<!-- src/lib/components/GameChatView.svelte -->

<script lang="ts">
	import type { Session } from '$lib/types';

	export let currentSession: Session;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;

	let currentPageIndex = 0;

	$: latestAiMessage =
		[...currentSession.logs].reverse().find((log) => log.speaker === 'ai')?.text ||
		'......';

	$: messagePages = (() => {
		const lines = latestAiMessage.split('\n');
		const pages = [];
		for (let i = 0; i < lines.length; i += 3) {
			pages.push(lines.slice(i, i + 3).join('\n'));
		}
		return pages.length > 0 ? pages : [''];
	})();

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

<div class="flex flex-col h-screen bg-gray-800 text-white">
    	<div class="flex justify-between items-center mb-4">
		<a
			href="{base}/"
			class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
		>
			履歴に戻る
		</a>
		<div class="flex items-center gap-4">
			<a
				href="{base}/settings?from=session/{currentSession.id}"
				class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
			>
				アプリ設定
			</a>
			<a
				href="{base}/session/{currentSession.id}/settings"
				class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
			>
				セッション設定
			</a>
		</div>
	</div>
	<div class="flex-grow">
	</div>

	<div class="flex-none p-4 space-y-3">
		<!-- ▼▼▼ [修正点 1] div を button に変更 ▼▼▼ -->
		<button
			type="button"
			class="dialog-box h-32 p-4 bg-black bg-opacity-50 rounded-lg border border-gray-600 cursor-pointer relative"
			on:click={handleNextPage}
		>
			{#if messagePages[currentPageIndex]}
				<p class="whitespace-pre-wrap">{messagePages[currentPageIndex]}</p>
			{/if}

			{#if hasMorePages}
				<div class="continue-indicator">▼</div>
			{/if}
		</button>
		<!-- ▲▲▲ ここまで ▲▲▲ -->

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
		
		/* ▼▼▼ [修正点 2] buttonのデフォルトスタイルをリセット ▼▼▼ */
		/* 
		  <button>タグはブラウザ標準の見た目を持つため、
		  それを打ち消してdivのように振る舞わせるためのスタイルを追加します。
		*/
		width: 100%;       /* 幅を親要素いっぱいに広げる */
		text-align: left;  /* テキストを左揃えにする */
		font-family: inherit; /* フォントを親から継承する */
		color: inherit;      /* 文字色を親から継承する */
	}

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