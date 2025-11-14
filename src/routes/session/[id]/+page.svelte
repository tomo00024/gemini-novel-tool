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
	import { processMessageIntoPages } from '$lib/utils/messageProcessor';
	import type { Trigger, Log, FeatureSettings, AppSettings } from '$lib/types';
	import { generateUUID } from '$lib/utils';

	// --- UIコンポーネントをインポート ---
	import StandardChatView from '$lib/components/StandardChatView.svelte';
	import GameChatView from '$lib/components/GameChatView.svelte';
	import ChatLayout from '$lib/components/ChatLayout.svelte';
	// --- リアクティブなストア定義 (変更なし) ---
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

	// --- コンポーネントの状態変数 (変更なし) ---
	let userInput = '';
	let isLoading = false;

	// --- ヘルパー関数 (変更なし) ---
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

	// --- ▼▼▼【変更】API呼び出し関数をキー切り替え対応に修正 ▼▼▼ ---
	async function getAiResponseAndUpdate(
		contextLogs: Log[],
		finalUserInput: string,
		userMessageId: string, // 親となるユーザーメッセージのID
		isRetry: boolean,
		sessionId: string,
		featureSettings: FeatureSettings
	) {
		isLoading = true;
		try {
			let currentAppSettings = get(appSettings);
			let currentActiveApiKey = currentAppSettings.apiKeys.find(
				(k) => k.id === currentAppSettings.activeApiKeyId
			)?.key;
			let currentModel = currentAppSettings.model;

			// APIキー切り替えに対応するためループ処理を追加
			while (true) {
				if (!currentActiveApiKey || !currentModel) {
					alert('APIキーまたはモデルが設定されていません。');
					break; // ループを抜ける
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

				// キー切り替えが必要なシグナルをチェック
				if (result.metadata?.requiresApiKeyLoop) {
					const currentApiKeyInfo = currentAppSettings.apiKeys.find(
						(k) => k.id === currentAppSettings.activeApiKeyId
					);
					const currentApiKeyName = currentApiKeyInfo ? currentApiKeyInfo.name : '現在のキー';

					if (
						confirm(
							`APIキー「${currentApiKeyName}」がレート制限(429)に達しました。次のAPIキーに切り替えて再試行しますか？`
						)
					) {
						// OK: 次のAPIキーを探して設定を更新し、ループを継続
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

						// 次のループのために変数を更新
						currentAppSettings = get(appSettings);
						currentActiveApiKey = nextApiKey.key;
						continue; // ループの先頭に戻って再試行
					} else {
						// キャンセル: エラーメッセージを表示して処理を中断
						const errorMessage = result.metadata.error?.error?.message || 'レート制限エラーです。';
						alert(`処理を中断しました: ${errorMessage}`);
						break; // ループを抜ける
					}
				} else {
					// 通常の成功時: ストアを更新してループを抜ける
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
								text: result.responseText,
								timestamp: new Date().toISOString(),
								parentId: userMessageId,
								activeChildId: null,
								metadata: result.metadata
							};
							sessionToUpdate.logs.push(newAiResponse);

							if (parentUserMessage) {
								parentUserMessage.activeChildId = newAiResponse.id;
							}
							sessionToUpdate.lastUpdatedAt = new Date().toISOString();
						}
						return allSessions;
					});
					break; // 成功したのでループを抜ける
				}
			}
		} catch (error) {
			console.error('API Error:', error);
			alert(`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isLoading = false;
		}
	}
	// --- ▲▲▲【変更】ここまで ▲▲▲ ---

	// --- メッセージ送信関数 (getAiResponseAndUpdateの引数をシンプルにするため微修正) ---
	async function handleSubmit() {
		if (isLoading || !userInput.trim() || !$currentSession) return;
		if (!$activeApiKey || !$model) {
			alert('APIキーまたはモデルが設定されていません。');
			return;
		}

		const currentUserInput = userInput;
		userInput = '';
		const now = new Date().toISOString();
		const allLogs = $currentSession.logs;
		const logMap = new Map(allLogs.map((log) => [log.id, log]));

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
			const sessionToUpdate = allSessions.find((s) => s.id === $currentSession.id);
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
				sessionToUpdate.lastUpdatedAt = now;
			}
			return allSessions;
		});

		const updatedLogs = get(sessions).find((s) => s.id === $currentSession.id)!.logs;
		const history = buildConversationHistory(updatedLogs, newUserMessage.id);
		await getAiResponseAndUpdate(
			history,
			currentUserInput,
			newUserMessage.id,
			false,
			$currentSession.id,
			$currentSession.featureSettings
		);
	}

	// --- リトライ関数 (getAiResponseAndUpdateの引数をシンプルにするため微修正) ---
	async function handleRetry(userMessageId: string) {
		if (isLoading || !$currentSession) return;
		if (!$activeApiKey || !$model) {
			alert('APIキーまたはモデルが設定されていません。');
			return;
		}
		const targetUserMessage = $currentSession.logs.find((log) => log.id === userMessageId);
		if (!targetUserMessage) return;
		const history = buildConversationHistory($currentSession.logs, userMessageId);
		const userInputForRetry = targetUserMessage.text;
		await getAiResponseAndUpdate(
			history,
			userInputForRetry,
			userMessageId,
			true,
			$currentSession.id,
			$currentSession.featureSettings
		);
	}

	/**
	 * ▼▼▼【追加】タイトル更新イベントを処理する関数 ▼▼▼
	 */
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
	<!-- ▼▼▼【変更】on:updateTitleイベントリスナーを追加 ▼▼▼ -->
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
