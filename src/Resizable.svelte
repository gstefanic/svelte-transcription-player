<script>
    import { onMount, createEventDispatcher, setContext } from 'svelte';
    import interact from 'interactjs';

    export let maxHeight;
    export let minHeight;
    export let resizable = true;
    export let autoscroll;

    const key = 'resizable';

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

    const isVisible = (offsetTop) => {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.offsetHeight;
        // console.log('isVisible', offsetTop, containerTop, containerBottom, containerTop <= offsetTop && offsetTop <= containerBottom);
        return (containerTop <= offsetTop && offsetTop <= containerBottom);
    };

    const shouldBeVisible = ({top, bottom}) => {
        console.log('shouldBeVisible', isVisible(top), isVisible(bottom))
        if (autoscroll && (!isVisible(top) || !isVisible(bottom))) {
            scrollTo(top);
        }
    };

    const scrollTo = (offsetTop) => {
        container.scrollTo({top: offsetTop, behavior: 'smooth'});
    };

    let containerWidth;
    $: emit('container-width-change', containerWidth);

    let listeners = {};
    const on = (event, cb) => {
        if (!(listeners[event] instanceof Set)) {
            listeners[event] = new Set();
        }
        listeners[event].add(cb);
    };

    const off = (event, cb) => {
        if (listeners[event] instanceof Set) {
            listeners[event].delete(cb);
        }
    };

    const emit = (event, ...args) => {
        if (listeners[event] instanceof Set) {
            listeners[event].forEach(cb => {
                cb(...args);
            });
        }
    };

    setContext(key, {
        getContainer: () => container,
        isVisible: isVisible,
        shouldBeVisible: shouldBeVisible,
        scrollTo: scrollTo,
        on, 
        off,
    });

</script>

<div bind:this={container} bind:offsetWidth={containerWidth} class="container" style="--max-h:{maxHeight}; --min-h:{minHeight};">
    <slot></slot>
</div>
{#if resizable}
<div class="handle" use:verticalDrag />
{/if}

<style>
    .container {
        overflow-y: auto;
        min-height: var(--min-h);
        max-height: var(--max-h);
        position: relative;
        background-color: aliceblue;
        border-radius: 0.5rem;
    }

    .handle {
        --handle-color: gray;
        --handle-height: 4px;
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