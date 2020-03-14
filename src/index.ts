import { Subject, animationFrameScheduler, from } from "rxjs";
import {
  map,
  throttleTime,
  bufferCount,
  startWith,
  mergeMap,
  auditTime,
} from "rxjs/operators";
import { findClosestPitch } from "./freqsToPitch";
// @ts-ignore (typescript doesn't support svelte imports)
import Meter from "./Meter.svelte";
import { freq, lastHundredFreqs } from "./stores";
import * as Comlink from "comlink";

// Safari doesn't suppport standard AudioContext.
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => console.log("Registered service worker"))
    .catch(() => console.log("Whoops..."));
}

const audioBuffer$ = new Subject<Float32Array>();
const pitchDisplay = document.getElementById("pitch")!;

// Put audio stuff into another thread.
const worker = new Worker("./dynamicWavelet.ts");
const obj = Comlink.wrap<{
  detectDynamicWavelet(buff: Float32Array): number | null;
}>(worker);

// Set up svelte component.
const meter = new Meter({ target: document.getElementById("meter") });

// Ask for permission to use the microphone.
navigator.mediaDevices
  .getUserMedia({ audio: true, video: false })
  .then(handleGotStream)
  .catch(err => alert(`Whoops! ${err.message}`));

// Take the stream and pipe its bytes into the RXJs Subject
function handleGotStream(stream: MediaStream) {
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(1024, 1, 1);

  source.connect(processor);
  processor.connect(context.destination);

  processor.onaudioprocess = function(e) {
    audioBuffer$.next(e.inputBuffer.getChannelData(0));
  };
}

// The Comlink-wrapped version of detectDynamicWavelet is async,
// so we have to wrap it in Rx.from() and merge the new observables
// back into the stream. Throttle results by animation frame.
const freq$ = audioBuffer$.pipe(
  mergeMap(buff => from(obj.detectDynamicWavelet(buff)).pipe()),
  throttleTime(0, animationFrameScheduler)
);

// Find the closest pitch to the frequency. This controls the big pitch letter.
const pitch$ = freq$.pipe(
  auditTime(300),
  map(x => (x == null ? 0 : x)),
  map(findClosestPitch)
);

// This controls the real time frequency graph.
// Turn freq$ into a stream of 100-length arrays of pitch.
const lastHundredFreq$ = freq$.pipe(
  startWith(...Array(100).fill(0)),
  bufferCount(100, 1)
);

// Controls the frequency needle.
freq$
  .pipe(
    auditTime(300),
    map(x => (x == null ? 0 : x))
  )
  .subscribe(freq.set);

pitch$.subscribe(value => (pitchDisplay.textContent = value));
lastHundredFreq$.subscribe(lastHundredFreqs.set);

export default meter;
