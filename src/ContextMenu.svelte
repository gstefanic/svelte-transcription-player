<script>
    // Version 0.4.1
    import { setContext as baseSetContext, onMount, onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';
    import { preventScrolling, isAncestorOfNode, disableDefaultContextMenu } from './utils';

    export let key = 'simple-context-menu';
    export let setContext = baseSetContext;
    export let transitionBg = fade;
    export let transitionBgProps = { duration: 250 };
    
    let _pageX, _pageY, _actions = [];

    const toVoid = () => {};
    let onOpen = toVoid;
    let onClose = toVoid;
    let onOpened = toVoid;
    let onClosed = toVoid;

    let enableScroll;

    const open = (
        {pageX, pageY} = {},
        actions = [],
        callback = {}
    ) => {
        console.log('ContextMenu/open', pageX, pageX, actions)
        _actions = actions,
        _pageX = pageX;
        _pageY = pageY;
        onOpen = callback.onOpen || toVoid;
        onClose = callback.onClose || toVoid;
        onOpened = callback.onOpened || toVoid;
        onClosed = callback.onClosed || toVoid;
        enableScroll = preventScrolling();
    };

    const close = (callback = {}) => {
        onClose = callback.onClose || onClose;
        onClosed = callback.onClosed || onClosed;
        _pageX = undefined;
        _pageY = undefined;
        _actions = [];
        closeSubmenu();

        enableScroll = enableScroll && enableScroll();
    };

    setContext(key, { open, close });

    let contentElement;
    let enableDefaultContextMenu;
    // onMount(async () => enableDefaultContextMenu = disableDefaultContextMenu(contentElement));
    onDestroy(async () => {
        // enableDefaultContextMenu && enableDefaultContextMenu();
        enableScroll = enableScroll && enableScroll();
    });


    let windowW, windowH, menuW, menuH;

    const calcMenuDimentions = (pageX, pageY, windowH, windowW, menuH, menuW) => {
        console.log('calcMenuDimentions', pageX, pageY, windowW, windowH)
        if (pageX === undefined || pageY === undefined) return;
        return {
            top: pageY,
            left: pageX < (windowW / 2) ? pageX : (pageX - menuW),
        };
    };

    $: menu = calcMenuDimentions(_pageX, _pageY, windowH, windowW, menuH, menuW);

    const handleBgMouseup = event => {
        if (menu !== undefined && !isAncestorOfNode(menuElement, event.target)) {
            close();
        }
    }

    const performAction = fn => () => {
        (fn || toVoid)();
        close();
    };

    let submenu;
    const openSubmenu = sm => {
        submenu = sm;
    };

    const closeSubmenu = () => {
        submenu = undefined;
    };

    let menuElement;

    const preventDefault = e => {
        if (isAncestorOfNode(contentElement, event.target) || isAncestorOfNode(menuElement, event.target)) {
            e.preventDefault();
        }
    };

</script>

<svelte:window bind:outerWidth={windowW} 
    bind:outerHeight={windowH} 
    on:mousedown={handleBgMouseup}
    on:touchstart={handleBgMouseup}
    on:contextmenu={preventDefault}
/>

{#if menu !== undefined}
<div class="menu" bind:this={menuElement}
    transition:transitionBg={transitionBgProps}
    style="--menu-left:{menu.left}px; --menu-top:{menu.top}px" 
    bind:offsetWidth={menuW}
    bind:offsetHeight={menuH}>
    <div class="items-wrapper">
        {#if submenu !== undefined}
            <div class="menu-item back" on:click={closeSubmenu}>
                {_actions[submenu].name}<span class="clone-submenu submenu-indicator"/>
            </div>
            <div class="section-divider"/>
            {#each _actions[submenu].submenu as {divider, name, callback}, index (name, callback)}
                {#if divider === true && index !== 0}
                    <div class="section-divider"/>
                {/if}
                <div class="menu-item" on:click={performAction(callback)}>
                    {name}
                </div>
            {/each}
        {:else}
            {#each _actions as {divider, name, callback, submenu}, index (name, callback)}

                {#if divider === true && index !== 0}
                    <div class="section-divider"/>
                {/if}

                {#if submenu !== undefined && submenu.length > 0}
                    <div class="menu-item" on:click={openSubmenu(index)}>
                        {name} <span class="submenu-indicator"></span>
                    </div>    
                {:else}
                    <div class="menu-item" on:click={performAction(callback)}>
                        {name}
                    </div>
                {/if}

            {/each}
        {/if}
    </div>
</div>
{/if}
<div bind:this={contentElement} on:contextmenu={preventDefault}>
    <slot></slot>
</div>

<style>
    .menu {
        position: fixed;
        top: var(--menu-top);
        left: var(--menu-left);
        z-index: 1000;
        background: red;

        min-width: 5rem;
        color: black;
        background: white;

        box-shadow: 0 4px 5px 3px rgba(0, 0, 0, 0.2);
        border-radius: 0.5rem;
    }

    .items-wrapper {
        padding: 4px 0;
    }

    .menu-item {
        position: relative;
        display: flex;
        align-items: center;
        font-weight: 500;
        font-size: 14px;
        /* font-size: 0.8rem; */
        padding: 4px 40px 4px 20px;
        /* padding: 0.3rem 3rem 0.3rem 1.5rem; */
        cursor: pointer;
    }

    .menu-item:hover {
        background: rgba(0, 0, 0, 0.2);
    }

    .section-divider {
        position: relative;
        background: grey;
        height: 1px;
        /* margin: 0 0.75rem 0 0.75rem; */
        margin: 0 10px 0 10px;
    }

    .submenu-indicator {
        background-image: url('./images/keyboard_arrow_right-24px.svg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 100% 100%;
        position: absolute;
        width: 20px;
        height: 20px;
        right: 4px;
        top: 3.5px;
    }

    .clone-submenu {
        background-size: 100% 100%;
        -moz-transform: scaleX(-1);
        -o-transform: scaleX(-1);
        -webkit-transform: scaleX(-1);
        transform: scaleX(-1);
        filter: FlipH;
    }

    .back {
        font-weight: 700;
    }

</style>