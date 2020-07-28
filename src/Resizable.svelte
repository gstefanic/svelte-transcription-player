<script>
    import { onMount, createEventDispatcher, setContext } from 'svelte';
    import interact from 'interactjs';

    export let autoscroll = true;

    const key = 'resizable';

    const dispatch = createEventDispatcher();
    export let container;

    $: onContaierChange(container);

    const onContaierChange = () => {
        emit('container-added');
        emit('container-removed');
    };

    const isVisible = (offsetTop) => {
        if (container instanceof HTMLElement) {
            const containerTop = container.scrollTop;
            const containerBottom = containerTop + container.offsetHeight;
            return (containerTop <= offsetTop && offsetTop <= containerBottom);
        } else {
            return true;
        }
    };

    const shouldBeVisible = ({top, bottom}) => {
        if (autoscroll && (!isVisible(top) || !isVisible(bottom))) {
            scrollTo(top);
        }
    };

    const scrollTo = (offsetTop) => {
        if (container instanceof HTMLElement) {
            container.scrollTo({top: offsetTop, behavior: 'smooth'});
        }
    };

    export let containerWidth;
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

<slot></slot>
