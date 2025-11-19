<script lang="ts">
	export let checked: boolean;
	export let label: string;
	export let id: string = '';
	export let disabled: boolean = false;
	let className: string = '';
	export { className as class };
</script>

<div class="flex items-center space-x-2 {className}">
	<input {id} type="checkbox" bind:checked {disabled} class="h-4 w-4" />
	<label for={id} class="text-sm text-gray-200" class:text-gray-400={disabled}>
		{label}
	</label>
</div>
