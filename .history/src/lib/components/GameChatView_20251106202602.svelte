<!-- src/lib/components/YourComponent.svelte -->
<script lang="ts">
	import type { Session } from '$lib/types';
	import { marked } from 'marked'; // markedをインポート
	import DOMPurify from 'dompurify'; // DOMPurifyをインポート

	export let currentSession: Session;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;
	export let base: string;

	let currentPageIndex = 0;

	$: latestAiMessage =
		[...currentSession.logs].reverse().find((log) => log.speaker === 'ai')?.text ||
		'......';

	// ▼▼▼ ページ分割ロジック（この部分は変更ありません） ▼▼▼
	$: messagePages = (() => {
		if (!latestAiMessage) {
			return ['......'];
		}
		const finalPages: string[] = [];
		const paragraphs = latestAiMessage.trim().split(/\n\n+/);
		for (const paragraph of paragraphs) {
			const lines = paragraph.split('\n');
			if (lines.length <= 3) {
				finalPages.push(paragraph);
			} else {
				for (let i = 0; i < lines.length; i += 3) {
					const pageChunk = lines.slice(i, i + 3).join('\n');
					finalPages.push(pageChunk);
				}
			}
		}
		return finalPages.length > 0 ? finalPages : [''];
	})();
	// ▲▲▲ ここまで ▲▲▲

	$: if (latestAiMessage) {
		currentPageIndex = 0;
	}

	$: hasMorePages = currentPageIndex < messagePages.length - 1;

	function handleNextPage() {
		if (hasMorePages) {
			currentPageIndex++;
		}
	}
</script>

<!-- HTMLの部分 -->
<div class="flex flex-col h-[100dvh] bg-gray-800 text-white">
	
	<!-- Part 1: ヘッダー部分 (上部固定) -->
	<!-- flex-shrink-0 でこの要素が縮まないようにする -->
	<div class="flex-shrink-0 p-4">
		<div class="flex justify-between items-center">
			<a
				href="{base}/"
				class="text-sm bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 rounded"
			>
				履歴に戻る
			</a>
			<div class="flex items-center gap-4">
				<a
					href="{base}/settings?from=session/{currentSession.id}"
					class="text-sm bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 rounded"
				>
					アプリ設定
				</a>
				<a
					href="{base}/session/{currentSession.id}/settings"
					class="text-sm bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 rounded"
				>
					セッション設定
				</a>
			</div>
		</div>
	</div>

	<!-- Part 2: 可変の空白エリア -->
	<!-- flex-1 (または flex-grow) で残りの空間を全て埋める -->
	<div class="flex-1"></div>

	<!-- Part 3: ダイアログと入力フォーム (下部固定) -->
	<!-- flex-shrink-0 でこの要素が縮まないようにする -->
	<div class="flex-shrink-0 p-4 space-y-3">
		<!-- ダイアログボックス -->
		<div
			role="button"
			tabindex="0"
			class="dialog-box h-32 p-4 bg-black bg-opacity-50 rounded-lg border border-gray-600 cursor-pointer relative"
			on:click={handleNextPage}
			on:keydown={(e) => e.key === 'Enter' && handleNextPage()}
		>
			{#if messagePages[currentPageIndex]}
				{#await marked(messagePages[currentPageIndex])}
					<p>...</p>
				{:then rawHtml}
					{@html DOMPurify.sanitize(rawHtml)}
				{:catch error}
					<p class="text-red-500">Error: {error.message}</p>
				{/await}
			{/if}

			{#if hasMorePages}
				<div class="continue-indicator">▼</div>
			{/if}
		</div>

		<!-- 入力フォーム -->
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

<style>
	.dialog-box {
		overflow: hidden;
		line-height: 1.6;
		user-select: none;
		width: 100%;
		text-align: left;
		font-family: inherit;
		color: inherit;
	}

	/* ▼▼▼ [ここからが変更箇所] Markdown用のグローバルスタイルを追加 ▼▼▼ */
	.dialog-box :global(p) {
		margin-bottom: 0.5rem;
	}
	.dialog-box :global(h1),
	.dialog-box :global(h2),
	.dialog-box :global(h3) {
		font-weight: bold;
		margin-bottom: 0.5rem;
	}
	.dialog-box :global(ul),
	.dialog-box :global(ol) {
		list-style-position: inside;
		padding-left: 1em;
	}
	.dialog-box :global(pre) {
		background-color: rgba(255, 255, 255, 0.1);
		padding: 0.5rem;
		border-radius: 0.25rem;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
	/* ▲▲▲ ここまで ▲▲▲ */

	.continue-indicator {
		position: absolute;
		bottom: 10px;
		right: 15px;
		font-size: 1.2rem;
		animation: bounce 1.5s infinite;
	}
	@keyframes bounce {
		0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
		40% { transform: translateY(-8px); }
		60% { transform: translateY(-4px); }
	}
	.input { padding: 0.5rem; }
	.btn { padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; }
	.btn-primary { background-color: #3b82f6; color: white; }
	.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>