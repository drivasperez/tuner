import { detectDynamicWavelet } from "./dynamicWavelet";
import { Subject, animationFrameScheduler } from "rxjs";
import {
  map,
  tap,
  first,
  throttleTime,
  bufferCount,
  startWith,
} from "rxjs/operators";
import { findClosestPitch } from "./freqsToPitch";
import Meter from "./Meter.svelte";
import { freq, lastHundredFreqs } from "./stores";

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

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
  map(buff => detectDynamicWavelet(buff)),
  map(x => (x == null ? 0 : x)),
  throttleTime(0, animationFrameScheduler)
);

const pitch$ = freq$.pipe(map(findClosestPitch));

const lastHundredFreq$ = freq$.pipe(
  startWith(...Array(100).fill(0)),
  bufferCount(100, 1)
);

audioBuffer$.pipe(first()).subscribe(console.log);

freq$.subscribe(freq.set);
pitch$
  .pipe(throttleTime(300))
  .subscribe(value => (pitchDisplay.textContent = value));
lastHundredFreq$.subscribe(lastHundredFreqs.set);

navigator.mediaDevices
  .getUserMedia({ audio: true, video: false })
  .then(handleSuccess)
  .catch(err => alert(`Whoops! ${err.message}`));

export default meter;
