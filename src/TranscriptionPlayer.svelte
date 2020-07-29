<script>
	import { onMount, setContext, getContext, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import SimpleModal from './SimpleModal';
    import ContextMenu from './ContextMenu';
	import WavesurferPlayer from './WavesurferPlayer';
	import TranscriptionView from './TranscriptionView';
	import TranscriptionEdit from './TranscriptionEdit';
	import Resizable from './Resizable';
	import Notifications from './Notifications';
	import Button from './Button';
	import { isFloat, toFixed, countWords, removeWhitespaces, formatTime, coordinatesOnPage, isFunction, textMetrics } from './utils';
	import { contextKey, duration, minRegionDuration, editMode, activeIndex } from './store';

	// Bindings
	let addNotification, transcriptionContainerElement;
	let openContextMenu, closeContextMenu;
	let settingsButton;

	export let audio;
	export let onEdited; // is is falsey then editing is disabled
	export let transcription;

	$: canEdit = isFunction(onEdited);

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

	// Player Height
	const playerHeights = {
		small: 50,
		normal: 80,
		large: 120,
	};
	const defaultPlayerSize = playerHeights.normal;

	$: _playerHeight = playerHeight in playerHeights ? playerHeights[playerHeight] : defaultPlayerSize;
	export let playerHeight; // small, normal, large

	// Colors
	export let backgroundColor = 'aliceblue';
	export let primaryColor = '#4353FF';
	export let secondaryColor = '#D9DCFF';
	export let regionColor = '#7F7FFF'; // faded by 40%

	// Line height
	export let lineHeight = 1.5;

	// Autoplay
	export let autoplay = true;
	export let autoplayConfigurable = false;

	// Autoscroll
	export let autoscroll = true;
	export let autoscrollConfigurable = false;

	// Font
	export let fontConfigurable = false;
	const getSizeInPx = (() => {
		const e = document.createElement('div');
		e.style.lineHeight = 1;
		return css => textMetrics('A', e).height;
	})();

	let fontSize;
	$: tick().then(() => fontSize = textMetrics('A', transcriptionContainerElement, {'line-height': 1}, fontStep, minFontSize, maxFontSize, baseFontSize, fontStepAmount).height);
	let fontStep = 0;
	export let fontStepAmount = '0.25rem';
	export let baseFontSize = '1.5rem';
	export let minFontSize = '0.75rem';
	export let maxFontSize = '2rem';

	const {
		increaseFontSize,
		decreaseFontSize
	} = {
		increaseFontSize: () => {
			const fontSizeInPx = textMetrics('A', transcriptionContainerElement).height;
			const maxFontSizeInPx = textMetrics('A', transcriptionContainerElement, {
				'font-size': maxFontSize,
			}).height;
			if (fontSizeInPx < maxFontSizeInPx) {
				fontStep += 1;
			}
		},
		decreaseFontSize: () => {
			const fontSizeInPx = textMetrics('A', transcriptionContainerElement).height;
			const minFontSizeInPx = textMetrics('A', transcriptionContainerElement, {
				'font-size': minFontSize,
			}).height;
			if (fontSizeInPx > minFontSizeInPx) {
				fontStep -= 1;
			}
		}
	};

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
			if (t[index] === undefined) return {
				success: false,
				transcription: t,
			};

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
					const res = _transcription.updateSection(index, {
						start: validateStart(start) ? start : (prevRegion ? prevRegion.start + $minRegionDuration : 0),
						end: validateEnd(end) ? end : (nextRegion ? nextRegion.end - $minRegionDuration : $duration),
					}, t, Object.assign(fix, { times: false }));
					return { ...res, fixed: true }
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

			if (fix && fix.color === true && _transcription.isRegion(index, t)) {
				if (!_transcription.colors.includes(t[index].color)) {
					t[index].color = _transcription.getColor(index, t);
				}
			}

			if ((!fix || fix.skipAssigment !== true) && t === transcriptionData) {
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
		validate: (t, props) => {
			const {fix} = props || {};
			if (t instanceof Array) {
				let wasFixed = false;
				t.forEach((section, index) => {
					const {success, fixed} = _transcription.updateSection(index, section, t, { times: fix === true, skipAssigment: true });
					if (!success) {
						return {
							transcription: t,
							valid: false,
							fixed: false,
						}
					}
					wasFixed |= fixed;
				});
				return {
					transcription: t,
					valid: !wasFixed,
					fixed: wasFixed,
				};
			} else {
				return {
					transcription: t,
					valid: false,
					fixed: false,
				}
				throw new Error('implementation error');
			}
		},
		areEqual: (t1, t2) => {
			if (t1 && t2 && t1.length === t2.length) {
				for (let i = 0; i < t2.length; i++) {
					const s1 = t1[i];
					const s2 = t2[i];
					if (!s1 || !s2 || s1.text !== s2.text || s1.start !== s2.start || s1.end !== s2.end) {
						return false;
					}
				}
				return true
			} else {
				return false;
			}
		},
	};

	setContext(contextKey, _transcription);

	// Settings
	let settingOpened;

	const allSettings = {
		autoscroll: { name: 'Autoscroll', type: 'checkbox', callback: checked => autoscroll = checked, checked: autoscroll},
		autoplay: { name: 'Autoplay', type: 'checkbox', callback: checked => autoplay = checked, checked: autoplay},
		font: { name: 'Font Size', submenu: [
			{ name: 'Decrease', callback: decreaseFontSize, },
			{ name: 'Increase', callback: increaseFontSize, },
		]},
	};

	const populateSettings = params => Object.keys(params).filter(key => params[key] === true).map(key => allSettings[key]);

	$: settings = populateSettings({autoplay: autoplayConfigurable, autoscroll: autoscrollConfigurable, font: fontConfigurable});

	const onSettingClicked = event => {
		settingOpened = !settingOpened;
	};

	$: settingOpened ? openSetting() : (closeContextMenu || toVoid)();

	const openSetting = () => {
		const { pageX, pageY } = coordinatesOnPage(settingsButton, { clientX: 0, clientY: 0});
		openContextMenu({
			pageX: pageX, 
			pageY: pageY,
			closeOnAction: false,
			openDirection: 'left',
		}, settings);
	};

	// Editing
	let doneEditingRunning;
	const {
		startEditing,
		cancelEditing,
		doneEditing,
	} = (() => {
		let savedState;
		const saveState = () => {
			savedState = _transcription.getTranscription(true);
		};

		const applySavedState = () => {
			if (savedState) {
				transcriptionData = savedState;
			}
		};

		const setEditMode = em => {
			setTimeout(() => $activeIndex = -1, 1);
			$editMode = em;
		};
		const hasTranscriptionChanged = () => !_transcription.areEqual(transcriptionData, savedState);

		return {
			startEditing: () => {
				saveState();
				setEditMode(true);
			},
			cancelEditing: () => {
				applySavedState();
				setEditMode(false);
			},
			doneEditing: async () => {
				doneEditingRunning = true;
				if (isFunction(onEdited)) {
					if (hasTranscriptionChanged()) {
						const {approved, response} = await new Promise((resolve, reject) => {
							onEdited(
								transcriptionData, 
								response => resolve({approved: true, response}), 
								response => resolve({approved: false, response})
							);
						});

						if (approved === true) {
							const {transcription: t} = response || {};
							if (t) {
								const {valid, fixed, transcription: tr} = _transcription.validate(t, {fix: true});
								if (valid || fixed) {
									transcriptionData = tr;
								}
							}
							setEditMode(false);
							addNotification({
								text: 'Transcription was successfully updated.',
								duration: 2000,
							});
						} else {
							const reason = (response && response.notification) ? (' ' + response.notification) : '';
							addNotification({
								text: 'Transcription could not be updated.' + reason,
								color: '#FF5757',
								duration: 5000,
							});
						}
					} else {
						setTimeout(() => $activeIndex = -1, 1);
						setEditMode(false);
					}
					doneEditingRunning = false;
				} else {
					console.error('onEdited is not a function, impl error?');
					setEditMode(false);
					doneEditingRunning = true;
				}
			},
		};
	})();

	$: {
		const {valid, fixed, transcription: t} = _transcription.validate(transcription, {fix: true});
		if (valid || fixed) {
			transcriptionData = t;
		} else {
			// transcriptionData = [];
		}
	};

	let playerHeightInPx;

	let container, containerWidth;

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

		height: 100%;
		max-height: inherit;
		display: flex;
		flex-flow: column nowrap;
	}

	.player-container {
		flex: 0 0 80px;
	}

	.toolbar-container {
		flex: 0 0 32px;
		display: flex;
		align-items: center;
		margin: 0.25rem 0;
	}

	.transcription-container {
		position: relative;
		flex: 1 1 auto;
		overflow: auto;
		line-height: 1.5;
		font-size: max(var(--min-font-size), min(var(--max-font-size) ,calc(var(--font-step-amount) * var(--font-step) + var(--base-font-size))));

		overflow-y: auto;
        background-color: var(--background-color);
        border-radius: 0.5rem;
	}

	.transcription-container::-webkit-scrollbar {
        width: 10px;
    }

    .transcription-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 0.5rem;
    }
    
    .transcription-container::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 0.5rem;
    }

    .transcription-container::-webkit-scrollbar-thumb:hover {
        background: #555; 
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

<div bind:this={container} bind:offsetWidth={containerWidth} class="container" style="--player-height: {_playerHeight}px">
	<ContextMenu contentContainer={container} bind:open={openContextMenu} bind:close={closeContextMenu}>
		<SimpleModal>
			<div class="player-container">
				<WavesurferPlayer 
					url={audio} 
					zoomEnabled={$editMode} 
					seekEnabled={!$editMode} 
					moveEnabled={$editMode} 
					playEnabled={!$editMode || true} 
					bind:regions={transcriptionData}
					bind:autoplay
					displayRegions={$editMode}
					{regionColor}
					{backgroundColor}
					{primaryColor}
					{secondaryColor}
					height={_playerHeight}
				/>
			</div>
			{#if canEdit || settings.length}
			<div class="toolbar-container" style="justify-content: {canEdit ? 'space-between' : 'flex-end'};">
				{#if canEdit}
					{#if $editMode}
					<div style="display: flex;">
						<Button onclick={doneEditing} height={'100%'} colors={{'default': '#4353FF', loading: '#4353FF'}}>Done</Button>
						<Button onclick={cancelEditing} height={'100%'} css={'margin-left: 0.5rem;'} colors={{'default': '#FF5757'}} disabled={doneEditingRunning}>Cancel</Button>
					</div>
					{:else}
					<div style="display: flex;">
						<Button onclick={startEditing} height={'100%'} colors={{'default': '#4353FF'}}>Edit</Button>
					</div>
					{/if}
				{/if}

				{#if settings.length}
				<span class="settings" bind:this={settingsButton} on:click={onSettingClicked}></span>
				{/if}
			</div>
			{/if}
			<div bind:this={transcriptionContainerElement} class="transcription-container" style="--line-height: {lineHeight}; --min-font-size: {minFontSize}; --max-font-size: {maxFontSize}; --base-font-size: {baseFontSize}; --font-step-amount: {fontStepAmount}; --font-step: {fontStep}; --background-color: {backgroundColor}">
				<Notifications bind:addNotification={addNotification}>
					<Resizable {backgroundColor} container={transcriptionContainerElement} {containerWidth} {autoscroll}>
						{#if $editMode}
						<TranscriptionEdit bind:transcription={transcriptionData} {fontSize} {regionColor}/>
						{:else}
						<TranscriptionView transcription={transcriptionData} {fontSize} progressColor={secondaryColor}/>
						{/if}
					</Resizable>
				</Notifications>
			</div>
		</SimpleModal>
	</ContextMenu>
</div>