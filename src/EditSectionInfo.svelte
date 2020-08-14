<script>
    import { getContext } from 'svelte';
    import { contextKey } from './store';
    import { toFixed } from './utils';
    import Button from './Button';
    import NewInput from './NewInput';

    const Void = {};
    const toVoid = () => Void;

    // export let callback = Void;
    export let title = 'Edit Section';
    export let section = Void;
    export let close;
    export let done;
    export let remove;
    export let validateStart, validateEnd, validateText;
    export let beRegion;
    export let hasAltText;
    export let paragraphConfigurable = true;

    let isValidText, isValidAlt, isValidStart, isValidEnd;

    const _done = async () => {
        await (done || toVoid)({
            text: section.text,
            start: beRegion ? toFixed(section.start) : undefined,
            end: beRegion ? toFixed(section.end) : undefined,
            line: section.paragraph || section.line,
            paragraph: section.paragraph,
            alt: hasAltText ? section.alt : undefined,
        });
        _close();
    };

    const _delete = async () => {
        await (remove || toVoid)();
        _close();
    };

    const _close = async () => {
        (close || toVoid)();
    };

</script>

<style>
    label > input[type="checkbox"] {
        margin-right: 4px;
    }
</style>

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
            <label><input type=checkbox bind:checked={hasAltText}>Alternative text</label>
        </div>

        {#if hasAltText}
        <NewInput blurOnEnter={false}
            singleline={false} 
            value={section.alt || ''} 
            maxHeight={50} 
            css={'display: block; max-height: 50px; border: solid 0.1rem black; border-radius: 0.25rem; padding: 0.2rem; margin: 0 0 0.5rem 0;'}
            on:input={({detail: value}) => section.alt = value}
            validate={validateText}
            bind:valid={isValidAlt}
            placeholder="Type something..."
        />
        {/if}

        <div style="margin-top: 0rem;">
            <label><input type=checkbox bind:checked={section.paragraph} disabled={!paragraphConfigurable}>Start of paragraph</label>
            {#if section.paragraph === true}
            <label><input type=checkbox checked={true} disabled="true">Start of line</label>
            {:else}
            <label><input type=checkbox bind:checked={section.line}>Start of line</label>
            {/if}
            <label><input type=checkbox bind:checked={beRegion}>Mark as region</label>
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

    <div style="display: flex; justify-content: space-between; margin-top: 1rem; height: 25px;">
        <div>
            {#if remove !== undefined}
			<Button onclick={_delete} height={'100%'} colors={{'default': '#FF5757'}}>Delete</Button>
            {:else}
            <Button onclick={_close} height={'100%'} colors={{'default': '#FF5757'}}>Delete</Button>
            {/if}
        </div>
        <div>
            <Button onclick={_done} disabled={!(isValidText && (!hasAltText || isValidAlt) && (!beRegion || isValidStart && isValidEnd))} height={'100%'}>Done</Button>
        </div>
    </div>
</div>