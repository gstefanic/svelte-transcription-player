<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import RegionHandle from './RegionHandle';
    import TimeRangeInput from './TimeRangeInput';
    import Blur from './Blur';
    import { isFloat } from './utils';
    import interact from 'interactjs';
    import { toFixed } from './utils';
    import { playing, duration, activeIndex, minRegionDuration } from './store';
    var Color = require('color');

    export let start, end;
    export let min, max;
    export let index;
    export let color = 'green';
    export let pxPerSec;
    export let scrollLeft;
    export let resizable;

    let maxStart, minEnd;
    $: maxStart = end - $minRegionDuration;
    $: minEnd = start + $minRegionDuration;
    $: handleColor = Color(color).lighten(0.75).fade(0.75).string();

    $: console.log('handleColor', handleColor);
    
    let resizing, draggingHandle;

    $: if (resizing) $playing = false;

    let active;

    const pause = () => $playing = false;
    $: active = $activeIndex === index;
    $: !active && pause();

    const dispatch = createEventDispatcher();

    let width, offsetLeft, timesContainerWidth;

    $: width = (end - start) * pxPerSec;
    $: offsetLeft = start * pxPerSec - scrollLeft;

    const touchable = node => {
        if (node instanceof HTMLElement) {
            const emit = (eventType, event) => {
                event.stopPropagation();
                event.preventDefault();
                event.target === node && node.dispatchEvent(new CustomEvent(eventType, {
                    detail: event,
                }))
            };

            let held;

            const intrct = interact(node)
            .on('tap', event => held = !held && emit('tap', event))
            .on('hold', event => held = emit('hold', event) || true);
    
            return () => intrct.unset();
        }
    };

    onMount(async () => {
        // console.log(`onMount region start: ${start}, end: ${end}, min: ${min}, maxStart: ${maxStart}, minEnd: ${minEnd}, max: ${max}`);
        // console.log('onMount region', start, end, pxPerSec, scrollLeft, width, offsetLeft);
    });

    const isValidStart = value => {
        // console.log('isValidStart', value, min, maxStart);
        return min <= value && value <= maxStart
    };
    const isValidEnd = value => minEnd <= value && value <= max;
    const validateStart = value => toFixed(Math.max(min, Math.min(maxStart, value)));
    const validateEnd = value => toFixed(Math.max(minEnd, Math.min(max, value)));

    const rezoom = () => dispatch('please-rezoom');

    const on = {
        region: {
            hold: event => console.log('hold'),
            tap: event => {
                pause();
                $activeIndex = index;
            },
            resized: () => {
                dispatch('resized');
                resizing = false;
                draggingHandle = false;
            },
        },
        edit: {
            focus: () => resizing = true,
            input: () => rezoom(),
            blur: () => {
                // console.log('WavesurserRegion#on:click', start, end);
                on.region.resized()
            },
        },
        start: {
            resizing: event => {
                if (event && event.detail.dx) {
                    resizing = true;
                    draggingHandle = true;
                    const dx = event.detail.dx;
                    const dt = dx / pxPerSec;
                    start = validateStart(start + dt);
                }
            },
        },
        end: {
            resizing: event => {
                if (event && event.detail.dx) {
                    resizing = true;
                    draggingHandle = true;
                    const dx = event.detail.dx;
                    const dt = dx / pxPerSec;
                    end = validateEnd(end + dt);
                }
            },
        },
    };

</script>

<style>
    .container {
        position: absolute;
        background-color: var(--region-color);
        z-index: 30;
        left: var(--offset-left);
        width: var(--region-width);
        height: 100%;
        cursor: pointer;
        top: 0;
        border-radius: 4px;
    }

    .container.resizing {
        z-index: 40;
    }

    .container.active {
        z-index: 30;
    }

    .handle {
        position: absolute;
        height: 100%;
        display: inline-flex;
        opacity: 0.25;
    }

    .handle-left {
        left: 0;
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
    }

    .handle-right {
        right: 0;
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
    }

    .times-container {
        position: absolute;
        z-index: 30;
        transform: translate(calc(var(--region-width) / 2 - 50%), 50%);
        display: inline-block;
    }

</style>

<div class="container" 
    use:touchable
    on:hold={on.region.hold}
    on:tap={on.region.tap}
    class:resizing
    class:active={index === $activeIndex}
    style="--offset-left:{offsetLeft}px; --region-width:{width}px; --region-color:{Color(color).lighten(0.5).fade(0.5).string()}">

    <div class="handle handle-left" style="background-color: {color}">
        {#if resizable}
            <RegionHandle
                on:resizing={on.start.resizing}
                on:resized={on.region.resized}
                {color}
            />
        {/if}
    </div>

    {#if index === $activeIndex}
    <div class="times-container" bind:offsetWidth={timesContainerWidth} style="visibility: {timesContainerWidth > width ? 'hidden' : 'visible'};">
        <Blur>
            <TimeRangeInput bind:start bind:end 
                {isValidStart} {isValidEnd} editMode={!draggingHandle} 
                {color}
                on:blur={on.edit.blur}
                on:input={on.edit.input}
                on:focus={on.edit.focus}
            />
        </Blur>
    </div>
    {/if}

    <div class="handle handle-right" style="background-color: {color}">
        {#if resizable}
            <RegionHandle
                on:resizing={on.end.resizing} 
                on:resized={on.region.resized}
                {color}
            />
        {/if}
    </div>

</div>