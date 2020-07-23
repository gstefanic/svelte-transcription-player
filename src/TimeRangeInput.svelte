<script>
    import { createEventDispatcher } from 'svelte';
    import NewInput from './NewInput';
    import { isFloat, toFixed } from './utils';
    var Color = require('color');

    export let start, end, editMode;
    export let isValidStart, isValidEnd;
    export let color = 'green';

    const dispatch = createEventDispatcher();

    const parse = content => isFloat(content, 2) ? Number(content) : undefined;

    const stringify = value => isFloat(value) ? (toFixed(value, 2) + '') : undefined;

    let startHasFocus, endHasFocus;

    let enterPressed;
    const on = {
        blur: () => {
            // console.log('on:blur', start, end);
            start = toFixed(start, 2);
            end = toFixed(end, 2);
            dispatch('blur');
        },
        focus: () => {
            // console.log('on:focus')
            dispatch('focus');
        },
    };

    const validateStart = value => {
        try {
            value = parseFloat(value)
            return isFloat(value, 2) && isValidStart(value)
        } catch (error) {
            return false;
        }
    };
    const validateEnd = value => {
        return isFloat(value, 2) && isValidEnd(value)
    };

    let isStartValid = validateStart(start);
    let isEndValid = validateStart(end);

    const onStartInput = ({detail: value}) => {
        start = value;
        dispatch('input', value);
    };

    const onEndInput = ({detail: value}) => {
        end = value;
        dispatch('input', value);
    };

</script>

<style>
    .container {
        display: flex;
        /* background: var(--color); */
        background: transparent;
        padding: 0 0.25rem;
    }

    .value {
        flex: 1 0 0;
    }

    .hidden {
        display: none;
    }

    .divider {
        background-image: url('./images/code-24px.svg');
        background-repeat: no-repeat;
        background-size: 80% 80%;
        background-position: center;
        width: 24px;
    }
</style>

<div class="container" style="--color:{Color(color).lighten(0.5).fade(0).string()}">
    <span class:hidden={endHasFocus} class="value value-start">
        <NewInput value={start}
            css={'min-width: 20px; max-width: 100px;'}
            contenteditable={editMode} 
            validate={validateStart} 
            valid={isStartValid} 
            on:input={onStartInput} 
            on:focus={on.focus} 
            on:blur={on.blur}/>
    </span>
    <span class="divider" class:hidden={startHasFocus || endHasFocus}></span>
    <span class:hidden={startHasFocus} class="value value-end" >
        <NewInput value={end} 
            css={'min-width: 20px; max-width: 100px;'}
            contenteditable={editMode} 
            on:input={onEndInput} 
            validate={validateEnd} 
            bind:valid={isEndValid} 
            on:focus={on.focus} 
            on:blur={on.blur}/>
    </span>
</div>