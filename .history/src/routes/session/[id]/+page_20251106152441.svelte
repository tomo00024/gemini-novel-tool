<script lang="ts">
	import { page } from '$app/stores';
	import { sessions, appSettings } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	import { callGeminiApiOnClient } from '$lib/geminiClient';
	import type { ChatResponse } from '$lib/geminiClient';

	// --- 表示するコンポーネントをインポート ---
	import StandardChatView from '$lib/components/StandardChatView.svelte';
	import GameChatView from '$lib/components/GameChatView.svelte'; // ★新規インポート

	// --- ストアとロジック (変更なし) ---
	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived(
		[sessions, sessionId],
		([$sessions, $sessionId]) => $sessions.find((s) => s.id === $sessionId)
	);
	const apiKey = derived(appSettings, ($appSettings) => $appSettings.apiKey);

	onMount(() => {
		const sessionExists = $sessions.some((s) => s.id === $page.params.id);
		if (!sessionExists) {
			alert('指定されたセッションが見つかりませんでした。');
			goto(base || '/');
		}
	});

	let userInput = '';
	let isLoading = false;

	async function handleSubmit() {
		if (isLoading || !userInput.trim() || !$currentSession) return;

		if (!$apiKey) {
			alert('設定画面でAPIキーを先に設定してください。');
			return;
		}

		isLoading = true;
		const currentUserInput = userInput;
		userInput = '';

		try {
			const conversationContext = {
				logs: $currentSession.logs.map((log) => ({
					speaker: log.speaker,
					text: log.text
				})),
				featureSettings: $currentSession.featureSettings
			};

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

			const result: ChatResponse = await callGeminiApiOnClient(
				$apiKey,
				conversationContext,
				currentUserInput
			);

			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === $currentSession.id);
				if (sessionToUpdate) {
					sessionToUpdate.logs.push({
						speaker: 'ai',
						text: result.responseText,
						timestamp: new Date().toISOString()
					});

					const goodwillSettings = sessionToUpdate.featureSettings.goodwill;
					if (goodwillSettings?.isEnabled && result.goodwillFluctuation !== 0) {
						goodwillSettings.currentValue += result.goodwillFluctuation;
					}

					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
				return allSessions;
			});
		} catch (error) {
			console.error('Gemini APIの呼び出し中にエラーが発生しました:', error);
			if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('permission'))) {
				alert('APIキーが無効、または権限がありません。設定を確認してください。');
			} else {
				alert(`メッセージの送信中にエラーが発生しました。\n${error instanceof Error ? error.message : '詳細はコンソールを確認してください。'}`);
			}

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

<!-- ▼▼▼ ここからがUIの切り替えロジック ▼▼▼ -->

{#if $currentSession}
	<!-- 
    viewModeが 'game' の場合は GameChatView を表示
    それ以外（'standard' や未設定）の場合は StandardChatView を表示
  -->
	{#if $currentSession.viewMode === 'game'}
		<GameChatView
			currentSession={$currentSession}
			{isLoading}
			bind:userInput
			{handleSubmit}
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
	<!-- ローディング表示 (変更なし) -->
	<div class="flex justify-center items-center h-screen">
		<p>セッションを読み込んでいます...</p>
	</div>
{/if}