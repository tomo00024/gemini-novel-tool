<!-- src/lib/components/global_settings/AccountSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { signIn, signOut } from '@auth/sveltekit/client';
	import Section from '$lib/components/ui/Section.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';

	let driveSyncEnabled = false;
</script>

<!-- アカウント連携 -->
<Section title="アカウント連携">
	{#if $page.data.session}
		<div class="space-y-3 text-sm">
			<p>
				✓ <span class="font-medium">{$page.data.session.user?.email}</span> としてログイン中
			</p>
			<Button on:click={() => signOut()}>ログアウト</Button>
		</div>
		<div class="space-y-3 border-t border-gray-600 pt-4">
			<h3 class="font-bold text-red-600">アカウントの削除 (退会)</h3>
			<p class="text-sm text-gray-400">
				アカウントを削除すると、サーバーにアップロードしたすべてのセッション履歴が完全に削除され、元に戻すことはできません。
			</p>
			<Button variant="danger">アカウントを完全に削除する</Button>
		</div>
	{:else}
		<div class="space-y-3">
			<Button variant="blue" on:click={() => signIn('google')}>Googleアカウントでログイン</Button>
			<p class="text-sm text-gray-400">
				ログインすると、セッション履歴をWeb上に公開して共有したり、Google
				Driveへ自動でバックアップしたりできるようになります。
			</p>
		</div>
	{/if}
</Section>

<!-- データ管理 -->
<Section title="データ管理">
	<!-- Google Drive 連携 -->
	<div class="space-y-2">
		<h3 class="font-bold">Google Drive 連携</h3>
		<Toggle
			id="drive-sync-enabled"
			disabled={!$page.data.session}
			label="Google Driveへの自動バックアップを有効にする"
			bind:checked={driveSyncEnabled}
		/>

		{#if !$page.data.session}
			<p class="pl-6 text-sm text-gray-400">
				この機能を利用するには、まずGoogleアカウントでログインしてください。
			</p>
		{:else}
			<div class="pl-6">
				<p class="text-sm">最終同期: 5分前</p>
				<Button class="mt-2">今すぐ同期</Button>
			</div>
		{/if}
	</div>

	<!-- 手動バックアップ -->
	<div class="space-y-2 border-t border-gray-600 pt-4">
		<h3 class="font-bold">手動バックアップ</h3>
		<div class="flex flex-wrap gap-2">
			<Button class="bg-green-200 text-green-800 hover:bg-green-300">
				セッション履歴をJSON出力
			</Button>
			<Button class="bg-green-200 text-green-800 hover:bg-green-300">
				セッション履歴をJSON読込
			</Button>
		</div>
		<p class="text-sm text-gray-400">セッション履歴をJSONファイルで手動でバックアップします。</p>
	</div>
</Section>

<!-- 破壊的変更 -->
<section class="space-y-4 border-t border-red-200 pt-4">
	<h2 class="text-lg font-bold text-red-600">破壊的変更</h2>
	<div class="flex flex-wrap gap-2">
		<Button variant="danger">セッション履歴の破棄</Button>
		<Button variant="danger">すべて破棄して初期化</Button>
	</div>
</section>
