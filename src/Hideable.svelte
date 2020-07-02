
<script>
	import { elasticOut } from 'svelte/easing';
	import { tick } from 'svelte';
	
	export let content = '';
	export let css;
	export let duration = 1000;
	export let initial = 0.5;
	
	let timer, changed;
	
	$: contentChanged(content);
	
	const contentChanged = async () => {
		clearTimeout(timer);
		changed = false;
		await tick();
		changed = true;
		timer = setTimeout(() => changed = false, duration / 5);
	};
	
	const whoosh = (node, params) => {
		const existingTransform = getComputedStyle(node).transform.replace('none', '');
		const initial = Math.max(0, Math.min(1, (params.initial || 0)));	
		const diff = initial - 1;
		return {
			delay: params.delay || 0,
			duration: params.duration || 400,
			easing: params.easing || elasticOut,
			css: (t, u) => `transform: ${existingTransform} scale(${initial - (t * diff)})`
		};
	};

	const shrink = (node, params) => {
		const existingTransform = getComputedStyle(node).transform.replace('none', '');
		const initial = Math.max(0, Math.min(1, (params.initial || 0)));	
		const diff = initial - 1;
		return {
			delay: params.delay || 0,
			duration: params.duration || 400,
			easing: params.easing || elasticOut,
			css: (t, u) => `transform: ${existingTransform} scale(${u})`
		};
	};
</script>

<span class="container" style={css}>
	{content}
	{#if changed}
	<span class="content" out:whoosh={{delay: 1000, duration: duration, initial: initial}}><slot>{content}</slot></span>
	{:else}
	<span class="content"><slot>{content}</slot></span>
	{/if}
</span>

<style>
	.content {
		color: black;
		position: absolute;
		top: 0;
		left: 0;
	}
	
	.container {
		color: transparent;
		position: relative;
	}
</style>