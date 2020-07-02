<script>
    import { createEventDispatcher } from 'svelte';

    export let css;
    export let containerWidth;

    const dispatch = createEventDispatcher();
    const onBgClick = event => {
        dispatch('outer-click', event);
    };
</script>

<div bind:offsetWidth={containerWidth} class="background" on:click|self={onBgClick}>
    <div class="container">
        <div class="content" style={css}>
            <slot></slot>
        </div>
    </div>
</div>

<style>
    .background {
        z-index: 1000;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.66);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .container {
        background-color: #fefefe;
        border-radius: 0.5rem;
        max-width: 100%;
        /* max-height: 100%; */
        flex: 0 0 content;
        /* position: relative;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: inline-block; */
        box-shadow: 0 0 0 1px black;
    }

    .content {
        padding: 0.5rem;
    }
</style>