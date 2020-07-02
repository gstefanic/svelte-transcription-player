import interact from 'interactjs'

export function touchable(node, options) {
    const defaultOptions = {
        events: ['down', 'move', 'up', 'cancel', 'tap', 'doubletap', 'hold'],
        origin: 'self',
        ignoreFrom: '',
        allowFrom: '',
        holdDuration: 1000,
    };

    options = Object.assign({}, options, defaultOptions);

    const intrct = interact(node).pointerEvents(options);

    options.events.forEach(eventType => intrct.on(eventType, pointerEvent => node.dispatchEvent(new CustomEvent(eventType, {
        detail: pointerEvent,
    }))));

    return {
        destroy: () => intrct.unset(node),
    }

}