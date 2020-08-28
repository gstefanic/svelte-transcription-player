<script>
	import Paragraph from './Paragraph';
    import { onMount, beforeUpdate, getContext, tick } from 'svelte';
    import { duration, time, activeIndex, playing, contextKey } from './store';
    import { textMetrics } from './utils';
    import { default as Color } from 'color';
    import './limit';
    export let transcription;

    const prepare = transcription => {
        let paragraphs = [];
        transcription.forEach((line, index) => {
            if (paragraphs.length === 0 || line.paragraph === true) {
                paragraphs = [{
                    offset: index,
                    length: 1,
                }, ...paragraphs];
            } else {
                const [{offset, length}, ...tail] = paragraphs;
                paragraphs = [{
                    offset,
                    length: length + 1,
                }, ...tail]
            }
        });
        return paragraphs.reverse();
    };

</script>

<style>
    .cntnr {
        position: relative;
        padding: 0.5rem;
        box-sizing: border-box;
        width: 100%;
    }
</style>

<div class="cntnr">
    {#each prepare(transcription) as {length, offset}, index}
    <Paragraph bind:transcription={transcription} {index} {offset} {length}/>
    {/each}
</div>