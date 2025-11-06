<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import { appSettings } from '$lib/stores';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';

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

<div class="flex flex-col h-screen p-4">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold">アプリ設定</h1>
		<a
			href={$returnPath.href}
			class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
		>
			{$returnPath.label}
		</a>
	</div>

	<div class="space-y-2">
		<label for="api-key" class="block font-medium">API Key</label>
		<input
			id="api-key"
			type="password"
			bind:value={$appSettings.apiKey}
			class="w-full max-w-md p-2 border rounded"
			placeholder="sk-..."
		/>
		<p class="text-sm text-gray-600">
			APIキーはブラウザ内にのみ保存されます。入力すると自動的に保存されます。
		</p>
	</div>
</div>