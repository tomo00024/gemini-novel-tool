<!-- src/lib/components/GameChatView.svelte -->

<script lang="ts">
	import type { Session } from '$lib/types';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { onMount, onDestroy } from 'svelte';
	import {
		processMessageIntoPages,
		type PageData,
		type ProcessedMessage
	} from '$lib/utils/messageProcessor';

	export let currentSession: Session;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;
	export let base: string;

	let currentBackgroundUrl = '';
	let currentCharacterUrl = '';
	let currentPageIndex = 0;
	let dialogWidth: number;
	let measurementDiv: HTMLDivElement | null = null;
	let processedMessage: ProcessedMessage;

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

	// AIのメッセージが変更されたら、ページ分割とメタデータ抽出を再実行
	$: processedMessage = (() => {
		if (!measurementDiv || !latestAiMessage || !dialogWidth) {
			return { pages: [{ text: '......' }], statusUpdates: {} };
		}

		const computedStyle = window.getComputedStyle(measurementDiv);
		const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
		const maxHeight = lineHeight * 3;

		measurementDiv.style.width = `${dialogWidth}px`;

		const measureTextHeight = (text: string): number => {
			if (!measurementDiv) return 0;
			measurementDiv.innerText = text;
			return measurementDiv.offsetHeight;
		};

		const imageBaseUrl =
			currentSession.gameViewSettings?.imageBaseUrl ??
			'https://dashing-fenglisu-4c8446.netlify.app';
		const imageExtension = currentSession.gameViewSettings?.imageExtension ?? '.avif';

		return processMessageIntoPages(latestAiMessage, {
			maxHeight: maxHeight,
			measureTextHeight: measureTextHeight,
			imageBaseUrl: imageBaseUrl,
			imageExtension: imageExtension
		});
	})();

	// processedMessageから各データを抽出する
	$: messagePageData = processedMessage.pages;

	// 画像URLを更新するロジック
	$: if (latestAiMessage && messagePageData.length > 0) {
		currentPageIndex = 0;

		const defaultBaseUrl =
			currentSession.gameViewSettings?.imageBaseUrl ??
			'https://dashing-fenglisu-4c8446.netlify.app';
		const defaultExtension = currentSession.gameViewSettings?.imageExtension ?? '.avif';
		const defaultBgUrl = `${defaultBaseUrl}/テスト/背景${defaultExtension}`;
		const defaultCharUrl = `${defaultBaseUrl}/テスト/人物${defaultExtension}`;

		currentBackgroundUrl = messagePageData[0]?.backgroundUrl || defaultBgUrl;
		currentCharacterUrl = messagePageData[0]?.characterUrl || defaultCharUrl;
	}

	// ページ送り時の画像更新ロジック
	$: if (currentPageIndex > 0 && messagePageData[currentPageIndex]) {
		const pageData = messagePageData[currentPageIndex];
		if (pageData.backgroundUrl) {
			currentBackgroundUrl = pageData.backgroundUrl;
		}
		if (pageData.characterUrl) {
			currentCharacterUrl = pageData.characterUrl;
		}
	}

	// 算出プロパティとイベントハンドラ
	$: messagePages = messagePageData.map((p) => p.text);
	$: hasMorePages = currentPageIndex < messagePages.length - 1;

	function handleNextPage() {
		if (hasMorePages) {
			currentPageIndex++;
		}
	}
</script>

<div class="flex h-[100dvh] flex-col bg-gray-800 text-white">
	<!-- ヘッダー部分 -->
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

	<div
		class="flex flex-shrink-0 flex-wrap justify-end gap-x-4 gap-y-1 px-4 pb-2 text-lg font-semibold"
	>
		{#if currentSession.customStatuses}
			{#each currentSession.customStatuses as status}
				{#if status.isVisible}
					<div class="bg-opacity-30 rounded-md bg-black px-3 py-1">
						<span>{status.name}: {status.currentValue}</span>
					</div>
				{/if}
			{/each}
		{/if}
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
			src={currentBackgroundUrl}
			alt="背景"
			class="absolute inset-0 z-10 h-full w-full object-cover"
		/>
		<img
			src={currentCharacterUrl}
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
