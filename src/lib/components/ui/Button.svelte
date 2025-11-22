<script lang="ts">
	export let variant: 'primary' | 'danger' | 'menu' = 'primary';
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let disabled: boolean = false;
	export let title: string = '';
	let className: string = '';
	export { className as class };

	const baseStyles =
		'cursor-pointer transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-70 font-semibold';

	const variants = {
		primary:
			'rounded-full bg-btn-primary-bg px-3 py-2 text-text-main hover:bg-btn-primary-hover-bg text-sm',
		danger:
			'rounded bg-bg-main px-3 py-2 text-red-600 hover:bg-red-600 text-sm border border-red-600 border-1',
		menu: 'rounded-full border border-btn-menu-border bg-btn-menu-bg px-3 py-1 text-btn-menu-text hover:border-btn-menu-hover-border hover:bg-btn-menu-hover-bg text-sm whitespace-nowrap'
	};
</script>

<button
	{type}
	class="{baseStyles} {variants[variant]} {className}"
	{disabled}
	{title}
	on:click
	{...$$restProps}
>
	<slot />
</button>
