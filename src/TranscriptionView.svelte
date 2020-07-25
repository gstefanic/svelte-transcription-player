<script>
    import { onMount, beforeUpdate, getContext, tick } from 'svelte';
    import { duration, time, activeIndex, playing, contextKey } from './store';
    import { textMetrics } from './utils';
    import './limit';
    export let transcription;
    export let fontSize;

    $: heightOfLine = container ? getLineHeight(fontSize) : 0;

    const getLineHeight = () => container ? textMetrics('A', container).height : 0;

    let container, lines;

    let currentProgressScroll = 0;

    let autoscroll = true;

    const { getContainer, isVisible, shouldBeVisible } = getContext('resizable');

    const { isRegion, getPrevRegion, getNextRegion } = getContext(contextKey);

    onMount(async () => {
        lines = container.getElementsByClassName('line');
        const wrapper = getContainer();

        let timer;
        let wrapperOnScroll = () => {
            clearTimeout(timer);
            autoscroll = false;
            timer = setTimeout(() => {
                const scrollOfProgress = getScrollOfProgress();
                autoscroll = isVisible(scrollOfProgress) || isVisible(scrollOfProgress - heightOfLine);
            }, 1000);
        };


        if (wrapper instanceof HTMLElement) {
            wrapper.addEventListener('wheel', wrapperOnScroll);
            wrapper.addEventListener('touchmove', wrapperOnScroll);
        }

        return () => {
            wrapper.removeEventListener('wheel', wrapperOnScroll);
            wrapper.removeEventListener('touchmove', wrapperOnScroll);
        }
    });

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

    const lineClick = index => () => {
        if ($activeIndex === index || index === currentLineIndex) {
            autoscroll = true;
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

    const getScrollOfProgress = () => {
        if (lines) {
            const lineElement = lines[currentLineIndex];
            if (lineElement) {
                const lineTop = lineElement.offsetTop;
                const lineHeight = lineElement.offsetHeight;
                const adjustedLineHeight = lineHeight;
                const progressLineNumber = Math.ceil((adjustedLineHeight * currentLineProgress) / heightOfLine);
                return lineTop + (progressLineNumber) * heightOfLine;
            }
        }
        return 0;
    }

    const scrollIfNeeded = (() => {
        if (autoscroll && currentLineProgress) {
            const scrollOfProgress = getScrollOfProgress();
            if (!isVisible(scrollOfProgress)) {
                shouldBeVisible({top: scrollOfProgress - heightOfLine, bottom: scrollOfProgress});
            }
        }
    }).limit(100);

    beforeUpdate(async () => {
        container && autoscroll && scrollIfNeeded();
    });

</script>

<style>
    .past {
        /* --color-past: rgba(0,0,0,0.1); */
        --color-past: aliceblue;
        background-color: var(--color-past);
    }

    .current {
        /* --color-past: rgba(0,0,0,0.1); */
        --color-past: aliceblue;
        --color-upcoming: transparent;
        background: linear-gradient(to right, var(--color-past) var(--progress), var(--color-upcoming) var(--progress));
    }

    .line {
        border-radius: 0.5rem;
    }

    .line:hover {
        /* --color-hover: rgba(0,0,0,0.15); */
        --color-hover: #e6f3ff;
        background-color: var(--color-hover);
        cursor: pointer;
    }

    .container {
        position: relative;
    }

</style>

<div bind:this={container} class="container" style="--progress:{currentLineProgress * 100}%">
    {#each prepare(transcription) as {start, end, text}, index (start, end)}
    <span class="line" class:past={end < $time} class:current={isCurrent(start, end, index, $time)} on:click={lineClick(index)}>
        {text}
    </span>
    {/each}
</div>