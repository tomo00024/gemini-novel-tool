<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import { appSettings } from '$lib/stores';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';
	import { availableModels } from '$lib/utils'; // [追加] 選択可能なモデルのリストをインポート

	const returnPath = derived(page, ($page) => {
		const from = $page.url.searchParams.get('from');
		if (from && from.startsWith('session/')) {
			return {
				href: `${base}/${from}`,
				label: 'セッションに戻る'
			};
		}
		return {
			href: `${base}/`,
			label: '履歴に戻る'
		};
	});
</script>

<div class="flex h-screen flex-col p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">アプリ設定</h1>
		<a
			href={$returnPath.href}
			class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		>
			{$returnPath.label}
		</a>
	</div>

	<!-- [変更] 設定項目全体をdivで囲み、項目間のスペースを調整 -->
	<div class="space-y-6">
		<!-- APIキー設定 -->
		<div class="space-y-2">
			<label for="api-key" class="block font-medium">API Key</label>
			<input
				id="api-key"
				type="password"
				bind:value={$appSettings.apiKey}
				class="w-full max-w-md rounded border p-2"
				placeholder="sk-..."
			/>
			<p class="text-sm text-gray-600">
				APIキーはブラウザ内にのみ保存されます。入力すると自動的に保存されます。
			</p>
		</div>

		<!-- [ここから追加] AIモデル選択 -->
		<div class="space-y-2">
			<label for="model-select" class="block font-medium">AIモデル</label>
			<select
				id="model-select"
				bind:value={$appSettings.model}
				class="w-full max-w-md rounded border bg-white p-2"
			>
				{#each availableModels as [modelId, modelName]}
					<option value={modelId}>{modelName}</option>
				{/each}
			</select>
			<p class="text-sm text-gray-600">
				チャットで使用するAIモデルを選択します。選択は自動的に保存されます。
			</p>
		</div>
		<!-- [ここまで追加] -->
	</div>
</div>
