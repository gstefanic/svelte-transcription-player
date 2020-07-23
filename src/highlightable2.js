import interact from 'interactjs';
import './limit';
import { coordinatesInElement, coordinatesOnPage, textMetrics } from './utils';
var eventEmiter = require('event-emitter');
var Color = require('color');

/**
 * @typedef {Object} HighlightableParams
 * @param {String} text
 * @param {SectionParams} sections
 * @param {number} containerWidth
 */

/**
 * @typedef {Object} ModifiedSectionEvent
 * @param {number} index
 * @param {SectionParams[]} sections
 * @param {SectionParams[]} oldSections
 * @param {SectionParams} section
 */

/**
 * @typedef {Object} ActionSectionEvent
 * @param {number} index
 * @param {SectionParams} section
 * @param {Event} event
 */

 /**
 * New section event event. *
 * @event HTMLElement#new-section
 * @type {object}
 * @property {ModifiedSectionEvent} detail
 */

/**
 * @param {HTMLElement} node 
 * @param {HighlightableParams} param1
 * @fires HTMLElement#new-section when new section is created
 * @fires HTMLElement#section-changed
 * @fires HTMLElement#start-resizing
 * @fires HTMLElement#section-click
 * @fires HTMLElement#word-click
 * @fires HTMLElement#word-hold
 */
export function highlightable(node, {text, sections, containerWidth}) {
    // console.log('highlightable/create', text, sections, containerWidth);

    const test = event => console.log('on click', event);

    let h;

    const emit = (type, event) => {
        console.log('highlightable emit', type, event);
        node.dispatchEvent(new CustomEvent(type, {
            detail: event,
        }));
    };

    const forwardEvent = type => event => {
        emit(type, event);
    };

    let onNewSection, onSectionChanged, onStartResizing, onSectionHold, onSectionClick, onWordClick, onWordHold;

    const destroy = () => {
        if (h) {
            h.off('new-section', onNewSection);
            h.off('section-changed', onSectionChanged);
            h.off('start-resizing', onStartResizing);
            h.off('section-hold', onSectionHold);
            h.off('section-click', onSectionClick);
            h.off('word-click', onWordClick);
            h.off('word-hold', onWordHold);
            h.destroy && h.destroy();
        }
    };

    const init = (node, text, sections) => {
        console.log('init', sections)
        destroy();
        h = new Highlightable(node, text, sections);

        h.on('new-section', onNewSection = forwardEvent('new-section'));
        h.on('section-changed', onSectionChanged = forwardEvent('section-changed'));
        h.on('start-resizing', onStartResizing = forwardEvent('start-resizing'));
        h.on('section-hold', onSectionHold = forwardEvent('section-hold'));
        h.on('section-click', onSectionClick = forwardEvent('section-click'));
        h.on('word-click', onWordClick = forwardEvent('word-click'));
        h.on('word-hold', onWordHold = forwardEvent('word-hold'));
    };

    return {
        update: (({text, sections}) => {
            init(node, text, sections);
        }).limit(500),
        destroy: () => destroy,
    };
};

/**
 * @typedef {Object} Section
 * @property {number} offset by which word in text section starts
 * @property {number} length how many words does the section span
 */

