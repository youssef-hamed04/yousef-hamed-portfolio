// SVG path for a sine wave, used by the loader and the marquee separators.
export function sinePath(width: number, height: number, cycles: number, step = 4) {
  const mid = height / 2;
  const amp = height / 2 - 2;
  let d = "";
  for (let x = 0; x <= width; x += step) {
    const y = mid - Math.sin((x / width) * cycles * Math.PI * 2) * amp;
    d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)} `;
  }
  return d.trim();
}
