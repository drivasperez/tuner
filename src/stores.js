import { spring } from "svelte/motion";
import { writable } from "svelte/store";

export const freq = spring(0);
export const lastHundredFreqs = writable([]);
