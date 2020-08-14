<script>
	import { onMount, createEventDispatcher, getContext, setContext, tick } from 'svelte';
	import { activeIndex, duration, minRegionDuration, contextKey, playing, RegionColor } from './store';
	import interact from 'interactjs';
	import NewInput from './NewInput';
	import EditSectionInfo from './EditSectionInfo';
	import { countWords, removeWhitespaces, isFloat, toFixed } from './utils';
	import Section from './Section';

	const log = console.log;

	export let transcription;
	export let offset;
	export let length;

	const { 
		isRegion,
		isParagraph,
		isLine,
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

	const { getContainer, on: resizableOn, off: resizableOff } = getContext('resizable');
	const { open: openModal, close: closeModal } = getContext('simple-modal');
	const { open: openContextMenu, close: closeContextMenu } = getContext('simple-context-menu');
	const dispatch = createEventDispatcher();

	let container, containerWidth;

	onMount(async () => {
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

	let wordElementsBySection = [];

	$: wordElements = wordElementsBySection.flat().filter(e => e instanceof HTMLElement);

	setContext('sections', {
		getTargets: (side, index) => {
			if (wordElementsBySection && (index < 0 + offset || index - offset >= wordElementsBySection.length)) {
				throw new Error('implementation error');
			}
			const min = offset;
			const max = offset + length;

			if (side === 'left') {
				const { index: prevRegionIndex } = getPrevRegion(index, transcription);
				const startIndex = Math.max(0, prevRegionIndex + 1);
				return wordElementsBySection.slice(startIndex, index + 1).flat().filter(e => e instanceof HTMLElement);
			} else if (side === 'right') {
				const { index: nextRegionIndex } = getNextRegion(index);
				const endIndex = nextRegionIndex === -1 ? wordElementsBySection.length : nextRegionIndex - offset;
				return wordElementsBySection.slice(index - offset, offset + endIndex).flat().filter(e => e instanceof HTMLElement);
			}
			throw new Error('implementation error');
		},
		getWordElements: () => wordElements,
	});

	const resize = sectionIndex => ({detail: {side, diff}}) => {
		if (!isRegion(sectionIndex, transcription)) {
			console.log({sectionIndex, offset, length, side, diff});
			throw new Error('implementation error');
		}
		const t = transcription;
		let activeIndexDiff = 0;
		const sectionText = t[sectionIndex].text;
		const sectionWords = sectionText.split(' ');
		if (side === 'left') {
			if (diff < 0) {
				const trimStart = (index, diff, t) => {
					if (diff === 0) {
						return t;
					}
					
					const wordCount = t[index].text.split(' ').length;
					if (diff >= wordCount) {
						throw new Error('impl');
					}

					const out = sectionWords.slice(0, diff).join(' ');
					const inside = sectionWords.slice(diff).join(' ');
					updateSection(index, { text: inside }, t);
					if (index === 0 || isLine(index, t) || isParagraph(index, t) || isRegion(index - 1, t)) {
						activeIndexDiff += 1;
						t.splice(index, 0, { text: out });
						updateSection(index, {
							line: t[index + 1].line, 
							paragraph: t[index + 1].paragraph,
						}, t, { breakpoints: true });
						updateSection(index + 1, {
							line: false, 
							paragraph: false,
						}, t, { breakpoints: true });
					} else {
						updateSection(index - 1, { text: t[index - 1].text + ' ' + out }, t);
					}
				};

				trimStart(sectionIndex, -diff, t);
			} else if (diff > 0) {
				// extend start
				if (sectionIndex === 0) {
					throw new Error('implementation error. When extending left handle, section index should be strictly larger than 0.');
				} else if (isRegion(sectionIndex - 1)) {
					throw new Error('implementation error');
				} else {
					const extendStart = (index, diff, t) => {
						if (diff === 0) {
							return t;
						}

						if (index === 0 || isLine(index, t) || isParagraph(index, t) || isRegion(index - 1, t)) {
							console.log(index === 0, isLine(index, t), isParagraph(index, t), isRegion(index - 1, t));
							throw new Error('impl');
						}

						const prevSectionText = transcription[index - 1].text;
						const prevSectionWords = prevSectionText.split(' ');
						const prevWordCount = prevSectionWords.length;
						if (diff >= prevWordCount) {
							activeIndexDiff -= 1;
							updateSection(index, {
								text: prevSectionText + ' ' + t[index].text,
								line: t[index - 1].line, 
								paragraph: t[index - 1].paragraph 
							}, t, { breakpoints: true });
							t.splice(index - 1, 1);
							return extendStart(index - 1, diff - prevWordCount, t);
						} else {
							const inside = prevSectionWords.slice(-diff).join(' ');
							const out = prevSectionWords.slice(0, prevSectionWords.length - diff).join(' ');

							updateSection(index, { text: inside + ' ' + t[index].text }, t);
							updateSection(index - 1, { text: out }, t);
							return t;
						}
					};

					extendStart(sectionIndex, diff, t);
				}
			}
		} else if (side === 'right') {
			if (diff < 0) {
				if (sectionIndex === transcription.length - 1) {
					throw new Error('implementation error');
				} else if (isRegion(sectionIndex + 1, transcription)) {
					throw new Error('implementation error');
				} else {
					const extendRight = (index, diff, t) => {
						if (diff === 0) {
							return t;
						}

						if (diff < 0 || isRegion(index + 1, t) || isLine(index + 1, t) || isParagraph(index + 1, t) || index + 1 >= t.length) {
							// console.log(diff < 0, isRegion(index + 1, t), isLine(index + 1, t), isParagraph(index + 1, t), index + 1 >= t.length)
							console.log({index, diff, transcription: t});
							throw new Error('impl');
						}
						
						const nextSectionText = transcription[index + 1].text;
						const nextSectionWords = nextSectionText.split(' ');
						const nextWordCount = nextSectionWords.length;
						if (diff >= nextWordCount) {
							updateSection(index, { text: t[index].text + ' ' + t[index + 1].text }, t);
							t.splice(index + 1, 1);
							return extendRight(index, diff - nextWordCount, t);
						} else {
							const inside = nextSectionWords.slice(0, diff).join(' ');
							const out = nextSectionWords.slice(diff).join(' ');
							updateSection(index, { text: t[index].text + ' ' + inside }, t)
							updateSection(index + 1, { text: out }, t);
							return t;
						}
					};

					extendRight(sectionIndex, -diff, t);
				}
			} else if (diff > 0) {
				const trimRight = (index, diff, t) => {
					const wordCount = t[index].text.split(' ').length;
					if (diff >= wordCount) {
						throw new Error('impl');
					} else {
						const inside = sectionWords.slice(0, sectionWords.length - diff).join(' ');
						const out = sectionWords.slice(-diff).join(' ');

						updateSection(index, { text: inside }, t);
						if (index === t.length - 1 || isParagraph(index + 1, t) || isLine(index + 1, t) || isRegion(index + 1, t)) {
							t.splice(index + 1, 0, { text: out });
						} else {
							updateSection(index + 1, { text: out + ' ' + t[index + 1].text}, t);
						}
					}
				};

				trimRight(sectionIndex, diff, t);
			}
		} else {
			throw new Error('invalid handle side');
		}
		transcription = t;
		tick().then(() => {
			$activeIndex = sectionIndex + activeIndexDiff;
		});
	};

	const insertText = (index, before = false) => {

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
					line: false,
					paragraph: index === 0,
				},
				beRegion: false,
				paragraphConfigurable: index !== 0, 
				validateText: validateText,
				validateStart: validateStart,
				validateEnd: validateEnd,
				close: closeModal,
				done: async (section) => {
					console.log({section});
					const {text, start, end, line, paragraph} = section;
					if (validateText(text)) {
						section.text = removeWhitespaces(text);
					}

					if (isRegion(section) && validateStart(end)(start) && validateEnd(start)(end)) {
						section.start = toFixed(start, 2);
						section.end = toFixed(end, 2);
					}

					if (index === transcription.length || !before) {
						insertSection(index, section, transcription, true)
					} else {
						if (paragraph && line) {
							await insertSection(index, Object.assign(section, {line: true, paragraph}), transcription, true);
						} else if (paragraph) {
							await insertSection(index, Object.assign(section, {line: true, paragraph}), transcription, true);
						} else if (line) {
							const { paragraph } = transcription[index];
							await updateSection(index, {paragraph: false}, transcription, { breakpoints: true });
							await insertSection(index, Object.assign(section, {line, paragraph}), transcription, true);
						} else {
							const { line, paragraph } = transcription[index];
							await updateSection(index, {line: false, paragraph: false}, transcription, { breakpoints: true });
							await insertSection(index, Object.assign(section, {line, paragraph}), transcription, true);
						}
					}

				},
			},
		);
	};

	const startEditingSection = index => {
		const {text, start, end, paragraph, line} = transcription[index];

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
					paragraph: index === 0 || paragraph, 
					line,
				},
				beRegion: wasRegion,
				paragraphConfigurable: index !== 0, 
				validateText: validateText,
				validateStart: validateStart,
				validateEnd: validateEnd,
				close: closeModal,
				remove: () => deleteSection(index),
				done: (section) => {
					const t = transcription.map(section => Object.assign({}, section));
					const {text, start, end, paragraph: _paragraph, line: _line} = section;
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

					if (_line !== line || _paragraph !== paragraph) {
						updateSection(index, {line: _line, paragraph: _paragraph}, t, { breakpoints: true })
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
								callback: () => insertText(sectionIndex, true),
							}, {
								name: 'After', 
								callback: () => insertText(sectionIndex + 1, false),
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
					{
						name: 'Insert text', 
						submenu: [{
							name: 'Before', 
							callback: () => insertText(sectionIndex, true),
						}, {
							name: 'After', 
							callback: () => insertText(sectionIndex + 1, false),
						},]
					},
					{ name: 'Create region', disabled: canCreateRegion ? false : disabledMessage, submenu: [
						{ name: 'Word', callback: () => {
							const t = transcription.flat();
							const wordsInSection = t[sectionIndex].text.split(' ');
							const leftText = wordsInSection.slice(0, wordIndex).join(' ');
							const rightText = wordsInSection.slice(wordIndex + 1).join(' ');
							updateSection(sectionIndex, { start, end, text: wordsInSection[wordIndex] }, t, { color: false });

							if (rightText) {
								insertSection(sectionIndex + 1, { text: rightText }, t, false);
							}

							if (leftText) {
								insertSection(sectionIndex, { text: leftText }, t, false);
							}

							transcription = t;
						}, },
						{ name: 'Section', callback: () => updateSection(sectionIndex, { start, end }, transcription, { color: false }) },
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
					{ name: 'Append Text', callback: () => insertText(transcription.length, false), },
				]);
			},
		}
	};

	let lineHeight;

</script>

<div bind:offsetHeight={lineHeight} style="position: absolute; left: -1000; top: -1000; color: transparent;">&nbsp;</div>
<div bind:this={container} style="padding: 0.0rem; box-sizing: border-box;">
{#each transcription as section, sectionIndex}
{#if sectionIndex >= offset && sectionIndex < offset + length}
<Section highlight={isRegion(section)} {lineHeight} index={sectionIndex}
	text={section.text} {containerWidth} color={section.color || $RegionColor}
	bind:wordElements={wordElementsBySection[sectionIndex]} 
	resizable={sectionIndex === $activeIndex} {sectionIndex} {container}
	on:resize={resize(sectionIndex)}
	on:section-click={on.section.click(sectionIndex)}
	on:section-hold={on.section.hold(sectionIndex)}
	on:word-click={on.word.click(sectionIndex)}
	on:word-hold={on.word.hold(sectionIndex)}
/>
{/if}
{/each}
</div>

