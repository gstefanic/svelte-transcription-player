<script>
    import { onMount, getContext, tick, createEventDispatcher } from 'svelte';
    import { Iterator, getOffsetPosition, textMetrics } from './utils';
    import interact from 'interactjs';
    import { default as Color } from 'color';
    import { activeIndex } from './store';

    export let text;
    export let highlight;
    export let resizable = true;
    export let color = 'red';
    export let index;
    export let container;
    export let containerWidth;
    export let sectionIndex;
    export let fontSize;
    export let lineHeight;
    export let padding = 'normal';

    const getRegionColor = (color) => {
        if ($activeIndex === index) {
            return Color(color).lighten(0.35).fade(0.40).string();
        } else {
            return Color(color).lighten(0.5).fade(0.5).string();
        }
    };

    $: sectionColor = getRegionColor(color, $activeIndex);
    $: handleColor = Color(color).fade(0.75).string();
    $: fontSizeInPx = Math.min(
        textMetrics('A', container, {'line-height': padding}, fontSize).height, 
        textMetrics('A', container).height
    );

    const dispatch = createEventDispatcher();

    const log = console.log;

    export let wordElements = [];
    let partElements = [];

    onMount(async () => {});

    const { getTargets, getWordElements } = getContext('sections');

    const getPartFromWordElement = wordElement => {

    };

    const getParts = (wordElements) => {
        /**
         * @param {PartParams[]} parts 
         * @param {HTMLElement} wordElement
         * @returns {PartParams[]}
         */
        const partsReductor = (parts, wordElement) => {
            if (!wordElement) return parts;
            if (!parts[0] || parts[0].top !== wordElement.offsetTop) {
                parts.unshift({
                    top: wordElement.offsetTop,
                    left: wordElement.offsetLeft,
                    width: wordElement.offsetWidth,
                    height: wordElement.offsetHeight,
                });
            } else {
                parts[0].width += wordElement.offsetWidth;
                parts[0].height = Math.max(parts[0].height, wordElement.offsetHeight);
            }
            return parts;
        };

        /** @type {PartParams[]} */
        const parts = wordElements.reduce(partsReductor, []).reverse();

        return parts;
    };

    $: words = text.split(' ');

    $: parts = getParts(wordElements, containerWidth, fontSize, lineHeight);

    let targets, targetsByRows, handleSide, X0, Y0, snapElement, originWordElement, resetHandleDown;

    const handleDown = (sectionIndex, side) => event => {
        log('event', event);

        const touchAction = container.style.touchAction;
        container.style.touchAction = 'none';
        const saved = {targets, targetsByRows, handleSide, X0, Y0, snapElement, originWordElement};
        resetHandleDown = () => {
            container.style.touchAction = touchAction;
            ({targets, targetsByRows, handleSide, X0, Y0, snapElement, originWordElement} = saved);
            leftHandle = {
                left: 0,
                top: 0,
            };
            rightHandle = {
                right: 0,
                top: 0,
            };
            resetHandleDown = undefined;
        };

        handleSide = side;
        targets = getTargets(side, sectionIndex);

        log('handleDown', {targets});

        targetsByRows = targets.reduce( ([row, ...rest], target) => {
            if (!row) {
                return [[target], ...rest];
            } else {
                const [{offsetTop: lastOffsetTop}] = row;
                const {offsetTop} = target;
                if (offsetTop > lastOffsetTop) {
                    return [[target], row, ...rest];
                } else if (offsetTop === lastOffsetTop) {
                    const [...targets] = row;
                    return [[target, ...targets], ...rest];
                } else {
                    throw new Error('targets must be sorted by `offsetTop` asc');
                }
            }
        }, []).reverse();

        ({x: X0, y: Y0} = getOffsetPosition(event, container));

        const rowIndex = targetsByRows.findIndex(([{offsetTop, offsetHeight}]) => offsetTop <= Y0 && Y0 < (offsetTop + offsetHeight));

        if (rowIndex < 0 || rowIndex >= targetsByRows.length) {
            throw new Error('implementation error, row index out of bounds', rowIndex);
        }

        // get the nearest word element in row
        ({element: originWordElement} = Iterator(targetsByRows[rowIndex], ([first]) => first, ({distX, element}, cur, stop) => {
            const {offsetLeft, offsetWidth} = cur;
            const dist = Math.abs((handleSide === 'left' ? offsetLeft : offsetLeft + offsetWidth) - X0);
            if (dist < distX) {
                return {
                    distX: dist,
                    element: cur,
                };
            } else {
                return stop({distX, element});
            }
        }, (_, i, arr) => arr[i + 1], {
            distX: Infinity,
            element: undefined,
        }));

        if (!originWordElement) {
            throw new Error('implementation error', {rowIndex, X0, Y0, targetsByRows, originWordElement });
        }

        // split targets into rows
        log(targets);
        log('targetsByRows', targetsByRows);
        log('rowIndex', rowIndex, Y0);
        log({originWordElement});
    };

    const handleMove = event => {
        if (targets && handleSide) {
            const {x, y} = getOffsetPosition(event, container);

            // calculate row index
            let rowIndex = targetsByRows.findIndex(([{offsetTop, offsetHeight}]) => offsetTop <= y && y < (offsetTop + offsetHeight));

            if (rowIndex < 0) {
                const [[{offsetTop: offsetTopFirstRow}]] = targetsByRows;
                rowIndex = y < offsetTopFirstRow ? 0 : targetsByRows.length - 1;
            }

            // get the nearest word element in row
            ({element: snapElement} = Iterator(targetsByRows[rowIndex], ([first]) => first, ({distX, element}, cur, stop) => {
                const {offsetLeft, offsetWidth} = cur;
                const dist = Math.abs((handleSide === 'left' ? offsetLeft : offsetLeft + offsetWidth) - x);
                if (dist < distX) {
                    return {
                        distX: dist,
                        element: cur,
                    };
                } else {
                    return stop({distX, element});
                }
            }, (_, i, arr) => arr[i + 1], {
                distX: Infinity,
                element: undefined,
            }));

            // move handle to that element
            if (handleSide === 'left') {
                leftHandle = {
                    left: snapElement.offsetLeft - leftHandleElement.offsetParent.offsetLeft,
                    top: snapElement.offsetTop - leftHandleElement.offsetParent.offsetTop,
                };
            } else if (handleSide === 'right') {
                const tmp1 = (rightHandleElement.offsetParent.offsetLeft + rightHandleElement.offsetParent.offsetWidth);
                const tmp2 = (snapElement.offsetLeft + snapElement.offsetWidth);

                rightHandle = {
                    top: snapElement.offsetTop - rightHandleElement.offsetParent.offsetTop,
                    right: tmp1 - tmp2,
                };
            } else {
                throw new Error('invalid handle side');
            }
        }
    };

    const handleUp = event => {
        log('handleUp');
        if (targets && handleSide && snapElement) {
            const originWordIndex = targets.indexOf(originWordElement);
            const releaseWordIndex = targets.indexOf(snapElement);
            const diff = originWordIndex - releaseWordIndex;
            if (handleSide === 'left' || handleSide === 'right') {
                dispatch('resize', {
                    side: handleSide,
                    diff: diff,
                });
            } else {
                throw new Error('invalid handle side');
            }
        }
        // targets = undefined;
        // handleSide = undefined;
        // snapElement = undefined;
        resetHandleDown && resetHandleDown();
    };

    let leftHandle = {
        left: 0,
        top: 0,
    }, rightHandle = {
        right: 0,
        top: 0,
    };

    let leftHandleElement, rightHandleElement;

    const interactable = node => {
        const interaction = interact(node);

        let held;
        interaction.on('hold', event => {
            held = true;
            node.dispatchEvent(new CustomEvent('tap', { detail: {event} }));
            node.dispatchEvent(new CustomEvent('hold', { detail: {event} }));
        });

        interaction.on('tap', event => {
            if (held) {
                held = false;
            } else {
                node.dispatchEvent(new CustomEvent('tap', { detail: {event} }));
            }
        });

        return {
            destroy() {
                interaction.unset();
            },
        };
    };

    const forward = (eventType, params) => ({detail}) => dispatch(eventType, params ? Object.assign(detail, params) : detail);