class Highlightable {
    /**
     * @constructor
     * @param {HTMLElement} node 
     * @param {String} text 
     * @param {Section[]} sections 
     */
    constructor(node, text, sections) {
        // removeAllChildren(node);
        // return;

        node.style.position = 'relative';
        node.style.userSelect = 'none';
        node.style['-webkit-touch-callout'] = 'none';
        node.style['-webkit-user-select'] = 'none';
        node.style['-khtml-user-select'] = 'none';
        node.style['-moz-user-select'] = 'none';
        node.style['-ms-user-select'] = 'none';

        if (!text || !text.split) {
            // console.log('text is not string')
            return;
        }

        const words = text.split(' ');

        /**
         * @param {Section[]} sections 
         * @returns {boolean}
         */
        const areSectionsValid = sections => {
            if (!(sections instanceof Array)) {
                console.error('sections is not an array');
                return false;
            }
            return !sections.some(({offset, length}, index, arr) => {
                if (typeof offset !== 'number' || typeof length !== 'number') {
                    console.error('`offset` and `length` should be numbers');
                    return true;
                }
                if (offset < 0 && length < 0) {
                    console.error('`offset` and `length` should be positive');
                    return true;
                }
                if (index > 0) {
                    const {offset: prevOff, length: prevLen} = arr[index - 1];
                    if (prevOff + prevLen > offset) {
                        console.error('sections should not overlap');
                        return true;
                    }
                }
                if (index === arr.length - 1 && offset + length > words.length) {
                    console.error('sections should be in range of text');
                    return true;
                }
            });
        };

        if (!areSectionsValid(sections)) {
            console.error(sections, text);
            throw new Error('sections are not valid');
        }

        const wordElements = words.map(word => {
            const wordSpan = document.createElement('span');
            wordSpan.classList.add('word');
            wordSpan.style.display = 'inline-block';
            wordSpan.innerText = word;
            wordSpan.innerHTML = wordSpan.innerHTML + '&nbsp;';
            return node.appendChild(wordSpan);
        });

        const oldSections = sections.map(s => Object.assign({}, s));
        const sectionObjects = sections.map(({offset, length, color, resizable}, index, arr) => {
            const section = new Section(
                node, 
                wordElements,
                offset, length, 
                (index === 0) ? 0 : (arr[index - 1].offset + arr[index - 1].length), // min
                (index === (arr.length - 1)) ? wordElements.length : (arr[index + 1].offset), // max,
                color,
                resizable
            );
            
            var onchange, onstartresizing, onhold, onclick;
            
            section.on('change', onchange = ({offset: newOffset, length: newLength}) => {
                // console.log('on section change', index, offset, length);
                arr[index].offset = newOffset;
                arr[index].length = newLength;

                const wasNewEmptySectionCreated = (index, oldSections, sections) => {
                    // console.log('wasNewEmptySectionCreated', index, oldSections, sections)
                    if (index === 0) {
                        return oldSections[index].offset === 0 && sections[index].offset !== 0;
                    } else {
                        const prevEndOffset = oldSections[index - 1].offset + oldSections[index - 1].length;
                        const newEndOffset = sections[index - 1].offset + sections[index - 1].length;
                        return (prevEndOffset === oldSections[index].offset && newEndOffset !== sections[index].offset)
                    }
                };

                const wasEmptySpaceAndNotNow = wasNewEmptySectionCreated(index, oldSections, arr);
                if (wasEmptySpaceAndNotNow) {
                    arr[index].index = arr[index].index + 1;
                } else {
                    const isEmptySpaceButWasntBefore = wasNewEmptySectionCreated(index, arr, oldSections);
                    if (isEmptySpaceButWasntBefore) {
                        arr[index].index = arr[index].index - 1;
                    } 
                }

                this.emit('section-changed', {
                    sections: arr,
                    oldSections: oldSections,
                    index: index,
                    section: arr[index],
                });
            });

            section.on('start-resizing', onstartresizing = ({type}) => {
                this.emit('start-resizing', {
                    section: arr[index],
                    index: index,
                    type: type,
                });
            });

            section.on('hold', onhold = event => {
                this.emit('section-hold', {
                    section: arr[index],
                    index: index,
                    event: event,
                });
            });

            section.on('click', onclick = event => {
                // console.log('on section click')
                this.emit('section-click', {
                    section: arr[index],
                    index: index,
                    event: event,
                });
            });

            const _destroySection = section.destroy;

            section.destroy = () => {
                section.off('change', onchange);
                section.off('start-resizing', onstartresizing);
                section.off('hold', onhold);
                section.off('click', onclick);
                _destroySection();
            };

            return section;
        });

        const nonSelectedWordElements = sectionObjects.slice().reverse().reduce((wordElementsLeft, sectionObject) => {
            wordElementsLeft.splice(sectionObject.offset, sectionObject.length);
            return wordElementsLeft;
        }, wordElements.slice());

        /**
         * @param {HTMLElement} wordElement 
         */
        const addWordInteractions = wordElement => {
            let held;
            const interaction = interact(wordElement).on('hold', event => {
                held = true;
                this.emit('word-click', {
                    event: event, 
                    offset: wordElements.indexOf(wordElement)
                });
                this.emit('word-hold', {
                    event: event, 
                    offset: wordElements.indexOf(wordElement)
                });
            })
            .on('tap', event => {
                if (held) {
                    held = false;
                } else {
                    this.emit('word-click', {
                        event: event, 
                        offset: wordElements.indexOf(wordElement)
                    });
                }
            });

            return () => interaction.unset();
        };
        // const addOnHoldCreateNewSection = wordElement => {
        //     const interaction = interact(wordElement).on('hold', event => {
        //         const offset = wordElements.indexOf(wordElement);
        //         for (var indexToBeInserted = 0; indexToBeInserted < sectionObjects.length; indexToBeInserted++) {
        //             const sectionObject = sectionObjects[indexToBeInserted];
        //             if (sectionObject.offset > offset) {
        //                 break;
        //             }
        //         }

        //         const newSection = {
        //             offset: offset,
        //             length: 1,
        //         };
        //         // console.log('sections before insert', JSON.stringify(sections), indexToBeInserted);
        //         const oldSections = sections.slice();
        //         sections.splice(indexToBeInserted, 0, newSection);
        //         // console.log('sections after insert', JSON.stringify(sections));
        //         this.emit('new-section', {
        //             section: newSection,
        //             sections: sections,
        //             index: indexToBeInserted,
        //             oldSections: oldSections,
        //         });
        //     })
        //     .on('click', event => {
        //         this.emit('word-click');
        //     })

        //     return () => interaction.unset();
        // };

        const removeWordInteractions = nonSelectedWordElements.map(addWordInteractions);

        // const removeOnHoldNewSelections = nonSelectedWordElements.map(addOnHoldCreateNewSection);

        this.destroy = () => {
            // removeOnHoldNewSelections.forEach(fn => fn());
            removeWordInteractions.forEach(fn => fn());
            sectionObjects.forEach(sectionObject => sectionObject.destroy());
            wordElements.forEach(wordElement => wordElement.remove());
            node.style.position = 'initial';
            node.style.userSelect = 'initial';
            node.style['-webkit-touch-callout'] = 'initial';
            node.style['-webkit-user-select'] = 'initial';
            node.style['-khtml-user-select'] = 'initial';
            node.style['-moz-user-select'] = 'initial';
            node.style['-ms-user-select'] = 'initial';
        };

        return this;
    }
};

