<script>
	import { onMount, setContext, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import WavesurferPlayer from './WavesurferPlayer';
	import TranscriptionView from './TranscriptionView';
	import TranscriptionEdit from './TranscriptionEdit';
	import Resizable from './Resizable';
	import SimpleModal from './SimpleModal';
	import ContextMenu from './ContextMenu';
	import Button from './Button';
	import { isFloat, toFixed, countWords, removeWhitespaces, formatTime, coordinatesOnPage } from './utils';
	import { contextKey, duration, minRegionDuration, editMode, activeIndex } from './store';

	export let audio;
	// export let transcription;

	let transcriptionData = [
		{ text: "The snow glows white on the mountain tonight.", start: 13.79, end: 17 },
		{ text: "Not a footprint to be seen.", start: 17.36, end: 20 },
		{ text: "A kingdom of isolation.", start: 21.01, end: 23.94 },
		{ text: "And it looks like I'm the queen.", start: 24.23, end: 27.15 },
		{ text: "The wind is howling like this swirling storm inside.", start: 28.86, end: 35 },
		{ text: "Couldn't keep it in, Heaven knows I tried.", start: 35.65, end: 41.15 },
		{ text: "Don't let them in, don't let them see.", start: 42.47, end: 45.98 },
		{ text: "Be the good girl you always have to be.", start: 45.98, end: 49.41 },
		{ text: "Conceal, don't feel, don't let them", start: 49.41, end: 52.65 },
		{ text: "know", start: 52.65, end: 55.89 },
		{ text: "Well, now they know.", start: 55.89, end: 59.22 },
		{ text: "Let it go, let it go.", },// start: 59.22, end: 62.76 },
		{ text: "Can't hold it back anymore.", start: 62.76, end: 66.32 },
		{ text: "Let it go, let it go.", },// start: 66.32, end: 69.73 },
		{ text: "Turn away and slam the door.", start: 69.73, end: 73.49 },
		{ text: "I don't care.", },// start: 73.49, end: 76.26 },
		{ text: "what they're going to say.", start: 76.26, end: 79.83 },
		{ text: "Let the storm rage on.", start: 80.4, end: 84.43,  },
		{ text: "The cold never bothered me anyway.", },// start: 84.43, end: 87.26,  },
	];
	
	const toVoid = () => {};

	const toggleEdit = async () => {
		setTimeout(() => $activeIndex = -1, 1);
		$editMode = !$editMode;
	};

	let fontSize = 1.5;
	let autoplay = true, autoscroll = true;

	const changeFont = increase => () => fontSize = Math.min(2, Math.max(0.75, increase ? fontSize + 0.25 : fontSize - 0.25));

	const _transcription = {
		isRegion: (i, t = transcriptionData) => {
			if (typeof i === 'number') {
				return _transcription.isRegion(t[i]);
			} else {
				return i !== undefined && i.start !== undefined && i.end !== undefined && i.text !== undefined;
			}
		},
		getPrevRegion: (i, t = transcriptionData) => {
			for (i; i > 0; i--) {
				if (_transcription.isRegion(i - 1, t)) {
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
		},
		getNextRegion: (i, t = transcriptionData) => {
			for (i; i < t.length - 1; i++) {
				if (_transcription.isRegion(i + 1, t)) {
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
		},
		getRegions: (t = transcriptionData) => t.filter((_, i, arr) => _transcription.isRegion(i, arr)),
		getTranscription: (copy = false) => copy ? transcriptionData.map(r => Object.assign({}, r)) : transcriptionData,
		mapRegionIndexToIndex: (regionIndex, t = transcriptionData) => {
			let regionsCounter = 0;
			for (let i = 0; i < t.length; i++) {
				if (_transcription.isRegion(i, t) && --regionIndex === -1) {
					return i;
				}
			}
			return -1;
		},
		mapIndexToRegionIndex: (index, t = transcriptionData) => {
			if (isRegion(index, t)) {
				let regionsCounter = -1;
				for (let i = index; i >= 0; i--) {
					if (_transcription.isRegion(i, t)) {
						regionsCounter++;
					}
				}
				return regionsCounter;
			} else {
				return -1;
			}
		},
		deleteSection: (index, t = transcriptionData) => {
			const tmp = t.filter((_, i) => i !== index);
			if (t === transcriptionData) {
				transcriptionData = tmp;
			}
			return t;
		},
		removeRegion: (index, t = transcriptionData) => {
			if (t[index]) {
				delete t[index].start
				delete t[index].end
				_transcription.joinEmptySections(t);
				if (t === transcriptionData) {
					transcriptionData = t;
				}
				return t;
			}
		},
		startValidator: (index, t = transcriptionData) => {
			const {region: prevRegion} = _transcription.getPrevRegion(index, t);

			const min = prevRegion ? prevRegion.start + $minRegionDuration : 0;

			let max;

			if (_transcription.isRegion(index, t)) {
				max = t[index].end - $minRegionDuration;
			} else {
				const {region: nextRegion} = _transcription.getNextRegion(index, t);
				max = nextRegion ? nextRegion.end - 2 * $minRegionDuration : $duration - $minRegionDuration;
			}

			return {
				validator: value => isFloat(value, 2) && min <= value && value <= max,
				min: min,
				max: max,
			};
		},
		endValidator: (index, t = transcriptionData) => {
			const {region: nextRegion} = _transcription.getNextRegion(index, t);

			const max = nextRegion ? nextRegion.end - $minRegionDuration : $duration;

			let min;

			if (_transcription.isRegion(index, t)) {
				min = t[index].start + $minRegionDuration;
			} else {
				const {region: prevRegion} = _transcription.getPrevRegion(index, t);
				min = prevRegion ? prevRegion.start + 2 * $minRegionDuration : $minRegionDuration;
			}

			return {
				validator: value => isFloat(value, 2) && min <= value && value <= max,
				min: min,
				max: max,
			};
		},
		validateText: text => countWords(text) > 0,
		getMinStart: (index, t = transcriptionData) => {
			const {region: prevRegion} = _transcription.getPrevRegion(index, t);
			return prevRegion ? prevRegion.start + $minRegionDuration : 0;
		},
		getMaxStart: (index, t = transcriptionData) => {
			if (_transcription.isRegion(index, t)) {
				return t[index].end - $minRegionDuration;
			} else {
				const {region: nextRegion} = _transcription.getNextRegion(index, t);
				return nextRegion ? nextRegion.end - $minRegionDuration : $duration;
			}
		},
		getMinEnd: (index, t = transcriptionData) => {
			if (_transcription.isRegion(index, t)) {
				return t[index].start + $minRegionDuration;
			} else {
				const {region: prevRegion} = _transcription.getPrevRegion(index, t);
				return prevRegion ? prevRegion.start + $minRegionDuration : 0;
			}
		},
		getMaxEnd: (index, t = transcriptionData) => {
			const {region: nextRegion} = _transcription.getNextRegion(index, t);
			return nextRegion ? nextRegion.end - $minRegionDuration : $duration;
		},
		updateSection: (index, {text, start, end, color}, t = transcriptionData, fix = false) => {
			if (t[index] === undefined) return false;

			if (text !== undefined) t[index].text = _transcription.fixSectionText(text);

			if (start !== undefined && end !== undefined) {
				const {index: prevRegionIndex, region: prevRegion} = _transcription.getPrevRegion(index, t);
				const {index: nextRegionIndex, region: nextRegion} = _transcription.getNextRegion(index, t);
		
				const {min: minStart, max: maxStart, validator: validateStart} = _transcription.startValidator(index, t);
				const {min: minEnd, max: maxEnd, validator: validateEnd} = _transcription.endValidator(index, t);
		
				if (validateStart(start) && validateEnd(end)) {
					t[index].start = start;
					if (prevRegion && start < prevRegion.end) {
						t[prevRegionIndex].end = start;
					}
		
					t[index].end = end;
					if (nextRegion && end > nextRegion.start) {
						nextRegion.start = end;
					}
				} else if (fix && fix.times) {
					return _transcription.updateSection(index, {
						start: validateStart(start) ? start : (prevRegion ? prevRegion.start + $minRegionDuration : 0),
						end: validateEnd(end) ? end : (nextRegion ? nextRegion.end - $minRegionDuration : $duration),
					}, t, Object.assign(fix, { times: false }));
				} else {
					return {
						success: false,
						transcription: t,
					}
				}
			}

			if (color !== undefined && _transcription.colors.includes(color)) {
				t[index].color = color;
			}

			if (_transcription.isRegion(index, t) && fix && fix.color === true) {
				if (!_transcription.colors.includes(t[index].color)) {
					t[index].color = _transcription.getColor(index, t);
				}
			}

			if (t === transcriptionData && (!fix || fix.skipAssigment !== true)) {
				transcriptionData = t;
			}

			return {
				success: true,
				transcription: t,
			};
		},
		insertSection: async (index, section, t = transcriptionData, optimization = false) => {
			if (index < 0 || index > t.length) {
				throw new Error('index out of bounds', index, section, t);
				await tick();
				return {
					success: false,
					transcription: t,
				};
			}

			section.text = _transcription.fixSectionText(section.text);

			if (_transcription.isRegion(section)) {
				t.splice(index, 0, {});
				if (!_transcription.updateSection(index, section, t, { color: true }).success) {
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

			if (optimization) {
				t = _transcription.joinEmptySections(t);
			}

			return {
				success: true,
				transcription: t,
			};
			
		},
		fixSectionText: text => removeWhitespaces(text).trim(),
		joinEmptySections: (t = transcriptionData) => {
			const tmp = t.reduce(([head, ...tail], section) => {
				section.text = _transcription.fixSectionText(section.text);
				if (!head) {
					return [section];
				} else if (_transcription.isRegion(section) || _transcription.isRegion(head)) {
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
		},
		getColor: (index, t = transcriptionData) => {
			return 'blue';
			if (t && t[index] && _transcription.isRegion(index, t)) {
				const possibleColors = _transcription.colors.filter(color => {
					const { region: prevRegion } = _transcription.getPrevRegion(index, t);
					const { region: nextRegion } = _transcription.getNextRegion(index, t);
					const prevColor = prevRegion ? prevRegion.color : undefined;
					const nextColor = nextRegion ? nextRegion.color : undefined;
					return color !== prevColor && color !== nextColor;
				});

				return possibleColors[Math.floor(Math.random() * possibleColors.length)];
			}
		},
		colors: ['red', 'blue', 'orangered'],
	};

	setContext(contextKey, _transcription);

	let openContextMenu, closeContextMenu, settingButton, settingOpened;

	const onSettingClicked = event => {
		settingOpened = !settingOpened;
	};

	$: settingOpened ? openSetting() : (closeContextMenu || toVoid)();

	const openSetting = () => {
		const { pageX, pageY } = coordinatesOnPage(settingButton, { clientX: 0, clientY: 0});
		openContextMenu({
			pageX: pageX, 
			pageY: pageY,
			closeOnAction: false,
			openDirection: 'left',
		}, [
			{ name: 'Autoscroll', type: 'checkbox', callback: checked => autoscroll = checked, checked: autoscroll},
			{ name: 'Autoplay', type: 'checkbox', callback: checked => autoplay = checked, checked: autoplay},
			{ name: 'Font Size', submenu: [
				{ name: 'Decrease', callback: changeFont(false), },
				{ name: 'Increase', callback: changeFont(true), },
			]},
		]);
	};

	const initialTranscriptionValidation = (t) => {
		if (t instanceof Array) {
			t.forEach((_, index) => {
				_transcription.updateSection(index, {}, t, { color: true });
			});
			return t;
		} else {
			throw new Error('implementation error');
		}
	};

	let savedState;
	const saveState = () => {
		savedState = _transcription.getTranscription(true);
	};

	const applySavedState = () => {
		if (savedState) {
			transcriptionData = savedState;
		}
	}

	const startEditing = () => {
		saveState();
		$editMode = true;
	};

	const doneEditing = () => {
		$editMode = false;
	};

	const cancelEditing = () => {
		applySavedState();
		$editMode = false;
	};

	transcriptionData = initialTranscriptionValidation(transcriptionData);

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
		height: 100%;
		font-size: var(--font-size);
		line-height: 1.5;
	}

	.settings {
		background-image: url('./images/settings-24px.svg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 80% 80%;
		height: 2rem; 
		width: 2rem;
		display: inline-block;
		cursor: pointer;
	}
</style>

<div class="container" style="--font-size:{fontSize}rem">
	<ContextMenu bind:open={openContextMenu} bind:close={closeContextMenu}>
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
			<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin: 0.25rem 0;">
				{#if $editMode}
				<div style="display: flex;">
					<Button onclick={doneEditing} height={'100%'} fontWeight={400} colors={{'default': '#4353FF'}}>Done</Button>
					<Button onclick={cancelEditing} height={'100%'} fontWeight={400} css={'margin-left: 0.5rem;'} colors={{'default': '#ff3737'}}>Cancel</Button>
				</div>
				{:else}
				<div style="display: flex;">
					<Button onclick={startEditing} height={'100%'} fontWeight={400} colors={{'default': '#4353FF'}}>Edit</Button>
				</div>
				{/if}
				<span class="settings" bind:this={settingButton} on:click={onSettingClicked}></span>
			</div>

			<div class="transcription-container">
				<Resizable {autoscroll}>
					{#if $editMode}
						<TranscriptionEdit bind:transcription={transcriptionData} {fontSize}/>
					{:else}
						<TranscriptionView transcription={transcriptionData} {fontSize}/>
					{/if}
				</Resizable>
			</div>
		</SimpleModal>
	</ContextMenu>
</div>