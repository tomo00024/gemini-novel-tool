<!-- src/lib/components/GameChatView.svelte -->

<script lang="ts">
	import type { Session } from '$lib/types';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { onMount, onDestroy } from 'svelte';

	export let currentSession: Session;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;
	export let base: string;

	let currentPageIndex = 0;
	let dialogWidth: number;
	let measurementDiv: HTMLDivElement | null = null;

	onMount(() => {
		measurementDiv = document.createElement('div');
		measurementDiv.classList.add('dialog-box');
		measurementDiv.style.position = 'absolute';
		measurementDiv.style.visibility = 'hidden';
		measurementDiv.style.left = '-9999px';
		measurementDiv.style.top = '-9999px';
		document.body.appendChild(measurementDiv);
	});

	onDestroy(() => {
		if (measurementDiv && measurementDiv.parentNode) {
			document.body.removeChild(measurementDiv);
		}
	});

	$: latestAiMessage =
		[...currentSession.logs].reverse().find((log) => log.speaker === 'ai')?.text || '......';

	$: messagePages = (() => {
		if (!measurementDiv || !latestAiMessage || !dialogWidth) {
			return ['......'];
		}

		measurementDiv.style.width = `${dialogWidth}px`;

		const computedStyle = window.getComputedStyle(measurementDiv);
		const lineHeight = parseFloat(computedStyle.lineHeight);
		if (isNaN(lineHeight)) {
			return [latestAiMessage];
		}
		const maxHeight = lineHeight * 3;

		const paragraphs = latestAiMessage.trim().split(/\n\n+/);
		const finalPages: string[] = [];

		// ▼▼▼ [ここからが変更箇所] ▼▼▼
		const primaryBreakChars = ['。', '！', '？'];
		const trailingChars = ['。', '」', '）', '！', '？'];

		for (const paragraph of paragraphs) {
			const characters = paragraph.split('');
			let currentPageContent = '';
			let tempContent = '';

			for (let i = 0; i < characters.length; i++) {
				tempContent += characters[i];
				measurementDiv.innerText = tempContent;

				if (measurementDiv.offsetHeight > maxHeight) {
					// --- 3行を超えたので、最適な分割点を探す ---
					let bestSplitIndex = -1;

					// 1. 後方検索: オーバーフロー直前のテキストの末尾から前に向かって、最適な区切り文字を探す
					for (let j = currentPageContent.length - 1; j >= 0; j--) {
						const char = currentPageContent[j];

						// 優先区切り文字かチェック
						if (primaryBreakChars.includes(char)) {
							// 2. 妥当性チェック: その地点で括弧が閉じてるか確認
							const substringToCheck = currentPageContent.substring(0, j + 1);
							const openKakko = (substringToCheck.match(/「/g) || []).length;
							const closeKakko = (substringToCheck.match(/」/g) || []).length;
							const openMaruKakko = (substringToCheck.match(/（/g) || []).length;
							const closeMaruKakko = (substringToCheck.match(/）/g) || []).length;

							if (openKakko <= closeKakko && openMaruKakko <= closeMaruKakko) {
								// 括弧が閉じていれば、ここを最適な分割点とする
								bestSplitIndex = j;
								break; // 最適な点が見つかったのでループを抜ける
							}
						}
					}

					// 3. 分割処理
					if (bestSplitIndex !== -1) {
						// 3a. 句読点が見つかった場合
						// さらに後ろに続く句読点を全て含める
						let finalSplitIndex = bestSplitIndex;
						for (let j = bestSplitIndex + 1; j < currentPageContent.length; j++) {
							if (trailingChars.includes(currentPageContent[j])) {
								finalSplitIndex = j;
							} else {
								break;
							}
						}

						const pageText = currentPageContent.substring(0, finalSplitIndex + 1);
						const remainingText = currentPageContent.substring(finalSplitIndex + 1);
						finalPages.push(pageText);
						tempContent = remainingText + characters[i];
					} else {
						// 3b. 句読点が見つからなかった場合 (フォールバック)
						finalPages.push(currentPageContent);
						tempContent = characters[i];
					}
				}
				currentPageContent = tempContent;
			}

			if (currentPageContent) {
				finalPages.push(currentPageContent);
			}
		}
		// ▲▲▲ [ここまでが変更箇所] ▲▲▲

		return finalPages.length > 0 ? finalPages : [''];
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

<!-- HTMLの部分 (変更なし) -->
<div class="flex h-[100dvh] flex-col bg-gray-800 text-white">
	<!-- Part 1: ヘッダー部分 -->
	<div class="flex-shrink-0 p-4">
		<div class="flex items-center justify-between">
			<a
				href="{base}/"
				class="rounded bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500"
			>
				履歴に戻る
			</a>
			<div class="flex items-center gap-4">
				<a
					href="{base}/settings?from=session/{currentSession.id}"
					class="rounded bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500"
				>
					アプリ設定
				</a>
				<a
					href="{base}/session/{currentSession.id}/settings"
					class="rounded bg-gray-600 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-500"
				>
					セッション設定
				</a>
			</div>
		</div>
	</div>

	<!-- Part 2: 画像表示エリア -->
	<div
		class="relative flex-1 cursor-pointer overflow-hidden"
		role="button"
		tabindex="0"
		on:click={handleNextPage}
		on:keydown={(e) => e.key === 'Enter' && handleNextPage()}
	>
		<img
			src="https://dashing-fenglisu-4c8446.netlify.app/テスト/背景.avif"
			alt="背景"
			class="absolute inset-0 z-10 h-full w-full object-cover"
		/>
		<img
			src="https://dashing-fenglisu-4c8446.netlify.app/テスト/人物.avif"
			alt="人物"
			class="absolute bottom-0 left-1/2 z-20 h-5/6 max-w-full -translate-x-1/2 object-contain"
		/>
	</div>

	<!-- Part 3: ダイアログと入力フォーム -->
	<div class="flex-shrink-0 space-y-3 p-4">
		<!-- ダイアログボックス -->
		<div
			role="button"
			tabindex="0"
			class="dialog-box bg-opacity-50 relative h-32 cursor-pointer rounded-lg border border-gray-600 bg-black p-4"
			on:click={handleNextPage}
			on:keydown={(e) => e.key === 'Enter' && handleNextPage()}
			bind:clientWidth={dialogWidth}
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
				class="input input-bordered flex-1 border-gray-600 bg-gray-700"
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
	/* styleタグ内は変更ありません */
	.dialog-box {
		overflow: hidden;
		line-height: 1.6;
		user-select: none;
		width: 100%;
		text-align: left;
		font-family: inherit;
		color: inherit;
	}

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

	.continue-indicator {
		position: absolute;
		bottom: 10px;
		right: 15px;
		font-size: 1.2rem;
		animation: bounce 1.5s infinite;
	}
	@keyframes bounce {
		0%,
		20%,
		50%,
		80%,
		100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-8px);
		}
		60% {
			transform: translateY(-4px);
		}
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