class Section {
    /**
     * @constructor
     * @param {HTMLElement} container 
     * @param {HTMLElement[]} wordElements
     * @param {number} offset 
     * @param {number} length 
     * @param {number} min
     * @param {number} max
     */
    constructor(container, wordElements, offset, length, min, max, color = 'blue', resizable = false) {

        const wordElementsInSection = wordElements.slice(offset, offset + length);
        this.offset = offset;
        this.length = length;

        // console.log('new section', offset, length, wordElementsInSection);

        let leftHandle, rightHandle;

        const onStartResized = node => {
            // console.log('onStartResized', node)
            const newOffset = wordElements.findIndex(el => el === node);
            this.emit('change', {
                offset: newOffset,
                length: offset - newOffset + length,
            });
        };

        const onEndResized = node => {
            // console.log('onEndResized', node)
            const newEnd = wordElements.findIndex(el => el === node);
            this.emit('change', {
                offset: offset,
                length: newEnd - offset + 1,
            });
        };

        const onStartResizingStart = () => {
            // console.log('onStartResizingEnd');
            this.emit('start-resizing', {
                type: 'start',
            });
        };
        
        const onStartResizingEnd = () => {
            // console.log('onStartResizingEnd');
            this.emit('start-resizing', {
                type: 'end',
            });
        };

        /**
         * @param {Part} part 
         */
        const setAsLeftHandle = part => {
            if (leftHandle) {
                leftHandle.off('resize', onStartResized);
                leftHandle.off('start-resizing', onStartResizingStart);
                leftHandle.destroy();
            }
            if (part) {
                leftHandle = new Handle(container, part.element, wordElements.slice(min, offset + length), color, false);
                leftHandle.on('start-resizing', onStartResizingStart);
                leftHandle.on('resize', onStartResized);
            }
        };

        const setAsRightHandle = part => {
            if (rightHandle) {
                rightHandle.off('resize', onEndResized);
                rightHandle.off('start-resizing', onStartResizingEnd);
                rightHandle.destroy();
            }
            if (part) {
                rightHandle = new Handle(container, part.element, wordElements.slice(offset, max), color, true);
                rightHandle.on('start-resizing', onStartResizingEnd);
                rightHandle.on('resize', onEndResized);
            }
        }

        /**
         * @param {PartParams[]} parts 
         * @param {HTMLElement} wordElement
         * @returns {PartParams[]}
         */
        const partsReductor = (parts, wordElement) => {
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
        const parts = wordElementsInSection.reduce(partsReductor, []).reverse();

        const {width: spaceCharWidth} = textMetrics('&nbsp;', container);
        // console.log('parts', parts)
        parts[parts.length - 1].width -= spaceCharWidth;

        /** @type {Part[]} */
        const partColor = Color(color).lighten(0.5).fade(0.5).string();
        let partObjects = parts.map(part => {
            const partObject = new Part(container, part, partColor);

            const onhold = event => this.emit('hold', event);
            const onclick = event => this.emit('click', event);
            partObject.on('hold', onhold);
            partObject.on('click', onclick);

            const _destroyPart = partObject.destroy;

            partObject.destroy = () => {
                partObject.off('hold', onhold);
                partObject.off('click', onclick);
                _destroyPart();
            };

            return partObject;
        });

        if (resizable) {
            setAsLeftHandle(partObjects[0]);
            setAsRightHandle(partObjects[partObjects.length - 1]);
        }

        this.destroy = () => {
            setAsLeftHandle();
            setAsRightHandle();
            partObjects.forEach(partObject => partObject.destroy());
        };

        return this;
    }
};

class Part {
    /**
     * @typedef {Object} PartParams
     * @param {number} top
     * @param {number} left
     * @param {number} width
     * @param {number} height
     */