</script>

<svelte:window on:mousemove={targets ? handleMove : undefined} 
    on:mouseup={targets ? handleUp : undefined} 
    on:touchmove={targets ? handleMove : undefined} 
    on:touchend={targets ? handleUp : undefined}/>

{#each words as word, wordIndex}
<!-- <span class="word" bind:this={wordElements[wordIndex]}>{word}{@html wordIndex === words.length - 1 ? '' : '&nbsp;'}</span> -->
{#if highlight}
<span class="word" 
    bind:this={wordElements[wordIndex]}>
    {word}&nbsp;
</span>
{:else}
<span class="word" 
    bind:this={wordElements[wordIndex]}
    use:interactable
    on:tap={forward('word-click', { wordIndex })}
    on:hold={forward('word-hold', { wordIndex })}>
    {word}&nbsp;
</span>
{/if}
{/each}

{#if highlight}
{#each parts as {top, left, height, width}, partIndex}
<div class="part" bind:this={partElements[partIndex]} 
    style="--top: {top}px; --left: {left}px; --height: {height}px; --width: {width}px; --section-color: {sectionColor}; --handle-color: {handleColor}; --inner-part-height: {fontSizeInPx}px;" 
    use:interactable
    on:tap={forward('section-click')}
    on:hold={forward('section-hold')}>
    {#if resizable && partIndex === 0}
    <div class="handle-container left" bind:this={leftHandleElement} 
        style="--left: {leftHandle.left}px; --top: {leftHandle.top}px;" 
        on:mousedown={handleDown(sectionIndex, 'left')}
        on:touchstart={handleDown(sectionIndex, 'left')}>
        <div class="handle" style="position: absolute; left: 0; top: 0; height: 100%; width: 4px;"></div>
    </div>    
    {/if}

    {#if resizable && partIndex === parts.length - 1}
    <div class="handle-container right" bind:this={rightHandleElement} 
        style="--left: {rightHandle.left}px; --top: {rightHandle.top}px; --right: {rightHandle.right}px" 
        on:mousedown={handleDown(sectionIndex, 'right')}
        on:touchstart={handleDown(sectionIndex, 'right')}>
        <div class="handle" style="position: absolute; right: 0; top: 0; height: 100%; width: 4px;"></div>
    </div>
    {/if}
    <div class="part-inner"></div>
</div>
{/each}
{/if}

<style>
    .word {
        display: inline-block;
    }

    .part {
        position: absolute;
        top: var(--top);
        left: var(--left);
        height: var(--height);
        width: var(--width);
        background-color: transparent;
        border-radius: 0.25rem;
    }

    .part-inner {
        position: absolute;
        background-color: var(--section-color);
        border-radius: 0.25rem;
        left: 0;
        z-index: -1;
        width: 100%;
        top: 50%;
        height: var(--inner-part-height);
        transform: translateY(-50%);
    }

    .handle-container {
        position: absolute;
        background-color: transparent;
        /* height: 100%; */
        width: 10px;
        cursor: ew-resize;
        touch-action: none;

        top: 50%;
        height: var(--inner-part-height);
        transform: translateY(-50%);
    }

    .handle {
        background-color: var(--handle-color);
    }

    .left > .handle {
        border-top-left-radius: 0.25rem;
        border-bottom-left-radius: 0.25rem;
    }

    .right > .handle {
        border-top-right-radius: 0.25rem;
        border-bottom-right-radius: 0.25rem;
    }

    .left {
        left: var(--left);
        top: calc(50% + var(--top));
    }

    .right {
        right: var(--right);
        left: var(--left);
        top: calc(50% + var(--top));
    }
</style>