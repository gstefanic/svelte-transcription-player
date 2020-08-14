<script>
    import { onMount, beforeUpdate, getContext, tick } from 'svelte';
    import { duration, time, activeIndex, playing, contextKey, SecondaryColor, FontSizePx, hovering, alternated } from './store';
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


    const alternate = index => () => {
        if ($alternated[index]) {
            $alternated = [];
        } else {
            $alternated = [];
            tick().then(() => $alternated[index] = true)
        }
    };
    const hover = index => () => {
        $hovering = [];
        $hovering[index] = true;
    };
    const unhover = index => () => $hovering[index] = false;

</script>

<style>
    .past {
        background-color: var(--progress-color);
    }

    .current {
        --color-upcoming: transparent;
        background: linear-gradient(to right, var(--progress-color) var(--progress), var(--color-upcoming) var(--progress));
    }

    .line {
        position: relative;
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

    .alternated {
        background-color: var(--hover-color);
        border-radius: 0.5rem;
    }

    svg {
        position: relative;
        top: 0.1em;
    }
</style>

<div bind:this={container} class="container" style="--progress:{currentLineProgress * 100}%; --progress-color: {$SecondaryColor}; --hover-color: {hoverColor};">
    {#each prepare(transcription) as {start, end, text, alt}, index}
    {#if index >= offset && index < offset + length}
    <span class="line" 
        class:past={start <= $time && end <= $time} 
        class:current={isCurrent(start, end, index, false, $time)}
        class:alternated={$alternated[index]}
        on:click={lineClick(index)}
        on:mouseover={hover(index)} on:mouseleave={unhover(index)}
    >
        {$alternated[index] ? alt || text : text}
        {#if $hovering[index] && alt || $alternated[index]}
            {#if $alternated[index]}
            <svg on:click|stopPropagation={alternate(index)} xmlns="http://www.w3.org/2000/svg" height="{$FontSizePx}px" viewBox="0 0 24 24" width="{$FontSizePx}px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92c-.5.51-.86.97-1.04 1.69-.08.32-.13.68-.13 1.14h-2v-.5c0-.46.08-.9.22-1.31.2-.58.53-1.1.95-1.52l1.24-1.26c.46-.44.68-1.1.55-1.8-.13-.72-.69-1.33-1.39-1.53-1.11-.31-2.14.32-2.47 1.27-.12.37-.43.65-.82.65h-.3C8.4 9 8 8.44 8.16 7.88c.43-1.47 1.68-2.59 3.23-2.83 1.52-.24 2.97.55 3.87 1.8 1.18 1.63.83 3.38-.19 4.4z"/></svg>
            {:else}
            <svg on:click|stopPropagation={alternate(index)} xmlns="http://www.w3.org/2000/svg" height="{$FontSizePx}px" viewBox="0 0 24 24" width="{$FontSizePx}px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm1.61-9.96c-2.06-.3-3.88.97-4.43 2.79-.18.58.26 1.17.87 1.17h.2c.41 0 .74-.29.88-.67.32-.89 1.27-1.5 2.3-1.28.95.2 1.65 1.13 1.57 2.1-.1 1.34-1.62 1.63-2.45 2.88 0 .01-.01.01-.01.02-.01.02-.02.03-.03.05-.09.15-.18.32-.25.5-.01.03-.03.05-.04.08-.01.02-.01.04-.02.07-.12.34-.2.75-.2 1.25h2c0-.42.11-.77.28-1.07.02-.03.03-.06.05-.09.08-.14.18-.27.28-.39.01-.01.02-.03.03-.04.1-.12.21-.23.33-.34.96-.91 2.26-1.65 1.99-3.56-.24-1.74-1.61-3.21-3.35-3.47z"/></svg>
            {/if}
        {/if}
    </span>
    {/if}
    {/each}
</div>