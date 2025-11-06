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
	<!-- 履歴画面のヘッダー構造に合わせて修正 -->
	<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-6">
		<!-- 左側の空スペース -->
		 		<div class="">
			<a
				href="{base}/"
				class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
			>
				&larr; 履歴に戻る
			</a>
		</div>
		<!-- 中央のタイトル -->
		<h1 class="text-2xl font-bold text-center">アプリ設定</h1>

		<!-- 右側の戻るリンク -->
	<div></div>
	</div>
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
</div>