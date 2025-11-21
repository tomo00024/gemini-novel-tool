<script lang="ts">
	export let value: any;
	export let options: string[] = [];
	export let disabled: boolean = false;
	export let label: string = '';
	export let id: string = '';
	let className: string = '';
	export { className as class };
</script>

<div class={className}>
	{#if label}
		<label for={id} class="mb-1 block text-lg font-bold text-stone-200">{label}</label>
	{/if}
	<select
		{id}
		bind:value
		{disabled}
		class="w-full rounded-lg border border-stone-600 bg-transparent px-3 py-2 text-stone-200 focus:outline-none disabled:opacity-50 [&>option]:text-stone-800"
		{...$$restProps}
	>
		{#if options && options.length > 0}
			<!-- options が渡された場合はループで option タグを生成 -->
			{#each options as option}
				<option value={option}>{option}</option>
			{/each}
		{:else}
			<!-- options がない場合は slot (子要素) を表示 -->
			<slot />
		{/if}
	</select>
</div>
