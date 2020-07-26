<script>
    import { createEventDispatcher } from 'svelte';

    export let items;
    export let isSubmenu = false;
    export let title;

    const dispatch = createEventDispatcher();

    const toVoid = () => {};

    const performAction = (fn, type) => event => {
        if (type === 'checkbox') {
            fn(event.target.checked);
        } else {
            fn();
        }
        dispatch('performed')
    };

    const toggleCheckbox = fn => performAction(fn, 'checkbox');

    let submenuIndex;
    const openSubmenu = index => () => {
        submenuIndex = index;
    };

    const closeSubmenu = () => {
        dispatch('close');
    };

    const submenuClosed = () => {
        submenuIndex = undefined;
    };


</script>

<div class="items-wrapper" style="--vertical-padding: {isSubmenu ? 0 : 4}px">
{#if submenuIndex === undefined}
{#if title || isSubmenu}
    <div class="menu-item back" on:click={closeSubmenu}>
        {title || 'Back'}{#if isSubmenu}<span class="close-submenu submenu-indicator"/>{/if}
    </div>
    <div class="section-divider"/>
{/if}
{#each items as {divider, name, callback, submenu, type, checked, disabled}, index (name, callback)}

    {#if divider === true && index !== 0}
        <div class="section-divider"/>
    {/if}

    {#if submenu !== undefined && submenu.length > 0}
        <div class="menu-item" class:disabled on:click|preventDefault={disabled ? toVoid : openSubmenu(index)}>
            {name} <span class="submenu-indicator"></span>
            {#if typeof disabled === 'string'}
                <div class="disabled-reason tooltip"><span class="tooltiptext">{disabled}</span></div>
            {/if}
        </div>
    {:else if type === 'checkbox'}
        <label class="menu-item" class:disabled>
            {name}<input class="checkbox" type=checkbox checked={checked} on:change={disabled ? toVoid : toggleCheckbox(callback)}>
            {#if typeof disabled === 'string'}
                <div class="disabled-reason tooltip"><span class="tooltiptext">{disabled}</span></div>
            {/if}
        </label>
    {:else}
        <div class="menu-item" class:disabled on:click|preventDefault={disabled ? toVoid : performAction(callback)}>
            {name}
            {#if typeof disabled === 'string'}
                <div class="disabled-reason tooltip"><span class="tooltiptext">{disabled}</span></div>
            {/if}
        </div>
    {/if}

{/each}
{:else}
    <svelte:self title={items[submenuIndex].name} 
        isSubmenu={true} items={items[submenuIndex].submenu}
        on:close={submenuClosed}
        on:performed
    />
{/if}
</div>

<style>
    .items-wrapper {
        padding: var(--vertical-padding) 0;
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

    .checkbox {
        position: absolute;
        width: 14px;
        height: 14px;
        right: 8px;
        top: 6.5px;
    }

    .close-submenu {
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

    .menu-item.disabled {
        color: grey;
    }

    .menu-item.disabled > .submenu-indicator {
        opacity: 0.5;
    }

    .menu-item.disabled:hover {
        background: rgba(0, 0, 0, 0);
    }

    .disabled-reason {
        position: absolute;
        width: 14px;
        height: 14px;
        right: 10px;
        top: 7px;
        background-color: #fff;
    }

    .tooltip {
        /* position: relative; */
        display: inline-block;
        background-image: url('./images/help_outline-24px.svg');
        fill: grey;
        background-repeat: no-repeat;
        background-position: center;
        background-size: 110% 110%;
    }

    .tooltip .tooltiptext {
        visibility: hidden;
        width: 120px;
        background-color: black;
        color: #fff;
        text-align: center;
        border-radius: 6px;
        padding: 5px 0;

        /* Position the tooltip */
        position: absolute;
        z-index: 1;
        top: -5px;
        right: 105%;
    }

    .tooltip:hover .tooltiptext {
        visibility: visible;
    }

    .tooltip:hover {
        background-image: url('./images/help-24px.svg');
    }
</style>