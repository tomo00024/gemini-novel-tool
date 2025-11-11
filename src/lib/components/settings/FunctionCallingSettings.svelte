<!-- src/lib/components/settings/FunctionCallingSettings.svelte -->
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
			<h2 class="text-lg font-semibold">Function Callingモード（開発中）</h2>
			<p class="text-sm text-gray-600">より複雑な対話フローを実現するためのモードです。</p>
		</div>
		<input
			type="radio"
			name="session-mode"
			value="twoStepFC"
			checked={apiMode === 'twoStepFC'}
			on:change={onModeChange}
		/>
	</label>
	{#if apiMode === 'twoStepFC'}
		<div class="mt-4 border-t pt-4">
			<p class="text-sm text-gray-500">TwoStepFC用の設定項目はまだありません。</p>
		</div>
	{/if}
</div>
