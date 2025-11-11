<!-- src/lib/components/settings/StandardMode.svelte -->
<script lang="ts">
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';

	export let currentSession: Readable<Session | undefined>;
	export let onModeChange: (event: Event) => void;

	const apiMode = $currentSession?.featureSettings.apiMode;
</script>

<div class="rounded-lg border p-4">
	<label class="flex cursor-pointer items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold">通常モード</h2>
			<p class="text-sm text-gray-600">標準的なチャットモードです。</p>
		</div>
		<input
			type="radio"
			name="session-mode"
			value="standard"
			checked={$currentSession?.viewMode === 'standard' && apiMode === 'standard'}
			on:change={onModeChange}
		/>
	</label>
</div>
