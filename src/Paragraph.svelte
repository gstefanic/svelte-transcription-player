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
            const params = typeof line.params === 'string' ? line.params.split(',') : [];
            if (res.length === 0 || params.includes('--line')) {
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
    .container {
        position: relative;
        padding: 0.5rem;
        height: 100%;
        box-sizing: border-box;
    }
</style>

{#if $ShowParagraphNumbers && index !== undefined}
<div style="padding-left: 0.5rem; margin-bottom: -0.75rem;">{index}:</div>
{/if}
<div class="container">
    {#each prepare(transcription) as {length, offset: o}, index}
    {#if $editMode}
    <TranscriptionEdit bind:transcription={transcription} offset={offset + o} {length}/>
    {:else}
    <TranscriptionView bind:transcription={transcription} offset={offset + o} {length}/>
    {/if}
    {/each}
</div>