<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import { appSettings } from '$lib/stores';
	// ▼▼▼ [変更点] pageストアとderivedをインポート ▼▼▼
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';

	// ▼▼▼ [変更点] URLのクエリパラメータを元に戻り先のパスとラベルを決定する ▼▼▼
	const returnPath = derived(page, ($page) => {
		const from = $page.url.searchParams.get('from');
		// クエリに'session/...'という情報があれば、セッション画面に戻るリンクを生成
		if (from && from.startsWith('session/')) {
			return {
				href: `${base}/${from}`,
				label: 'セッションに戻る'
			};
		}
		// デフォルトは履歴画面に戻る
		return {
			href: `${base}/`,
			label: '履歴画面'
		};
	});

	function saveApiKey() {
		alert('APIキーを保存しました！');
	}
</script>

<div class="p-4 max-w-2xl mx-auto">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold">アプリ設定</h1>
		<!-- ▼▼▼ [変更点] aタグのhrefとテキストを動的に設定 ▼▼▼ -->
		<a
			href={$returnPath.href}
			class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
		>
			{$returnPath.label}
		</a>
		<!-- ▲▲▲ ここまで ▲▲▲ -->
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
		<p class="text-sm text-gray-600">APIキーはブラウザ内にのみ保存されます。</p>
	</div>

	<div class="mt-4">
		<button on:click={saveApiKey} class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
			保存
		</button>
	</div>
</div>