<script lang="ts">
	export let title: string;
	let className: string = '';
	export { className as class };
</script>

<section class="space-y-4 {className}">
	<h2 class="text-lg font-bold text-gray-200">{title}</h2>
	<slot />
</section>
