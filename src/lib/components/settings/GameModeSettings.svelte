<!-- src/lib/components/settings/GameModeSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';

	export let currentSession: Readable<Session | undefined>;
	export let onModeChange: (event: Event) => void;

	const sessionId = derived(page, ($page) => $page.params.id);
	const session = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	function handleGameViewSettingChange(field: 'imageBaseUrl' | 'imageExtension', event: Event) {
		const newValue = (event.target as HTMLInputElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.gameViewSettings) {
				sessionToUpdate.gameViewSettings[field] = newValue;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

<div class="rounded-lg border p-4">
	<label class="flex cursor-pointer items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold">ゲーム風モード</h2>
			<p class="text-sm text-gray-600">チャット画面の見た目をゲーム風に切り替えます。</p>
		</div>
		<input
			type="radio"
			name="session-mode"
			value="game"
			checked={$currentSession?.viewMode === 'game'}
			on:change={onModeChange}
		/>
	</label>

	{#if $currentSession?.viewMode === 'game' && $session?.gameViewSettings}
		<div class="mt-4 space-y-6 border-t pt-4">
			<!-- 画像設定 -->
			<div class="space-y-4">
				<h3 class="font-medium">画像設定</h3>
				<div>
					<label for="image-base-url" class="mb-1 block text-sm text-gray-700">画像ベースURL</label>
					<input
						id="image-base-url"
						type="text"
						class="input input-bordered w-full"
						placeholder="https://..."
						value={$session.gameViewSettings.imageBaseUrl}
						on:input={(e) => handleGameViewSettingChange('imageBaseUrl', e)}
					/>
				</div>
				<div>
					<label for="image-extension" class="mb-1 block text-sm text-gray-700">画像拡張子</label>
					<input
						id="image-extension"
						type="text"
						class="input input-bordered w-full"
						placeholder=".avif, .webp, .png など"
						value={$session.gameViewSettings.imageExtension}
						on:input={(e) => handleGameViewSettingChange('imageExtension', e)}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>
