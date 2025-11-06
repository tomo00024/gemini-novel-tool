<!-- src/routes/session/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions, appSettings } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
    import { base } from '$app/paths';
	
	import { callGeminiApiOnClient } from '$lib/geminiClient';
	import type { ChatResponse } from '$lib/geminiClient';

	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived(
		[sessions, sessionId],
		([$sessions, $sessionId]) => $sessions.find((s) => s.id === $sessionId)
	);
	const apiKey = derived(appSettings, ($appSettings) => $appSettings.apiKey);

	onMount(() => {
		const sessionExists = $sessions.some(s => s.id === $page.params.id);
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
				logs: $currentSession.logs.map(log => ({
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

{#if $currentSession}
	<div class="flex flex-col h-screen p-4 max-w-3xl mx-auto">
		<!-- ▼▼▼ [修正点] ヘッダー内のボタンのスタイルを統一 ▼▼▼ -->
		<div class="flex justify-between items-center mb-4">
			<a
				href="{base}/"
				class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
			>
				履歴に戻る
			</a>
			<div class="flex items-center gap-4">
				<a
					href="{base}/settings?from=session/{$currentSession.id}"
					class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
				>
					アプリ設定
				</a>
				<a
					href="{base}/session/{$currentSession.id}/settings"
					class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
				>
					セッション設定
				</a>
			</div>
		</div>
		<!-- ▲▲▲ ここまで ▲▲▲ -->

		<div class="flex-1 overflow-y-auto mb-4 space-y-4 p-2 bg-gray-100 rounded">
			{#each $currentSession.logs as message (message.timestamp)}
				<div class="chat {message.speaker === 'user' ? 'chat-end' : 'chat-start'}">
					<div class="chat-bubble {message.speaker === 'user' ? 'chat-bubble-primary' : ''}">
						<p class="whitespace-pre-wrap">{message.text}</p>
					</div>
				</div>
			{/each}

			{#if isLoading}
				<div class="chat chat-start">
					<div class="chat-bubble">考え中...</div>
				</div>
			{/if}
		</div>

		<form on:submit|preventDefault={handleSubmit} class="flex gap-2">
			<input
				type="text"
				bind:value={userInput}
				placeholder="メッセージを入力..."
				class="input input-bordered flex-1"
				disabled={isLoading}
			/>
			<button type="submit" class="btn btn-primary" disabled={isLoading}> 送信 </button>
		</form>
	</div>
{:else}
	<div class="flex justify-center items-center h-screen">
		<p>セッションを読み込んでいます...</p>
	</div>
{/if}

<style>
	.chat {
		display: grid;
		grid-template-columns: 1fr;
	}
	.chat-start {
		justify-items: start;
	}
	.chat-end {
		justify-items: end;
	}
	.chat-bubble {
		max-width: 90%;
		padding: 0.5rem 1rem;
		border-radius: 1rem;
		background-color: #f0f0f0;
	}
	.chat-bubble-primary {
		background-color: #3b82f6;
		color: white;
	}
	.input {
		padding: 0.5rem;
	}
	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
	}
	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>