    /**
     * @param {HTMLElement} container 
     * @param {PartParams} param1
     * @param {String} color
     */
    constructor(container, {top, left, height, width}, color) {
        // const leftHandle = new LeftHandle(container, wordElements.slice(min, offset + length));
        // const rightHandle = new RightHandle(container, wordElements.slice(offset + length, max));
        const partElement = document.createElement('div');
        partElement.classList.add('part')
        partElement.style.top = `${top}px`;
        partElement.style.left = `${left}px`;
        partElement.style.height = `${height}px`;
        partElement.style.width = `${width}px`;
        partElement.style.position = 'absolute';
        partElement.style.backgroundColor = color;
        partElement.style.borderRadius = '0.25em';
        this.element = container.appendChild(partElement);

        let held;

        const interaction = interact(this.element)
        .pointerEvents({
            ignoreFrom: ['.handle'],
        })
        .on('hold', event => {
            this.emit('click', event);
            this.emit('hold', event);
            held = true;
        })
        .on('tap', event => {
            if (held) {
                held = false;
            } else {
                this.emit('click', event);
            }
        });

        this.destroy = () => {
            interaction.unset();
            partElement.remove();
        };

        return this;
    }
}

class Handle {
    /**
     * @constructor
     * @param {HTMLElement} container
     * @param {HTMLElement} partElement 
     * @param {HTMLElement[]} targets
     * @param {string} color
     * @param {boolean} isRight
     */
    constructor(container, partElement, targets, color, isRight = false) {
        const handleWrapperWidth = 16;
        const handleWidth = 4;
        const element = document.createElement('div');
        element.classList.add('handle-container');
        element.style.zIndex = '1';
        element.style.width = `${handleWrapperWidth}px`;
        element.style.height = '100%';
        element.style.background = 'transparent';
        element.style.cursor = 'ew-resize';
        element.style.position = 'absolute';
        element.style.touchAction = 'none';
        if (isRight) {
            element.style.right = `0px`;
            element.style.marginRight = `-${handleWidth}px`;
        }

        const handle = document.createElement('div');
        handle.classList.add('handle');
        handle.style.height = '100%';
        handle.style.width = `${handleWidth}px`;
        handle.style.backgroundColor = color;
        handle.style.position = 'absolute';
        if (isRight) {
            handle.style.right = '0px';
            handle.style.opacity = 0.5;
        } else {
            handle.style.opacity = 0.25;
            handle.style.left = '0px';
        }
        element.appendChild(handle);

        partElement.appendChild(element);
        if (isRight) {
            handle.style.borderTopRightRadius = '0.25em';
            handle.style.borderBottomRightRadius = '0.25em';
            partElement.style.borderTopRightRadius = '0';
            partElement.style.borderBottomRightRadius = '0';
            
        } else {
            handle.style.borderTopLeftRadius = '0.25em';
            handle.style.borderBottomLeftRadius = '0.25em';
            partElement.style.borderTopLeftRadius = '0';
            partElement.style.borderBottomLeftRadius = '0';
        }

        /**
         * @param {HTMLElement} el 
         * @returns {number}
         */
        const getLine = (offsetY, pageOffset = 0) => Math.floor((offsetY - pageOffset) / partElement.offsetHeight);

        const {pageX: containerOffsetLeft, pageY: containerOffsetTop} = coordinatesOnPage(container, {
            clientX: 0,
            clientY: 0,
        });

        let targetsByLines = [];
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const line = getLine(target.offsetTop);
            const snap = {
                x: (containerOffsetLeft + target.offsetLeft) + (isRight ? (target.offsetWidth - element.offsetWidth - handleWidth - 1) : 0),
                y: containerOffsetTop + target.offsetTop + target.offsetHeight / 2,
                target: target,
            };
            if (targetsByLines[line]) {
                targetsByLines[line].push(snap);
            } else {
                targetsByLines[line] = [snap];
            }
        }

