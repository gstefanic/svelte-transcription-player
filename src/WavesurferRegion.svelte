<script>
    import { createEventDispatcher, tick } from 'svelte';
    import RegionHandle from './RegionHandle';
    import TimeRangeInput from './TimeRangeInput';
    import Blur from './Blur';
    import { isFloat } from './utils';
    import interact from 'interactjs';
    import { toFixed } from './utils';
    import { playing, duration, activeIndex, minRegionDuration, RegionColor } from './store';
    var Color = require('color');

    export let start, end;
    export let min, max;
    export let index;
    export let color = $RegionColor;
    export let pxPerSec;
    export let scrollLeft;
    export let resizable;

    let maxStart, minEnd;
    $: maxStart = end - $minRegionDuration;
    $: minEnd = start + $minRegionDuration;
    $: handleColor = Color(color).darken(0.25).fade(0.65).string();
    $: regionColor = getRegionColor(color, $activeIndex);

    const getRegionColor = (color) => {
        if ($activeIndex === index) {
            return Color(color).darken(0.1).fade(0.4).string();
        } else {
            return Color(color).fade(0.5).string();
        }
    };

    let resizing, draggingHandle;

    $: if (resizing) $playing = false;

    let active;

    const pause = async () => {
        $playing = false
        return tick();
    };

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
            // .on('hold', event => held = emit('hold', event) || true);
    
            return () => intrct.unset();
        }
    };

    const isValidStart = value => {
        return min <= value && value <= maxStart
    };
    const isValidEnd = value => minEnd <= value && value <= max;
    const validateStart = value => toFixed(Math.max(min, Math.min(maxStart, value)));
    const validateEnd = value => toFixed(Math.max(minEnd, Math.min(max, value)));

    const rezoom = () => dispatch('please-rezoom');

    const on = {
        region: {
            tap: async event => {
                if ($activeIndex === index) {
                    $playing = !$playing;
                } else {
                    await pause();
                    $activeIndex = index;
                }
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
    .cntnr {
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

    .cntnr.resizing {
        z-index: 40;
    }

    .cntnr.active {
        z-index: 30;
    }

    .handle {
        position: absolute;
        height: 100%;
        display: inline-flex;
    }

    .handle-left {
        left: 0;
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
        background: linear-gradient(to right, var(--handle-color) 4px, transparent 4px);
    }

    .handle-right {
        right: 0;
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
        background: linear-gradient(to left, var(--handle-color) 4px, transparent 4px);
    }

    .times-container {
        position: absolute;
        z-index: 30;
        transform: translate(calc(var(--region-width) / 2 - 50%), 50%);
        display: inline-block;
    }

</style>

<div class="cntnr" 
    use:touchable
    on:tap={on.region.tap}
    class:resizing
    class:active={index === $activeIndex}
    style="--offset-left: {offsetLeft}px; --region-width: {width}px; --region-color: {regionColor}; --handle-color: {handleColor}">

    <div class="handle handle-left">
        {#if resizable}
            <RegionHandle
                on:resizing={on.start.resizing}
                on:resized={on.region.resized}
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

    <div class="handle handle-right">
        {#if resizable}
            <RegionHandle
                on:resizing={on.end.resizing} 
                on:resized={on.region.resized}
            />
        {/if}
    </div>

</div>