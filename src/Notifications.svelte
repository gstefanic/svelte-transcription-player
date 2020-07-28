<script>
    import Notification from './Notification';
    import { createEventDispatcher, setContext } from 'svelte';

    const dispatch = createEventDispatcher();
    export const key = 'simple-notifications';
    let notifications = [];

    let ids = 0;
    export let defaultColor = '#4353FF';

    export const addNotification = ({text, color = defaultColor, duration = Infinity, component = Notification}) => {
        if (!text) {
            throw new Error('Impl error');
        }

        const notification = {
            text, 
            color, 
            component, 
            id: ids++,
        };

        notifications = [...notifications, notification];

        if (duration !== Infinity) {
            if (isNaN(parseInt(duration)) || duration < 0) {
                throw new Error('Impl error');
            }
            setTimeout(_removeNotification(notification.id), duration);
        }

        dispatch('add', {id: notification.id});
        return notification.id;
    };

    const _removeNotification = id => () => {
        notifications = notifications.filter(notification => notification.id !== id);
        dispatch('remove', {id});
    };

    export const removeNotification = id => _removeNotification(id)();

    setContext(key, {
        addNotification,
        removeNotification,
    });

</script>

<div class="notifications">
    {#each notifications as {id, text, color, component} (id)}
    <div class="notification">
        <svelte:component this={component} {text} {color} on:remove={_removeNotification(id)}/>
    </div>
    {/each}
</div>
<slot></slot>

<style>
    .notifications {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999;
        display: flex;
        flex-direction: column;
    }

    .notification {
        position: relative;
        margin: 4px;
    }
</style>