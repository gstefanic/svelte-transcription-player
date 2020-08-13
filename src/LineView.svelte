<script>
    import { onMount, beforeUpdate, getContext, tick } from 'svelte';
    import { duration, time, activeIndex, playing, contextKey } from './store';
    import { textMetrics } from './utils';
    import { default as Color } from 'color';
    import './limit';
    export let transcription;
    export let fontSize;
    export let progressColor = 'aliceblue';
    export let offset = 0;

    $: hoverColor = Color(progressColor).darken(0.025).string();

    $: heightOfLine = container ? getLineHeight(fontSize) : 0;

    const getLineHeight = () => container ? textMetrics('A', container).height : 0;

    let container;

    const { isRegion, getPrevRegion, getNextRegion } = getContext(contextKey);

    let currentLineProgress, currentLineIndex;

    $: calcLineProgress(currentLineIndex, $time);

    const extract = (line, index) => {
        let lineCopy = Object.assign({}, line);
        if (lineCopy.start === undefined) {
            lineCopy.start = transcription[index - 1] ? transcription[index - 1].end : 0;
        }

        if (lineCopy.end === undefined) {
            lineCopy.end = transcription[index + 1] ? transcription[index + 1].start : $duration;
        }

        const params = typeof line.params === 'string' ? line.params.split(',') : [];
        if (params && params.length) {
            lineCopy['newLine'] = params.includes('--line');
            lineCopy['newParagraph'] = params.includes('--paragraph');
        }


        return lineCopy;
    };

    const prepare = transcription => transcription.map(extract);

    const isCurrent = (start, end, index, check = false) => {
        if (check || isRegion(index)) {
            if (start <= $time && $time < end) {
                currentLineIndex = index;
                return true;
            }
        } else {
            const {region: prevRegion} = getPrevRegion(index);
            const {region: nextRegion} = getNextRegion(index);
            const {end: start} = prevRegion || {end: 0};
            const {start: end} = nextRegion || {start: $duration};
            return isCurrent(start, end, index, true);
        }
        return false;
    };

    const calcLineProgress = index => {
        if (index !== undefined) {
            const {start, end} = extract(transcription[index], index);
            if (isCurrent(start, end, index)) {
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

    const lineClick = ix => () => {
        const index = offset + ix;
        if ($activeIndex === index || index === currentLineIndex) {
            if ($playing) {
                $playing = false;
                $activeIndex = index;
            } else {
                $activeIndex = undefined;
                $activeIndex = index;
                $playing = true;
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

<div bind:this={container} class="container" style="--progress:{currentLineProgress * 100}%; --progress-color: {progressColor}; --hover-color: {hoverColor};">
    {#each prepare(transcription) as {start, end, text}, index (start, end)}
    <span class="line" 
        class:past={start <= $time && end <= $time} 
        class:current={isCurrent(start, end, index, $time)} 
        on:click={lineClick(index)}
    >
        {text}
    </span>
    {/each}
</div>