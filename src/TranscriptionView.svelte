<script>
    import { onMount, beforeUpdate, getContext, tick } from 'svelte';
    import { duration, time, activeIndex, playing, contextKey } from './store';
    import { textMetrics } from './utils';
    import { default as Color } from 'color';
    import './limit';
    export let transcription;
    export let fontSize;
    export let progressColor = 'aliceblue';

    $: hoverColor = Color(progressColor).darken(0.025).string();

    $: heightOfLine = container ? getLineHeight(fontSize) : 0;

    const getLineHeight = () => container ? textMetrics('A', container).height : 0;

    let container, lines;

    let currentProgressScroll = 0;

    let autoscroll = true;

    const { getContainer, isVisible, shouldBeVisible, on, off } = getContext('resizable');

    const { isRegion, getPrevRegion, getNextRegion } = getContext(contextKey);

    onMount(async () => {
        lines = container.getElementsByClassName('line');
        let wrapper;

        let onWrapperAdded, onWrapperRemoved;

        on('container-added', onWrapperAdded = () => {
            wrapper = getContainer();
            if (wrapper instanceof HTMLElement) {
                wrapper.addEventListener('wheel', wrapperOnScroll);
                wrapper.addEventListener('touchmove', wrapperOnScroll);
            }
        });

        on('container-removed', onWrapperRemoved = () => {
            if (wrapper instanceof HTMLElement) {
                wrapper.addEventListener('wheel', wrapperOnScroll);
                wrapper.addEventListener('touchmove', wrapperOnScroll);
                wrapper = undefined;
            }
        });

        let timer;
        let wrapperOnScroll = () => {
            clearTimeout(timer);
            autoscroll = false;
            timer = setTimeout(() => {
                const {top, bottom} = getScrollOfProgress();
                autoscroll = isVisible(top) || isVisible(bottom);
            }, 1000);
        };

        return () => {
            if (wrapper instanceof HTMLElement) {
                wrapper.removeEventListener('wheel', wrapperOnScroll);
                wrapper.removeEventListener('touchmove', wrapperOnScroll);
            }
            off('container-added', onWrapperAdded);
            off('container-removed', onWrapperRemoved)
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
                const progressLineNumber = Math.floor((adjustedLineHeight * currentLineProgress) / heightOfLine);
                const topOfRow = lineTop + (progressLineNumber) * heightOfLine;
                return {
                    top: topOfRow,
                    bottom: topOfRow + heightOfLine,
                };
            }
        }
        return 0;
    }

    const scrollIfNeeded = (() => {
        if (autoscroll && currentLineProgress) {
            const {bottom, top} = getScrollOfProgress();
            if (!isVisible(top) || !isVisible(bottom)) {
                shouldBeVisible({top, bottom});
            }
        }
    }).limit(100);

    beforeUpdate(async () => {
        container && autoscroll && scrollIfNeeded();
    });

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
        padding: 0.5rem;
        height: 100%;
        box-sizing: border-box;
    }

</style>

<div bind:this={container} class="container" style="--progress:{currentLineProgress * 100}%; --progress-color: {progressColor}; --hover-color: {hoverColor};">
    {#each prepare(transcription) as {start, end, text}, index (start, end)}
    <span class="line" class:past={start <= $time && end <= $time} class:current={isCurrent(start, end, index, $time)} on:click={lineClick(index)}>
        {text}
    </span>
    {/each}
</div>