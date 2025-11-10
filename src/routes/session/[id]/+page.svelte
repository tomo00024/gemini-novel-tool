<!-- src/routes/session/[id]/+page.svelte -->

<!-- src/routes/session/[id]/+page.svelte -->

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
		// 多重送信防止、空のメッセージ送信防止、セッション未読み込み時のガード節。
		if (isLoading || !userInput.trim() || !$currentSession) return;

		// APIキーが未設定の場合、処理を中断してユーザーに設定を促す。
		if (!$apiKey) {
			alert('設定画面でAPIキーを先に設定してください。');
			return;
		}

		// [追加] モデルが未設定の場合、処理を中断してユーザーに設定を促す。
		if (!$model) {
			alert('設定画面でAIモデルを選択してください。');
			return;
		}

		isLoading = true;
		const currentUserInput = userInput; // APIに送信する現在の入力を変数にコピー
		userInput = ''; // 入力フィールドを即座にクリアしてUXを向上

		try {
			// 1. ユーザーの入力をログに即時反映させる（楽観的UI更新）
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

			// 2. APIに渡すための会話コンテキストを構築する
			const conversationContext = {
				logs: $currentSession.logs.map((log) => ({
					speaker: log.speaker,
					text: log.text
				})),
				featureSettings: $currentSession.featureSettings
			};

			// 3. 外部サービス(`geminiService`)を呼び出してAPIと通信する
			// [修正] 第2引数に選択されたモデル名($model)を追加
			const result = await callGeminiApi($apiKey, $model, conversationContext, currentUserInput);

			// 4. APIからの応答をセッションログに保存し、関連する状態を更新する
			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === $currentSession.id);
				if (sessionToUpdate) {
					// AIの返信テキストをログに追加
					sessionToUpdate.logs.push({
						speaker: 'ai',
						text: result.responseText,
						timestamp: new Date().toISOString()
					});

					// --- ここからが新しいステータス更新ロジック ---
					// ゲーム風モード、かつ、設定が存在する場合のみステータス更新を実行
					if (
						sessionToUpdate.viewMode === 'game' &&
						sessionToUpdate.gameViewSettings?.customStatuses
					) {
						// メッセージからステータス更新コマンドを抽出する
						// ※ この処理ではページ分割は不要なため、計測関連のオプションはダミーでOK
						const processed = processMessageIntoPages(result.responseText, {
							maxHeight: 9999,
							measureTextHeight: () => 0, // ダミー関数
							imageBaseUrl: sessionToUpdate.gameViewSettings.imageBaseUrl,
							imageExtension: sessionToUpdate.gameViewSettings.imageExtension
						});
						const updates = processed.statusUpdates;
						const statuses = sessionToUpdate.gameViewSettings.customStatuses;

						// 抽出したコマンドを元に、定義されている各ステータスの値を更新
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
									// 'set' mode
									status.currentValue = newValueStr;
								}
							}
						}
					}
					// --- ステータス更新ロジックここまで ---
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
				return allSessions;
			});
		} catch (error) {
			// 5. API通信中にエラーが発生した場合の処理
			console.error('APIの呼び出し中にエラーが発生しました:', error);

			// エラー内容に応じて、より具体的で分かりやすいアラートをユーザーに表示する
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

			// 楽観的UI更新で追加したユーザーの入力をログから削除する（ロールバック処理）
			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === $currentSession.id);
				if (sessionToUpdate) {
					sessionToUpdate.logs.pop();
				}
				return allSessions;
			});
		} finally {
			// 6. 成功・失敗にかかわらず、ローディング状態を必ず解除する
			isLoading = false;
		}
	}
</script>

<!-- 
  ここから下はページのUI（ビュー）を定義するテンプレート部分です。
  Svelteのリアクティビティにより、$currentSessionストアの値が変更されると自動的に再描画されます。
-->

{#if $currentSession}
	<!--
    このページの主要機能の一つである、動的なビュー切り替え。
    セッションの設定（`viewMode`）を読み取り、'game'ならゲーム風UIを、
    それ以外（'standard'や未定義の場合も含む）なら標準UIを表示する。
  -->
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
	<!-- 
    `$currentSession`がまだ読み込めていない（undefinedの）場合に表示されるフォールバックUI。
    ページの初回読み込み時などに一瞬表示される。
  -->
	<div class="flex h-screen items-center justify-center">
		<p>セッションを読み込んでいます...</p>
	</div>
{/if}
