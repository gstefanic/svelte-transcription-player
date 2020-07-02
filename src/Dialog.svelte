<script>
    /**
     * @emits close if `closable` is truthy and 
     */
    import Modal from './Modal';
    import { createEventDispatcher } from 'svelte';
    export let visible;
    export let closable = true;
    export let maxWidth;
    export let minWidth;
    export let width = 0.8;

    let containerWidth;

    const dispatch = createEventDispatcher();

    const close = () => {
        if (closable) {
            visible = false;
            dispatch('close');
        }
    };
</script>

{#if visible}
<Modal
    bind:containerWidth={containerWidth}
    on:outer-click={close} 
    css={`display: flex; flex-flow: column; width: ${containerWidth * width}px; max-width: ${maxWidth}px; min-width: ${minWidth}px;`}>
    <div class="section-editing-container" style="font-size: 1rem;">

        <div style="display: flex;">
            <div style="flex: 1; align-self: flex-start;">
                <slot name="title"></slot>
            </div>
            {#if closable}
            <span on:click={close} class="close" style="flex: 0 0 21px;"></span>
            {/if}
        </div>

        <div style="margin-top: 0.5rem; display: flex; flex-flow: column;">
            <slot name='body'></slot>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 1rem;">
            <div>
                <slot name='bottom-left'></slot>
            </div>
            <div>
                <slot name='bottom-right'></slot>
            </div>
        </div>
    </div>
</Modal>
{/if}

<style>
    .close {
        background-image: url('./images/clear-24px.svg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 100% 100%;
    }
</style>