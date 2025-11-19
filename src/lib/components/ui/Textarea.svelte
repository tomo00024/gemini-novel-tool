<script lang="ts">
	export let value: string;
	export let placeholder: string = '';
	export let disabled: boolean = false;
	export let label: string = '';
	export let id: string = '';
	export let rows: number = 2;
	let className: string = '';
	export { className as class };

	function autosize(node: HTMLTextAreaElement) {
		function resize() {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		}
		node.addEventListener('input', resize);
		// Initial resize
		resize();

		return {
			destroy() {
				node.removeEventListener('input', resize);
			}
		};
	}
</script>

<div class={className}>
	{#if label}
		<label for={id} class="mb-1 block text-lg font-bold text-gray-200">{label}</label>
	{/if}
	<textarea
		{id}
		bind:value
		use:autosize
		{rows}
		{placeholder}
		{disabled}
		class="w-full resize-none rounded-lg border border-gray-600 bg-transparent px-3 py-2 text-gray-200 focus:outline-none disabled:opacity-50"
		{...$$restProps}
	></textarea>
</div>
