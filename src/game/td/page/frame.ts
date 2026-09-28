// Menu frame: every menu screen is laid out for a phone held sideways (844 x 390 CSS px)
// and the whole menu layer is scaled with CSS zoom to the space it has. Desktop shows the
// same layout, larger; small phones get a slightly smaller one instead of a scrolling page.
// Inside the zoomed layer, layout sizes are logical px: container queries see the frame
// size, while pointer coordinates and getBoundingClientRect are screen px (see zoomOf).
const FRAME_W = 844;
const FRAME_H = 390;
const MIN_ZOOM = 0.75; // below this text gets too small to read; the screen scrolls instead

export function createMenuFrame(el: HTMLElement) {
  const host = el.parentElement!;
  function fit() {
    const style = getComputedStyle(host);
    const w = host.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const h = host.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (w <= 0 || h <= 0) return;
    const zoom = Math.max(MIN_ZOOM, Math.min(w / FRAME_W, h / FRAME_H));
    el.style.setProperty("--td-zoom", zoom.toFixed(4));
  }
  new ResizeObserver(fit).observe(host);
  fit();
}

// Screen px per layout px of an element (1 outside the menu frame). Divide pointer deltas
// by it before using them as layout lengths.
export function zoomOf(el: HTMLElement) {
  return el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1;
}
