/**
 * The horizon under the hero: a sun going down into water, with a small island
 * off to one side.
 *
 * Each piece is its own fixed-size SVG on an integer grid, and the water is a
 * CSS band behind them. Stretching one wide SVG across the viewport would scale
 * the grid non-uniformly and turn every "pixel" into a rectangle, which is the
 * one thing this artwork cannot survive. Layer order puts the sun behind the
 * water so it sets into it.
 */

/** A stepped disc on a 16x16 grid: row widths staircase rather than curve. */
const SUN: [number, number][] = [
  [6, 4], [4, 8], [3, 10], [2, 12], [1, 14], [1, 14], [0, 16], [0, 16],
  [0, 16], [0, 16], [1, 14], [1, 14], [2, 12], [3, 10], [4, 8], [6, 4],
];

/** Broken reflection: [row, x, width] on the same 16-wide grid. */
const GLINTS: [number, number, number][] = [
  [0, 2, 12], [1, 5, 5], [2, 1, 5], [2, 10, 4], [3, 6, 4],
  [4, 2, 3], [4, 10, 5], [5, 6, 3], [6, 3, 5], [7, 8, 3], [8, 5, 4],
];

function Sun() {
  return (
    <svg className="scene-sun" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <g fill="#FFE9B0">
        {SUN.map(([x, w], y) => <rect key={y} x={x} y={y} width={w} height={1} />)}
      </g>
    </svg>
  );
}

function Glints() {
  return (
    <svg className="scene-glint" viewBox="0 0 16 10" aria-hidden="true" focusable="false">
      <g fill="#FFE3B4" opacity={0.5}>
        {GLINTS.map(([y, x, w], i) => <rect key={i} x={x} y={y} width={w} height={0.5} />)}
      </g>
    </svg>
  );
}

function Island() {
  return (
    <svg className="scene-island" viewBox="0 0 46 24" aria-hidden="true" focusable="false">
      {/* shed */}
      <rect x={15} y={1} width={12} height={2} fill="#8A4B36" />
      <rect x={13} y={3} width={16} height={2} fill="#9B5740" />
      <rect x={11} y={5} width={20} height={2} fill="#8A4B36" />
      <rect x={14} y={7} width={14} height={7} fill="#F2E4CE" />
      <rect x={16} y={9} width={4} height={4} fill="#FFD98A" />
      <rect x={23} y={9} width={3} height={5} fill="#6B4A33" />
      {/* ground */}
      <rect x={8} y={14} width={30} height={2} fill="#7FB25C" />
      <rect x={5} y={16} width={36} height={2} fill="#6FA34F" />
      <rect x={7} y={18} width={32} height={2} fill="#8A6A45" />
      <rect x={11} y={20} width={24} height={2} fill="#7A5C3C" />
      <rect x={16} y={22} width={14} height={2} fill="#6B5034" />
    </svg>
  );
}

export function PixelScene() {
  return (
    <div className="scene-band" aria-hidden="true">
      <Sun />
      <div className="scene-water" />
      <Glints />
      <Island />
    </div>
  );
}
