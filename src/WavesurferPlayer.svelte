<script>
    import WaveSurfer from 'wavesurfer.js';
    import WavesurferRegion from './WavesurferRegion';
    import Pulsable from './Pulsable';
    import Blur from './Blur';
    import { onMount, onDestroy, tick, getContext } from 'svelte';
    import { fade } from 'svelte/transition';
    import { time, playing, duration, activeIndex, minRegionDuration, contextKey, editMode } from './store';
    import { coordinatesInElement, coordinatesOnPage, toFixed, formatTime, whoosh, whooshBackground } from './utils';
    import interact from 'interactjs';
    import touchable from './interactable';

    export let url;
    export let zoomEnabled = false;
    export let seekEnabled = true;
    export let moveEnabled = false;
    export let playEnabled = true;
    export let regions;
    export let displayRegions = false;
    export let autoplay = true;

    const { isRegion } = getContext(contextKey);

    let wavesurferContainer;
    let waveElement;
    let wavesurferWidth;
    let wavesurfer;
    let ready = false;
    let minPxPerSec, maxPxPerSec, curPxPerSec;
    let scrollLeft;

    let zoomPercent;

    const visibility = {
        zoomPercent: {
            shouldBeVisible: () => !(isNaN(zoomPercent) || zoomPercent === 0),
        },
        time: {
            shouldBeVisible: () => timeChanging === true,
        },
    };


    let timeChanging;
    const onTimeChange = () => {
        clearTimeout(visibility.time.changingTimer);
        setTimeout(() => timeChanging = true, 1);
        visibility.time.changingTimer = setTimeout(() => timeChanging = false, 1000);
    }

    const onChange = async variable => {
        clearTimeout(visibility[variable].timer);
        if (visibility[variable].shouldBeVisible()) {
            visibility[variable].visible = true;
            await tick();
        } else {
            visibility[variable].timer = setTimeout(() => visibility[variable].visible = false, 1000);
        }
    };

    $: onChange('zoomPercent', zoomPercent);
    $: onChange('time', timeChanging);
    $: onTimeChange($time);

    $: zoomPercent = calculateZoomPercent(minPxPerSec, maxPxPerSec, curPxPerSec);

    const calculateZoomPercent = () => Math.round((curPxPerSec - minPxPerSec) * 100 / (maxPxPerSec - minPxPerSec));

    $: !zoomEnabled && zoom();
    $: toggleInteraction(seekEnabled);

    /* Play pause when var store changes */
    $: setPlaying($playing);
    $: if (!playEnabled) $playing = false;
    // const setPlaying = play => play ? wavesurfer && wavesurfer.play() : wavesurfer && wavesurfer.pause();

    const setPlaying = play => {
        if ($editMode) {
            if (play) {
                if (isRegion($activeIndex)) {
                    // play region
                    wavesurfer.play(regions[$activeIndex].start, regions[$activeIndex].end)
                } else {
                    wavesurfer.play(0);
                }
            } else {
                wavesurfer && wavesurfer.pause();
            }
        } else {
            play ? wavesurfer && wavesurfer.play() : wavesurfer && wavesurfer.pause();
        }
    }


    /* Automatically load audio when wavesurfer is initialized or url is changed*/
    $: {
        if (wavesurfer) {
            setReady(false);
            wavesurfer.once('ready', () => {
                setReady(true);
            });
            wavesurfer.load(url);
        } else {
            setReady(false);
        }
    };

    $: if (ready) {
        minPxPerSec = wavesurferWidth / $duration;
        curPxPerSec = minPxPerSec;
    };
    $: maxPxPerSec = minPxPerSec * 20;

    /* Change width of wavesurfer on window resize */
    $: wavesurferWidth && ready && zoom();

    onMount(async () => {
		wavesurfer = WaveSurfer.create({
            container: wavesurferContainer,
            height: wavesurferContainer.offsetHeight,
            mediaControls: false,
            fillParent: true,
            scrollParent: false,
            backend: 'MediaElement',
            waveColor: '#D9DCFF',
            progressColor: '#4353FF',
            cursorColor: '#4353FF',
            barWidth: 3,
            barRadius: 3,
            cursorWidth: 1,
            barGap: 3,
        });

        wavesurfer.on('audioprocess', currentTime => $time = currentTime);
        wavesurfer.on('seek', progress => $time = progress * $duration);

        /* Remove wavesurfer scrollbar */
        wavesurfer.container.querySelectorAll('wave').forEach(element => {
            element.style.overflow = 'hidden';
        });

        /* update `curPxPerSec` on every zoom */
        wavesurfer.on('zoom', async pxPerSec => {
            await tick();
            curPxPerSec = pxPerSec;
        });

        const moveWaveform = interact(wavesurferContainer).draggable({
            listeners: {
                move: event => {
                    if (waveElement && moveEnabled) waveElement.scrollLeft -= event.dx;
                },
            },
            origin: 'self',
            cursorChecker: (action, interactable, element, interacting) => {
                if (waveElement && moveEnabled && curPxPerSec > minPxPerSec) {
                    return interacting ? 'grabbing' : 'grab'
                }
                return 'default';
            }
        }).on('tap', event => {
            if (event.target === waveElement) {
                if ($activeIndex === -1) {
                    $activeIndex = undefined;
                } else {
                    $activeIndex = -1;
                }
            }
        });

        const pinchToZoom = interact(wavesurferContainer).gesturable({
            listeners: {
                move: event => zoomEnabled && zoomIn(event.ds, coordinatesOnPage(wavesurferContainer, {
                    clientX: (event.box.left + event.box.right) / 2,
                    clientY: event.client.y,
                })),
            },
            origin: 'self',
        });

        /* onDestroy */
        return () => {
            moveWaveform.unset();
            pinchToZoom.unset();
            wavesurfer && wavesurfer.destroy();
        }
    });

    const onWaveElementScroll = () => scrollLeft = waveElement ? waveElement.scrollLeft : 0;

    const setReady = isReady => {
        if (isReady) {
            $duration = toFixed(wavesurfer.getDuration(), 2);
            waveElement = wavesurferContainer.querySelector('wave');
            onWaveElementScroll();
            waveElement.addEventListener('scroll', onWaveElementScroll);
            // console.log(wavesurferContainer.offsetWidth);
            // console.log(wavesurfer);
        } else {
            $playing = false;
            $duration = 0;
            $time = 0;
            waveElement && waveElement.removeEventListener('scroll', onWaveElementScroll);
            waveElement = undefined;
            scrollLeft = 0;
        }
        ready = isReady;
    };

    const toggleInteraction = interact => {
        if (wavesurfer) {
            let tmp = wavesurfer;
            tmp.params.interact = interact;
        }
    };
    
    /* Toggle playing. Allow only when ready.*/
    const togglePlaying = () => $playing = ready && playEnabled && !$playing;

    const zoomOut = (percent = 0.1, options) => zoomIn(-percent, options);
    const zoomIn = (percent = 0.1, options) => ready && zoom(curPxPerSec + ((maxPxPerSec - minPxPerSec) * percent), options);

    const zoom = (pxPerSec, options) => {
        if (ready) {
            if (!isNaN(pxPerSec)) {
                pxPerSec = Math.min(maxPxPerSec, Math.max(minPxPerSec, pxPerSec));

                if (waveElement && options && options.pageX && options.pageY) {
                    const scrollLeft = waveElement.scrollLeft;
                    const positionInWave = coordinatesInElement(waveElement, { x: options.pageX, y: options.pageY });
                    const offsetLeft = positionInWave.x;
                    const mouseAtTime = (offsetLeft + scrollLeft) / curPxPerSec;
                    const relativePositionInWave = offsetLeft / wavesurferWidth;

                    wavesurfer.zoom(pxPerSec);
                    tick().then(() => {
                        centerTimeAt(mouseAtTime, relativePositionInWave);
                    });
                } else {
                    wavesurfer.zoom(pxPerSec);
                }
            } else {
                wavesurfer.zoom(minPxPerSec);
            }
        }
    };

    const centerTimeAt = (time, percent = 0.5) => {
        if (!ready) {
            return;
        }
        if (time === undefined || time < 0 || time > $duration) {
            throw new Error('time out of range:', time);
        }
        if (percent === undefined || percent < 0 || percent > 1) {
            throw new Error('percent out of range:', percent);
        }

        const newPixelOffset = (percent - 0.5) * wavesurferWidth;
        const timeOffset = newPixelOffset / curPxPerSec;
        const newCenterTime = time - timeOffset;
        wavesurfer.drawer.recenter(newCenterTime / $duration);
    }

    const wheelHandler = event => zoomEnabled && (event.deltaY < 0 ? zoomIn : zoomOut)(undefined, {
        pageX: event.pageX,
        pageY: event.pageY,
    });

    const getPreviousRegion = index => {
        for (var i = index - 1; i >= 0; i--) {
            if (regions[i] && regions[i].start !== undefined && regions[i].end !== undefined) {
                return {
                    index: i,
                    region: regions[i],
                }
            }
        }
        return {
            index: -1,
            region: undefined,
        };
    };

    const getNextRegion = index => {
        for (var i = index + 1; i < regions.length; i++) {
            if (regions[i] && regions[i].start !== undefined && regions[i].end !== undefined) {
                return {
                    index: i,
                    region: regions[i],
                }
            }
        }
        return {
            index: -1,
            region: undefined,
        };
    };

    // $: console.log('regions changed', regions)

    const regionResized = index => async event => {
        console.error('region updated index:', index, 'region', regions[index], 'event', event, regions);
        if (regions[index]) {
            const start = regions[index].start;
            const end = regions[index].end;

            const {index: prevRegionIndex, region: prevRegion} = getPreviousRegion(index);
            const {index: nextRegionIndex, region: nextRegion} = getNextRegion(index);
            // console.error('new star and end', start, end, prevRegionIndex, nextRegionIndex);

            if (prevRegionIndex !== -1 && start < prevRegion.end) {
                if (prevRegion.start + $minRegionDuration > start) {
                    regions[prevRegionIndex].end = regions[prevRegionIndex].start + $minRegionDuration;
                    regions[index] = regions[prevRegionIndex].end;
                    // console.error('fix start, moved too much')
                } else {
                    regions[prevRegionIndex].end = toFixed(start);
                    // console.error('fix prev region end')
                }
            }

            if (nextRegionIndex !== -1 && end > regions[nextRegionIndex].start) {
                if (nextRegion.end - $minRegionDuration < end) {
                    regions[nextRegionIndex].start = regions[nextRegionIndex].end - $minRegionDuration;
                    regions[index].end = regions[nextRegionIndex].start;
                    // console.error('fix end, moved to much')
                } else {
                    regions[nextRegionIndex].start = toFixed(end);
                    // console.error('fix next region start')
                }
            }
        }
        zoomOnRegion(index);
        await tick();
        $playing = autoplay;
    };

    $: zoomOnRegion($activeIndex);
    $: seekToRegion($activeIndex);

    const zoomOnRegion = index => {

        if (!displayRegions) return;

        if (index === undefined) {
            zoom();
            return;
        }

        const isZoomedOut = () => curPxPerSec <= minPxPerSec;

        const isTimeVisible = (time, pxPerSec = curPxPerSec) => time * pxPerSec >= scrollLeft && time * pxPerSec <= (scrollLeft + wavesurferWidth);
        
        const isRegionVisible = region => isTimeVisible(region.start) && isTimeVisible(region.end) && couldRegionBeVisible(region, curPxPerSec);

        const regionDuration = region => region ? region.end - region.start : 0;
        
        const regionWidth = (region, pxPerSec = curPxPerSec) => regionDuration(region) * pxPerSec;

        const couldRegionBeVisible = (region, pxPerSec) => regionWidth(region, pxPerSec) <= wavesurferWidth;

        const zoomOnRegion = region => zoom(
            (regionWidth(region, maxPxPerSec) < wavesurferWidth) 
                ? (maxPxPerSec) 
                : (wavesurferWidth / (regionDuration(region) * 1.5))
            ) || centerRegion(region);

        const centerRegion = region => centerTimeAt((Math.max(0, region.start) + Math.min($duration, region.end)) / 2);

        const region = regions[index];

        if (region) {
            if (isZoomedOut()) {
                zoomOnRegion(region);
            } else if (!isRegionVisible(region)) {
                if (couldRegionBeVisible(region)) {
                    centerRegion(region);
                } else {
                    zoomOnRegion(region);
                }
            }
        }
    };

    const getMin = (index, mrd) => {
        for (let region = regions[index - 1]; index >= 0; index--) {
            if (regions[index - 1] && regions[index - 1].start !== undefined) return regions[index - 1].start + mrd;
        }
        return 0;
    };

    const getMax = (index, mrd) => {
        for (let region = regions[index + 1]; index < regions.length; index++) {
            if (regions[index + 1] && regions[index + 1].end !== undefined) return regions[index + 1].end - mrd;
        }
        return $duration;
    };

    const wavesurferMouseleave = () => {
        cursorLeft = undefined;
    };

    const wavesurferMousemove = event => {
        const {pageX} = coordinatesOnPage(wavesurferContainer, {clientX: 0, clientY: 0})
        cursorLeft = event.pageX - pageX;
    }

    let cursor, cursorLeft, cursorWidth;

    const calcTranslateX = (cursorLeft, cursorWidth, wavesurferWidth) => {
        const halfWidth = cursorWidth / 2;
        if (cursorLeft < halfWidth) {
            const diff = halfWidth - cursorLeft;
            return (((cursorLeft - halfWidth) / cursorWidth) * -100) - 50;
        } else if ((wavesurferWidth - halfWidth) < cursorLeft) {
            return -50 + (((wavesurferWidth - halfWidth) - cursorLeft) / cursorWidth) * 100;
        }
        return -50;
    };

    const onCursorClick = () => {
        wavesurfer && seekEnabled && wavesurfer.seekTo(((scrollLeft + cursorLeft) / curPxPerSec) / $duration);
    };

    const seekToRegion = index => {
        if (!ready) return
        if (isRegion(index)) {
            wavesurfer.seekTo(regions[index].start / $duration);
        } else {
            wavesurfer.seekTo(0);
        }
    };

