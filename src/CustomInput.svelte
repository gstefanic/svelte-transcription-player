<script>
    import { beforeUpdate, afterUpdate, onMount, createEventDispatcher } from 'svelte';
    import { isFunction, getCaretPosition, setCaretPosition } from './utils';
    import interact from 'interactjs';

    export let value;
    export let contenteditable;
    export let focus;
    export let validate = value => true;

    export let stringify = value => {
        try {
            const res = (JSON.stringify(value));
            return res;
        } catch (error) {
            return undefined;
        }
    };

    export let parse = content => {
        try {
            const res = (JSON.parse(content));
            return res;
        } catch (error) {
            return undefined;
        }
    };

    let naturalFocusChange;
    $: onFocusChanged(focus);
    const onFocusChanged = () => {
        if (naturalFocusChange) {
            naturalFocusChange = false;
        } else {
            input && (focus ? input.focus() : input.blur());
        }
    }

    const dispatch = createEventDispatcher();

    let invalid, error, errorTimer;
    let content, input;
    let editablecontent;

    const clearErrorTimer = () => errorTimer = clearTimeout(errorTimer);
    const emitError = () => {
        error = true;
        if (errorTimer) clearErrorTimer();
        errorTimer = setTimeout(() => {
            error = false;
        }, 500);
    }

    // console.log('loaded', `value: |${value}|, content:|${content}|`);

    const contentToValue = () => {
        const tmp = parse(content);
        if (tmp === undefined && value !== undefined) {
            valueToContent();
            // console.error('error editing, new content:', content);
            emitError();
        } else {
            // console.info('edited, update value from', value, 'to', tmp);
            clearErrorTimer();
            invalid = !validate(tmp, content);
            if (!invalid) {
                error = false;
                value = tmp;
                dispatch('input');
                return true;
            }
        }
    };

    const valueToContent = () => {
        const tmp = stringify(value);
        if (tmp === undefined) {
            // console.error('error stringifying value', value);
            edited = true;
            contentToValue();
        } else if (content !== tmp) {
            // console.info('update content from', content, 'to', tmp);
            if (input) {
                applyCaretPosition = () => {
                    setCaretPosition(input, caretPosition);
                    applyCaretPosition = undefined;
                };
            }
            content = tmp;
            invalid = !validate(value, content);
            return true;
        }
    };

    beforeUpdate(() => {
        // console.log('beforeUpdate', `value: |${value}|, content:|${content}|`);
        if (edited) {
            edited = false;
            contentToValue();
        } else {
            valueToContent();
        }
    });

    afterUpdate(() => {
        // console.log('afterupdate')
        applyCaretPosition && applyCaretPosition();
    });

    let edited, applyCaretPosition, caretPosition;

    // onMount(async () => console.log('onMount', `value: |${value}|, content:|${content}|`));

    const inputable = node => {
        const onKeyDown = event => {
            edited = true;
            caretPosition = getCaretPosition(node);
        };

        node.addEventListener('keydown', onKeyDown);

        return () => node.removeEventListener('keydown', onKeyDown);
    };

    const enterable = node => {
        const onKeyDown = event => {
            if (event.key === 'Enter') {
                // console.log('enterable is enter');
                event.stopPropagation();
                event.preventDefault();
                dispatch('enter', event);
            }
        }

        node.addEventListener('keydown', onKeyDown);

        return () => node.removeEventListener('keydown', onKeyDown);
    };

    const holdable = node => {
        const intrct = interact(node).on('hold', event => dispatch('hold', event));

        return () => intrct.unset();
    };

    const focusable = node => {
        const focuschange = event => {
            event.stopImmediatePropagation();
            if (event.sourceCapabilities) {
                // dispatch(event.type, event)
                naturalFocusChange = true;
                focus = event.type === 'focus';
            } else {
                node.blur();
            }
        };

        node.addEventListener('focus', focuschange);
        node.addEventListener('blur', focuschange);

        return () => {
            node.removeEventListener('focus', focuschange);
            node.removeEventListener('blur', focuschange);
        }
    };
    
    const ignoreDrag = node => {
        const intrct = interact(node).draggable({
            listeners: {
                drag: event => event.stopPropagation(),
            },
            cursorChecker: () => 'text',
        });

        return () => intrct.unset();
    };

</script>

<style>
    span {
        display: inline;
        min-width: 20px;
    }

    .invalid {
        background-color: red;
    }

    .error {
        background-color: orangered;
    }

    .content {
        /* -webkit-touch-callout: initial;
        -webkit-user-select: initial;
        -khtml-user-select: initial;
        -moz-user-select: initial;
        -ms-user-select: initial;
        user-select: initial; */
        text-align: center; 
    }
</style>

{#if contenteditable}
<span class="content"
    class:invalid
    class:error
    bind:this={input}
    contenteditable="true"
    bind:innerHTML={content}
    use:ignoreDrag
    use:enterable
    use:inputable
    use:focusable
/>
{:else}
<span class="content" use:holdable on:click>{content}</span>
{/if}