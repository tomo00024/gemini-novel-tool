<script lang="ts">
	export let title: string;
	export let description: string;
	export let selected: boolean = false;
	export let onClick: () => void;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="cursor-pointer rounded-lg border p-4 transition-all duration-200"
	style:border-color={selected
		? 'var(--bg-border-main)'
		: 'rgb(from var(--bg-border-main) r g b / 0.5)'}
	class:hover:bg-[#262626]={!selected}
	on:click={onClick}
>
	<h3 class="mb-1 font-bold" style:color={selected ? 'var(--text-main)' : 'var(--text-off)'}>
		{title}
	</h3>
	<p class="text-xs" style:color={selected ? 'var(--text-sub)' : 'var(--text-off)'}>
		{description}
	</p>
</div>
