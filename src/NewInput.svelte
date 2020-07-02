<script>
    /**
     * @emits input on valid input @param {string} detail content
     * @emits focus on focus
     * @emits blur on blur
     */
    import { createEventDispatcher } from 'svelte';
    export let value;
    export let contenteditable = true;
    export let validate = value => true;
    export let valid = validate(value);
    export let blurOnEnter = true;
    export let css;
    export let singleline = true;
    export let placeholder;

    let content;

    $: content = value;

    const dispatch = createEventDispatcher();

    let inputed;

    const inputable = node => {
        const onKeyDown = event => {
            inputed = true;
        };

        node.addEventListener('keydown', onKeyDown);

        return () => node.removeEventListener('keydown', onKeyDown);
    };

    const focusable = (node, blurOnEnter = false) => {

        let enterPressed;

        const focuschange = event => {
            event.stopImmediatePropagation();
            if (enterPressed) {
                enterPressed = false;
            } else {
                dispatch(event.type);
            }
            if (event.type === 'blur') {
                content = value;
            }
        };

        const onKeyDown = event => {
            if (event.key === 'Enter') {
                enterPressed = true;
                node && node.blur && node.blur();
                dispatch('blur');
            }
        };

        node.addEventListener('focus', focuschange);
        node.addEventListener('blur', focuschange);
        if (blurOnEnter) {
            node.addEventListener('keydown', onKeyDown);
        }

        return () => {
            node.removeEventListener('focus', focuschange);
            node.removeEventListener('blur', focuschange);
            node.removeEventListener('keydown', onKeyDown);
        }
    };

    const onContentChange = () => {
        valid = validate(content);
        if (valid && inputed) {
            dispatch('input', content);
        }
    };

    $: onContentChange(content);

</script>

{#if contenteditable}
<span style={css}
    class="content editable"
    class:error={!valid}
    contenteditable="true"
    class:single-line={singleline}
    bind:textContent={content}
    use:inputable
    use:focusable={blurOnEnter}
    {placeholder}
/>
{:else}
<span style={css} class="content" placeholder="Type something..." class:error={!valid} on:click>{value}</span>
{/if}

<style>
    .error {
        background-color: red;
    }

    .content.editable {
        touch-action: initial;
        user-select: initial;
        -webkit-touch-callout: initial;
        -webkit-user-select: initial;
        -khtml-user-select: initial;
        -moz-user-select: initial;
        -ms-user-select: initial;
    }

    .content {
        overflow-y: auto; 
        overflow-x: hidden; 
        display: inline-block;
        max-height: var(--max-height);
    }

    [contenteditable="true"].content.single-line {
        white-space: nowrap;
        overflow: hidden;
    }

    /* [contenteditable="true"].content.single-line br {
        display:none;

    }

    [contenteditable="true"].content.single-line * {
        display:inline;
        white-space:nowrap;
    } */

    .content[placeholder]:empty:before {
        content: attr(placeholder);
        color: #555; 
    }

    /* .content[placeholder]:empty:focus:before {
        content: "";
    } */

</style>