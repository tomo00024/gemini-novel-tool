<!-- src/lib/components/settings/StandardMode.svelte -->
<script lang="ts">
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';
	import Section from '$lib/components/ui/Section.svelte';

	export let currentSession: Readable<Session | undefined>;
	export let onModeChange: (event: Event) => void;

	const apiMode = $currentSession?.featureSettings.apiMode;
</script>

<Section title="通常モード">
	<label
		class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-600 p-4 hover:bg-gray-800"
	>
		<div>
			<p class="text-sm text-gray-400">標準的なチャットモードです。</p>
		</div>
		<input
			type="radio"
			name="session-mode"
			value="standard"
			class="h-4 w-4"
			checked={$currentSession?.viewMode === 'standard' && apiMode === 'standard'}
			on:change={onModeChange}
		/>
	</label>
</Section>
