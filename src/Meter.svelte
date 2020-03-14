<script>
  import { line, curveCatmullRom } from "d3-shape";
  import { freq, lastHundredFreqs } from "./stores";

  const fn = line().curve(curveCatmullRom);

  $: percent = ($freq / 3951) * 100;

  let graphpoints;
  $: {
    let newPoints = [];
    let i = 0;
    for (const y of $lastHundredFreqs) {
      if (y !== null) {
        newPoints.push([i, 100 - (y / 3951) * 100]);
      }
      i++;
    }
    graphpoints = newPoints;
  }

  let svgline;
  $: {
    svgline = fn(graphpoints);
  }

  const pips = Array(21)
    .fill(0)
    .map((_x, i) => (i % 4 === 0 ? 30 : 5));
</script>

<svg id="graph" viewBox="0 0 100 100" preserveAspectRatio="none">
  <path id="line" d="{svgline}" fill="none" />
  <line
    id="needle"
    x1="0"
    x2="0"
    y1="100%"
    y2="35%"
    style="transform: translate({percent}%, 0)"
  />
  {#each pips as pip, index}
  <line
    class="pip"
    x1="{index * 5}%"
    y1="100%"
    x2="{index * 5}%"
    y2="{80 - pip}%"
  />
  {/each}
</svg>

<style>
  svg {
    width: 100%;
    height: 40vh;
  }
  .pip {
    stroke: rgb(0, 0, 0);
    stroke-width: 0.4;
  }

  #needle {
    stroke: red;
    stroke-width: 0.5;
    will-change: transform;
  }

  #line {
    stroke: white;
    stroke-width: 0.4;
  }
</style>
