<script>
    import { fade } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    export let text;
    export let color;

    const dispatch = createEventDispatcher();

    const remove = () => dispatch('remove');
</script>

<div
	class="notification"
	role="status"
	aria-live="polite"
	in:fade
	out:fade
	style="--background-color: {color}"
>
	<div class="content">
		{text}
	</div>
	<button
		class="button"
		on:click={remove}
		aria-label="delete notification"
	>
		&times;
	</button>
</div>


<style>

    .notification {
        background-color: var(--background-color);
        position: relative;
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        /* margin: 12px; */
        color: #fff;
        border-radius: 0.25rem;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
        min-height: 0;
        min-width: 128px;
        overflow: hidden;
        font-size: 1rem;
    }

    .button {
        display: block;
        width: 30px;
        padding: 0 0 2px;
        margin: 0;
        border: none;
        border-left: 1px solid #eee;
        outline: none;
        background: none;
        cursor: pointer;
        font-size: 20px;
        color: #000;
        box-sizing: border-box;
    }

    .button:hover {
        background: rgba(0, 0, 0, 0.01);
    }

    .content {
        width: 300px;
        padding: 6px 6px 6px 6px;
        box-sizing: border-box;
        word-wrap: break-word;
        font-size: 0.8rem;
    }
</style>