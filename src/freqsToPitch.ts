const freqsToPitch: [string, number][] = [
  ["C", 16],
  ["C#", 17],
  ["D ", 18],
  ["D#", 20],
  ["E ", 21],
  ["F ", 22],
  ["F#", 23],
  ["G ", 25],
  ["G#", 26],
  ["A ", 28],
  ["A#", 29],
  ["B ", 31],
  ["C ", 33],
  ["C#", 35],
  ["D ", 37],
  ["D#", 39],
  ["E ", 41],
  ["F ", 44],
  ["F#", 46],
  ["G ", 49],
  ["G#", 52],
  ["A ", 55],
  ["A#", 58],
  ["B ", 62],
  ["C ", 65],
  ["C#", 69],
  ["D ", 73],
  ["D#", 78],
  ["E ", 82],
  ["F ", 87],
  ["F#", 93],
  ["G ", 98],
  ["G#", 104],
  ["A ", 110],
  ["A#", 117],
  ["B ", 124],
  ["C ", 131],
  ["C#", 139],
  ["D ", 147],
  ["D#", 156],
  ["E ", 165],
  ["F ", 175],
  ["F#", 185],
  ["G ", 196],
  ["G#", 208],
  ["A ", 220],
  ["A#", 233],
  ["B ", 247],
  ["C ", 262],
  ["C#", 278],
  ["D ", 294],
  ["D#", 311],
  ["E ", 330],
  ["F ", 349],
  ["F#", 370],
  ["G ", 392],
  ["G#", 415],
  ["A ", 440],
  ["A#", 466],
  ["B ", 494],
  ["C ", 523],
  ["C#", 554],
  ["D ", 587],
  ["D#", 622],
  ["E ", 659],
  ["F ", 699],
  ["F#", 740],
  ["G ", 784],
  ["G#", 831],
  ["A ", 880],
  ["A#", 932],
  ["B ", 988],
  ["C ", 1047],
  ["C#", 1109],
  ["D ", 1175],
  ["D#", 1245],
  ["E ", 1319],
  ["F ", 1397],
  ["F#", 1475],
  ["G ", 1568],
  ["G#", 1661],
  ["A ", 1760],
  ["A#", 1865],
  ["B ", 1976],
  ["C ", 2093],
  ["C#", 2218],
  ["D ", 2349],
  ["D#", 2489],
  ["E ", 2637],
  ["F ", 2794],
  ["F#", 2960],
  ["G ", 3136],
  ["G#", 3322],
  ["A ", 3520],
  ["A#", 3729],
  ["B ", 3951],
  ["C ", 4186],
  ["C#", 4435],
  ["D ", 4699],
  ["D#", 4978],
  ["E ", 5274],
  ["F ", 5588],
  ["F#", 5920],
  ["G ", 6272],
  ["G#", 6645],
  ["A ", 7040],
  ["A#", 7459],
  ["B ", 7902],
];

export function findClosestPitch(freq: number): string {
  let lb = 0;
  let ub = freqsToPitch.length - 1;

  while (lb <= ub) {
    let mid = Math.floor((ub + lb) / 2);

    if (freq < freqsToPitch[mid][1]) {
      ub = mid - 1;
    } else if (freq > freqsToPitch[mid][1]) {
      lb = mid + 1;
    } else {
      return freqsToPitch[mid][0];
    }
  }
  // lo == hi + 1

  return freqsToPitch[Math.max(0, lb)][1] - freq <
    freq - freqsToPitch[Math.max(0, ub)][1]
    ? freqsToPitch[Math.max(lb, 0)][0]
    : freqsToPitch[Math.max(ub, 0)][0];
}
