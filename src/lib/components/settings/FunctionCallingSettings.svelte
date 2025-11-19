<!-- src/lib/components/settings/FunctionCallingSettings.svelte -->
<script lang="ts">
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';
	import Section from '$lib/components/ui/Section.svelte';

	export let currentSession: Readable<Session | undefined>;
	export let onModeChange: (event: Event) => void;

	const apiMode = $currentSession?.featureSettings.apiMode;
</script>

<Section title="Function Callingモード（開発中）">
	<label
		class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-600 p-4 hover:bg-gray-800"
	>
		<div>
			<p class="text-sm text-gray-400">より複雑な対話フローを実現するためのモードです。</p>
		</div>
		<input
			type="radio"
			name="session-mode"
			value="twoStepFC"
			class="h-4 w-4"
			checked={apiMode === 'twoStepFC'}
			on:change={onModeChange}
		/>
	</label>
	{#if apiMode === 'twoStepFC'}
		<div class="mt-4 border-t border-gray-600 pt-4">
			<p class="text-sm text-gray-500">TwoStepFC用の設定項目はまだありません。</p>
		</div>
	{/if}
</Section>
