<script>
	import { setContext, tick } from 'svelte';
	import WavesurferPlayer from './WavesurferPlayer';
	import TranscriptionView from './TranscriptionView';
	import TranscriptionEdit from './TranscriptionEdit';
	import Resizable from './Resizable';
	import SimpleModal from './SimpleModal';
	import ContextMenu from './ContextMenu';
	import { isFloat, toFixed, countWords, removeWhitespaces, formatTime } from './utils';
	import { contextKey, duration, minRegionDuration, editMode, activeIndex } from './store';
	export let audio;
	// export let transcription;

	let transcriptionData = [{
        "text": "The snow glows white on the mountain tonight.",
        "start": 13.79,
        "end": 17
    }, {
        "text": "Not a footprint to be seen.",
        "start": 17.36,
        "end": 20
    }, {
        "text": "A kingdom of isolation.",
        "start": 21.01,
        "end": 23.94
    }, {
        "text": "And it looks like I'm the queen.",
        "start": 24.23,
        "end": 27.15
    }, {
        "text": "The wind is howling like this swirling storm inside.",
        "start": 28.86,
        "end": 35
    }, {
        "text": "Couldn't keep it in, Heaven knows I tried.",
        "start": 35.65,
        "end": 41.15
    }];

	const toggleEdit = async () => {
		setTimeout(() => $activeIndex = -1, 1);
		$editMode = !$editMode;
	};

	let fontSize = 1.5;
	let autoplay = true, autoscroll = true;

	const changeFont = increase => () => fontSize = Math.min(2, Math.max(0.75, increase ? fontSize + 0.25 : fontSize - 0.25));

	const isRegion = (i, t = transcriptionData) => {
		if (typeof i === 'number') {
			return isRegion(t[i]);
		} else {
			return i !== undefined && i.start !== undefined && i.end !== undefined && i.text !== undefined;
		}
	};

	const getPrevRegion = (i, t = transcriptionData) => {
		for (i; i > 0; i--) {
			if (isRegion(i - 1, t)) {
				return {
					index: i - 1,
					region: t[i - 1],
				};
			}
		}
		return {
			index: -1,
			region: undefined,
		};
	};

	const getNextRegion = (i, t = transcriptionData) => {
		for (i; i < t.length - 1; i++) {
			if (isRegion(i + 1, t)) {
				return {
					index: i + 1,
					region: t[i + 1],
				};
			}
		}
		return {
			index: -1,
			region: undefined,
		};
	};

	const getRegions = (t = transcriptionData) => t.filter((_, i, arr) => isRegion(i, arr));

	const getTranscription = (copy = false) => copy ? transcriptionData.map(r => Object.assign({}, r)) : transcriptionData;

	const mapRegionIndexToIndex = (regionIndex, t = transcriptionData) => {
		let regionsCounter = 0;
		for (let i = 0; i < t.length; i++) {
			if (isRegion(i, t) && --regionIndex === -1) {
				return i;
			}
		}
		return -1;
	};

	const mapIndexToRegionIndex = (index, t = transcriptionData) => {
		if (isRegion(index, t)) {
			let regionsCounter = -1;
			for (let i = index; i >= 0; i--) {
				if (isRegion(i, t)) {
					regionsCounter++;
				}
			}
			return regionsCounter;
		} else {
			return -1;
		}
	};

	const deleteSection = (index, t = transcriptionData) => {
		const tmp = t.filter((_, i) => i !== index);
		if (t === transcriptionData) {
			transcriptionData = tmp;
		}
		return t;
	};

	const removeRegion = (index, t = transcriptionData) => {
		if (t[index]) {
			delete t[index].start
			delete t[index].end
			joinEmptySections(t);
			if (t === transcriptionData) {
				transcriptionData = t;
			}
			return t;
		}
	};

	const startValidator = (index, t = transcriptionData) => {
		const {region: prevRegion} = getPrevRegion(index, t);

		const min = prevRegion ? prevRegion.start + $minRegionDuration : 0;

		let max;

		if (isRegion(index, t)) {
			max = t[index].end - $minRegionDuration;
		} else {
			const {region: nextRegion} = getNextRegion(index, t);
			max = nextRegion ? nextRegion.end - 2 * $minRegionDuration : $duration - $minRegionDuration;
		}

		return {
			validator: value => isFloat(value, 2) && min <= value && value <= max,
			min: min,
			max: max,
		};
	};

	const endValidator = (index, t = transcriptionData) => {
		const {region: nextRegion} = getNextRegion(index, t);

		const max = nextRegion ? nextRegion.end - $minRegionDuration : $duration;

		let min;

		if (isRegion(index, t)) {
			min = t[index].start + $minRegionDuration;
		} else {
			const {region: prevRegion} = getPrevRegion(index, t);
			min = prevRegion ? prevRegion.start + 2 * $minRegionDuration : $minRegionDuration;
		}

		return {
			validator: value => isFloat(value, 2) && min <= value && value <= max,
			min: min,
			max: max,
		};
	};

	const validateText = text => countWords(text) > 0;

	const getMinStart = (index, t = transcriptionData) => {
		const {region: prevRegion} = getPrevRegion(index, t);
		return prevRegion ? prevRegion.start + $minRegionDuration : 0;
	};

	const getMaxStart = (index, t = transcriptionData) => {
		if (isRegion(index, t)) {
			return t[index].end - $minRegionDuration;
		} else {
			const {region: nextRegion} = getNextRegion(index, t);
			return nextRegion ? nextRegion.end - $minRegionDuration : $duration;
		}
	};

	const getMinEnd = (index, t = transcriptionData) => {
		if (isRegion(index, t)) {
			return t[index].start + $minRegionDuration;
		} else {
			const {region: prevRegion} = getPrevRegion(index, t);
			return prevRegion ? prevRegion.start + $minRegionDuration : 0;
		}
	};

	const getMaxEnd = (index, t = transcriptionData) => {
		const {region: nextRegion} = getNextRegion(index, t);
		return nextRegion ? nextRegion.end - $minRegionDuration : $duration;
	};

	const updateSection = (index, {text, start, end}, fix = false, t = transcriptionData) => {
		if (t[index] === undefined) return false;

		if (text !== undefined) t[index].text = fixSectionText(text);

		if (start !== undefined && end !== undefined) {
			const {index: prevRegionIndex, region: prevRegion} = getPrevRegion(index, t);
			const {index: nextRegionIndex, region: nextRegion} = getNextRegion(index, t);
	
			const {min: minStart, max: maxStart, validator: validateStart} = startValidator(index, t);
			const {min: minEnd, max: maxEnd, validator: validateEnd} = endValidator(index, t);
	
			if (validateStart(start) && validateEnd(end)) {
				t[index].start = start;
				if (prevRegion && start < prevRegion.end) {
					t[prevRegionIndex].end = start;
				}
	
				t[index].end = end;
				if (nextRegion && end > nextRegion.start) {
					nextRegion.start = end;
				}
			} else if (fix) {
				return updateSection(index, {
					start: validateStart(start) ? start : (prevRegion ? prevRegion.start + $minRegionDuration : 0),
					end: validateEnd(end) ? end : (nextRegion ? nextRegion.end - $minRegionDuration : $duration),
				}, false, t);
			} else {
				return {
					success: false,
					transcription: t,
				}
			}
		}

		if (t === transcriptionData) {
			transcriptionData = t;
		}

		return {
			success: true,
			transcription: t,
		};
	};

	const insertSection = async (index, section, t = transcriptionData) => {
		if (index < 0 || index > t.length) {
			throw new Error('index out of bounds', index, section, t);
			await tick();
			return {
				success: false,
				transcription: t,
			};
		}

		section.text = fixSectionText(section.text);

		if (isRegion(section)) {
			console.log('section is region')
			t.splice(index, 0, {});
			if (!updateSection(index, section, t).success) {
				throw new Error('can\'t insert section', section, index, t);
				t.splice(index, 1);
				if (t === transcriptionData) {
					transcriptionData = t;
				}
				return {
					success: false,
					transcription: t,
				}
			}
		} else {
			t.splice(index, 0, section);
		}

		t = joinEmptySections(t);

		return {
			success: true,
			transcription: t,
		};
		
	};

	const fixSectionText = text => removeWhitespaces(text).trim();

	const joinEmptySections = (t = transcriptionData) => {
		const tmp = t.reduce(([head, ...tail], section) => {
			section.text = fixSectionText(section.text);
			if (!head) {
				return [section];
			} else if (isRegion(section) || isRegion(head)) {
				return [section, head, ...tail];
			} else {
				head.text += ' ' + section.text;
				return [head, ...tail];
			}
		}, []).reverse();
		if (t === transcriptionData) {
			transcriptionData = tmp;
		}
		return tmp;
	};

	setContext(contextKey, {
		isRegion: isRegion,
		getPrevRegion: getPrevRegion,
		getNextRegion: getNextRegion,
		getRegions: getRegions,
		getTranscription: getTranscription,
		mapRegionIndexToIndex: mapRegionIndexToIndex,
		mapIndexToRegionIndex: mapIndexToRegionIndex,
		deleteSection: deleteSection,
		removeRegion: removeRegion,
		startValidator: startValidator,
		endValidator: endValidator,
		validateText: validateText,
		getMinStart: getMinStart,
		getMaxStart: getMaxStart,
		getMinEnd: getMinEnd,
		getMaxEnd: getMaxEnd,
		updateSection: updateSection,
		insertSection: insertSection,
	});

