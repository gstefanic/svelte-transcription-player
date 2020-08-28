<script>
	import { onMount, setContext, getContext, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import SimpleModal from './SimpleModal';
    import ContextMenu from './ContextMenu';
	import WavesurferPlayer from './WavesurferPlayer';
	import TranscriptionView from './TranscriptionView';
	import Transcription from './Transcription';
	import TranscriptionEdit from './TranscriptionEdit';
	import Resizable from './Resizable';
	import Notifications from './Notifications';
	import Button from './Button';
	import { isFloat, toFixed, countWords, removeWhitespaces, formatTime, coordinatesOnPage, isFunction, textMetrics } from './utils';
	import { contextKey, duration, minRegionDuration, editMode, activeIndex, 
		PrimaryColor, SecondaryColor, BackgroundColor, RegionColor, ShowParagraphNumbers, Autoplay, FontSizePx
	} from './store';
	import ImportTranscription from './ImportTranscription';
	import ExportTranscription from './ExportTranscription';

	// Bindings
	let addNotification, transcriptionContainerElement;
	let openContextMenu, closeContextMenu;
	let settingsButton;
	let playerHeightInPx;
	let container, containerWidth;
	let openModal, closeModal;

	export let audio;
	export let onEdited; // if not a function then editing is disabled
	export let transcription;
	export let showParagraphNumbers = false;

	$: $PrimaryColor = primaryColor;
	$: $SecondaryColor = secondaryColor;
	$: $BackgroundColor = backgroundColor;
	$: $RegionColor = regionColor;
	$: $ShowParagraphNumbers = showParagraphNumbers === true;
	$: $Autoplay = autoplay;

	$: canEdit = isFunction(onEdited);

	let transcriptionData = [];
	
	const toVoid = () => {};

	export let importEnabled = false, exportEnabled = false;

	const showExportView = () => {
		openModal(
			ExportTranscription, {
				transcription: transcriptionData,
			}
		);
	};

	const showImportView = () => {
		openModal(
			ImportTranscription, {
				onImport: t => loadArrayAsTranscription(t, { showNotifications: true }),
			}
		);
	};

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

	$: tick().then(() => $FontSizePx = textMetrics('A', transcriptionContainerElement, {'line-height': 1}, fontStep, minFontSize, maxFontSize, baseFontSize, fontStepAmount).height);
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
		isLine: (i, t = transcriptionData) => {
			if (typeof i === 'number') {
				return _transcription.isLine(t[i]);
			} else {
				return i !== undefined && typeof i.text === 'string' && i.line === true;
			}
		},
		isParagraph: (i, t = transcriptionData) => {
			if (typeof i === 'number') {
				return _transcription.isLine(t[i]);
			} else {
				return i !== undefined && typeof i.text === 'string' && i.paragraph === true;
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
			if (index !== t.length - 1) {
				if (t[index].line === true) {
					_transcription.updateSection(index + 1, { line: true }, t);
				}
				if (t[index].paragraph === true) {
					_transcription.updateSection(index + 1, { paragraph: true }, t);
				}
			}
			const tmp = t.filter((_, i) => i !== index);
			if (t === transcriptionData) {
				transcriptionData = tmp;
			}
			return tmp;
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
		updateSection: (index, {text, start, end, color, line, paragraph}, t = transcriptionData, fix = false) => {
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

			if (line !== undefined) {
				t[index].line = line === true;
			}

			if (paragraph !== undefined) {
				t[index].paragraph = paragraph === true;
			}

			if (fix && fix.breakpoints) {
				if (index === 0) {
					t[index].paragraph = true;
					t[index].line = true;
				}
				if (!t[index].line) delete t[index].line
				if (!t[index].paragraph) delete t[index].paragraph
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
				if (!_transcription.updateSection(index, section, t, { color: true, breakpoints: true }).success) {
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
				} else if (_transcription.isLine(section) || _transcription.isParagraph(section) || _transcription.isRegion(section) || _transcription.isRegion(head)) {
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
					const {success, fixed} = _transcription.updateSection(index, section, t, { times: fix === true, skipAssigment: true, breakpoints: true });
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
		getBoundTimes: (index, t = transcriptionData) => {
			if (_transcription.isRegion(index, t)) {
				return { start: t[index].start, end: t[index].end };
			} else if (index >= 0 && index < t.length) {
				const { region: prevRegion, index: prevIndex } = _transcription.getPrevRegion(index, t);
				const { region: nextRegion, index: nextIndex } = _transcription.getNextRegion(index, t);
				const minStart = prevRegion ? prevRegion.end : 0;
				const maxEnd = nextRegion ? nextRegion.start : $duration;

				const startIndex = prevIndex === -1 ? 0 : prevIndex + 1;
				const endIndex = nextIndex === -1 ? t.length : nextIndex;

				const getChars = (startIndex, endIndex) => {
					if (endIndex == undefined) {
						startIndex = endIndex;
					}
					if (startIndex < 0 || endIndex > t.length || endIndex < startIndex) {
						console.error({startIndex, endIndex, transcription: t});
						throw new Error('impl error');
					}
					return t.slice(startIndex, endIndex).map(l => l && typeof l.text === 'string' ? l.text : '').join('').length;
				}

				const totalDuration = maxEnd - minStart;
				const charSum = getChars(startIndex, endIndex);
				const charSumToStart = getChars(startIndex, index);
				const start = Math.max(minStart, minStart + (charSumToStart / charSum) * totalDuration, 2);
				const dur = (t[index].text.length / charSum) * totalDuration;
				const end = Math.min(maxEnd, start + dur);
				return { start, end };
			} else {
				console.error({ index, transcription: t });
				throw new Error('impl error, index out of bounds');
			}
		}
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
		import: { name: 'Import', callback: showImportView },
		export: { name: 'Export', callback: showExportView },
	};

	const populateSettings = params => Object.keys(params).filter(key => params[key] === true).map(key => allSettings[key]);

	$: settings = populateSettings({
		autoplay: autoplayConfigurable, 
		autoscroll: autoscrollConfigurable,
		import: importEnabled,
		export: exportEnabled,
		font: fontConfigurable,
	});

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
				tick().then(() => {
					setEditMode(false);
				});
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

	$: onTranscriptionChange(transcription);

	const loadArrayAsTranscription = (arr, params) => {
		const defaultParams = {
			showNotifications: false,
			initialize: false,
		};

		const { 
			showNotifications, 
			initialize 
		} = params || defaultParams;

		if (arr instanceof Array) {
			const {valid, fixed, transcription: t} = _transcription.validate(arr, {fix: true, skipAssigment: true});
			if (valid) {
				if (fixed && showNotifications) {
					addNotification({
						text: 'Transcription was fixed automatically.',
						duration: 2000,
					});
				}
				if (showNotifications) {
					addNotification({
						text: 'Transcription was successfully loaded.',
						duration: 2000,
					});
				}
				transcriptionData = t;
			} else {
				if (initialize) {
					transcriptionData = [];
				}
				if (showNotifications) {
					addNotification({
						text: 'Transcription not imported, due to invalid sections.',
						color: '#FF5757',
						duration: 5000,
					});
				}
			}
		} else {
			throw new Error('Impl error');
		}
	}

	const onTranscriptionChange = () => {
		if (transcription instanceof Array) {
			loadArrayAsTranscription(transcription, { initialize: true });
		} else if (typeof transcription === 'string') {
			fetch(transcription)
				  .then(response => response.json())
				  .then(loadArrayAsTranscription)
				  .catch(error => console.error('Error:', error));
		} else if (transcription) {
			addNotification({
				text: 'Transcription could not be loaded.',
				color: '#FF5757',
				duration: 5000,
			});
		} else {
			console.error('transcription error', transcription);
		}
	};

</script>

<style>
	.cntnr {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
		color: #333;
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
		flex: 0 0 50px;
	}

	.toolbar-container {
		flex: 0 0 32px;
		display: flex;
		align-items: center;
		margin-top: 0.25rem;
		width: 100%;
	}

	.transcription-container {
		margin-top: 0.25rem;
		position: relative;
		flex: 1 1 auto;
		overflow: auto;
		line-height: 1.5;
		font-size: max(var(--min-font-size), min(var(--max-font-size) ,calc(var(--font-step-amount) * var(--font-step) + var(--base-font-size))));

		overflow-y: auto;
        background-color: var(--background-color);
        border-radius: 0.5rem;
		width: 100%;
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
		height: 24px; 
		width: 24px;
		display: inline-block;
		cursor: pointer;
	}
</style>

<div bind:this={container} bind:offsetWidth={containerWidth} class="cntnr" style="--player-height: {_playerHeight}px">
	<ContextMenu contentContainer={container} bind:open={openContextMenu} bind:close={closeContextMenu}>
		<SimpleModal bind:open={openModal} bind:close={closeModal}>
			<div class="player-container">
				<WavesurferPlayer 
					url={audio} 
					zoomEnabled={$editMode} 
					seekEnabled={!$editMode} 
					moveEnabled={$editMode} 
					playEnabled={!$editMode || true} 
					bind:regions={transcriptionData}
					displayRegions={$editMode}
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
				<div class="settings" bind:this={settingsButton} on:click={onSettingClicked}>
					<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><path d="M0,0h24v24H0V0z" fill="none"/><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></g></svg>
				</div>
				{/if}
			</div>
			{/if}
			<div bind:this={transcriptionContainerElement} class="transcription-container" style="--line-height: {lineHeight}; --min-font-size: {minFontSize}; --max-font-size: {maxFontSize}; --base-font-size: {baseFontSize}; --font-step-amount: {fontStepAmount}; --font-step: {fontStep}; --background-color: {backgroundColor}">
				<Notifications bind:addNotification={addNotification}>
					<Resizable {backgroundColor} container={transcriptionContainerElement} {containerWidth} {autoscroll}>
						<Transcription bind:transcription={transcriptionData}/>
					</Resizable>
				</Notifications>
			</div>
		</SimpleModal>
	</ContextMenu>
</div>