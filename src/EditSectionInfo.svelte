<script>
    import { getContext } from 'svelte';
    import { contextKey } from './store';
    import { toFixed } from './utils';
    import NewInput from './NewInput';

    const { isRegion } = getContext(contextKey);

    const Void = {};
    const toVoid = () => Void;

    // export let callback = Void;
    export let title = 'Edit Section';
    export let section = Void;
    export let close;
    export let done;
    export let remove;
    export let validateStart, validateEnd, validateText;

    let isValidText, isValidStart, isValidEnd;

    const _done = () => {
        (done || toVoid)({
            text: section.text,
            start: beRegion ? toFixed(section.start) : undefined,
            end: beRegion ? toFixed(section.end) : undefined,
        });
        _close();
    };

    const _delete = () => {
        (remove || toVoid)();
        _close();
    };

    const _close = () => {
        (close || toVoid)();
    };

    export let beRegion;

</script>

<div class="section-editing-container" style="font-size: 1rem;">

    <div style="display: flex;">
        <div style="flex: 1; align-self: flex-start;">
            <span>{title}</span>
        </div>
    </div>

    <div style="margin-top: 0.5rem; display: flex; flex-flow: column;">
        <NewInput blurOnEnter={false}
            singleline={false} 
            value={section.text} 
            maxHeight={50} 
            css={'display: block; max-height: 50px; border: solid 0.1rem black; border-radius: 0.25rem; padding: 0.2rem; margin-top: 0.5rem;'}
            on:input={({detail: value}) => section.text = value}
            validate={validateText}
            bind:valid={isValidText}
            placeholder="Type something..."
        />

        <div style="margin-top: 0.5rem;">
            <label>
                <input type=checkbox bind:checked={beRegion}>
                Mark as region
            </label>
        </div>

        {#if beRegion}
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap">
            <div style="display: flex; margin-top: 0.5rem">
                <span style="display: inline:block; margin-right: 8px;">Start:</span>
                <NewInput value={section.start} 
                    css={'width: 50px; border: solid 0.1rem black; border-radius: 0.25rem; padding: 0 0.25rem;'}
                    on:input={({detail: value}) => section.start = value}
                    validate={validateStart(section.end)}
                    bind:valid={isValidStart}
                    placeholder="Start"
                />
            </div>
            <div style="display: flex; margin-top: 0.5rem">
                <span style="display: inline:block; margin-right: 8px;">End:</span>
                <NewInput value={section.end} 
                    css={'width: 50px; border: solid 0.1rem black; border-radius: 0.25rem; padding: 0 0.25rem;'}
                    on:input={({detail: value}) => section.end = value}
                    validate={validateEnd(section.start)}
                    bind:valid={isValidEnd}
                    placeholder="End"
                />
            </div>
        </div>
        {/if}
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 1rem;">
        <div>
            <button on:click={_close}>Cancel</button>
            {#if remove !== undefined}
			<button on:click={_delete}>Delete</button>
            {/if}
        </div>
        <div>
            <button on:click={_done} disabled={!(isValidText && (!beRegion || isValidStart && isValidEnd))}>Done</button>
        </div>
    </div>
</div>