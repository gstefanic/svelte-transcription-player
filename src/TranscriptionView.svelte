<script>
    import { onMount, beforeUpdate, getContext, tick } from 'svelte';
    import { duration, time, activeIndex, playing, contextKey, SecondaryColor, FontSizePx } from './store';
    import { textMetrics } from './utils';
    import { default as Color } from 'color';
    import './limit';
    export let transcription;
    export let offset = 0;
    export let length = 0;

    $: hoverColor = Color($SecondaryColor).darken(0.025).string();

    $: heightOfLine = container ? getLineHeight($FontSizePx) : 0;

    const getLineHeight = () => container ? textMetrics('A', container).height : 0;

    let container;

    const { isRegion, getPrevRegion, getNextRegion, getBoundTimes } = getContext(contextKey);

    let currentLineProgress, currentLineIndex;

    $: calcLineProgress(currentLineIndex, $time);

    const extract = (line, index) => {
        if (isRegion(index)) {
            return Object.assign({}, line);
        } else {
            return Object.assign({}, line, getBoundTimes(index));
        }
    };

    const prepare = transcription => transcription.map(extract);

    const isCurrent = (start, end, index, skipCheck = false) => {
        if (skipCheck || isRegion(index)) {
            if (start <= $time && $time < end) {
                currentLineIndex = index;
                return true;
            }
        } else {
            const { start, end } = getBoundTimes(index);
            return isCurrent(start, end, index, true);
        }
        return false;
    };

    const calcLineProgress = index => {
        if (index !== undefined) {
            const {start, end} = extract(transcription[index], index);
            if (isCurrent(start, end, index, true)) {
                const duration = end - start;
                const elapsed = $time - start;
                if (elapsed < 0) {
                    throw new Error('impl error');
                }
                if (duration < 0) {
                    throw new Error('impl error');
                }
                currentLineProgress = (elapsed < 0 || duration <= 0) ? 0 : elapsed / duration;
            } else {
                currentLineProgress = 0;
            }
        }
    };

    const lineClick = index => () => {
        const { start, end } = getBoundTimes(index);
        if (start <= $time && $time < end) {
            if ($playing) {
                $playing = false;
                $activeIndex = index;
            } else {
                $activeIndex = undefined;
                $activeIndex = index;
                tick().then(() => {
                    $playing = true;
                });
            }
        } else {
            $activeIndex = undefined;
            $activeIndex = index;
        }
    };

</script>

<style>
    .past {
        background-color: var(--progress-color);
    }

    .current {
        --color-upcoming: transparent;
        background: linear-gradient(to right, var(--progress-color) var(--progress), var(--color-upcoming) var(--progress));
    }

    .current.not-region {
        background-color: var(--progress-color);
    }

    .line {
        border-radius: 0.5rem;
    }

    .line:hover {
        background-color: var(--hover-color);
        cursor: pointer;
    }
    .container {
        position: relative;
        box-sizing: border-box;
    }
</style>

<div bind:this={container} class="container" style="--progress:{currentLineProgress * 100}%; --progress-color: {$SecondaryColor}; --hover-color: {hoverColor};">
    {#each prepare(transcription) as {start, end, text, notRegion}, index}
    {#if index >= offset && index < offset + length}
    <span class="line" 
        class:past={start <= $time && end <= $time} 
        class:current={isCurrent(start, end, index, false, $time)}
        class:not-region={notRegion}
        on:click={lineClick(index)}
    >
        {text}
    </span>
    {/if}
    {/each}
</div>