import { writable, readable } from 'svelte/store';

export const playing = writable(false);
export const duration = writable(0);
export const activeIndex = writable(undefined);
export const minRegionDuration = readable(1); // in seconds
export const contextKey = readable('fdjgfmuvgfughufghbufdgvdui'); // in seconds
export const time = writable(0);
export const editMode = writable(false);
export const PrimaryColor = writable('#4353FF');
export const SecondaryColor = writable('#D9DCFF');
export const BackgroundColor = writable('#F0F8FF');
export const RegionColor = writable('#7F7FFF');
export const ShowParagraphNumbers = writable(false);
export const Autoplay = writable(true);
export const FontSizePx = writable(undefined);
export const hovering = writable([]);
export const alternated = writable([]);