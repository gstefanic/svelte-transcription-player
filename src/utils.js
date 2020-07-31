export function coordinatesInElement(element, {y, x}, canBeOutside) {
    var rect = element.getBoundingClientRect();
    var X = x - rect.left; //x position within the element.
    var Y = y - rect.top;  //y position within the element.
    if (canBeOutside || X >= 0 && X <= rect.width && Y >= 0 && Y <= rect.height) {
        return {
            x: X,
            y: Y,
        };
    } else {
        return {};
    }
};

/**
 * 
 * @param {HTMLElement} element 
 * @param {*} param1 
 */
export function coordinatesOnPage(element, {clientX, clientY}) {
    let pageX = clientX, pageY = clientY;
    try {
        while (element && element !== document) {
            pageX += element.offsetLeft;
            pageY += element.offsetTop;
            element = element.offsetParent;
        }
        return {
            pageX: pageX,
            pageY: pageY,
        }
    } catch (error) {
        console.error('coordinatesOnPage error:', error.message)
        return {};
    }
};

export function toFixed(number, decimals = 2) {
    const power = Math.pow(10, decimals);
    return Math.round((Number(number) + Number.EPSILON) * power) / power;
};

export function isFloat(value, decimals) {
    if (isNaN(decimals)) {
        return /^-?\d*(\.\d+)?$/.test(value);
    } else {
        // /^\d*(\.\d{0,2})?$/
        const regex = new RegExp('^\\d*(\\.\\d{0,' + decimals + '})?$');
        return regex.test(value);
    }
};

export function isFunction(fn) {
    return fn && {}.toString.call(fn) === '[object Function]';
};

export function getCaretPosition(editableDiv) {
    var caretPos = 0,
    sel, range;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount) {
            range = sel.getRangeAt(0);
            if (range.commonAncestorContainer.parentNode == editableDiv) {
                caretPos = range.endOffset;
            }
        }
    } else if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        if (range.parentElement() == editableDiv) {
            var tempEl = document.createElement("span");
            editableDiv.insertBefore(tempEl, editableDiv.firstChild);
            var tempRange = range.duplicate();
            tempRange.moveToElementText(tempEl);
            tempRange.setEndPoint("EndToEnd", range);
            caretPos = tempRange.text.length;
        }
    }
    return caretPos;
};

export function setCaretPosition(node, position) {
    let range = document.createRange();
    let sel = window.getSelection();
    if (node && node.childNodes && node.childNodes[0]) {
        range.setStart(node.childNodes[0], Math.min(position, node.childNodes[0].length));
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        node.focus();
    }
};

/**
 * @param {HTMLElement} node 
 */
export function removeAllChildren(node) {
    while(node.firstChild) node.removeChild(node.lastChild);
};

/**
 * @param {String} string 
 * @param {HTMLElement} container 
 */
export function textMetrics(string, container, props = {}) {
    var h = 0, w = 0;
    var div = document.createElement('div');
    if (container && container.appendChild) {
        container.appendChild(div);
    } else {
        document.body.appendChild(div);
    }
    div.style['position'] = 'absolute';
    div.style['left'] = '-1000';
    div.style['top'] = '-1000';
    div.style['color'] = 'transparent';
    // div.style['visibility'] = 'hidden';

    // div.innerText = string;
    div.innerHTML = string;

    var styles = ['font-size','font-style', 'font-weight', 'font-family','line-height', 'text-transform', 'letter-spacing'];

    styles.forEach(styleProperty => {
        if (container && container.style) {
            div.style[styleProperty] = container.style[styleProperty];
        } else {
            div.style[styleProperty] = document.body.style[styleProperty];
        }
    });

    for (const prop in props) {
        div.style[prop] = props[prop];
    }
    
    w = div.clientWidth;
    h = div.clientHeight;
    
    div.remove();

    return {
        width: w,
        height: h,
    };
};

