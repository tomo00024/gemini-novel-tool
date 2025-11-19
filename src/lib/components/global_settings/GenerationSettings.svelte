<!-- src/lib/components/global_settings/GenerationSettings.svelte -->
<script lang="ts">
	import { appSettings } from '$lib/stores';
	import Section from '$lib/components/ui/Section.svelte';
	import Input from '$lib/components/ui/Input.svelte';
</script>

<Section title="生成パラメータ設定">
	<div class="grid max-w-md grid-cols-[150px_1fr] items-center gap-x-4 gap-y-3">
		<!-- Temperature -->
		<label for="temperature-input" class="text-sm font-medium">Temperature</label>
		<Input
			id="temperature-input"
			type="number"
			min="0"
			max="2"
			step="0.1"
			bind:value={$appSettings.generation.temperature}
			placeholder="例：1"
			class="w-32"
		/>

		<!-- Top-P -->
		<label for="top-p-input" class="text-sm font-medium">Top-P</label>
		<Input
			id="top-p-input"
			type="number"
			min="0"
			max="1"
			step="0.01"
			bind:value={$appSettings.generation.topP}
			placeholder="例：0.95"
			class="w-32"
		/>

		<!-- Top-K -->
		<label for="top-k-input" class="text-sm font-medium">Top-K</label>
		<Input
			id="top-k-input"
			type="number"
			min="1"
			step="1"
			bind:value={$appSettings.generation.topK}
			placeholder="例：64"
			class="w-32"
		/>

		<!-- Max Output Tokens -->
		<label for="max-tokens-input" class="text-sm font-medium">Max Output Tokens</label>
		<Input
			id="max-tokens-input"
			type="number"
			min="1"
			step="1"
			bind:value={$appSettings.generation.maxOutputTokens}
			placeholder="例：65535"
			class="w-32"
		/>

		<!-- Thinking Budget -->
		<label for="thinking-budget-input" class="text-sm font-medium">Thinking Budget</label>
		<Input
			id="thinking-budget-input"
			type="number"
			min="-1"
			step="1"
			bind:value={$appSettings.generation.thinkingBudget}
			placeholder="例：-1"
			class="w-32"
		/>
	</div>
</Section>
