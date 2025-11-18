<!-- src/lib/components/PublishModal.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { appSettings } from '$lib/stores';

	export let busy = false;
	export let initialTitle = '';

	// 親コンポーネントにイベントを伝えるための仕組み
	const dispatch = createEventDispatcher();

	// --- フォームの入力値を保持する変数 ---
	let title = initialTitle;
	let description = '';
	let imageUrl = '';
	let expiresAt = '';
	// appSettingsストアから読み込んだ前回の作者名で初期化する
	let authorName = $appSettings.lastUsedAuthorName || '';
	// 公開範囲をこのコンポーネント内で管理する
	let contentScope: 'template' | 'full' | null = null;

	let modalElement: HTMLDivElement;

	onMount(() => {
		modalElement?.focus();
	});

	/**
	 * 「公開」ボタンが押されたときの処理
	 */
	function handleSubmit() {
		// タイトルと公開範囲が選択されていること、処理中でないことを確認
		if (!title || !contentScope || busy) return;

		dispatch('submit', {
			title,
			description,
			imageUrl: imageUrl || null,
			expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
			authorName: authorName || null,
			// 選択された公開範囲もイベントに含める
			contentScope
		});
	}

	/**
	 * キャンセル処理
	 */
	function handleCancel() {
		dispatch('close');
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions, a11y-click-events-have-key-events -->
<div
	class="bg-opacity-60 fixed inset-0 z-50 flex items-center justify-center bg-black"
	on:click={handleCancel}
>
	<div
		bind:this={modalElement}
		tabindex="-1"
		class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl outline-none"
		on:click|stopPropagation
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<h2 id="modal-title" class="text-xl font-bold text-gray-800">セッションの公開</h2>
		<p class="mt-2 text-sm text-gray-600">
			公開する情報の範囲を選択し、サーバーに登録する情報を入力してください。
		</p>

		<!-- 1. 公開範囲の選択 -->
		<div class="mt-4 space-y-4">
			<h3 class="text-base font-semibold text-gray-800">1. 公開範囲の選択 *</h3>
			<label class="flex cursor-pointer items-start rounded-lg border p-4 transition hover:bg-gray-50">
				<input
					type="radio"
					name="publish-scope"
					value="template"
					class="mt-1 mr-4 h-5 w-5"
					bind:group={contentScope}
				/>
				<div>
					<span class="font-semibold text-gray-800">テンプレートのみ公開</span>
					<p class="mt-1 text-sm text-gray-600">
						最初のプロンプトとAIの最初の応答、セッション設定を公開します。
					</p>
				</div>
			</label>
			<label class="flex cursor-pointer items-start rounded-lg border p-4 transition hover:bg-gray-50">
				<input
					type="radio"
					name="publish-scope"
					value="full"
					class="mt-1 mr-4 h-5 w-5"
					bind:group={contentScope}
				/>
				<div>
					<span class="font-semibold text-gray-800">すべての会話履歴を公開</span>
					<p class="mt-1 text-sm text-gray-600">
						設定、プロンプト、そしてすべてのAIとの会話履歴を公開します。
					</p>
					<div
						class="mt-2 rounded border-l-4 border-yellow-400 bg-yellow-50 p-2 text-sm text-yellow-800"
					>
						<strong class="font-bold">⚠️【注意】</strong>
						個人情報や機密情報が含まれていないか内容をよく確認してください。
					</div>
				</div>
			</label>
		</div>

		<!-- 2. 公開情報の入力 -->
		<div class="mt-6 space-y-4">
			<h3 class="text-base font-semibold text-gray-800">2. 公開情報の入力</h3>
			<div>
				<label for="title" class="block text-sm font-medium text-gray-700">タイトル *</label>
				<input
					type="text"
					id="title"
					bind:value={title}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					required
				/>
			</div>
			<div>
				<label for="authorName" class="block text-sm font-medium text-gray-700">作者名</label>
				<input
					type="text"
					id="authorName"
					bind:value={authorName}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					placeholder="公開される名前 (空欄可)"
				/>
			</div>
			<div>
				<label for="description" class="block text-sm font-medium text-gray-700">説明文</label>
				<textarea
					id="description"
					bind:value={description}
					rows="3"
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				></textarea>
			</div>
			<div>
				<label for="imageUrl" class="block text-sm font-medium text-gray-700">画像URL</label>
				<input
					type="url"
					id="imageUrl"
					bind:value={imageUrl}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					placeholder="https://example.com/image.png"
				/>
			</div>
			<div>
				<label for="expiresAt" class="block text-sm font-medium text-gray-700">有効期限</label>
				<input
					type="datetime-local"
					id="expiresAt"
					bind:value={expiresAt}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				/>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<button
				on:click={handleCancel}
				class="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
			>
				キャンセル
			</button>
			<button
				on:click={handleSubmit}
				disabled={!title || !contentScope || busy}
				class="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
			>
				{#if busy}処理中...{:else}同意して公開{/if}
			</button>
		</div>
	</div>
</div>