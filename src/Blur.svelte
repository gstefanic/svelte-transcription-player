<script>
	export let css = '';
	export let radius = '0.5rem';
	const toVoid = () => {};
	export let transitionIn = toVoid, transitionOut = toVoid;
    export let inParams = {}, outParams = {};
    export let color = 'rgba(0,0,0, 0.1)';
		
	const getRadius = radius => isNaN(radius) ? radius : (radius + 'px');
</script>

{#if transitionIn !== toVoid && transitionOut !== toVoid}
<div class="bg" style={`--color:${color};` + css} in:transitionIn={inParams} out:transitionOut={outParams} on:click>
	<slot></slot>
	<div class="blur" style="--border-radius:{getRadius(radius)}"></div>
</div>
{:else}
<div class="bg" style={`--color:${color};` + css} on:click>
	<slot></slot>
	<div class="blur" style="--border-radius:{getRadius(radius)}"></div>
</div>
{/if}

<style>
	.blur {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		z-index: -1;
		border-radius: var(--border-radius);
		
		filter: blur(1px);
		-webkit-filter: blur(1px);
		background-color: var(--color);
		background-position: center;
		background-repeat: no-repeat;
		background-size: cover;
	}
	.bg {
		position: relative;
		display: inline-block;
	}
</style>