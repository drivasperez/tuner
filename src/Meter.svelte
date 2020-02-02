<script>
  import { line, curveCatmullRom } from "d3-shape";
  import { freq, lastHundredFreqs } from "./stores";
  console.log(curveCatmullRom);

  const fn = line().curve(curveCatmullRom);

  function jump() {
    freq.set($freq + 400);
  }

  $: percent = ($freq / 3951) * 100;

  $: graphpoints = $lastHundredFreqs.map((x, i) => [i, 100 - (x / 3951) * 100]);

  let svgline;
  $: {
    svgline = fn(graphpoints);
  }

  const pips = Array(21)
    .fill(0)
    .map((_x, i) => (i % 4 === 0 ? 30 : 5));
  console.log("Pips:", pips);
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
    max-height: 300px;
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
