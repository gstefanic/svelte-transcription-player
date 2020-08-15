import { withKnobs, text, boolean, select, color } from "@storybook/addon-knobs";
import { action } from '@storybook/addon-actions';

import TranscriptionPlayer from './../../src/TranscriptionPlayer.svelte';

const fontSizeOptions = {
	'extra-small': '0.75rem',
	'small': '1.2rem',
	'normal': '1.5rem',
	'large': '1.75rem',
	'extra-large': '2rem',
};

const playerHeightOptions = {
	small: 'small', 
	normal: 'normal', 
	large: 'large'
};

export default {
	title: 'TranscriptionPlayer',
	component: TranscriptionPlayer,
	decorators: [ withKnobs ],
};

export const viewOnly = () => ({
	title: 'View Only',
	Component: TranscriptionPlayer,
	props: {
		audio: text('audio', '../demo1.mp3'),
		transcription: text('transcription', '../demo1.json'),
		baseFontSize: select('fontSize', fontSizeOptions, fontSizeOptions.normal),
		fontConfigurable: boolean('fontConfigurable', false),
		autoplay: boolean('autoplay', true),
		autoplayConfigurable: boolean('autoplayConfigurable', false),
		// autoscroll: boolean('autoscroll', true),
		// autoscrollConfigurable: boolean('autoscrollConfigurable', false),
		showParagraphNumbers: boolean('showParagraphNumbers', true),
		importEnabled: boolean('importEnabled', false),
		exportEnabled: boolean('exportEnabled', false),
		playerHeight: select('playerHeight', playerHeightOptions, playerHeightOptions.normal),
		backgroundColor: color('backgroundColor', '#F0F8FF'),
		primaryColor: color('primaryColor', '#4353FF'),
		secondaryColor: color('secondaryColor', '#D9DCFF'),
		regionColor: color('regionColor', '#7F7FFF'),
	},
});

export const editMode = () => ({
	title: 'Edit Mode',
	Component: TranscriptionPlayer,
	props: {
		onEdited: (transcription, approve) => {
			action('onEdited')(transcription);
			setTimeout(approve, 1000);
		},
		audio: text('audio', '../demo1.mp3'),
		transcription: text('transcription', '../demo1.json'),
		baseFontSize: select('fontSize', fontSizeOptions, fontSizeOptions.normal),
		fontConfigurable: boolean('fontConfigurable', true),
		autoplay: boolean('autoplay', true),
		autoscrollConfigurable: boolean('autoscrollConfigurable', true),
		showParagraphNumbers: boolean('showParagraphNumbers', true),
		importEnabled: boolean('importEnabled', true),
		exportEnabled: boolean('exportEnabled', true),
		playerHeight: select('playerHeight', playerHeightOptions, playerHeightOptions.normal),
		backgroundColor: color('backgroundColor', '#F0F8FF'),
		primaryColor: color('primaryColor', '#4353FF'),
		secondaryColor: color('secondaryColor', '#D9DCFF'),
		regionColor: color('regionColor', '#7F7FFF'),
	},
});

export const demo2 = () => ({
	title: 'Edit Mode',
	Component: TranscriptionPlayer,
	props: {
		onEdited: (transcription, approve) => {
			action('onEdited')(transcription);
			setTimeout(approve, 1000);
		},
		audio: text('audio', '../demo2.mp3'),
		transcription: text('transcription', '../demo2.json'),
		baseFontSize: select('fontSize', fontSizeOptions, fontSizeOptions.normal),
		fontConfigurable: boolean('fontConfigurable', true),
		autoplay: boolean('autoplay', true),
		autoplayConfigurable: boolean('autoplayConfigurable', true),
		showParagraphNumbers: boolean('showParagraphNumbers', true),
		importEnabled: boolean('importEnabled', true),
		exportEnabled: boolean('exportEnabled', true),
		playerHeight: select('playerHeight', playerHeightOptions, playerHeightOptions.normal),
		backgroundColor: color('backgroundColor', '#F0F8FF'),
		primaryColor: color('primaryColor', '#4353FF'),
		secondaryColor: color('secondaryColor', '#D9DCFF'),
		regionColor: color('regionColor', '#7F7FFF'),
	},
});

export const demo3 = () => ({
	title: 'Edit Mode',
	Component: TranscriptionPlayer,
	props: {
		onEdited: (transcription, approve) => {
			action('onEdited')(transcription);
			setTimeout(approve, 1000);
		},
		audio: text('audio', '../demo3.mp3'),
		transcription: text('transcription', '../demo3.json'),
		baseFontSize: select('fontSize', fontSizeOptions, fontSizeOptions.normal),
		fontConfigurable: boolean('fontConfigurable', true),
		autoplay: boolean('autoplay', true),
		autoplayConfigurable: boolean('autoplayConfigurable', true),
		autoscroll: boolean('autoscroll', true),
		autoscrollConfigurable: boolean('autoscrollConfigurable', true),
		showParagraphNumbers: boolean('showParagraphNumbers', true),
		importEnabled: boolean('importEnabled', true),
		exportEnabled: boolean('exportEnabled', true),
		playerHeight: select('playerHeight', playerHeightOptions, playerHeightOptions.normal),
		backgroundColor: color('backgroundColor', '#F0F8FF'),
		primaryColor: color('primaryColor', '#4353FF'),
		secondaryColor: color('secondaryColor', '#D9DCFF'),
		regionColor: color('regionColor', '#7F7FFF'),
	},
});