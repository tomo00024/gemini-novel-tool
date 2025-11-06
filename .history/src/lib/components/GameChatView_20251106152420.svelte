<!-- src/lib/components/GameChatView.svelte -->

<script lang="ts">
	import { derived } from 'svelte/store';

	// 親コンポーネントから渡されるデータと関数
	export let currentSession: any;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;

	// --- テキストページ送り機能のためのリアクティブな処理 ---

	// 1. 表示すべき最新のAIのメッセージを抽出する
	const latestAiMessage = derived(
		currentSession,
		($currentSession) =>
			[...$currentSession.logs].reverse().find((log) => log.speaker === 'ai')?.text ||
			'......' // AIの最初のメッセージがない場合はプレースホルダー
	);

	// 2. メッセージが変更されたら、テキストを3行ごとの「ページ」に分割する
	const messagePages = derived(latestAiMessage, ($latestAiMessage) => {
		// テキストを行ごとに分割
		const lines = $latestAiMessage.split('\n');
		const pages = [];
		// 3行を1ページとしてまとめる
		for (let i = 0; i < lines.length; i += 3) {
			pages.push(lines.slice(i, i + 3).join('\n'));
		}
		return pages;
	});

	// 3. 現在表示しているページ番号を管理する
	let currentPageIndex = 0;

	// 4. セッションのログが更新されたら、ページ番号を先頭(0)に戻す
	$: if ($currentSession.logs) {
		currentPageIndex = 0;
	}

	// --- イベントハンドラ ---

	/**
	 * メッセージウィンドウがクリックされたときに呼び出される
	 */
	function handleNextPage() {
		// まだ続きのページがある場合のみ、ページ番号を進める
		if (currentPageIndex < $messagePages.length - 1) {
			currentPageIndex++;
		}
	}

	// 表示するテキストがまだ残っているかどうか
	$: hasMorePages = currentPageIndex < $messagePages.length - 1;
</script>

<!-- ▼▼▼ ここからがゲーム風UIのHTML構造 ▼▼▼ -->
<div class="flex flex-col h-screen bg-gray-800 text-white">
	<!-- 1. 上部: ビジュアルエリア (将来のための空きスペース) -->
	<div class="flex-grow">
		<!-- 将来ここにキャラクター画像などを表示 -->
	</div>

	<!-- 2. 下部: ダイアログエリア -->
	<div class="flex-none p-4 space-y-3">
		<!-- 2-A. メッセージ表示ウィンドウ -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="dialog-box h-32 p-4 bg-black bg-opacity-50 rounded-lg border border-gray-600 cursor-pointer relative"
			on:click={handleNextPage}
		>
			{#if $messagePages[currentPageIndex]}
				<p class="whitespace-pre-wrap">{$messagePages[currentPageIndex]}</p>
			{/if}

			<!-- 「続きを読む」アイコン -->
			{#if hasMorePages}
				<div class="continue-indicator">▼</div>
			{/if}
		</div>

		<!-- 2-B. 入力フォーム -->
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
		/* テキストがはみ出た場合に隠す */
		overflow: hidden;
		line-height: 1.6;
		/* ユーザーがテキストを選択できないようにして、クリック操作を快適にする */
		user-select: none; 
	}

	.continue-indicator {
		position: absolute;
		bottom: 10px;
		right: 15px;
		font-size: 1.2rem;
		/* アニメーションで点滅させる */
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

	/* 標準UIから持ってきたスタイル */
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