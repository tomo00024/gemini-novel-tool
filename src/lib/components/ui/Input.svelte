<script lang="ts">
	export let value: string | number | null | undefined;
	export let type: string = 'text';
	export let placeholder: string = '';
	export let disabled: boolean = false;
	export let label: string = '';
	export let id: string = '';
	let className: string = '';
	export { className as class };
</script>

<div class={className}>
	{#if label}
		<label for={id} class="mb-1 block text-sm font-medium text-gray-200">{label}</label>
	{/if}
	{#if type === 'number'}
		<input
			{id}
			type="number"
			bind:value
			{placeholder}
			{disabled}
			class="w-full rounded-lg border border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-200 focus:outline-none disabled:opacity-50"
			{...$$restProps}
		/>
	{:else}
		<input
			{id}
			{type}
			bind:value
			{placeholder}
			{disabled}
			class="w-full rounded-lg border border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-200 focus:outline-none disabled:opacity-50"
			{...$$restProps}
		/>
	{/if}
</div>