export function countWords(text) {
    var matches = text.match(/[\w\d\’\'-]+/gi);
    return matches ? matches.length : 0;
};

export function removeWhitespaces(text) {
    return text.replace(/\s\s/g, "");
};

const preventDefault = (e) => {
    e.preventDefault();
};

const preventDefaultForScrollKeys = (e) => {
    // left: 37, up: 38, right: 39, down: 40,
    // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
    var keys = {32: 1, 33: 1, 34: 1, 35: 1, 36: 1, 37: 1, 38: 1, 39: 1, 40: 1};
    if (keys[e.keyCode]) {
        preventDefault(e);
        return false;
    }
};

export function disableScroll(node = window) {
    // modern Chrome requires { passive: false } when adding event
    var supportsPassive = false;
    try {
        node.addEventListener("test", null, Object.defineProperty({}, 'passive', {
            get: function () { supportsPassive = true; } 
        }));
    } catch(e) {}
    
    var wheelOpt = supportsPassive ? { passive: false } : false;
    var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

    node.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
    node.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
    node.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
    node.addEventListener('keydown', preventDefaultForScrollKeys, false);
};

export function enableScroll(node = window) {
    // modern Chrome requires { passive: false } when adding event
    var supportsPassive = false;
    try {
        node.addEventListener("test", null, Object.defineProperty({}, 'passive', {
            get: function () { supportsPassive = true; } 
        }));
    } catch(e) {}
    
    var wheelOpt = supportsPassive ? { passive: false } : false;
    var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

    node.removeEventListener('DOMMouseScroll', preventDefault, false);
    node.removeEventListener(wheelEvent, preventDefault, wheelOpt); 
    node.removeEventListener('touchmove', preventDefault, wheelOpt);
    node.removeEventListener('keydown', preventDefaultForScrollKeys, false);
};

export function isAncestorOfNode(ancestor, node) {
    while(node) {
        if (node === ancestor) return true;
        node = node.parentNode;
    }
    return false;
};

export function disableDefaultContextMenu(node) {
    let fn;
    if (node.addEventListener) {
        node.addEventListener('contextmenu', fn = function (e) {
            e.preventDefault();
        }, true);
        return () => node.removeEventListener('contextmenu', fn, true);
    } else {
        node.attachEvent('oncontextmenu', fn = function () {
            window.event.returnValue = false;
        });
        return () => node.detachEvent('oncontextmenu', fn);
    }
};

export function formatTime(sec_num) {
    sec_num = Math.round(sec_num);
    let hours   = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    if (hours > 0) {
        return hours+':'+minutes+':'+seconds;
    } else {
        return `${minutes}:${seconds}`;
    }
};

import { elasticOut, quintOut } from 'svelte/easing';
export const whoosh = (node, params) => {
    const existingTransform = getComputedStyle(node).transform.replace('none', '');
	const initial = Math.max(0, Math.min(1, (params.initial || 0)));	
	const diff = initial - 1;
	return {
		delay: params.delay || 0,
		duration: params.duration || 400,
		easing: params.easing || elasticOut,
		css: (t, u) => `transform: ${existingTransform} scale(${initial - (t * diff)})`
	};
};

export const whooshBackground = (node, params) => {
    const existingSize = getComputedStyle(node).backgroundSize;
    
    const splitted = existingSize.split(' ');
    let sizex, sizey;
    let unitx, unity;
    if (splitted.length === 0) {
        sizex = sizey = 100;
        unitx = unity = '%';
    } else if (splitted.length === 1) {
        sizex = sizey = splitted[0].match(/([0-9]*)/);
        unitx = unity = splitted[0].match(/([^0-9]*)/);
    } else {
        sizex = splitted[0].match(/([0-9]*)/)[0];
        unitx = splitted[0].split(sizex)[1];

        sizey = splitted[1].match(/([0-9]*)/)[0];
        unity = splitted[1].split(sizey)[1];
    }

	return {
		delay: params.delay || 0,
		duration: params.duration || 400,
		easing: params.easing || quintOut,
		css: (t, u) => `background-size: ${sizex * t}${unitx} ${sizey * t}${unity}`,
	};
};

export const Iterator = (what, getFirst, fn, step, init = undefined) => {
    const first = getFirst(what);
    let acc = init, cur = first, index = 0;

    const stop = value => {
        step = () => false;
        return value;
    };

    while (cur) {
        acc = fn(acc, cur, stop, index, what, getFirst);
        cur = step(cur, index, what, getFirst);
        index++;
    }
    return acc;
};

export function getOffsetPosition(evt, parent){
    var position = {
        x: (evt.targetTouches) ? evt.targetTouches[0].pageX : evt.clientX,
        y: (evt.targetTouches) ? evt.targetTouches[0].pageY : evt.clientY
    };

    while(parent.offsetParent){
        position.x -= parent.offsetLeft - parent.scrollLeft;
        position.y -= parent.offsetTop - parent.scrollTop;

        parent = parent.offsetParent;
    }

    return position;
}

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
  
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
  
    try {
      var successful = document.execCommand('copy');
      var msg = successful ? 'successful' : 'unsuccessful';
      console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
  
    document.body.removeChild(textArea);
};

export function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function() {
        // console.log('Async: Copying to clipboard was successful!');
    }, function(err) {
        console.error('Async: Could not copy text: ', err);
    });
};

export function download(content, fileName, contentType) {
    let a = document.createElement("a");
    let file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
};

export async function chooseJsonFile() {
    const extentions = ['.json'];

    let input = document.createElement("input");
    input.type = 'file';
    input.style.display = 'none';
    input.accept = extentions.join(', ');
    document.body.appendChild(input);

    return new Promise((resolve, reject) => {
        input.onclick = () => {
            let onFocus;
            document.body.addEventListener('foucs', onFocus = () => {
                document.body.removeEventListener('focus', onFocus);
                input.remove();
            });

            input.onchange = event => {
                const reader = new FileReader();
                const url = event.target.value;
                const ext = url.substring(url.lastIndexOf('.')).toLowerCase();
                const files = event.target.files;
                if (files && files[0]) {
                    if (extentions && !extentions.includes(ext)) {
                        reject();
                        // throw new Error ('impl error');
                    }
        
                    reader.onload = e => {
                        const result = e.target.result;
                        if (typeof result === 'string') {
                            resolve(result);
                        } else {
                            reject();
                        }
                    };
        
                    reader.readAsText(files[0]);
                } else {
                    reject();
                    throw new Error('impl error');
                }
            };
        };

        input.click();
    });

};

export function prettyPrint(obj) {
    const replacer = (match, pIndent, pKey, pVal, pEnd) => {
        var key = '<span style="color: brown;">';
        var val = '<span style="color: navy;">';
        var str = '<span style="color: olive;">';
        var r = pIndent || '';
        if (pKey)
           r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
        if (pVal)
           r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
        return r + (pEnd || '');
    };

    const jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
    return JSON.stringify(obj, null, 3)
       .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
       .replace(/</g, '&lt;').replace(/>/g, '&gt;')
       .replace(jsonLine, replacer);
};