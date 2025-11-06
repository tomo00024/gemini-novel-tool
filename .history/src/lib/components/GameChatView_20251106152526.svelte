<!-- src/lib/components/GameChatView.svelte -->

<script lang="ts">
	// [修正点 1] Session 型をインポートして、プロパティの型を正しく定義します
	import type { Session } from '$lib/types';

	// 親コンポーネントから渡されるデータと関数
	export let currentSession: Session; // 'any' から 'Session' に変更
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;


	// [修正点 2] 'derived'ストアの使用をやめ、プロパティが変更されると自動で再計算される
	//             Svelteのリアクティブな宣言($:)に全面的に切り替えます。

	// --- テキストページ送り機能のためのリアクティブな処理 ---

	let currentPageIndex = 0;

	// 1. currentSession.logsが変更されるたびに、最新のAIメッセージを再計算する
	$: latestAiMessage =
		[...currentSession.logs].reverse().find((log) => log.speaker === 'ai')?.text ||
		'......';

	// 2. latestAiMessageが変更されるたびに、テキストを3行ごとの「ページ」に再分割する
	$: messagePages = (() => {
		const lines = latestAiMessage.split('\n');
		const pages = [];
		for (let i = 0; i < lines.length; i += 3) {
			pages.push(lines.slice(i, i + 3).join('\n'));
		}
		// ページが空にならないように、最低でも1つの空ページを保証する
		return pages.length > 0 ? pages : [''];
	})();

	// 3. 表示中のAIメッセージが変わったら（＝新しい応答が来たら）、ページ番号を先頭(0)に戻す
	$: if (latestAiMessage) {
		currentPageIndex = 0;
	}

	// 4. 現在のページ番号や総ページ数が変わるたびに、続きがあるかを再計算する
	$: hasMorePages = currentPageIndex < messagePages.length - 1;


	// --- イベントハンドラ (変更なし) ---
	function handleNextPage() {
		if (hasMorePages) {
			currentPageIndex++;
		}
	}
</script>

<!-- HTML部分は変更ありません -->
<div class="flex flex-col h-screen bg-gray-800 text-white">
	<div class="flex-grow">
	</div>

	<div class="flex-none p-4 space-y-3">
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="dialog-box h-32 p-4 bg-black bg-opacity-50 rounded-lg border border-gray-600 cursor-pointer relative"
			on:click={handleNextPage}
		>
			{#if messagePages[currentPageIndex]}
				<p class="whitespace-pre-wrap">{messagePages[currentPageIndex]}</p>
			{/if}

			{#if hasMorePages}
				<div class="continue-indicator">▼</div>
			{/if}
		</div>

		<form on:submit|preventDefault={handleSubmit} class="flex gap-2">
			<input
				type="text"
				bind:value={userInput}
				placeholder="メッセージを入力..."
				class="input input-bordered flex-1 bg-gray-700 border-gray-600"
				disabled={isLoading}
			/>
			<button type="submit" class="btn btn-primary" disabled={isLoading}>
				{#if isLoading}
					送信中...
				{:else}
					送信
				{/if}
			</button>
		</form>
	</div>
</div>

<!-- スタイル部分は変更ありません -->
<style>
	.dialog-box {
		overflow: hidden;
		line-height: 1.6;
		user-select: none;
	}

	.continue-indicator {
		position: absolute;
		bottom: 10px;
		right: 15px;
		font-size: 1.2rem;
		animation: bounce 1.5s infinite;
	}

	@keyframes bounce {
		0%, 20%, 50%, 80%, 100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-8px);
		}
		60% {
			transform: translateY(-4px);
		}
	}

	.input { padding: 0.5rem; }
	.btn { padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; }
	.btn-primary { background-color: #3b82f6; color: white; }
	.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>