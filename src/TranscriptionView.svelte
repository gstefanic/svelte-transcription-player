<script>
    import { duration, time } from './store';
    export let transcription;

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

    const isCurrent = (start, end, index) => {
        if (start <= $time && $time <= end) {
            currentLineIndex = index;
            return true;
        }
        return false;
    };

    const calcLineProgress = index => {
        if (index !== undefined) {
            const {start, end} = extract(transcription[index], index);
            if (isCurrent(start, end, index)) {
                const duration = end - start;
                const elapsed = $time - start;
                currentLineProgress = elapsed / duration;
            } else {
                currentLineProgress = 0;
            }
        }
    };
</script>

<style>
    .past {
        --color-past: grey;
        background-color: var(--color-past);
    }

    .current {
        --color-past: grey;
        --color-upcoming: transparent;
        background: linear-gradient(to right, var(--color-past) var(--progress), var(--color-upcoming) var(--progress));
    }
</style>

<div class="container" style="--progress:{currentLineProgress * 100}%">
    {#each prepare(transcription) as {start, end, text}, index (start, end)}
    <span class="line" class:past={end < $time} class:current={isCurrent(start, end, index, $time)}>
        {text}
    </span>
    {/each}
</div>