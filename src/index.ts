import { Subject, animationFrameScheduler, from } from "rxjs";
import {
  map,
  tap,
  first,
  throttleTime,
  bufferCount,
  startWith,
  mergeMap,
  auditTime,
} from "rxjs/operators";
import { findClosestPitch } from "./freqsToPitch";
// @ts-ignore
import Meter from "./Meter.svelte";
import { freq, lastHundredFreqs } from "./stores";
import * as Comlink from "comlink";

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => console.log("Registered service worker"))
    .catch(() => console.log("Whoops..."));
}

const worker = new Worker("./dynamicWavelet.ts");
const obj = Comlink.wrap<{
  detectDynamicWavelet(buff: Float32Array): number | null;
}>(worker);

const FRAME = 1000 / 60;

const meter = new Meter({ target: document.getElementById("meter") });

const audioBuffer$ = new Subject<Float32Array>();
const pitchDisplay = document.getElementById("pitch")!;

function handleSuccess(stream: MediaStream) {
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(1024, 1, 1);

  source.connect(processor);
  processor.connect(context.destination);

  processor.onaudioprocess = function(e) {
    audioBuffer$.next(e.inputBuffer.getChannelData(0));
  };
}

const freq$ = audioBuffer$.pipe(
  mergeMap(buff => from(obj.detectDynamicWavelet(buff)).pipe()),
  throttleTime(0, animationFrameScheduler)
);

const pitch$ = freq$.pipe(
  map(x => (x == null ? 0 : x)),
  map(findClosestPitch)
);

const lastHundredFreq$ = freq$.pipe(
  startWith(...Array(100).fill(0)),
  bufferCount(100, 1)
);

freq$.pipe(auditTime(300)).subscribe(freq.set);
pitch$
  .pipe(auditTime(300))
  .subscribe(value => (pitchDisplay.textContent = value));
lastHundredFreq$.subscribe(lastHundredFreqs.set);

navigator.mediaDevices
  .getUserMedia({ audio: true, video: false })
  .then(handleSuccess)
  .catch(err => alert(`Whoops! ${err.message}`));

export default meter;
