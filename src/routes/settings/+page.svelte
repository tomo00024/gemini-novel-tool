<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import { appSettings } from '$lib/stores';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';
	import { availableModels } from '$lib/utils';

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

		<!-- AIモデル選択 -->
		<div class="space-y-2">
			<label for="model-select" class="block font-medium">AIモデル</label>
			<select
				id="model-select"
				bind:value={$appSettings.model}
				class="w-full max-w-md rounded border bg-white p-2"
			>
				{#each availableModels as model}
					<option value={model}>{model}</option>
				{/each}
			</select>
			<p class="text-sm text-gray-600">
				チャットで使用するAIモデルを選択します。選択は自動的に保存されます。
			</p>
		</div>

		<div class="space-y-2">
			<label for="system-prompt" class="block font-medium">システムプロンプト</label>
			<div class="flex items-center space-x-2">
				<input
					id="system-prompt-enabled"
					type="checkbox"
					bind:checked={$appSettings.systemPrompt.isEnabled}
					class="h-4 w-4 rounded"
				/>
				<label for="system-prompt-enabled" class="text-sm">有効にする</label>
			</div>
			<textarea
				id="system-prompt"
				rows="4"
				bind:value={$appSettings.systemPrompt.text}
				class="w-full max-w-md rounded border p-2 disabled:bg-gray-100"
				placeholder="AIの役割や応答のトーンなどを設定します..."
				disabled={!$appSettings.systemPrompt.isEnabled}
			></textarea>
			<p class="text-sm text-gray-600">
				（未実装）AIへの基本的な指示を定義します。入力すると自動的に保存されます。
			</p>
		</div>

		<div class="space-y-2">
			<label for="dummy-user-prompt" class="block font-medium">ダミーユーザープロンプト</label>
			<div class="flex items-center space-x-2">
				<input
					id="dummy-user-prompt-enabled"
					type="checkbox"
					bind:checked={$appSettings.dummyUserPrompt.isEnabled}
					class="h-4 w-4 rounded"
				/>
				<label for="dummy-user-prompt-enabled" class="text-sm">有効にする</label>
			</div>
			<textarea
				id="dummy-user-prompt"
				rows="2"
				bind:value={$appSettings.dummyUserPrompt.text}
				class="w-full max-w-md rounded border p-2 disabled:bg-gray-100"
				placeholder="直近のダミー入力..."
				disabled={!$appSettings.dummyUserPrompt.isEnabled}
			></textarea>
			<p class="text-sm text-gray-600">
				ユーザー入力の直後に続く、ユーザー側の直近の発言としてダミーで入力します。入力すると自動的に保存されます。
			</p>
		</div>
	</div>
</div>
