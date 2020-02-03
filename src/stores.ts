import { spring } from "svelte/motion";
import { writable } from "svelte/store";

export const freq = spring<number | null>(0);
export const lastHundredFreqs = writable<(number | null)[]>([]);