</script>

<div class="container">
    <div class="playPauseButtonContainer">
        {#if $playing}
        <div class="playPauseButton paused" class:disabled={!playEnabled} on:click={togglePlaying} in:whooshBackground></div>
        {:else}
        <div class="playPauseButton" class:disabled={!playEnabled} on:click={togglePlaying} in:whooshBackground></div>
        {/if}
    </div>

    <div class="wavesurfer" 
        class:interactable={zoomEnabled || moveEnabled}
        bind:this={wavesurferContainer} 
        bind:clientWidth={wavesurferWidth}
        on:mousemove={wavesurferMousemove}
        on:mouseleave={wavesurferMouseleave}
        on:wheel={wheelHandler} >
        
        {#each regions as region, i (region)}
        {#if (ready && displayRegions && region.start !== undefined && region.end !== undefined)}
        <WavesurferRegion 
            bind:start={region.start}
            bind:end={region.end}
            index={i}
            min={getMin(i, $minRegionDuration)}
            max={getMax(i, $minRegionDuration)}
            color={region.color}
            pxPerSec={curPxPerSec} 
            wavesurferWidth={wavesurferWidth} 
            scrollLeft={scrollLeft}
            on:resized={regionResized(i)}
            resizable={$activeIndex === i}
            on:please-rezoom={() => zoomOnRegion(i)}
        />
        {/if}
        {/each}

        {#if visibility.zoomPercent.visible && !visibility.time.visible}
        <Blur css={'position: absolute; bottom: 0; right: 0; z-index: 100; font-size: 0.8rem; margin: 0 0.25rem 0.25rem 0; cursor: pointer;'} 
            transitionIn={whoosh} transitionOut={whoosh} on:click={zoom}>
            <span style="padding: 0.05rem 0.4rem;">{zoomPercent}%</span>
        </Blur>
        {/if}

        {#if visibility.time.visible}
        <Blur css={'position: absolute; bottom: 0; left: 0; z-index: 100; font-size: 0.8rem; margin: 0 0 0.25rem 0.25rem'} transitionIn={whoosh} transitionOut={fade}>
            <span style="padding: 0.05rem 0.4rem;">{formatTime($time)}</span>
        </Blur>
        {/if}

        {#if visibility.time.visible && !visibility.zoomPercent.visible}
        <Blur css={'position: absolute; bottom: 0; right: 0; z-index: 100; font-size: 0.8rem; margin: 0 0.25rem 0.25rem 0'} transitionIn={whoosh} transitionOut={fade}>
            <span style="padding: 0.05rem 0.4rem;">-{formatTime($duration - $time)}</span>
        </Blur>
        {/if}

        <div class="cursor" 
            hidden={cursorLeft === undefined || (false && seekEnabled !== true)} 
            bind:this={cursor} 
            style="--cursor-left:{cursorLeft}px; --translate-x:{calcTranslateX(cursorLeft, cursorWidth, wavesurferWidth)}%;" 
            on:click={onCursorClick}>
            <span bind:offsetWidth={cursorWidth}>
                <Blur css={'transform: translate(var(--translate-x), 0); z-index: 0; font-size: 0.8rem; display: inline-block;'}}>
                    <span style="padding: 0.05rem 0.4rem;">{formatTime((scrollLeft + cursorLeft) / curPxPerSec)}</span>
                </Blur>
            </span>
        </div>
        
    </div>
</div>

<style>
    .cursor {
        height: 100%; 
        width: 0px;
        position: absolute;
        z-index: 10;
        left: var(--cursor-left)
    }
    .container {
        position: relative;
        --wavesurfer-height:50px;
        display: flex;
        align-items: stretch;
        justify-content: left;
        height: var(--wavesurfer-height);
        /* touch-action: none;
        -ms-touch-action: none; */
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    .wavesurfer {
        flex: 1 0 200px;
        overflow: hidden;
        position: relative;
    }

    .interactable {
        touch-action: none;
        user-select: none;
    }

    .playPauseButtonContainer {
        flex: 0 0 50px;
        position: relative;
    }
    .playPauseButton {
        background-image: url('./images/play_arrow-black-18dp.svg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 80% 80%;
        background-color: lightgray;
        border-radius: 0.5rem;
        cursor: pointer;
        position: absolute;
        top: 0;
        left : 0;
        height: 100%;
        width: 100%;
    }

    .paused {
        background-image: url('./images/pause-black-18dp.svg');
    }

    .disabled {
        filter: blur(1px);
		-webkit-filter: blur(1px);
        cursor: default;
    }
</style>