        let savedSnapPosition, snapTarget;

        let startX0, startY0;

        const interaction = interact(element).draggable({
            listeners: {
                start: event => {
                    const {x, y} = coordinatesInElement(partElement.parentElement, {
                        x: event.pageX,
                        y: event.pageY,
                    });
                    startX0 = x;
                    startY0 = y;
                    console.log('start move', x, y, event.pageY);
                    this.emit('start-resizing', event);
                },
                move: event => {
                    const {x, y} = coordinatesInElement(partElement.parentElement, {
                        x: event.pageX,
                        y: event.pageY,
                    });
                    console.log('move', x, y, event.pageY);
                    if (isRight) {
                        element.style.right = `${event.clientX0 - event.clientX}px`;
                        // element.style.right = `${startX0 - x}px`;
                    } else {
                        element.style.left = `${event.clientX - event.clientX0}px`;
                        // element.style.left = `${x - startX0}px`;
                    }
                    element.style.top = `${event.clientY - event.clientY0}px`;
                    // element.style.top = `${y - startY0}px`;
                },
                end: event => {
                    const {offsetLeft: handleOffsetLeft, offsetTop: handleOffsetTop} = element;
                    const clientX = handleOffsetLeft + partElement.offsetLeft + (isRight ? 0 : element.offsetWidth);
                    const clientY = handleOffsetTop + partElement.offsetTop;
                    const pageX = clientX + containerOffsetLeft;
                    const pageY = clientY + containerOffsetTop;

                    // console.log('move end', isRight, snapTarget);
                    this.emit('resize', snapTarget);

                    if (isRight) {
                        element.style.right = '0px';
                    } else {
                        element.style.left = '0px';
                    }
                    element.style.top = '0px';


                    startX0 = undefined;
                    startY0 = undefined;
                },
            },
            cursorChecker: () => 'ew-resize',
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: container,
                }),
                /**/interact.modifiers.snap({
                    targets: [
                        (
                        // the x and y page coordinates,
                        pageX, pageY,
                        // the current interaction
                        interaction,
                        // the offset information with relativePoint if set
                        { x: offsetX, y: offsetY, relativePoint, index: relativePointIndex },
                        // the index of this function in the options.targets array
                        index) => {
                            if (savedSnapPosition) return savedSnapPosition;
                            
                            let line = getLine(pageY - containerOffsetTop);
                            if (line >= targetsByLines.length) {
                                line = targetsByLines.length - 1;
                            } else if (targetsByLines[line] === undefined) {
                                line = targetsByLines.findIndex(t => t !== undefined);
                            }
                            const targets = targetsByLines[line];

                            let snapPosition;
                            if (targets) {
                                const y = (line + 0.5) * partElement.offsetHeight + containerOffsetTop;
                                let x;
                                let node;
                                let dis;
                                for (let i = 0; i < targets.length; i++) {
                                    const target = targets[i];
                                    const d = Math.abs(pageX - (target.x));
                                    if (dis && d > dis) {
                                        break;
                                    } else {
                                        x = target.x;
                                        node = target.target;
                                        dis = d;
                                    }
                                }

                                if (x !== undefined) {
                                    snapPosition = {
                                        x: x,
                                        y: y - partElement.parentElement.parentElement.scrollTop,
                                        target: node,
                                    };
                                }
                            }

                            if (snapPosition !== undefined) {
                                savedSnapPosition = snapPosition;
                                // console.log('set snap target', snapPosition.target);
                                snapTarget = snapPosition.target;
                            }
                            setTimeout(() => savedSnapPosition = undefined, 100);
                            return savedSnapPosition;
                        }
                    ],
                    relativePoints: [
                        { x: 0, y: 0.5 },
                    ],
                }),/**/
            ],
        });

        this.destroy = () => {
            interaction.unset();
            handle.remove();
            element.remove();
        }

        return this;
    }
};

eventEmiter(Handle.prototype);
eventEmiter(Part.prototype);
eventEmiter(Section.prototype);
eventEmiter(Highlightable.prototype);