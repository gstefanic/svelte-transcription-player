<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import interact from 'interactjs';

    export let maxHeight = 300;
    export let minHeight = 100;

    const dispatch = createEventDispatcher();
    let container;

    onMount(async () => {
        console.log('Resizable mounted', container);
    });

    const verticalDrag = node => {
        const interaction = interact(node).draggable({
            listeners: {
                move: event => {
                    const height = container.offsetHeight;
                    container.style.height = `${height + event.delta.y}px`;
                }
            },
            lockAxis: 'y',
            cursorChecker: () => 'n-resize',
        });

        return {
            destroy: () => {
                interaction.unset();
            }
        }
    };

</script>

<div bind:this={container} class="container" style="--max-h:{maxHeight}px; --min-h:{minHeight}px;">
    <slot></slot>
</div>
<div class="handle" use:verticalDrag />

<style>
    .container {
        overflow-y: auto;
        max-height: var(--max-h);
        min-height: var(--min-h);
        position: relative;
    }

    .handle {
        --handle-color: gray;
        --handle-height: 2px;
        --container-h: 10px;
        bottom: 0;
        height: var(--container-h);
        background: linear-gradient(to bottom, 
            transparent calc((var(--container-h) - var(--handle-height)) / 2), 
            var(--handle-color) calc((var(--container-h) - var(--handle-height)) / 2), 
            var(--handle-color) calc((var(--container-h) + var(--handle-height)) / 2), 
            transparent calc((var(--container-h) + var(--handle-height)) / 2) 
        );
        width: 100%;
        touch-action: none;
        user-select: none;
        border-radius: 0.1rem;
        position: relative;
    }

    ::-webkit-scrollbar {
        width: 10px;
    }

    ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 0.5rem;
    }
    
    ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 0.5rem;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: #555; 
    }
</style>