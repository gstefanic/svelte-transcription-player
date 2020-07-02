import { writable, readable } from 'svelte/store';

export const playing = writable(false);
export const duration = writable(0);
export const activeIndex = writable(undefined);
export const minRegionDuration = readable(1); // in seconds
export const contextKey = readable('fdjgfmuvgfughufghbufdgvdui'); // in seconds
export const time = writable(0);