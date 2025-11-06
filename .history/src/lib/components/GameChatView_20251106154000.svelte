<script lang="ts">
	import type { Session } from '$lib/types';

	export let currentSession: Session;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;
	export let base: string;

	let currentPageIndex = 0;

	$: latestAiMessage =
		[...currentSession.logs].reverse().find((log) => log.speaker === 'ai')?.text ||
		'......';

	// ▼▼▼ [ここからが変更箇所] 新しいページ分割ロジック ▼▼▼
	$: messagePages = (() => {
		// AIからの応答がない場合は、プレースホルダーを返す
		if (!latestAiMessage) {
			return ['......'];
		}

		const finalPages: string[] = [];

		// 1. まず、空行（2つ以上の連続した改行）でテキスト全体を「段落ブロック」に分割する
		const paragraphs = latestAiMessage.trim().split(/\n\n+/);

		// 2. 各段落ブロックを処理する
		for (const paragraph of paragraphs) {
			// 段落を構成する行の配列に変換する
			const lines = paragraph.split('\n');

			if (lines.length <= 3) {
				// 2-A. 段落が3行以下の場合、その段落はそのまま1つのページになる
				finalPages.push(paragraph);
			} else {
				// 2-B. 段落が4行以上の場合、その段落をさらに3行ごとのチャンクに分割する
				for (let i = 0; i < lines.length; i += 3) {
					const pageChunk = lines.slice(i, i + 3).join('\n');
					finalPages.push(pageChunk);
				}
			}
		}

		// 最終的なページ配列が空にならないように保証する
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

<!-- HTMLとStyleの部分は変更ありません -->
<div class="flex flex-col h-screen bg-gray-800 text-white">
	<div class="flex-grow p-4">
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

	<div class="flex-none p-4 space-y-3">
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