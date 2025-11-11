<script lang="ts">
	/**
	 * @file このファイルは、特定のセッション（:idで指定）におけるチャット画面そのものを定義します。
	 * @component SessionChatPage
	 * @description
	 * URLの動的パラメータからセッションIDを取得し、ユーザーとの対話UIを提供する責務を持ちます。
	 * 主な機能は以下の通りです。
	 * - ユーザーからのメッセージ送信処理 (`handleSubmit`)
	 * - `geminiService` を介したバックエンドAPIとの通信
	 * - APIからの応答（AIの返信や好感度の変動など）をセッションストアに反映
	 * - セッション設定の `viewMode` に応じて、`StandardChatView` と `GameChatView` の表示を動的に切り替える
	 * @see {@link ./settings/+page.svelte | このページに対応する設定ページ}
	 */

	// --- SvelteKitのコア機能とストアをインポート ---
	import { page } from '$app/stores';
	import { sessions, appSettings } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	// --- 外部サービスと型ガードをインポート ---
	import { callGeminiApi, isOneStepResponse } from '$lib/geminiService';
	import { processMessageIntoPages } from '$lib/utils/messageProcessor';

	// --- 表示モードに応じて動的に切り替えるUIコンポーネントをインポート ---
	import StandardChatView from '$lib/components/StandardChatView.svelte';
	import GameChatView from '$lib/components/GameChatView.svelte';
	import type { Trigger } from '$lib/types';

	// --- リアクティブなストア定義 ---

	/**
	 * @description URLの動的パラメータ `:id` から、現在のセッションIDをリアクティブに取得するderivedストア。
	 */
	const sessionId = derived(page, ($page) => $page.params.id);

	/**
	 * @description 全セッションリストと現在のセッションIDを元に、
	 *              このページで表示・編集対象となっているセッションオブジェクト全体をリアクティブに提供するderivedストア。
	 */
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	/**
	 * @description アプリケーション設定ストアから、APIキーをリアクティブに取得するderivedストア。
	 */
	const apiKey = derived(appSettings, ($appSettings) => $appSettings.apiKey);

	/**
	 * @description アプリケーション設定ストアから、選択されたAIモデル名をリアクティブに取得するderivedストア。
	 */
	const model = derived(appSettings, ($appSettings) => $appSettings.model);

	/**
	 * @description このコンポーネントがマウントされた直後に実行されるライフサイクル関数。
	 *              存在しないセッションのURLに直接アクセスされた場合のガード処理を行う。
	 */
	onMount(() => {
		// $sessionsストア（クライアントサイドで永続化されている）に該当IDのセッションが存在しない場合、
		// ユーザーに警告を表示し、安全なホームページへリダイレクトさせる。
		const sessionExists = $sessions.some((s) => s.id === $page.params.id);
		if (!sessionExists) {
			alert('指定されたセッションが見つかりませんでした。');
			goto(base || '/');
		}
	});

	// --- コンポーネントの状態変数 ---

	/** @description ユーザーが入力中のテキストを保持する。`bind:userInput`を介して子コンポーネントと双方向バインディングされる。 */
	let userInput = '';

	/** @description APIとの通信中かどうかを示すフラグ。UIのローディング表示や送信ボタンの無効化に使用する。 */
	let isLoading = false;

	/**
	 * ユーザーからのメッセージ送信を処理する非同期関数。
	 * フォームのsubmitイベントなどから呼び出される。
	 */
	async function handleSubmit() {
		if (isLoading || !userInput.trim() || !$currentSession) return;
		if (!$apiKey) {
			alert('設定画面でAPIキーを先に設定してください。');
			return;
		}
		if (!$model) {
			alert('設定画面でAIモデルを選択してください。');
			return;
		}

		isLoading = true;
		const currentUserInput = userInput;
		userInput = '';

		try {
			// Step 1: トリガーを評価し、最終的なプロンプトと、"もし成功したら"更新するべきトリガーの状態を準備する
			let finalUserInput = currentUserInput;
			const activeTriggerInstructions: string[] = [];
			// この変数が、API成功後にストアに保存される新しいトリガーの状態
			let triggersToUpdateAfterSuccess: Trigger[] | undefined = undefined;

			if ($currentSession.triggers && $currentSession.customStatuses) {
				const statuses = $currentSession.customStatuses;
				const evaluatedTriggers: Trigger[] = []; // 評価後のトリガーを一時的に格納

				for (const trigger of $currentSession.triggers) {
					const hasBeenExecuted = trigger.hasBeenExecuted ?? false;
					const lastEvaluationResult = trigger.lastEvaluationResult ?? false;

					let isConditionMet = false;
					if (trigger.conditions && trigger.conditions.length > 0) {
						const conditionResults = trigger.conditions.map((condition) => {
							const status = statuses.find((s) => s.id === condition.statusId);
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

					if (shouldExecute) {
						activeTriggerInstructions.push(trigger.responseText);
					}

					evaluatedTriggers.push({
						...trigger,
						hasBeenExecuted: hasBeenExecuted || shouldExecute,
						lastEvaluationResult: isConditionMet
					});
				}

				// 評価した結果、何かしらのトリガーが存在すれば、それを更新対象としてセット
				if (evaluatedTriggers.length > 0) {
					triggersToUpdateAfterSuccess = evaluatedTriggers;
				}
			}

			// プロンプトの構築
			if (activeTriggerInstructions.length > 0) {
				const instructions = activeTriggerInstructions.join('\n');
				finalUserInput = `[内部指示Start]\n${instructions}\n[内部指示End]\nユーザー文章: ${currentUserInput}`;
			}

			// Step 2: ユーザーの入力ログだけを先にストアに反映させる（UIの応答性のため）
			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === $currentSession.id);
				if (sessionToUpdate) {
					sessionToUpdate.logs.push({
						speaker: 'user',
						text: currentUserInput,
						timestamp: new Date().toISOString()
					});
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
				return allSessions;
			});

			// Step 3: APIを呼び出す
			const conversationContext = {
				logs: $currentSession.logs.map((log) => ({ speaker: log.speaker, text: log.text })),
				featureSettings: $currentSession.featureSettings
			};

			const result = await callGeminiApi(
				$apiKey,
				$model,
				$appSettings,
				conversationContext,
				finalUserInput
			);

			// Step 4: APIが成功した場合、応答の保存とトリガーの状態更新を"同時に"行う
			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === $currentSession.id);
				if (sessionToUpdate) {
					// AIの応答をログに追加
					sessionToUpdate.logs.push({
						speaker: 'ai',
						text: result.responseText,
						timestamp: new Date().toISOString()
					});
					if (triggersToUpdateAfterSuccess) {
						sessionToUpdate.triggers = triggersToUpdateAfterSuccess;
					}

					// ステータスの更新処理
					if (sessionToUpdate.customStatuses && sessionToUpdate.gameViewSettings) {
						const processed = processMessageIntoPages(result.responseText, {
							maxHeight: 9999,
							measureTextHeight: () => 0,
							imageBaseUrl: sessionToUpdate.gameViewSettings.imageBaseUrl,
							imageExtension: sessionToUpdate.gameViewSettings.imageExtension
						});
						const updates = processed.statusUpdates;
						const statuses = sessionToUpdate.customStatuses;
						for (const status of statuses) {
							if (updates[status.name]) {
								const newValueStr = updates[status.name];
								if (status.mode === 'add') {
									const currentValueNum = parseInt(status.currentValue, 10);
									const changeValueNum = parseInt(newValueStr, 10);
									if (!isNaN(currentValueNum) && !isNaN(changeValueNum)) {
										status.currentValue = (currentValueNum + changeValueNum).toString();
									}
								} else {
									status.currentValue = newValueStr;
								}
							}
						}
					}
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
				return allSessions;
			});
		} catch (error) {
			console.error('APIの呼び出し中にエラーが発生しました:', error);
			if (
				error instanceof Error &&
				(error.message.includes('API key not valid') || error.message.includes('permission'))
			) {
				alert('APIキーが無効、または権限がありません。設定を確認してください。');
			} else {
				alert(
					`メッセージの送信中にエラーが発生しました。\n${error instanceof Error ? error.message : '詳細はコンソールを確認してください。'}`
				);
			}

			// エラー時はユーザーの入力ログをロールバックする。
			// トリガーの状態はストアに保存されていないので、何もしなくて良い。
			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === $currentSession.id);
				if (sessionToUpdate) {
					sessionToUpdate.logs.pop();
				}
				return allSessions;
			});
		} finally {
			isLoading = false;
		}
	}
</script>

{#if $currentSession}
	{#if $currentSession.viewMode === 'game'}
		<GameChatView
			currentSession={$currentSession}
			{isLoading}
			bind:userInput
			{handleSubmit}
			{base}
		/>
	{:else}
		<StandardChatView
			currentSession={$currentSession}
			{base}
			{isLoading}
			bind:userInput
			{handleSubmit}
		/>
	{/if}
{:else}
	<div class="flex h-screen items-center justify-center">
		<p>セッションを読み込んでいます...</p>
	</div>
{/if}
