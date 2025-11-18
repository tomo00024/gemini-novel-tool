<!-- src/routes/session/[id]/+page.svelte -->
<script lang="ts">
	// --- SvelteKitのコア機能とストアをインポート ---
	import { page } from '$app/stores';
	import { sessions, appSettings } from '$lib/stores';
	import { derived, get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { chatSessionStore } from '$lib/chatSessionStore';

	// --- 外部サービスと型定義、ヘルパー関数をインポート ---
	import { callGeminiApi } from '$lib/geminiService';
	import type {
		Trigger,
		Log,
		FeatureSettings,
		AppSettings,
		DiceRoll,
		CustomStatus
	} from '$lib/types';
	import { generateUUID } from '$lib/utils';
	import {
		initializeAndStoreImageRules,
		correctImageMarkdownInText
	} from '$lib/utils/imageUrlCorrector';

	// --- UIコンポーネントをインポート ---
	import StandardChatView from '$lib/components/StandardChatView.svelte';
	import GameChatView from '$lib/components/GameChatView.svelte';
	import ChatLayout from '$lib/components/ChatLayout.svelte';

	// --- リアクティブなストア定義 ---
	$: if ($currentSession) {
		chatSessionStore.init($currentSession);
	}
	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);
	const activeApiKey = derived(appSettings, ($appSettings) => {
		if (!$appSettings.activeApiKeyId || !$appSettings.apiKeys) {
			return null;
		}
		const activeKey = $appSettings.apiKeys.find((k) => k.id === $appSettings.activeApiKeyId);
		return activeKey ? activeKey.key : null;
	});
	const model = derived(appSettings, ($appSettings) => $appSettings.model);

	onMount(() => {
		const sessionExists = $sessions.some((s) => s.id === $page.params.id);
		if (!sessionExists) {
			alert('指定されたセッションが見つかりませんでした。');
			goto(base || '/');
		}
	});

	// --- コンポーネントの状態変数 ---
	let userInput = '';
	let isLoading = false;
	let lastProcessedSessionId: string | null = null;
	let lastProcessedLogCount: number = 0;

	$: if ($currentSession) {
		const currentId = $currentSession.id;
		const currentLogCount = $currentSession.logs.length;
		const hasSessionChanged = currentId !== lastProcessedSessionId;
		const isFirstPost = lastProcessedLogCount === 0 && currentLogCount > 0;

		if (hasSessionChanged || isFirstPost) {
			chatSessionStore.init($currentSession);
			initializeAndStoreImageRules($currentSession);
			lastProcessedSessionId = currentId;
			lastProcessedLogCount = currentLogCount;
		}
	}

	/**
	 * ダイスロール設定に基づき、ダイスロールを実行し、指示ブロック文字列を生成する関数
	 */
	function generateDiceRollBlock(diceRolls: DiceRoll[] | undefined): string {
		if (!diceRolls || diceRolls.length === 0) {
			return '';
		}

		const instructions: string[] = [];
		for (const diceRoll of diceRolls) {
			if (!diceRoll.isEnabled) continue;

			const results: number[] = [];
			for (let i = 0; i < diceRoll.diceCount; i++) {
				const result = Math.floor(Math.random() * diceRoll.diceType) + 1;
				results.push(result);
			}

			if (results.length > 0) {
				const formattedString = `｛${diceRoll.instructionText}:${results.join(',')}｝`;
				instructions.push(formattedString);
			}
		}

		if (instructions.length === 0) {
			return '';
		}

		return `[ダイスロールStart]\n${instructions.join('\n')}\n[ダイスロールEnd]`;
	}

	/**
	 * トリガーを評価し、指示ブロックと「更新後のステータス配列」「更新後のトリガー配列」を返す
	 * シーケンシャル（上から順）に実行し、ステータス変更はその場で後続の判定に反映される
	 */
	function evaluateTriggers(
		triggers: Trigger[] | undefined,
		initialCustomStatuses: CustomStatus[] | undefined
	): {
		triggerBlock: string;
		updatedTriggers: Trigger[] | undefined;
		updatedStatuses: CustomStatus[] | undefined;
	} {
		if (!triggers || triggers.length === 0 || !initialCustomStatuses) {
			return {
				triggerBlock: '',
				updatedTriggers: triggers,
				updatedStatuses: initialCustomStatuses
			};
		}

		const instructions: string[] = [];
		const evaluatedTriggers: Trigger[] = [];

		// 計算用にステータスのディープコピーを作成（これを次々と書き換えていく）
		let currentStatuses = JSON.parse(JSON.stringify(initialCustomStatuses)) as CustomStatus[];

		for (const trigger of triggers) {
			const hasBeenExecuted = trigger.hasBeenExecuted ?? false;
			const lastEvaluationResult = trigger.lastEvaluationResult ?? false;

			// 1. 条件判定 (currentStatuses の値を使う)
			let isConditionMet = false;
			if (trigger.conditions && trigger.conditions.length > 0) {
				const conditionResults = trigger.conditions.map((condition) => {
					const status = currentStatuses.find((s) => s.id === condition.statusId);
					if (!status) return false;
					const currentValue = parseFloat(status.currentValue);
					if (isNaN(currentValue)) return false;

					switch (condition.operator) {
						case '>=':
							return currentValue >= condition.value;
						case '>':
							return currentValue > condition.value;
						case '<=':
							return currentValue <= condition.value;
						case '<':
							return currentValue < condition.value;
						case '==':
							return currentValue === condition.value;
						default:
							return false;
					}
				});

				isConditionMet = conditionResults.reduce((acc, current, index) => {
					if (index === 0) return current;
					const conjunction = trigger.conjunctions[index - 1];
					return conjunction === 'AND' ? acc && current : acc || current;
				}, conditionResults[0] ?? false);
			}

			// 2. 実行判定
			let shouldExecute = false;
			switch (trigger.executionType) {
				case 'persistent':
					shouldExecute = isConditionMet;
					break;
				case 'once':
					shouldExecute = isConditionMet && !hasBeenExecuted;
					break;
				case 'on-threshold-cross':
					shouldExecute = isConditionMet && !lastEvaluationResult;
					break;
			}

			// 3. 実行 (テキスト収集 & ステータス更新)
			if (shouldExecute) {
				// A. テキスト追加
				if (trigger.responseText) {
					instructions.push(trigger.responseText);
				}

				// B. ステータス即時更新 (バッファを書き換え、次のトリガー判定に影響させる)
				if (trigger.statusUpdates && trigger.statusUpdates.length > 0) {
					for (const update of trigger.statusUpdates) {
						const targetStatus = currentStatuses.find((s) => s.id === update.targetStatusId);
						if (targetStatus) {
							let val = parseFloat(targetStatus.currentValue);
							if (isNaN(val)) val = 0;

							if (update.operation === 'set') {
								val = update.value;
							} else if (update.operation === 'add') {
								val += update.value;
							} else if (update.operation === 'sub') {
								val -= update.value;
							}

							targetStatus.currentValue = String(val); // 文字列として保存
						}
					}
				}
			}

			evaluatedTriggers.push({
				...trigger,
				hasBeenExecuted: hasBeenExecuted || (shouldExecute && trigger.executionType === 'once'),
				lastEvaluationResult: isConditionMet
			});
		}

		const triggerBlock =
			instructions.length > 0 ? `[トリガーStart]\n${instructions.join('\n')}\n[トリガーEnd]` : '';

		return {
			triggerBlock,
			updatedTriggers: evaluatedTriggers,
			updatedStatuses: currentStatuses
		};
	}

	function buildFinalUserInput(currentUserInput: string, blocks: string[]): string {
		const validBlocks = blocks.filter((block) => block);
		const finalParts: string[] = [];

		if (validBlocks.length > 0) {
			const internalInstructions = `[内部指示Start]\n${validBlocks.join('\n')}\n[内部指示End]`;
			finalParts.push(internalInstructions);
		}

		const userMessageBlock = `[ユーザー文章Start]\n${currentUserInput}\n[ユーザー文章End]`;
		finalParts.push(userMessageBlock);

		return finalParts.join('\n');
	}

	function buildConversationHistory(allLogs: Log[], targetLogId: string): Log[] {
		const history: Log[] = [];
		const logMap = new Map(allLogs.map((log) => [log.id, log]));
		const targetLog = logMap.get(targetLogId);
		if (!targetLog) return [];

		let currentParentId = targetLog.parentId;
		while (currentParentId) {
			const parentLog = logMap.get(currentParentId);
			if (!parentLog) break;
			history.unshift(parentLog);
			currentParentId = parentLog.parentId;
		}
		return history;
	}

	async function getAiResponseAndUpdate(
		contextLogs: Log[],
		finalUserInput: string,
		userMessageId: string,
		isRetry: boolean,
		sessionId: string,
		featureSettings: FeatureSettings,
		triggersToUpdateAfterSuccess: Trigger[] | undefined
	) {
		isLoading = true;
		try {
			let currentAppSettings = get(appSettings);
			let currentActiveApiKey = currentAppSettings.apiKeys.find(
				(k) => k.id === currentAppSettings.activeApiKeyId
			)?.key;
			let currentModel = currentAppSettings.model;

			while (true) {
				if (!currentActiveApiKey || !currentModel) {
					alert('APIキーまたはモデルが設定されていません。');
					break;
				}

				const conversationContext = {
					logs: contextLogs.map((log) => ({ speaker: log.speaker, text: log.text })),
					featureSettings: featureSettings
				};

				const result = await callGeminiApi(
					currentActiveApiKey,
					currentModel,
					currentAppSettings,
					conversationContext,
					finalUserInput
				);

				if (result.metadata?.requiresApiKeyLoop) {
					// APIキーローテーション処理
					const currentApiKeyInfo = currentAppSettings.apiKeys.find(
						(k) => k.id === currentAppSettings.activeApiKeyId
					);
					const currentApiKeyName = currentApiKeyInfo ? currentApiKeyInfo.name : '現在のキー';

					if (
						confirm(
							`APIキー「${currentApiKeyName}」がレート制限(429)に達しました。次のAPIキーに切り替えて再試行しますか？`
						)
					) {
						const currentIndex = currentAppSettings.apiKeys.findIndex(
							(k) => k.id === currentAppSettings.activeApiKeyId
						);
						const nextIndex = (currentIndex + 1) % currentAppSettings.apiKeys.length;
						const nextApiKey = currentAppSettings.apiKeys[nextIndex];

						appSettings.update((settings) => {
							settings.activeApiKeyId = nextApiKey.id;
							return settings;
						});

						alert(`APIキーを「${nextApiKey.name}」に切り替えました。再試行します。`);

						currentAppSettings = get(appSettings);
						currentActiveApiKey = nextApiKey.key;
						continue;
					} else {
						const errorMessage = result.metadata.error?.error?.message || 'レート制限エラーです。';
						alert(`処理を中断しました: ${errorMessage}`);
						break;
					}
				} else {
					// 成功時
					let responseText = result.responseText;
					const settings = get(appSettings);

					if (settings.assist.autoCorrectUrl) {
						console.log('[AI Response] URL auto-correction is enabled. Applying correction...');
						responseText = correctImageMarkdownInText(responseText);
					}

					sessions.update((allSessions) => {
						const sessionToUpdate = allSessions.find((s) => s.id === sessionId);
						if (sessionToUpdate) {
							const parentUserMessage = sessionToUpdate.logs.find(
								(log) => log.id === userMessageId
							);

							if (parentUserMessage && 'requestBody' in result) {
								parentUserMessage.metadata = (result as any).requestBody;
							}

							const newAiResponse: Log = {
								id: generateUUID(),
								speaker: 'ai',
								text: responseText,
								timestamp: new Date().toISOString(),
								parentId: userMessageId,
								activeChildId: null,
								metadata: result.metadata
							};
							sessionToUpdate.logs.push(newAiResponse);

							if (parentUserMessage) {
								parentUserMessage.activeChildId = newAiResponse.id;
							}

							if (triggersToUpdateAfterSuccess) {
								sessionToUpdate.triggers = triggersToUpdateAfterSuccess;
							}

							sessionToUpdate.lastUpdatedAt = new Date().toISOString();
						}
						return allSessions;
					});
					break;
				}
			}
		} catch (error) {
			console.error('API Error:', error);
			alert(`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isLoading = false;
		}
	}

	async function handleSubmit() {
		if (isLoading || !userInput.trim() || !$currentSession) return;
		if (!$activeApiKey || !$model) {
			alert('APIキーまたはモデルが設定されていません。');
			return;
		}

		const currentUserInput = userInput;
		userInput = '';

		// 1. 指示ブロック生成（ダイス & トリガー）
		const diceBlock = generateDiceRollBlock($currentSession.diceRolls);
		const { triggerBlock, updatedTriggers, updatedStatuses } = evaluateTriggers(
			$currentSession.triggers,
			$currentSession.customStatuses
		);

		// 2. 最終プロンプト構築
		const finalUserInput = buildFinalUserInput(currentUserInput, [diceBlock, triggerBlock]);

		// 3. ログ保存 & ステータス更新
		const now = new Date().toISOString();
		const allLogs = $currentSession.logs;
		const logMap = new Map(allLogs.map((log) => [log.id, log]));

		// 末尾のログ（親ID）を見つける
		let lastLog: Log | null = null;
		if (allLogs.length > 0) {
			let currentLog = allLogs.find((log) => log.parentId === null);
			if (currentLog) {
				lastLog = currentLog;
				while (currentLog.activeChildId) {
					const nextLog = logMap.get(currentLog.activeChildId);
					if (nextLog) {
						currentLog = nextLog;
						lastLog = nextLog;
					} else {
						break;
					}
				}
			}
		}

		const parentId = lastLog ? lastLog.id : null;

		const newUserMessage: Log = {
			id: generateUUID(),
			speaker: 'user',
			text: currentUserInput,
			timestamp: now,
			parentId: parentId,
			activeChildId: null
		};

		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $currentSession!.id);
			if (sessionToUpdate) {
				if (sessionToUpdate.logs.length === 0) {
					sessionToUpdate.title = currentUserInput.substring(0, 10);
				}
				sessionToUpdate.logs.push(newUserMessage);

				if (parentId) {
					const parentLog = sessionToUpdate.logs.find((log) => log.id === parentId);
					if (parentLog) {
						parentLog.activeChildId = newUserMessage.id;
					}
				}

				// ステータス更新を適用
				if (updatedStatuses) {
					sessionToUpdate.customStatuses = updatedStatuses;
				}

				sessionToUpdate.lastUpdatedAt = now;
			}
			return allSessions;
		});

		// 4. AI応答要求
		const updatedLogs = get(sessions).find((s) => s.id === $currentSession!.id)!.logs;
		const history = buildConversationHistory(updatedLogs, newUserMessage.id);

		await getAiResponseAndUpdate(
			history,
			finalUserInput,
			newUserMessage.id,
			false,
			$currentSession!.id,
			$currentSession!.featureSettings,
			updatedTriggers
		);
	}

	async function handleRetry(userMessageId: string) {
		if (isLoading || !$currentSession) return;
		if (!$activeApiKey || !$model) {
			alert('APIキーまたはモデルが設定されていません。');
			return;
		}
		const targetUserMessage = $currentSession.logs.find((log) => log.id === userMessageId);
		if (!targetUserMessage) return;

		const userInputForRetry = targetUserMessage.text;

		const diceBlock = generateDiceRollBlock($currentSession.diceRolls);
		const { triggerBlock, updatedTriggers, updatedStatuses } = evaluateTriggers(
			$currentSession.triggers,
			$currentSession.customStatuses
		);

		const finalUserInput = buildFinalUserInput(userInputForRetry, [diceBlock, triggerBlock]);

		// リトライ時もステータス更新を反映させる
		if (updatedStatuses) {
			sessions.update((allSessions) => {
				const s = allSessions.find((x) => x.id === $currentSession!.id);
				if (s) {
					s.customStatuses = updatedStatuses;
					s.lastUpdatedAt = new Date().toISOString();
				}
				return allSessions;
			});
		}

		const history = buildConversationHistory($currentSession.logs, userMessageId);
		await getAiResponseAndUpdate(
			history,
			finalUserInput,
			userMessageId,
			true,
			$currentSession.id,
			$currentSession.featureSettings,
			updatedTriggers
		);
	}

	// 欠損していた関数を追加
	function handleUpdateTitle(event: CustomEvent<{ title: string }>): void {
		const newTitle = event.detail.title;
		if (!$currentSession || !newTitle) return;

		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $currentSession!.id);
			if (sessionToUpdate) {
				sessionToUpdate.title = newTitle;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

{#if $currentSession}
	<ChatLayout
		bind:userInput
		{isLoading}
		{handleSubmit}
		sessionTitle={$currentSession.title}
		on:updateTitle={handleUpdateTitle}
	>
		{#if $currentSession.viewMode === 'game'}
			<GameChatView currentSession={$currentSession} />
		{:else}
			<StandardChatView {handleRetry} />
		{/if}
	</ChatLayout>
{:else}
	<div class="flex h-screen items-center justify-center">
		<p>セッションを読み込んでいます...</p>
	</div>
{/if}
