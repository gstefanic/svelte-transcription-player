import { action } from '@storybook/addon-actions';

import TranscriptionPlayer from './../../src/TranscriptionPlayer.svelte';

export default {
	title: 'TranscriptionPlayer',
	component: TranscriptionPlayer,
};

export const viewOnly = () => ({
	title: 'View Only',
	Component: TranscriptionPlayer,
	props: {
		audio: '../demo.mp3',
		transcription: '../demo.json',
	},
});

export const editMode = () => ({
	title: 'Edit Mode',
	Component: TranscriptionPlayer,
	props: {
		audio: '../demo.mp3',
		transcription: '../demo.json',
		onEdited: (_, a) => setTimeout(a, 1000),
	},
	fontConfigurable: true,
	autoplayConfigurable: true,
	autoscrollConfigurable: true,
	importEnabled: true,
	exportEnabled: true,
});