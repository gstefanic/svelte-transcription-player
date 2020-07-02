<script>
	import { onMount, createEventDispatcher, getContext } from 'svelte';
	import { activeIndex, duration, minRegionDuration, contextKey } from './store';
	import interact from 'interactjs';
	import NewInput from './NewInput';
	import Dialog from './Dialog';
	import EditSectionInfo from './EditSectionInfo';
	import { countWords, removeWhitespaces, isFloat, toFixed } from './utils';
	import { highlightable } from './highlightable';

	export let transcription;
	export let fontSize;

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
		updateSection, 
		insertSection 
	} = getContext(contextKey);

	const { open: openModal, close: closeModal } = getContext('simple-modal');
	const { open: openContextMenu, close: closeContextMenu } = getContext('simple-context-menu');

	let text, sections, containerWidth, container;
	const dispatch = createEventDispatcher();
	const colors = ['red', 'green', 'blue', 'orangered'];

	onMount(async () => {
		const containerInteraction = interact(container).on('hold', on.background.contextMenu);

		return () => containerInteraction.unset();
	});
	
	$: onTranscriptionChange(transcription, $activeIndex);

	const onTranscriptionChange = () => {
		const {text: t, sections: s} = transformFromTransctiption(sections);
		text = t;
		sections = s;
	};

	const transformFromTransctiption = () => {
		const initValue = {
			text: '',
			sections: [],
			len: 0,
		};

		if (!transcription) {
			return initValue;
		}

		return transcription.reduce(({text, sections, len}, section, index) => {
			const wordsInSection = section.text.trim().split(' ').length;
			let newSection;

			if (section.end !== undefined && section.start !== undefined) {

				if (!section.color || sections.length && sections[sections.length - 1].color === section.color) {
					const possibleColors = colors.filter(color => !(sections[sections.length - 1] && sections[sections.length - 1].color === color));

					section.color = possibleColors[Math.floor(Math.random() * possibleColors.length)];
				}

				newSection = {
					offset: len,
					length: wordsInSection,
					index: index,
					color: section.color,
					start: section.start,
					end: section.end,
					resizable: index === $activeIndex
				};
			}
			return {
				text: text ? (text + ' ' + section.text.trim()) : section.text.trim(),
				sections: newSection ? sections.concat([newSection]) : sections,
				len: len + wordsInSection,
			};
		}, initValue);
	};

	const transformToTransctiption = (text, sections) => {
		const words = text.split(' ');
		let lastOffset = 0;
		let lastLength = 0;
		const res = sections.reduce((acc, {offset, length, color, start, end}, index, arr) => {
			const lastEnd = lastOffset + lastLength;

			const nonSelected = words.slice(lastEnd, offset);

			if (nonSelected && nonSelected.length > 0) {
				acc.push({
					text: nonSelected.join(' '),
				});
			}

			acc.push({
				text: words.slice(offset, offset + length).join(' '),
				color: color,
				start: start,
				end: end,
			});

			lastOffset = offset;
			lastLength = length;

			if (index === arr.length - 1 && (lastOffset + lastLength) < words.length) {
				const lastNonSeclected = words.slice(lastOffset + lastLength, words.length);
				acc.push({
					text: lastNonSeclected.join(' '),
				});
			}

			return acc;
		}, []);
		return res;
	};

	const createNewRegion = (offset, length) => {
		let regionIndex = sections.findIndex(({offset: o, length: l}) => {
			return offset < o;
		});

		let sectionIndex;

		if (regionIndex === -1) {
			regionIndex = sections.length;
			sectionIndex = transcription.length - 1;
		} else {
			sectionIndex = mapRegionIndexToIndex(regionIndex);
		}

		const getStartTime = () => {
			const {region: prevRegion} = getPrevRegion(sectionIndex);
			return prevRegion ? prevRegion.end : 0;
		};

		const getEndTime = () => {
			if (transcription[sectionIndex] && transcription[sectionIndex].start !== undefined) {
				return transcription[sectionIndex].start;
			} else {
				return $duration;
			}
		};

		const getColor = () => {
			const notAllowedColors = [
				(sections[regionIndex - 1] || {}).color,
				(sections[regionIndex + 1] || {}).color,
			];
			const possibleColors = colors.filter(color => notAllowedColors.includes(color));
			return possibleColors[Math.floor(Math.random() * possibleColors.length)];
		}

		const start = getStartTime();
		const end = getEndTime();

		if (end - start >= $minRegionDuration) {
			sections.splice(regionIndex, 0, {
				offset: offset,
				length: length,
				start: start,
				end: end,
				color: getColor(),
			});

			transcription = transformToTransctiption(text, sections);
			$activeIndex = mapRegionIndexToIndex(regionIndex);
		} else {
			// TODO: show error
		}
	};

	const startEditingSection = index => {
		const {text, start, end} = transcription[index];

		const {min: minStart} = startValidator(index);
		const {max: maxEnd} = endValidator(index);

		const validateStart = end => value => minStart <= value && value <= (end - $minRegionDuration);
		const validateEnd = start => value => (start + $minRegionDuration) <= value && value <= maxEnd;

		const wasRegion = isRegion(index);

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
					const {text, start, end} = section;
					if (validateText(text)) {
						const trimmedText = removeWhitespaces(text);
						transcription[index].text = trimmedText;
					}

					if (isRegion(section)) {
						if (validateStart(end)(start) && validateEnd(start)(end)) {
							updateSection(index, {
								start: toFixed(start, 2),
								end: toFixed(end, 2),
							});
							console.log('transcription updated', JSON.parse(JSON.stringify(transcription)))
							if (!wasRegion) {
								$activeIndex = index;
							}
						}
					} else {
						removeRegion(index);
					}

				},
			},
		);
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
				done: (section) => {
					const {text, start, end} = section;
					if (validateText(text)) {
						section.text = removeWhitespaces(text);
					}

					if (isRegion(section) && validateStart(end)(start) && validateEnd(start)(end)) {
						section.start = toFixed(start, 2);
						section.end = toFixed(end, 2);
					}

					const {success} = insertSection(index, section);

					console.log('inserting seccess:', success);

				},
			},
		);
	};

	const on = {
		section: {
			change: ({detail}) => {
				console.log('on.section.change', detail);
				const {index: regionIndex, sections: newSections, oldSections, section} = event.detail;
				const {index: sectionIndex} = section;
				transcription = transformToTransctiption(text, sections);
				$activeIndex = sectionIndex;
			},
			click: ({detail}) => {
				const {section, index: regionIndex, event} = detail;
				console.log('on.section.click', event);
				const {index: sectionIndex} = section;
				if (regionIndex !== undefined && sectionIndex !== undefined) {
					$activeIndex = sectionIndex;
				}
				if (event.button === 2) {
					on.section.hold({detail: detail});
				}
			},
			hold: ({detail}) => {
				const {section, index: regionIndex, event} = detail;
				const {index} = section;
				console.log('onSectionHold', regionIndex, index);

				openContextMenu(
					{
						pageX: event.x,
						pageY: event.y,
					}, [{
							name: 'Edit', 
							callback: () => startEditingSection(index),
						}, {
							name: 'Insert text', 
							submenu: [{
								name: 'Before', 
								callback: () => insertText(index),
							}, {
								name: 'After', 
								callback: () => insertText(index + 1),
							},]
						}, {
							name: 'Remove region', 
							callback: () => removeRegion(index),
						}, {
							name: 'Delete', 
							callback: () => deleteSection(index),
							divider: true,
						},
					]
				);
			},
		},
		word: {
			click: ({detail}) => {
				const {offset, event} = detail || {};
				console.log('onWordClick', event);
				$activeIndex = undefined;
				if (event.button === 2) {
					on.word.hold({detail: detail});
				}
			},
			hold: ({detail}) => {
				const {offset, event} = detail || {};

				console.log('on word hold')

				let tmpOffset = 0, ifItWereRegion;
				for (var index = 0; index < transcription.length; index++) {
					const sectionWordCount = transcription[index].text.split(' ').length;
					tmpOffset += sectionWordCount;
					console.log('iteration', sectionWordCount, tmpOffset)
					if (offset < tmpOffset) {
						ifItWereRegion = {
							offset: tmpOffset - sectionWordCount,
							length: sectionWordCount,
						}
						break;
					}
				}
				console.log('onWordHold', offset, event, index, 'ifItWereRegion', ifItWereRegion);

				openContextMenu({
					pageX: event.x,
					pageY: event.y,
				}, [
					{ name: 'Edit', callback: () => startEditingSection(index), },
					{ name: 'Create region', submenu: [
						{ name: 'Word', callback: () => createNewRegion(offset, 1), },
						{ name: 'Section', callback: () => createNewRegion(ifItWereRegion.offset, ifItWereRegion.length) },
					], },
					{ name: 'Delete', divider: true, callback: () => deleteSection(index)},
				]);
			},
		},
		background: {
			click: event => {
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
			}
		}
	};
</script>

<div class="container"
	bind:this={container}
	bind:offsetWidth={containerWidth} 
    use:highlightable={{text: text, sections: sections, containerWidth: containerWidth, fontSize: fontSize}}
	on:section-click={on.section.click}
	on:word-click={on.word.click}
	on:word-hold={on.word.hold}
	on:section-hold={on.section.hold}
	on:section-changed={on.section.change}
	on:click|self={on.background.click}
	on:contextmenu={on.background.contextMenu}
/>
<style>
	.container {
		height: 100%;
	}
</style>