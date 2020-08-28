<script>
    import TranscriptionView from './TranscriptionView';
    import TranscriptionEdit from './TranscriptionEdit';
    import { onMount, beforeUpdate, getContext, tick } from 'svelte';
    import { duration, time, activeIndex, playing, contextKey, editMode, SecondaryColor, ShowParagraphNumbers } from './store';
    import { textMetrics } from './utils';
    import { default as Color } from 'color';
    import './limit';
    export let transcription;
    export let offset = 0;
    export let length = 0;
    export let index;

    const prepare = transcription => {
        let res = [];
        transcription.slice(offset, offset + length).forEach((line, index) => {
            if (res.length === 0 || line.line === true) {
                res = [{
                    offset: index,
                    length: 1,
                }, ...res];
            } else {
                const [{offset, length}, ...tail] = res;
                res = [{
                    offset,
                    length: length + 1,
                }, ...tail]
            }
        });
        return res.reverse();
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

{#if $ShowParagraphNumbers && index !== undefined}
<div style="padding-left: 0.5rem; margin-bottom: -0.75rem;">{index}:</div>
{/if}
<div class="cntnr">
    {#each prepare(transcription) as {length, offset: o, id}, index}
    {#if $editMode}
    <TranscriptionEdit bind:transcription={transcription} offset={offset + o} {length}/>
    {:else}
    <TranscriptionView bind:transcription={transcription} offset={offset + o} {length}/>
    {/if}
    {/each}
</div>