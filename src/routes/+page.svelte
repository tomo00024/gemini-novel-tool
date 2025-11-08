<!-- src/routes/+page.svelte -->

<script lang="ts">
	import { sessions } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createNewSession } from '$lib/utils';

	/**
	 * 「新しいセッションを開始」ボタンがクリックされたときに実行される関数
	 */
	function handleNewSession(): void {
		// ★★★ 複雑なオブジェクト作成ロジックを、ヘルパー関数の呼び出しに置き換え ★★★
		const newSession = createNewSession();

		// sessionsストアを更新する
		sessions.update((currentSessions) => [...currentSessions, newSession]);

		// 新しく作成したセッションの対話画面へ遷移
		goto(`${base}/session/${newSession.id}`);
	}
</script>

<div class="flex h-screen flex-col p-4">
	<!-- ▼▼▼ ここからヘッダーの修正 ▼▼▼ -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">履歴画面</h1>
		<div class="flex items-center gap-4">
			<a
				href="{base}/settings"
				class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
			>
				アプリ設定
			</a>
			<button
				on:click={handleNewSession}
				class="rounded bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
			>
				新しいセッションを開始
			</button>
		</div>
	</div>
	<!-- ▲▲▲ ここまでヘッダーの修正 ▲▲▲ -->

	{#if $sessions.length === 0}
		<p class="text-gray-500">
			まだセッションがありません。「新しいセッションを開始」ボタンから始めましょう。
		</p>
	{:else}
		<ul class="space-y-3">
			{#each [...$sessions].reverse() as session (session.id)}
				<li>
					<a
						href="{base}/session/{session.id}"
						class="block rounded-lg bg-white p-4 shadow transition-colors hover:bg-gray-100"
					>
						<div class="text-sm text-gray-600">
							最終更新: {new Date(session.lastUpdatedAt).toLocaleString('ja-JP')}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
