<script>
    import { onMount, beforeUpdate, afterUpdate } from 'svelte';
    import { isFunction, coordinatesInElement, coordinatesOnPage } from './utils';
    import interact from 'interactjs';
    import './limit.js';
	
	let data = {
		"words": [
			{ word: 'The' },
			{ word: 'snow' },
			{ word: 'glows' },
			{ word: 'white' },
			{ word: 'on' },
			{ word: 'the' },
			{ word: 'mountain' },
			{ word: 'tonight.' },
			{ word: 'Not' },
			{ word: 'a' },
			{ word: 'footprint' },
			{ word: 'to' },
			{ word: 'be' },
			{ word: 'seen.' },
		],
		sections: [
			{ offset: 4, length: 8 },
		]
	};
	
	onMount(async () => {
		
	});
	
    let container, containerWidth, lineHeight;
    
    let sections;
    // Throttle and limit to 200ms
    const refreshSections = ((callback) => {
        sections = addSections();
        if (isFunction(callback)) callback();
    }).limit(200);
	
	const removeSections = () => container && container.querySelectorAll('.section').forEach(section => section.remove());
	
	const addSections = () => {
        if (!container) return [];
        removeSections();
        const words = Array.prototype.slice.call(container.querySelectorAll('span'));
		return data.sections.map(s => {
			let width = 0;
			let {offset, length} = s;
			let top, left;
			let section, parts = [];
			for (length; length > 0; length--, offset++) {
				const word = words[offset];
                const wordWidth = word.offsetWidth;
                lineHeight = word.offsetHeight;
                const sectionHeight = Math.min(20, lineHeight);
				if (top !== word.offsetTop) {
					if (section) {
						section.style.width = `${width}px`;
						parts.push(section);
					}
					width = 0;
					top = word.offsetTop;
					left = word.offsetLeft;
					section = document.createElement('div');
					section.classList.add('section')
					section.style.height = `${sectionHeight}px`;
					section.style.top = `${top + (lineHeight - sectionHeight) / 2}px`;
					section.style.left = `${left}px`;
					section.style.position = 'absolute';
					// section.style['z-index'] = '-1';
					section.style.background = 'rgba(255,0,0,0.1)';
				}
				width += wordWidth;
			}
			section.style.width = `${width}px`;
			parts.push(section);
            console.log('parts:', parts);
			return parts;
		}).map(parts => parts.map(part => container.appendChild(part)));
        snapGrid = createSnapGrid();
        sections.forEach(parts => {
            console.log(parts)
            addHandles(parts)
        });
    };
    
    let snapGrid;
    
	afterUpdate(async () => {
        refreshSections();
	});
	
	const onclick = index => () => {
		const { word } = data.words[index];
		console.log(index, word);
    };

    const createSnapGrid = () => {
        let snapTo = [];
        sections.forEach(parts => {
            parts.forEach(part => {
                const partXY = coordinatesOnPage(part, {clientX: 0, clientY: 0});
                snapTo.push({
                    x: partXY.pageX,
                    y: partXY.pageY,
                });
            });
        });
        return snapTo;
    };
    
    const addHandles = parts => {
        const handle = document.createElement('div');
        // handle.style.marginLeft = '-2px';
        handle.style.width = '4px';
        handle.style.height = '100%';
        handle.style.background = 'green';
        handle.style.cursor = 'ew-resize';
        handle.style.position = 'absolute';
        // handle.onmousedown = onResizeStart(handle, parts);
        // handle.ontouchstart = onResizeStart(handle, parts);
        handle.style.touchAction = 'none';

        const part0XY = coordinatesOnPage(parts[0], {clientX: 0, clientY: 0});

        let handleX0, handleY0;
        const confirmStartHandlePos = event => {
            console.log('confirmStartHandlePos');

            const dx = event.clientX - handleX0;
            const dy = event.clientY - handleY0;

            const handleLeft = handle.offsetLeft;
            const handleTop = handle.offsetTop;

            const handleX = handleLeft + parts[0].offsetLeft;
            const handleY = handleTop + parts[0].offsetTop;

            const grabLine = getLine(parts[0].offsetTop);
            const releaseLine = getLine(parts[0].offsetTop + dy);

            if (releaseLine < grabLine) {
                console.log('add lines up')
                const lines = grabLine - releaseLine;
                
            } else if (releaseLine > grabLine) {

            } else {
                const partX = parts[0].offsetLeft;
                const partW = parts[0].offsetWidth;
                if (handleX > (partX + partW)) {
                    console.log('remove this part')
                    parts[0].remove();
                    parts.splice(0, 1);
                    parts[0] && addHandles(parts);
                } else if (dx > 0) {
                    console.log('trim in same line', dx);
                    parts[0].style.left = `${partX + dx}px`;
                    parts[0].style.width = `${partW - dx}px`;
                } else {
                    console.log('extend in same line', dx);
                    const dX = Math.max(dx)
                    parts[0].style.left = `${partX + dX}px`;
                    parts[0].style.width = `${partW - dX}px`;
                }
            }

            if (event) {
                handleX0 = event.clientX;
                handleY0 = event.clientY;
            }

            handle.style.top = '0px';
            handle.style.left = '0px';
        };

        interact(parts[0].appendChild(handle)).draggable({
            listeners: {
                start: event => {
                    console.log('start', event)
                    handleX0 = event.clientX0;
                    handleY0 = event.clientY0;
                },
                move: event => {
                    handle.style.left = `${event.clientX - handleX0}px`;
                    handle.style.top = `${event.clientY - handleY0}px`;
                },
                end: event => {
                    confirmStartHandlePos(event);
                },
            },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: container,
                }),
                interact.modifiers.snap({
                    // targets: [{
                    //     x: 10, y: 10,
                    // }]
                    // targets: snapGrid,
                    relativePoints: [
                        { x: 0, y: 0 },
                    ]
                }),
            ],
        });
    }

    const onResizeStart = (handle, parts) => event => {

        const getPageX = event => event.touches ? event.touches[0].pageX : event.pageX;
        const getPageY = event => event.touches ? event.touches[0].pageY : event.pageY;

        const originalPageX = getPageX(event);
        const originalPageY = getPageY(event);

        const tmp = coordinatesInElement(container, { x: originalPageX, y: originalPageY }, true)
        const originalClientX = tmp.x;
        const originalClientY = tmp.y;

        let previousPageX, previousPageY;

        const mousemove = event => {
            const currentPageX = getPageX(event);
            const currentPageY = getPageY(event);

            const tmp = coordinatesInElement(container, { x: currentPageX, y: currentPageY }, true)

            const currentClientX = tmp.x;
            const currentClientY = tmp.y;
            
            const dx = currentPageX - previousPageX;
            const dy = currentPageY - previousPageY;
            move(currentClientX, currentClientY, dx, dy);
            previousPageX = currentPageX;
            previousPageY = currentPageY;
        };

        const mouseup = event => {
            console.log('up');
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
            const tmp = coordinatesInElement(container, { x: event.pageX, y: event.pageY }, true);
            up(tmp.x, tmp.y);
        };

        const touchmove = event => {
            if (event.touches && event.touches[0]) {
                const {pageX, pageY} = event.touches[0];
                const dx = pageX - prevX, dy = pageY - prevY;
                move (dx, dy);
                prevX = pageX;
                prevY = pageY;
            }
        };

        const touchend = event => {
            document.removeEventListener('touchmove', touchmove);
            document.removeEventListener('touchend', touchend);
            const tmp = coordinatesInElement(container, { x: event.touches[0].pageX, y: event.touches[0].pageY }, true);
            up(tmp.x, tmp.y);
        }

        if (event.touches && event.touches[0]) {
            console.log('touchstart', event);
            document.addEventListener('touchmove', touchmove);
            document.addEventListener('touchend', touchend);
        } else {
            console.log('mousedown', event);
            document.addEventListener('mousemove', mousemove);
            document.addEventListener('mouseup', mouseup);
        }

        const containerHeight = container.offsetHeight;

        const move = (clientX, clientY, dx, dy) => {
            console.log('move', clientX, clientY, dx, dy);
            const handleTop = handle.offsetTop;
            const handleLeft = handle.offsetLeft;

            const partX = parts[0].offsetLeft;
            const partY = parts[0].offsetTop;

            let nleft, ntop;

            if (clientX < 0) {
                nleft = -partX;
            } else if (clientX > containerWidth) {
                nleft = containerWidth - partX - handle.offsetWidth;
            } else {
                nleft = (clientX - originalClientX);
            }

            if (clientY < 0) {
                ntop = -partY;
            } else if (clientY > containerHeight) {
                mtop = containerHeight - parts[0].offsetTop;
            } else {
                ntop = clientY - originalClientY;
            }
            
            handle.style.top = `${ntop}px`;
            handle.style.left = `${nleft}px`;
            // confirmStartHandlePos(handle, parts)
        };

        const up = (clientX, clientY) => {
            confirmStartHandlePos(handle, parts);
        }
    };

    const getLine = offsetTop => Math.floor(offsetTop / lineHeight);

    const confirmStartHandlePos = (handle, parts) => {
        const dx = handle.offsetLeft;
        const dy = handle.offsetTop;
        console.log('confirmStartHandlePos', dx, dy);

        const grabLine = getLine(parts[0].offsetTop);
        const releaseLine = getLine(parts[0].offsetTop + dy);

        const handleX = parts[0].offsetLeft + dx;
        const handleY = parts[0].offsetTop + dy;

        if (releaseLine < grabLine) {

        } else if (releaseLine > grabLine) {

        } else {
            const partX = parts[0].offsetLeft;
            const partW = parts[0].offsetWidth;
            if (handleX > containerWidth) {
                console.log('remove this part')
                parts[0].remove();
                parts.splice(0, 1);
                addHandles(parts);
            } else if (dx > 0) {
                console.log('trim in same line', dx);
                parts[0].style.left = `${partX + dx}px`;
                parts[0].style.width = `${partW - dx}px`;
            } else {
                console.log('extend in same line', dx);
                const dX = Math.max(dx, -partX)
                parts[0].style.left = `${partX + dX}px`;
                parts[0].style.width = `${partW - dX}px`;
            }
        }
        
        handle.style.top = `0px`;
        handle.style.left = `0px`;
    }
	
</script>

<div class="container" bind:this={container} bind:offsetWidth={containerWidth}>
	{#each data.words as word, index}
	<span class="word">{word.word}&nbsp;</span>
	{/each}
</div>

<style>
	.container {
		position: relative;
		border: solid 1px blue;
		width: 50%;
		line-height: 2;

        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
	}
	
	.word {
		display: inline-block;
	}
</style>