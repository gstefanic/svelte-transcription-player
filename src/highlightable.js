import Highlightable from './Highlightable';

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
export function highlightable(node, props) {
    const H = new Highlightable({
        target: node,
        props: props,
    });

    return {
        update(props) {
            H.$set(props);
        },
        destroy() {
            H.$destroy();
        }
    };
};