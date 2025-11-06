<!-- src/routes/settings/+page.svelte -->

<script lang="ts">
	import { base } from '$app/paths';
	import { appSettings } from '$lib/stores';

	function saveApiKey() {
		alert('APIキーを保存しました！');
	}
</script>

<div class="p-4 max-w-2xl mx-auto">
	<!-- ▼▼▼ ここからヘッダーの修正 ▼▼▼ -->
	<!-- セッション画面のヘッダー構造とスタイルに合わせて修正 -->
	<div class="flex justify-between items-center mb-4">
		<a href="{base}/" class="text-blue-500 hover:underline">&larr; 履歴に戻る</a>
		<!-- この画面では右側に配置するボタンがないため、<a>タグのみ配置します -->
	</div>

	<h1 class="text-2xl font-bold mb-6">アプリ設定</h1>
	<!-- ▲▲▲ ここまでヘッダーの修正 ▲▲▲ -->

	<div class="space-y-2">
		<label for="api-key" class="block font-medium">API Key</label>
		<!--
			bind:valueでストアの値（$appSettings.apiKey）に直接バインドします。
			これにより、入力フィールドの変更が即座にストアに反映されます。
		-->
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
		<!--
			入力値は既にストアにバインドされているため、このボタンは実質的に
			「保存しました」とユーザーに通知する役割になります。
			もし入力のたびに自動保存で良いなら、このボタン自体が不要になる可能性もあります。
		-->
		<button on:click={saveApiKey} class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
			保存
		</button>
	</div>

	<!-- ▼▼▼ ヘッダーに戻るリンクを統一したため、冗長なこのリンクは削除します ▼▼▼ -->
	<!-- 
	<div class="mt-8">
		<a href="{base}/" class="text-blue-500 hover:underline">&larr; 履歴画面に戻る</a>
	</div>
	-->
</div>