<script>
    // Version 0.4.1
    import { setContext as baseSetContext, onMount, onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';
    import { disableScroll, enableScroll, disable, isAncestorOfNode, disableDefaultContextMenu } from './utils';
    import Menu from './Menu';

    export let key = 'simple-context-menu';
    export let setContext = baseSetContext;
    export let transitionBg = fade;
    export let transitionBgProps = { duration: 250 };
    
    let _pageX, _pageY, _items = [], _closeOnAction = true, _openDirection;

    const toVoid = () => {};
    let onOpen = toVoid;
    let onClose = toVoid;
    let onOpened = toVoid;
    let onClosed = toVoid;

    export const open = (
        {pageX, pageY, closeOnAction = true, openDirection} = {},
        items = [],
        callback = {}
    ) => {
        _items = items,
        _pageX = pageX;
        _pageY = pageY;
        _closeOnAction = closeOnAction;
        _openDirection = openDirection;
        onOpen = callback.onOpen || toVoid;
        onClose = callback.onClose || toVoid;
        onOpened = callback.onOpened || toVoid;
        onClosed = callback.onClosed || toVoid;
        disableScroll();
    };

    export const close = (callback = {}) => {
        onClose = callback.onClose || onClose;
        onClosed = callback.onClosed || onClosed;
        _pageX = undefined;
        _pageY = undefined;
        _items = [];
        // closeSubmenu();

        enableScroll();
    };

    setContext(key, { open, close });

    export let contentContainer;
    let enableDefaultContextMenu;
    onMount(async () => {

        if (contentContainer instanceof HTMLElement) {
            contentContainer.addEventListener('contextmenu', preventDefault);
        } else {
            // throw new Error('contentContainer instanceof HTMLElement');
        }

        return () => {
            enableScroll = enableScroll && enableScroll();
            if (contentContainer instanceof HTMLElement) {
                contentContainer.removeEventListener('contextmenu', preventDefault);
            }
        }
    });


    let windowW, windowH, menuW, menuH;

    const calcMenuDimentions = (pageX, pageY, windowH, windowW, menuH, menuW) => {
        if (pageX === undefined || pageY === undefined) return;
        if (_openDirection === 'left') {
            return {
                top: pageY,
                left: (pageX - menuW),
            };
        } else if (_openDirection === 'right') {
            return {
                top: pageY,
                left: pageX,
            };
        } else {
            return {
                top: pageY,
                left: pageX < (windowW / 2) ? pageX : (pageX - menuW),
            };
        }
    };

    $: menu = calcMenuDimentions(_pageX, _pageY, windowH, windowW, menuH, menuW);

    let container;

    const preventDefault = e => {
        if (isAncestorOfNode(contentContainer, event.target) || isAncestorOfNode(container, event.target)) {
            e.preventDefault();
        }
    };

    const handleBgMouseup = event => {
        if (menu !== undefined && !isAncestorOfNode(container, event.target)) {
            close();
        }
    };

    const actionPerformed = () => {
        _closeOnAction && close();
    };

</script>

<svelte:window bind:outerWidth={windowW} 
    bind:outerHeight={windowH} 
    on:mousedown={handleBgMouseup}
    on:touchstart={handleBgMouseup}
    on:contextmenu={preventDefault}
/>

{#if menu !== undefined}
<div class="cntnr" bind:this={container}
    transition:transitionBg={transitionBgProps}
    style="--menu-left:{menu.left}px; --menu-top:{menu.top}px" 
    bind:offsetWidth={menuW}
    bind:offsetHeight={menuH}>
    <Menu items={_items} on:performed={actionPerformed}/>
</div>
{/if}

<slot></slot>

<style>
    .cntnr {
        position: fixed;
        top: var(--menu-top);
        left: var(--menu-left);
        z-index: 1000;
        width: fit-content;

        min-width: 5rem;
        color: black;
        background: white;
        box-shadow: 0 4px 5px 3px rgba(0, 0, 0, 0.2);
        border-radius: 0.5rem;
    }
</style>