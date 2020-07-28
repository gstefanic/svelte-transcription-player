<script>
	import { onMount, createEventDispatcher, getContext, setContext, tick } from 'svelte';
	import { activeIndex, duration, minRegionDuration, contextKey, playing } from './store';
	import interact from 'interactjs';
	import NewInput from './NewInput';
	import EditSectionInfo from './EditSectionInfo';
	import { countWords, removeWhitespaces, isFloat, toFixed } from './utils';
	// import { highlightable } from './highlightable';
	import Section from './Section';

	const log = console.log;

	export let transcription;
	export let fontSize;
	export let regionColor = '#7F7FFF';

	const { 
		isRegion, 
		removeRegion, 
		deleteSection, 
		startValidator, 
		endValidator, 
		validateText, 
		getPrevRegion, 
		getNextRegion, 
		mapRegionIndexToIndex,
		mapIndexToRegionIndex,
		updateSection, 
		insertSection,
		getColor,
	} = getContext(contextKey);

	const { getContainer, shouldBeVisible, on: resizableOn, off: resizableOff } = getContext('resizable');
	const { open: openModal, close: closeModal } = getContext('simple-modal');
	const { open: openContextMenu, close: closeContextMenu } = getContext('simple-context-menu');
	const dispatch = createEventDispatcher();

	let container, containerWidth;

	onMount(async () => {
		container = getContainer();
		const oldPositioning = container.style.position;
		container.style.position = 'relative';

		const onContainerWidthChange = width => containerWidth = width;
		resizableOn('container-width-change', onContainerWidthChange);

		const containerIteraction = interact(container).on('tap', on.container.click).on('hold', on.container.contextMenu);

		container.addEventListener('contextmenu', on.container.contextMenu);

		return () => {
			container.style.position = oldPositioning;
			resizableOff('container-width-change', onContainerWidthChange);
			container && containerIteraction.unset();
			container.removeEventListener('contextmenu', on.container.contextMenu);
		}
	});

	$: scrollToRegion($activeIndex);
	const scrollToRegion = (sectionIndex) => {
		if (sectionIndex < wordElementsBySection.length && isRegion(sectionIndex)) {
			const wordElement = wordElementsBySection[sectionIndex][0];
			const lastWordElement = wordElementsBySection[sectionIndex][wordElementsBySection[sectionIndex].length - 1];
			if (wordElement && lastWordElement) {
				shouldBeVisible({top: wordElement.offsetTop, bottom: lastWordElement.offsetTop + lastWordElement.offsetHeight});
			}
		}
	};

	let wordElementsBySection = [];

	$: wordElements = wordElementsBySection.flat().filter(e => e instanceof HTMLElement);

	setContext('sections', {
		getTargets: (side, index) => {
			if (wordElementsBySection && (index < 0 || index >= wordElementsBySection.length)) {
				throw new Error('implementation error');
			}
			if (side === 'left') {
				const { index: prevRegionIndex } = getPrevRegion(index, transcription);
				return wordElementsBySection.slice(prevRegionIndex + 1, index + 1).flat().filter(e => e instanceof HTMLElement);
			} else if (side === 'right') {
				const { index: nextRegionIndex } = getNextRegion(index);
				const endIndex = nextRegionIndex === -1 ? wordElementsBySection.length : nextRegionIndex;
				return wordElementsBySection.slice(index, endIndex).flat().filter(e => e instanceof HTMLElement);
			}
			throw new Error('implementation error');
		},
		getWordElements: () => wordElements,
	});

	const resize = sectionIndex => ({detail: {side, diff}}) => {
		if (!isRegion(sectionIndex, transcription)) {
			throw new Error('implementation error');
		}
		const t = transcription;
		const sectionText = t[sectionIndex].text;
		const sectionWords = sectionText.split(' ');
		if (side === 'left') {
			if (diff < 0) {
				// trim start
				const out = sectionWords.slice(0, -diff).join(' ');
				const inside = sectionWords.slice(-diff).join(' ');
				t[sectionIndex].text = inside;
				if (sectionIndex === 0 || isRegion(sectionIndex - 1, transcription)) {
					t.splice(sectionIndex, 0, { text: out });
				} else {
					t[sectionIndex - 1].text += ' ' + out;
				}
			} else if (diff > 0) {
				// extend start
				if (sectionIndex === 0) {
					throw new Error('implementation error. When extending left handle, section index should be strictly larger than 0.');
				} else if (isRegion(sectionIndex - 1)) {
					throw new Error('implementation error');
				} else {
					const prevSectionText = transcription[sectionIndex - 1].text;
					const prevSectionWords = prevSectionText.split(' ');
					const inside = prevSectionWords.slice(-diff).join(' ');
					const out = prevSectionWords.slice(0, prevSectionWords.length - diff).join(' ');

					t[sectionIndex].text = inside + ' ' + t[sectionIndex].text;
					if (diff === prevSectionWords.length) {
						t.splice(sectionIndex - 1, 1);
					} else {
						t[sectionIndex - 1].text = out;
					}
				}
			}
		} else if (side === 'right') {
			if (diff < 0) {
				if (sectionIndex === transcription.length - 1) {
					throw new Error('implementation error');
				} else if (isRegion(sectionIndex + 1, transcription)) {
					throw new Error('implementation error');
				} else {
					const nextSectionText = transcription[sectionIndex + 1].text;
					const nextSectionWords = nextSectionText.split(' ');
					const inside = nextSectionWords.slice(0, -diff).join(' ');
					const out = nextSectionWords.slice(-diff).join(' ');
					t[sectionIndex].text += ' ' + inside;
					if (-diff === nextSectionWords.length) {
						t.splice(sectionIndex + 1, 1);
					} else {
						t[sectionIndex + 1].text = out;
					}
				}
			} else if (diff > 0) {
				const inside = sectionWords.slice(0, sectionWords.length - diff).join(' ');
				const out = sectionWords.slice(-diff).join(' ');
				t[sectionIndex].text = inside;
				if (sectionIndex === transcription.length - 1 || isRegion(sectionIndex + 1, transcription)) {
					t.splice(sectionIndex + 1, 0, { text: out});
				} else {
					t[sectionIndex + 1].text = out + ' ' + t[sectionIndex + 1].text;
				}
			}
		} else {
			throw new Error('invalid handle side');
		}
		transcription = t;
	};

	const insertText = (index) => {

		if (0 > index || index > transcription.length) {
			throw new Error('Index out of range', index);
			return;
		}

		const {min: minStart} = startValidator(index);

		const maxEnd = transcription[index] ? transcription[index].end - $minRegionDuration : $duration;

		const suggestedEnd = transcription[index] ? transcription[index].start : $duration;
		const suggestedStart = (getPrevRegion(index).region || {end: 0}).end;

		const validateStart = end => start => minStart <= start && start <= (end - $minRegionDuration);
		const validateEnd = start => end => (start + $minRegionDuration) <= end && end <= maxEnd;

		openModal(
			EditSectionInfo,
			{
				title: 'Create Section',
				section: {
					text: '',
					start: suggestedStart,
					end: suggestedEnd,
				},
				beRegion: false,
				validateText: validateText,
				validateStart: validateStart,
				validateEnd: validateEnd,
				close: closeModal,
				done: async (section) => {
					const {text, start, end} = section;
					if (validateText(text)) {
						section.text = removeWhitespaces(text);
					}

					if (isRegion(section) && validateStart(end)(start) && validateEnd(start)(end)) {
						section.start = toFixed(start, 2);
						section.end = toFixed(end, 2);
					}

					const {success} = await insertSection(index, section, transcription, true);

				},
			},
		);
	};

	const startEditingSection = index => {
		const {text, start, end} = transcription[index];

		const {min: minStart} = startValidator(index);
		const {max: maxEnd} = endValidator(index);

		const validateStart = end => value => minStart <= value && value <= (end - $minRegionDuration);
		const validateEnd = start => value => (start + $minRegionDuration) <= value && value <= maxEnd;

		const wasRegion = isRegion(index, transcription);

		openModal(
			EditSectionInfo,
			{
				section: {
					text: text,
					start: wasRegion ? start : (getPrevRegion(index).region || {end: 0}).end,
					end: wasRegion ? end : (getNextRegion(index).region || {start: $duration}).start,
				},
				beRegion: wasRegion,
				validateText: validateText,
				validateStart: validateStart,
				validateEnd: validateEnd,
				close: closeModal,
				remove: () => deleteSection(index),
				done: (section) => {
					const t = transcription.map(section => Object.assign({}, section));
					const {text, start, end} = section;
					if (validateText(text)) {
						const trimmedText = removeWhitespaces(text);
						t[index].text = trimmedText;
					}

					if (isRegion(section)) {
						if (validateStart(end)(start) && validateEnd(start)(end)) {
							updateSection(index, {
								start: toFixed(start, 2),
								end: toFixed(end, 2),
							}, t);
							if (!wasRegion) {
								$activeIndex = index;
							}
						}
					} else {
						removeRegion(index, t);
					}

					transcription = t;

				},
			},
		);
	};

	const on = {
		section: {
			click: sectionIndex => async ({detail: {event}}) => {
				if (sectionIndex === $activeIndex) {
					$playing = event.button === 0 && !$playing;
				} else {
					$playing = false;
					await tick();
					$activeIndex = sectionIndex;
				}
				if (event.button === 2) {
					on.section.hold(sectionIndex)({detail: {event}});
				}
			},
			hold: sectionIndex => async ({detail: {event}}) => {
				$playing = false;
				await tick();
				$activeIndex = sectionIndex;
				openContextMenu(
					{
						pageX: event.x,
						pageY: event.y,
					}, [{
							name: 'Edit', 
							callback: () => startEditingSection(sectionIndex),
						}, {
							name: 'Insert text', 
							submenu: [{
								name: 'Before', 
								callback: () => insertText(sectionIndex),
							}, {
								name: 'After', 
								callback: () => insertText(sectionIndex + 1),
							},]
						}, {
							name: 'Remove region', 
							callback: () => removeRegion(sectionIndex),
						}, {
							name: 'Delete', 
							callback: () => deleteSection(sectionIndex),
							divider: true,
						},
					]
				);
			},
		},
		word: {
			click: sectionIndex => ({detail: {event, wordIndex}}) => {
				$activeIndex = undefined;
				if (event.button === 2) {
					on.word.hold(sectionIndex)({detail: {event, wordIndex}});
				}
			},
			hold: sectionIndex => ({detail: {wordIndex, event}}) => {
				if (typeof wordIndex !== 'number') {
					throw new Error('implementation error');
				}
				if (isRegion(sectionIndex)) {
					throw new Error('implementation error');
				}
				const {end: start} = getPrevRegion(sectionIndex).region || {end: 0};
				const {start: end} = getNextRegion(sectionIndex).region || {start: $duration};

				const canCreateRegion = start <= end - $minRegionDuration;
				const disabledMessage = 'Please resize neighbouring regions on the waveform.';

				openContextMenu({
					pageX: event.x,
					pageY: event.y,
				}, [
					{ name: 'Edit', callback: () => startEditingSection(sectionIndex), },
					{ name: 'Create region', disabled: canCreateRegion ? false : disabledMessage, submenu: [
						{ name: 'Word', callback: () => {
							const t = transcription.flat();
							const wordsInSection = t[sectionIndex].text.split(' ');
							const leftText = wordsInSection.slice(0, wordIndex).join(' ');
							const rightText = wordsInSection.slice(wordIndex + 1).join(' ');
							updateSection(sectionIndex, { start, end, text: wordsInSection[wordIndex] }, t, { color: true });

							if (rightText) {
								insertSection(sectionIndex + 1, { text: rightText }, t, false);
							}

							if (leftText) {
								insertSection(sectionIndex, { text: leftText }, t, false);
							}

							transcription = t;
						}, },
						{ name: 'Section', callback: () => updateSection(sectionIndex, { start, end }, transcription, { color: true }) },
					], },
					{ name: 'Delete', divider: true, callback: () => deleteSection(sectionIndex)},
				]);
			},
		},
		container: {
			click: event => {
				if (event.target !== container) return;
				$activeIndex = undefined;
			},
			contextMenu: event => {
				if (event.target !== container) return;

				$activeIndex = undefined;
				openContextMenu({
					pageX: event.x,
					pageY: event.y,
				}, [
					{ name: 'Insert Text', callback: () => insertText(transcription.length), },
				]);
			},
		}
	};

	let lineHeight;

</script>

<div bind:offsetHeight={lineHeight} style="position: absolute; left: -1000; top: -1000; color: transparent;">&nbsp;</div>
<div style="padding: 0.5rem;">
{#each transcription as section, sectionIndex}
<Section highlight={isRegion(section)} {fontSize} {lineHeight} index={sectionIndex}
	text={section.text} {containerWidth} color={section.color || regionColor}
	bind:wordElements={wordElementsBySection[sectionIndex]} 
	resizable={sectionIndex === $activeIndex} {sectionIndex} {container}
	on:resize={resize(sectionIndex)}
	on:section-click={on.section.click(sectionIndex)}
	on:section-hold={on.section.hold(sectionIndex)}
	on:word-click={on.word.click(sectionIndex)}
	on:word-hold={on.word.hold(sectionIndex)}
/>
{/each}
</div>

