<!-- src/lib/components/global_settings/UiSettings.svelte -->
<script lang="ts">
	import { appSettings } from '$lib/stores';
	import Section from '$lib/components/ui/Section.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
</script>

<Section title="UI設定">
	<Toggle
		id="custom-font-size"
		bind:checked={$appSettings.ui.useCustomFontSize}
		label="チャットの文字サイズを変更"
	/>
	<div class="ml-6 flex items-center gap-2" class:opacity-50={!$appSettings.ui.useCustomFontSize}>
		<label for="font-size-input" class="text-sm whitespace-nowrap"> サイズ(px): </label>
		<Input
			id="font-size-input"
			type="number"
			bind:value={$appSettings.ui.chatFontSize}
			disabled={!$appSettings.ui.useCustomFontSize}
			class="w-20"
		/>
	</div>
</Section>
