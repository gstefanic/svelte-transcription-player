<script>
	import { default as Color } from 'color';
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
    export let fontSize;
	export let colors = true;
    export let rounded = true; // false: sharp edges, number: border-radius in px, string: border-radius
    export let fontWeight = 700;
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
	$: radius = _rounded === true ? (`${_height / 2}px`) : _rounded;
	
    $: buttonHeight = typeof height === 'string' ? height : (isNaN(parseFloat(height)) ? defaultHeight : (height + 'px'));
    
    const defaultFontSize = () => `${buttonHeight * 0.5}px`;
    $: _fontSize = fontSize ? (isNaN(parseFloat(fontSize)) ? (typeof fontSize === 'string' ? fontSize : defaultFontSize()) : `${fontSize}px`) : defaultFontSize();
	
	$: onStateChange(state);
	
	const onStateChange = () => {
		if ((state === states.ERROR && resetOnError) || (state === states.DONE && resetOnDone)) {
			setTimeout(() => state = states.DEFAULT, 1000);
		}
	};
	
	let _width, _height;
	
	const click = event => {
		if (!disabled && state === states.DEFAULT) {
			state = states.LOADING
			Promise.resolve((onclick || toVoid)(event))
			.then(async (reject) => {
				if (reject === true) {
					state = states.DONE;
					console.log('click returned true');
				} else if (reject === false) {
					console.log('click returned false');
					state = states.ERROR;
				} else {
					console.log('click returned undefined');
					state = states.DEFAULT;
				}
			})
			.catch(async () => state = states.ERROR);
		}
	};
	
</script>

<div class="container" bind:offsetWidth={_width} bind:offsetHeight={_height} class:loading={state === states.LOADING} class:disabled
		 style="--button-height: {buttonHeight}; --bg-color: {bgColor}; --font-color: {color}; --radius: {radius}; --pulse-color: {pulseColor}; --font-size: {_fontSize}; --h-margin: {_height / 2}px; --hover-color: {hoverColor}; --disabled-color: {disabledColor}; {css}" on:click={click}>
	<div class="inner" style="--font-weight: {fontWeight}">
		<slot></slot>
	</div>
</div>

<style>
	.container {
		display: flexbox;
		height: var(--button-height);
		align-items: center;
		cursor: pointer;
		background-color: var(--bg-color);
		color: var(--font-color);
		border-radius: var(--radius);
		/**font-family: Arial, Helvetica, sans-serif;/**/
		box-sizing: border-box;
		border: solid 2px transparent
	}
	
	.inner {
		margin-top: calc((var(--button-height) - var(--font-size)) / 2);
		margin-bottom: calc((var(--button-height) - var(--font-size)) / 2);
        margin-left: var(--h-margin);
        margin-right: var(--h-margin);
		font-size: var(--font-size);
		font-weight: var(--font-weight);
		line-height: 1.5;
		display: inline-block;
	}

    .container:hover {
        background-color: var(--hover-color);
    }
		
	.container:active {
		border: solid 2px white;
	}
	
	.container.loading {
		background-color: var(--bg-color);
		transform: scale(1);
		animation: pulse 1s infinite;
		box-sizing: unset;
	}

	.container.disabled {
		border: solid 2px transparent;
		/* background-color: var(--disabled-color); */
		background-color: var(--bg-color);
		opacity: 0.4;
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