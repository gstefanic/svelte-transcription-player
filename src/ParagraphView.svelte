<script>
    import LineView from './LineView';
    import { onMount, beforeUpdate, getContext, tick } from 'svelte';
    import { duration, time, activeIndex, playing, contextKey } from './store';
    import { textMetrics } from './utils';
    import { default as Color } from 'color';
    import './limit';
    export let transcription;
    export let fontSize;
    export let progressColor = 'aliceblue';
    export let offset = 0;
    export let index;

    $: index;

    const prepare = transcription => {
        let res = [];
        transcription.forEach((line, index) => {
            const params = typeof line.params === 'string' ? line.params.split(',') : [];
            if (res.length === 0 || params.includes('--line')) {
                res = [{
                    offset: index,
                    lines: [line],
                }, ...res];
            } else {
                const [{offset, lines}, ...tail] = res;
                res = [{
                    offset,
                    lines: [...lines, line],
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

{#if index !== undefined}
<div style="padding-left: 0.5rem; margin-bottom: -0.75rem;">{index}:</div>
{/if}
<div class="container">
    {#each prepare(transcription) as {lines, offset: o}, index}
    <LineView transcription={lines} offset={offset + o} {fontSize} {progressColor}/>
    {/each}
</div>