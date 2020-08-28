
<script>
	import { onMount } from 'svelte';
	import { default as Color } from 'color';
	import { isFloat } from './utils.js';
	export const states = {
		DEFAULT: 'default',
		LOADING: 'loading',
		DONE: 'done',
		ERROR: 'error',
	};
	const log = console.log;
	const toVoid = () => {};
	
    const defaultHeight = '2.6rem';
    
	const defaultColors = {
		[states.DEFAULT]: {background: 'blue', text: 'white'},
		[states.LOADING]: {background: 'blue', text: 'white'},
		[states.DONE]: {background: 'green', text: 'white'},
		[states.ERROR]: {background: 'red', text: 'white'},
	};
	
	export let onclick = toVoid;
	export let resetOnError = false;
	export let resetOnDone = false;
	export let height = defaultHeight;
	export let fontSize = '1rem';
	export let colors = true;
	export let rounded = true; // false: sharp edges, number: border-radius in px, string: border-radius
	export let fontWeight = 400;
	export let css;
	export let disabled = false;
	let state = states.DEFAULT;
		
	$: _colors = (typeof colors === 'object' ? (Object.assign({}, defaultColors, colors)) : defaultColors);
	$: _color = _colors[state];
	
	$: bgColor = _color && _color.background ? _color.background : _color;
	$: color = _color && _color.text ? _color.text : defaultColors[state].text;
	$: pulseColor = Color(bgColor).lighten(0).fade(0).string();
	$: hoverColor = Color(bgColor).darken(0.1).string();
	$: disabledColor = Color(bgColor).darken(0.2).fade(0.5).string();
	
	$: _rounded = rounded ? (typeof rounded === 'string' ? rounded : (isNaN(parseFloat(rounded)) ? true : (rounded + 'px'))) : 0;
	$: radius = _rounded === true ? (`${btnHeight / 2}px`) : _rounded;
	
	$: buttonHeight = typeof height === 'string' ? height : (isNaN(parseFloat(height)) ? defaultHeight : (height + 'px'));
    
	const defaultFontSize = () => `${_height * 0.5}px`;
	$: _fontSize = fontSize ? (isFloat(fontSize) ? `${fontSize}px` : (typeof fontSize === 'string' ? fontSize : defaultFontSize())) : defaultFontSize(_height);
	
	$: onStateChange(state);
	
	const onStateChange = () => {
		if ((state === states.ERROR && resetOnError) || (state === states.DONE && resetOnDone)) {
			setTimeout(() => state = states.DEFAULT, 1000);
		}
	};
	
	let _width, _height, container, btnWidth, btnHeight;

	onMount(async () => {
		if (container instanceof HTMLElement) {
			btnWidth = container.offsetWidth;
			btnHeight = container.offsetHeight;
		}
	});

	$: btnWidth = _width;
	$: btnHeight = _height;

	const click = event => {
		if (!disabled && state === states.DEFAULT) {
			state = states.LOADING
			Promise.resolve((onclick || toVoid)(event))
			.then(async (reject) => {
				if (reject === true) {
					state = states.DONE;
				} else if (reject === false) {
					state = states.ERROR;
				} else {
					state = states.DEFAULT;
				}
			})
			.catch(async () => state = states.ERROR);
		}
	};

	let innerWidth;
	
</script>

<div class="cntnr" bind:this={container} bind:offsetWidth={_width} bind:offsetHeight={_height} class:loading={state === states.LOADING} class:disabled
		 style="--button-height: {buttonHeight}; --bg-color: {bgColor}; --font-color: {color}; --radius: {radius}; --pulse-color: {pulseColor}; --font-size: {_fontSize}; --hover-color: {hoverColor}; --disabled-color: {disabledColor}; --inner-width: {innerWidth}px; {css}" on:click={click}>
	<div class="inner" style="--font-weight: {fontWeight};" bind:offsetWidth={innerWidth}>
		<slot></slot>
	</div>
</div>

<style>
	.cntnr {
		display : inline-flex;
		align-items : center;
		justify-content: center;
		height: var(--button-height);
		cursor: pointer;
		background-color: var(--bg-color);
		color: var(--font-color);
		border-radius: var(--radius);
		/**/box-sizing: border-box;/**/
		/**/border: solid 2px transparent;/**/
		width: var(--inner-width);
	}
	
	.inner {
		font-size: var(--font-size);
		font-weight: var(--font-weight);
		padding: 0 var(--radius);
		line-height: normal;
		display: inline;
	}

	.cntnr:hover {
		background-color: var(--hover-color);
	}
		
	.cntnr:active {
		border: solid 2px white;
	}
	
	.cntnr.loading {
		background-color: var(--bg-color);
		transform: scale(1);
		animation: pulse 1s infinite;
		box-sizing: unset;
	}

	.cntnr.disabled {
		border: solid 2px transparent;
		background-color: var(--disabled-color);
		cursor: default;
	}
	
	@keyframes pulse {
		0% {
			/* transform: scale(0.95); */
			box-shadow: 0 0 0 0 var(--pulse-color);
		}

		70% {
			/* transform: scale(1); */
			box-shadow: 0 0 0 4px rgba(0, 0, 0, 0);
		}

		100% {
			/* transform: scale(0.95); */
			box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
		}
	}
</style>