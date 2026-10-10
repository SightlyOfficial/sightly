const CH_DEFAULTS = {
  style: 'cross', color: '#00ff00', opacity: 100,
  size: 10, thickness: 2, gap: 4,
  branches: { top: true, bottom: true, left: true, right: true },
  outline: true, outlineColor: '#000000', outlineThickness: 1,
  dot: true, dotStyle: 'square', dotSize: 0, dotColor: '#00ff00', dotOutline: true,
  glow: 0, shadow: false, radius: 0, blink: false, pulse: false, spin: false,
  rotation: 0, scale: 100, offsetX: 0, offsetY: 0,
  image: null, imgSize: 64, imgOpacity: 100
};

function drawCrosshair(svg, input, cx, cy) {
  const c = { ...CH_DEFAULTS, ...input, branches: { ...CH_DEFAULTS.branches, ...(input.branches || {}) } };
  const NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  svg.style.filter = +c.glow > 0 ? `drop-shadow(0 0 ${+c.glow}px ${c.color})` : c.shadow ? 'drop-shadow(0 2px 4px rgba(0,0,0,.6))' : 'none';
  svg.classList.toggle('fx-blink', !!c.blink);
  svg.classList.toggle('fx-pulse', !!c.pulse);
  svg.classList.toggle('fx-spin', !!c.spin);
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('transform', `translate(${cx + +c.offsetX} ${cy + +c.offsetY}) rotate(${+c.rotation}) scale(${+c.scale / 100})`);
  g.setAttribute('opacity', +c.opacity / 100);
  svg.appendChild(g);
  const add = (tag, a) => { const el = document.createElementNS(NS, tag); for (const k in a) el.setAttribute(k, a[k]); g.appendChild(el); };
  const ot = +c.outlineThickness, rx = +c.radius;
  const rect = (x, y, w, h, fill, pad = 0) => add('rect', { x: x - pad, y: y - pad, width: w + 2 * pad, height: h + 2 * pad, rx: rx + pad, fill });
  const box = (x, y, w, h) => {
    if (c.outline && ot > 0) rect(x, y, w, h, c.outlineColor, ot);
    rect(x, y, w, h, c.color);
  };
  const L = +c.size, T = +c.thickness, G = +c.gap, h = T / 2, b = c.branches;
  if (c.style === 'cross') {
    if (b.left) box(-G - L, -h, L, T);
    if (b.right) box(G, -h, L, T);
    if (b.top) box(-h, -G - L, T, L);
    if (b.bottom) box(-h, G, T, L);
  }
  if (c.style === 'circle') {
    const r = G + L;
    if (c.outline && ot > 0) add('circle', { r, fill: 'none', stroke: c.outlineColor, 'stroke-width': T + 2 * ot });
    add('circle', { r, fill: 'none', stroke: c.color, 'stroke-width': T });
  }
  if (c.style === 'image' && c.image) {
    const s = +c.imgSize;
    add('image', { href: c.image, x: -s / 2, y: -s / 2, width: s, height: s, opacity: c.imgOpacity / 100 });
  }
  if (c.style === 'dot' || c.dot) {
    const d = +c.dotSize > 0 ? +c.dotSize : Math.max(2, T);
    const shape = (pad, fill) => {
      const s = d + 2 * pad;
      if (c.dotStyle === 'circle') return add('circle', { r: s / 2, fill });
      const a = { x: -s / 2, y: -s / 2, width: s, height: s, fill };
      if (c.dotStyle === 'diamond') a.transform = 'rotate(45)';
      add('rect', a);
    };
    if (c.dotOutline && ot > 0) shape(ot, c.outlineColor);
    shape(0, c.dotColor);
  }
}