</script>

<style>
	.container {
		position: relative;
		user-select: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
	}

	.transcription-container {
		margin-top: 0.5rem;
		height: 100%;
		font-size: var(--font-size);
	}

	.font-size {
		background-image: url('./images/format_size-24px.svg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 80% 80%;
		height: 24px; 
		width: 24px;
		display: inline-block;
	}

	.font-size.decrease {
		-moz-transform: scaleX(-1);
		-o-transform: scaleX(-1);
		-webkit-transform: scaleX(-1);
		transform: scaleX(-1);
		filter: FlipH;
		-ms-filter: "FlipH";
	}
</style>

<div class="container" style="--font-size:{fontSize}rem">
	<ContextMenu>
		<SimpleModal>
			<WavesurferPlayer 
				url={audio} 
				zoomEnabled={$editMode} 
				seekEnabled={!$editMode} 
				moveEnabled={$editMode} 
				playEnabled={!$editMode || true} 
				bind:regions={transcriptionData}
				bind:autoplay
				displayRegions={$editMode}
			/>
			<div class="transcription-container">
				<Resizable {autoscroll}>
					{#if $editMode}
						<TranscriptionEdit bind:transcription={transcriptionData} {fontSize}/>
					{:else}
						<TranscriptionView transcription={transcriptionData} {fontSize}/>
					{/if}
				</Resizable>
			</div>
			<button on:click={toggleEdit}>{$editMode ? 'view' : 'edit'}</button>
			<label style="display: inline-block;"><input type=checkbox bind:checked={autoplay}> Autoplay</label>
			<label style="display: inline-block;"><input type=checkbox bind:checked={autoscroll}> Autoscroll</label>
			<button on:click={() => console.log(transcriptionData)}>{'print'}</button>
			<span class="font-size decrease" on:click={changeFont(false)}></span>
			<span class="font-size" on:click={changeFont(true)}></span>
		</SimpleModal>
	</ContextMenu>
</div>