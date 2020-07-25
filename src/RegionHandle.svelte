<script>
    import { createEventDispatcher } from 'svelte';
    import interact from 'interactjs';

    const dispatch = createEventDispatcher();

    const eventListeners = node => {
        const intrct = interact(node).draggable({
            listeners: {
                move: event => dispatch('resizing', { dx: event.dx }),
                end: event => dispatch('resized'),
            },
            cursorChecker: () => 'ew-resize',
        })
        // ', event => dispatch('hold'));

        return () => intrct.unset();
    };

</script>

<style>
    .handle {
        width: 10px;
        height: 100%;
        background-color: transparent;
    }
</style>

<div class="handle" use:eventListeners/>
