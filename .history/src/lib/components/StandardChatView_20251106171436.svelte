<!-- src/lib/components/StandardChatView.svelte -->

<script lang="ts">
	import { marked } from 'marked'; // markedをインポート

	export let currentSession: any;
	export let base: string;
	export let isLoading: boolean;
	export let userInput: string;
	export let handleSubmit: () => Promise<void>;
</script>

<div class="flex flex-col h-screen p-4">
	<!-- ヘッダー部分は変更なし -->
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

	<div class="flex-1 overflow-y-auto mb-4 space-y-4 p-2 bg-gray-100 rounded">
		{#each currentSession.logs as message (message.timestamp)}
			<div class="chat {message.speaker === 'user' ? 'chat-end' : 'chat-start'}">
				<div class="chat-bubble {message.speaker === 'user' ? 'chat-bubble-primary' : ''}">
					<!-- 変更箇所：markedと{@html}を使用してMarkdownをレンダリング -->
					<!-- proseクラスを追加して、@tailwindcss/typographyのスタイルを適用 -->
					<div class="prose max-w-none">
						{@html marked(message.text)}
					</div>
				</div>
			</div>
		{/each}

		{#if isLoading}
			<div class="chat chat-start">
				<div class="chat-bubble">考え中...</div>
			</div>
		{/if}
	</div>

	<!-- フォーム部分は変更なし -->
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

<style>
	/* styleタグの中身は変更ありません */
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
	/* proseスタイルがprimaryの文字色を上書きしないように調整 */
	.chat-bubble-primary :global(.prose) {
		color: white;
	}
	/* リンクなどの色も調整 */
	.chat-bubble-primary :global(.prose a),
	.chat-bubble-primary :global(.prose strong) {
		color: white;
	}
	.chat-bubble-primary :global(.prose code) {
		color: #e5e7eb;
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