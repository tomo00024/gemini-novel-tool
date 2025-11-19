<!-- src/lib/components/PublishModal.svelte -->

<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { appSettings } from '$lib/stores';
	// ▼ 追加: 必要なutilsとコンポーネントをインポート
	import { availableModels } from '$lib/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	export let busy = false;
	export let initialTitle = '';

	const dispatch = createEventDispatcher();

	let title = initialTitle;
	let description = '';
	let imageUrl = '';
	let expiresAt = '';
	let authorName = $appSettings.lastUsedAuthorName || '';
	let contentScope: 'template' | 'full' | null = null;

	// ▼ 追加: モデル選択用の変数（初期値は現在の設定または空）
	let model = $appSettings.model || '';

	// ▼ 追加: 設定画面と同じロジックでモデルリストを生成
	$: selectableModels =
		$appSettings.availableModelList && $appSettings.availableModelList.length > 0
			? $appSettings.availableModelList.map((m) =>
					typeof m === 'string' ? m.replace(/^models\//, '') : String(m)
				)
			: availableModels;

	let modalElement: HTMLDivElement;

	onMount(() => {
		modalElement?.focus();
	});

	function handleSubmit() {
		if (!title || !contentScope || busy) return;

		dispatch('submit', {
			title,
			description,
			imageUrl: imageUrl || null,
			expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
			authorName: authorName || null,
			contentScope,
			model // ▼ 追加: 送信データにモデルを含める
		});
	}

	function handleCancel() {
		dispatch('close');
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions, a11y-click-events-have-key-events -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
	on:click={handleCancel}
>
	<div
		bind:this={modalElement}
		tabindex="-1"
		class="w-full max-w-2xl rounded-lg bg-app-bg p-6 shadow-xl outline-none"
		on:click|stopPropagation
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<h2 id="modal-title" class="text-xl font-bold text-gray-200">セッションの公開</h2>

		<!-- 1. 公開範囲の選択 -->
		<div class="mt-4 space-y-4">
			<h3 class="text-base font-semibold text-gray-200">1. 公開範囲の選択 *</h3>
			<label
				class="flex cursor-pointer items-start rounded-lg border border-gray-700 p-4 transition hover:bg-gray-800/50"
				class:bg-gray-800={contentScope === 'template'}
			>
				<input
					type="radio"
					name="publish-scope"
					value="template"
					class="mt-1 mr-4 h-5 w-5 accent-green-500"
					bind:group={contentScope}
				/>
				<div>
					<span class="font-semibold text-gray-200">テンプレートのみ公開</span>
					<p class="mt-1 text-sm text-gray-400">
						最初のプロンプトとAIの最初の応答、セッション設定を公開します。
					</p>
				</div>
			</label>
			<label
				class="flex cursor-pointer items-start rounded-lg border border-gray-700 p-4 transition hover:bg-gray-800/50"
				class:bg-gray-800={contentScope === 'full'}
			>
				<input
					type="radio"
					name="publish-scope"
					value="full"
					class="mt-1 mr-4 h-5 w-5 accent-green-500"
					bind:group={contentScope}
				/>
				<div>
					<span class="font-semibold text-gray-200">すべての会話履歴を公開</span>
					<p class="mt-1 text-sm text-gray-400">
						設定、プロンプト、そしてすべてのAIとの会話履歴を公開します。
					</p>
					<div
						class="mt-2 rounded border-l-4 border-yellow-600 bg-yellow-900/30 p-2 text-sm text-yellow-200"
					>
						<strong class="font-bold">⚠️【注意】</strong>
						個人情報や機密情報が含まれていないか内容をよく確認してください。
					</div>
				</div>
			</label>
		</div>

		<!-- 2. 公開情報の入力 -->
		<div class="mt-6 space-y-4">
			<h3 class="text-base font-semibold text-gray-200">2. 公開情報の入力</h3>

			<div>
				<label for="title" class="mb-1 block text-sm font-medium text-gray-200">タイトル *</label>
				<Input type="text" id="title" bind:value={title} class="w-full" required />
			</div>

			<!-- ▼ 追加: モデル選択UI -->
			<div>
				<label for="model" class="mb-1 block text-sm font-medium text-gray-200">使用モデル</label>
				<Select id="model" bind:value={model} options={selectableModels} class="w-full" />
			</div>

			<div>
				<label for="authorName" class="mb-1 block text-sm font-medium text-gray-200">作者名</label>
				<Input
					type="text"
					id="authorName"
					bind:value={authorName}
					class="w-full"
					placeholder="公開される名前 (空欄可)"
				/>
			</div>
			<div>
				<label for="description" class="mb-1 block text-sm font-medium text-gray-200">説明文</label>
				<Textarea id="description" bind:value={description} rows={3} class="w-full" />
			</div>
			<div>
				<label for="imageUrl" class="mb-1 block text-sm font-medium text-gray-200">画像URL</label>
				<Input
					type="url"
					id="imageUrl"
					bind:value={imageUrl}
					class="w-full"
					placeholder="https://example.com/image.png"
				/>
			</div>
			<div>
				<label for="expiresAt" class="mb-1 block text-sm font-medium text-gray-200">有効期限</label>
				<input
					type="datetime-local"
					id="expiresAt"
					bind:value={expiresAt}
					class="w-full rounded-lg border border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-200 focus:outline-none"
				/>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" on:click={handleCancel}>キャンセル</Button>
			<Button variant="primary" on:click={handleSubmit} disabled={!title || !contentScope || busy}>
				{#if busy}処理中...{:else}同意して公開{/if}
			</Button>
		</div>
	</div>
</div>
