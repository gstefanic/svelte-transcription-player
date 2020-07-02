<script>
    import { createEventDispatcher } from 'svelte';
    import interact from 'interactjs';

    export let color = 'green';

    const dispatch = createEventDispatcher();

    const eventListeners = node => {
        const intrct = interact(node).draggable({
            listeners: {
                move: event => dispatch('resizing', { dx: event.dx }),
                end: event => dispatch('resized'),
            },
            cursorChecker: () => 'ew-resize',
        }).on('hold', event => dispatch('hold'));

        return () => intrct.unset();
    };

</script>

<style>
    .handle {
        width: 4px;
        height: 100%;
        /* background-color: var(--handle-color); */
        background-color: transparent;
    }
</style>

<div class="handle" use:eventListeners style="--handle-color:{color}" />
