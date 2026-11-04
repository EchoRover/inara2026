// Every moving background on the site, generated in code. All of them grow from one idea: light coming
// through a mashrabiya, the carved screen of stars. InaraScenes.mount(canvas, id) builds lazily when the
// canvas comes near the screen, frees its memory when it scrolls far away, and only animates while visible.
//
// Performance rules: geometry is built once into cached layers. A frame repaints only the small patches
// that changed, copied from the cached layer. Lanterns and the sunrise glow are not drawn per frame at all:
// they are SVG and CSS elements that the browser moves on the GPU.
(() => {
  const DPR = Math.min(1.5, window.devicePixelRatio || 1);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // The IIT Delhi - Abu Dhabi palette (also in styles.css). Light is Solar with Radiant embers, the lattice is a
  // pale Carbon tint, lit edges are the lightest Solar tint, and the night behind it all is Carbon.
  const SOLAR = [246, 146, 57], RADIANT = [245, 75, 76], MIST = [218, 216, 216], GLOW = [252, 237, 219];
  const NIGHT = ["#222223", "#282829"];

  // ---------- geometry ----------
  function grid(w, h, s, ox = 0, oy = 0) {
    const out = [];
    for (let y = oy - s; y < h + s; y += s) for (let x = ox - s; x < w + s; x += s) out.push({ x, y });
    return out;
  }
  // the 16-point star of the lattice
  function star(c, cx, cy, R, r) {
    for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8, d = k % 2 ? r : R, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; k ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.closePath();
  }
  function diamond(c, x, y, d) { c.moveTo(x, y - d); c.lineTo(x + d, y); c.lineTo(x, y + d); c.lineTo(x - d, y); c.closePath(); }
  function layer(w, h) {
    const c = document.createElement("canvas"); c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
    const x = c.getContext("2d"); x.setTransform(DPR, 0, 0, DPR, 0, 0); return [c, x];
  }
  function sky(x, w, h, stops) { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  const cellSize = (w, h, n, lo, hi) => clamp(Math.min(w, Math.max(h, 520)) / n, lo, hi);

  // Where the light is: the cursor while it moves, otherwise a slow wander on the open side.
  function lightAt(st, now, cx = 0.62) {
    st.idle++;
    if (st.idle > 120 || st.px < 0) return [st.w * (cx + 0.22 * Math.sin(now / 3100)), st.h * (0.48 + 0.28 * Math.sin(now / 2300))];
    return [st.px, st.py];
  }
  // Repaint a rectangle of the canvas from the cached base layer (the only per-frame "clear").
  function restore(st, b) {
    const x0 = Math.max(0, Math.floor(b[0])), y0 = Math.max(0, Math.floor(b[1])), x1 = Math.min(st.w, Math.ceil(b[0] + b[2])), y1 = Math.min(st.h, Math.ceil(b[1] + b[3]));
    if (x1 > x0 && y1 > y0) st.ctx.drawImage(st.base, x0 * DPR, y0 * DPR, (x1 - x0) * DPR, (y1 - y0) * DPR, x0, y0, x1 - x0, y1 - y0);
  }

  // The screen: a lattice of stars, dark and dim, with light behind it. Where the light falls the stars glow.
  function latticeBase(st, s, dim) {
    const { w, h } = st, cells = grid(w, h, s), R = s / 2, r = R * 0.62;
    const [lit, lx] = layer(w, h);
    lx.fillStyle = rgba(SOLAR, 0.5); lx.beginPath(); cells.forEach((p) => star(lx, p.x, p.y, R, r)); lx.fill();
    lx.fillStyle = rgba(SOLAR, 0.85); lx.beginPath(); cells.forEach((p) => diamond(lx, p.x + s / 2, p.y, r * 0.42)); lx.fill();
    lx.lineJoin = "round"; lx.strokeStyle = rgba(GLOW, 1); lx.lineWidth = 1.4; lx.beginPath();
    cells.forEach((p) => star(lx, p.x, p.y, R, r)); cells.forEach((p) => diamond(lx, p.x + s / 2, p.y, r * 0.42)); lx.stroke();
    const [base, bx] = layer(w, h);
    sky(bx, w, h, [[0, NIGHT[0]], [1, NIGHT[1]]]);
    bx.fillStyle = rgba(MIST, 0.05 * dim); bx.beginPath(); cells.forEach((p) => star(bx, p.x, p.y, R, r)); bx.fill();
    bx.lineJoin = "round"; bx.strokeStyle = rgba(MIST, 0.34 * dim); bx.lineWidth = 1.15; bx.beginPath();
    cells.forEach((p) => star(bx, p.x, p.y, R, r)); cells.forEach((p) => diamond(bx, p.x + s / 2, p.y, r * 0.42)); bx.stroke();
    Object.assign(st, { s, cells, R, r, lit, base, box: null });
    st.ctx.drawImage(base, 0, 0, w, h);
  }

  const screen = {
    build(st) {
      latticeBase(st, cellSize(st.w, st.h, 6, 70, 150), 1);
      st.G = st.w < 700 ? 170 : 230;
    },
    frame(st, now) {
      const { ctx, w, G } = st;
      const [x, y] = reduced ? [w * 0.64, st.h * 0.5] : lightAt(st, now);
      const box = [Math.floor(x - G), Math.floor(y - G), G * 2, G * 2];
      ctx.globalCompositeOperation = "source-over";
      if (st.box) restore(st, st.box);
      restore(st, box);
      if (!st.glow) [st.glow, st.gx] = layer(G * 2, G * 2);
      const gx = st.gx; gx.globalCompositeOperation = "source-over"; gx.clearRect(0, 0, G * 2, G * 2);
      gx.drawImage(st.lit, box[0] * DPR, box[1] * DPR, G * 2 * DPR, G * 2 * DPR, 0, 0, G * 2, G * 2);
      gx.globalCompositeOperation = "destination-in";
      const g = gx.createRadialGradient(G, G, 0, G, G, G); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.5, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
      gx.fillStyle = g; gx.fillRect(0, 0, G * 2, G * 2);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(st.glow, box[0], box[1], G * 2, G * 2);
      ctx.drawImage(st.glow, box[0], box[1], G * 2, G * 2);
      const a = ctx.createRadialGradient(x, y, 0, x, y, G); a.addColorStop(0, rgba(RADIANT, 0.2)); a.addColorStop(1, rgba(RADIANT, 0));
      ctx.fillStyle = a; ctx.fillRect(box[0], box[1], G * 2, G * 2);
      ctx.globalCompositeOperation = "source-over";
      st.box = box;
      if (reduced) return "still";
    },
  };

  // Pulse: rings of light travel outward across the lattice, lighting the stars they pass. The cursor lights its own.
  const pulse = {
    build(st) {
      latticeBase(st, cellSize(st.w, st.h, 7, 64, 120), 0.9);
      const { w, h, cells } = st, c0 = [w * 0.7, h * 0.45];
      st.d = Float32Array.from(cells, (p) => Math.hypot(p.x - c0[0], p.y - c0[1]));
      st.on = [];
    },
    frame(st, now) {
      const { ctx, w, h, cells, s, R, r, d } = st, T = reduced ? 2.2 : now / 1000, maxR = Math.hypot(w, h) * 0.85, pad = s / 2 + 3;
      const cursor = !reduced && st.px >= 0 && st.idle++ < 90;
      for (const i of st.on) restore(st, [cells[i].x - pad, cells[i].y - pad, pad * 2, pad * 2]);
      const on = [];
      ctx.lineJoin = "round";
      for (let i = 0; i < cells.length; i++) {
        const p = cells[i];
        if (p.x < -s || p.x > w + s || p.y < -s || p.y > h + s) continue;
        let a = 0;
        for (const k of [0, 0.5]) {
          const ring = (((T / 7 + k) % 1) * maxR), fade = 1 - ring / maxR;
          a = Math.max(a, Math.max(0, 1 - Math.abs(d[i] - ring) / (s * 1.2)) * (0.15 + 0.85 * fade));
        }
        if (cursor) a = Math.max(a, Math.max(0, 1 - Math.hypot(p.x - st.px, p.y - st.py) / (s * 2.2)));
        if (a < 0.03) continue;
        on.push([i, a]);
      }
      for (const [i, a] of on) {
        const p = cells[i];
        ctx.beginPath(); star(ctx, p.x, p.y, R, r);
        ctx.fillStyle = rgba(SOLAR, a * 0.85); ctx.fill();
        ctx.strokeStyle = rgba(GLOW, Math.min(1, a * 1.3)); ctx.lineWidth = 1.6; ctx.stroke();
      }
      st.on = on.map((o) => o[0]);
      if (reduced) return "still";
    },
  };

  // Pointed arches, the way a colonnade frames the sky. evenodd leaves the openings empty.
  function colonnade(x, w, h, H, n) {
    const a = w / n, aw = a * 0.62, floor = h - H * 0.1, top = h - H, spring = top + H * 0.42;
    x.beginPath(); x.moveTo(0, top); x.lineTo(w, top); x.lineTo(w, h + 2); x.lineTo(0, h + 2); x.closePath();
    for (let i = 0; i < n; i++) {
      const cx = a * (i + 0.5), l = cx - aw / 2, r = cx + aw / 2;
      x.moveTo(l, floor); x.lineTo(l, spring);
      x.quadraticCurveTo(l, top + H * 0.14, cx, top + H * 0.1);
      x.quadraticCurveTo(r, top + H * 0.14, r, spring);
      x.lineTo(r, floor); x.closePath();
    }
    x.fillStyle = "#1a1a1b"; x.fill("evenodd");
  }
  // soft lilac lattice high in the sky, so the screen motif is always present
  function faintLattice(x, w, h, s) {
    const cells = grid(w, h, s), R = s / 2, r = R * 0.62;
    x.save(); x.beginPath(); x.rect(0, 0, w, h * 0.7); x.clip();
    const g = x.createLinearGradient(0, 0, 0, h * 0.7); g.addColorStop(0, rgba(MIST, 0.2)); g.addColorStop(1, rgba(MIST, 0));
    x.strokeStyle = g; x.lineWidth = 1.1; x.lineJoin = "round"; x.beginPath();
    cells.forEach((p) => star(x, p.x, p.y, R, r)); x.stroke(); x.restore();
  }

  // ---------- DOM decor: moved by the browser, never redrawn ----------
  let spriteDone = false;
  function sprite() {
    if (spriteDone) return; spriteDone = true;
    const pts = []; for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8 - Math.PI / 2, d = k % 2 ? 4.2 : 9; pts.push(`${(30 + Math.cos(a) * d).toFixed(2)},${(50 + Math.sin(a) * d).toFixed(2)}`); }
    const d = document.createElement("div");
    d.setAttribute("aria-hidden", "true"); d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    d.innerHTML = `<svg width="0" height="0" xmlns="http://www.w3.org/2000/svg"><defs>
      <radialGradient id="lt-glow"><stop offset="0" stop-color="#f69239" stop-opacity="0.55"/><stop offset="0.5" stop-color="#f54b4c" stop-opacity="0.16"/><stop offset="1" stop-color="#f54b4c" stop-opacity="0"/></radialGradient>
      <linearGradient id="lt-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fceddb"/><stop offset="1" stop-color="#f9a75e"/></linearGradient>
      <symbol id="lt" viewBox="0 0 60 100" overflow="visible">
        <circle cx="30" cy="52" r="48" fill="url(#lt-glow)"/>
        <path d="M24 25 Q30 8 36 25" fill="none" stroke="#a61e22" stroke-width="2"/>
        <path d="M16 30 L44 30 L40 24 L20 24 Z" fill="#a61e22"/>
        <path d="M18 30 Q13 52 20 73 L40 73 Q47 52 42 30 Z" fill="url(#lt-body)"/>
        <path d="M30 30 L30 73 M24 30 Q21 52 25 73 M36 30 Q39 52 35 73" fill="none" stroke="#bd634f" stroke-opacity="0.35" stroke-width="1"/>
        <polygon points="${pts.join(" ")}" fill="#fffaf7"/>
        <path d="M20 73 L40 73 L36 79 L24 79 Z" fill="#a61e22"/>
        <path d="M30 79 L30 88" stroke="#a61e22" stroke-width="2"/>
      </symbol></defs></svg>`;
    document.body.appendChild(d);
  }
  function lanterns(host, st) {
    sprite();
    const n = st.w < 700 ? 5 : 9, el = document.createElement("div");
    el.className = "lanterns"; el.setAttribute("aria-hidden", "true");
    el.innerHTML = Array.from({ length: n }, (_, i) => {
      const w = 34 + Math.random() * 44, x = 8 + ((i + Math.random() * 0.7) / n) * 88, dur = 26 + Math.random() * 22;
      return `<span class="lantern" style="--x:${x.toFixed(1)}%;--w:${w.toFixed(0)}px;--dur:${dur.toFixed(1)}s;--delay:${(-Math.random() * dur).toFixed(1)}s;--sway:${(4 + Math.random() * 4).toFixed(1)}s;--drift:${((Math.random() - 0.5) * 80).toFixed(0)}px;--y:${(10 + Math.random() * 70).toFixed(0)}%"><svg viewBox="0 0 60 100"><use href="#lt"/></svg></span>`;
    }).join("");
    host.insertBefore(el, host.querySelector(".stage-content"));
    return el;
  }
  function sunGlow(host) {
    const el = document.createElement("div");
    el.className = "sun-glow"; el.setAttribute("aria-hidden", "true");
    host.insertBefore(el, host.querySelector(".stage-content"));
    return el;
  }

  // Lanterns: a dusk sky behind a colonnade, lanterns rising through it.
  const lanternScene = {
    build(st) {
      const { w, h, ctx } = st;
      sky(ctx, w, h, [[0, "#222223"], [0.5, "#2c2c2d"], [0.84, "#5e1c1f"], [1, "#a61e22"]]);
      faintLattice(ctx, w, h, cellSize(w, h, 6, 70, 150));
      colonnade(ctx, w, h, clamp(h * 0.18, 90, 140), Math.max(4, Math.round(w / 150)));
    },
    frame: () => "still",
    decor: lanterns,
  };
  // Dawn: the sun just above the arches, its glow slowly breathing (CSS).
  const dawnScene = {
    build(st) {
      const { w, h, ctx } = st, H = clamp(h * 0.18, 90, 140), sx = w * 0.7, sy = h - H * 1.12;
      sky(ctx, w, h, [[0, "#222223"], [0.48, "#32629f"], [0.8, "#f36e68"], [1, "#f9a75e"]]);
      faintLattice(ctx, w, h, cellSize(w, h, 6, 70, 150));
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.min(w, h) * 0.55);
      g.addColorStop(0, rgba(GLOW, 0.95)); g.addColorStop(0.1, rgba(SOLAR, 0.7)); g.addColorStop(0.45, rgba(RADIANT, 0.22)); g.addColorStop(1, rgba(RADIANT, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = rgba(GLOW, 1); ctx.beginPath(); ctx.arc(sx, sy, Math.max(22, Math.min(w, h) * 0.05), 0, TAU); ctx.fill();
      colonnade(ctx, w, h, H, Math.max(3, Math.round(w / 210)));
    },
    frame: () => "still",
    decor: (host) => sunGlow(host),
  };
  // The home hero: the screen, with lanterns rising in front of it.
  const hero = { build: screen.build, frame: screen.frame, decor: lanterns };

  const SCENES = { screen, pulse, lanterns: lanternScene, dawn: dawnScene, hero };

  // ---------- runner ----------
  function mount(canvas, id) {
    const scene = SCENES[id] || screen;
    const host = canvas.parentElement, st = { px: -1, py: -1, idle: 999 };
    let raf = 0, visible = false, built = false, dead = false, still = false, decor = null;
    const keep = ["px", "py", "idle"];
    const loop = (now) => { raf = 0; if (dead || !visible || !built) return; still = scene.frame(st, now) === "still"; if (!still) raf = requestAnimationFrame(loop); };
    const kick = () => { if (!raf && visible && built && !dead && !still) raf = requestAnimationFrame(loop); };
    function clear() { decor?.remove(); decor = null; for (const k of Object.keys(st)) if (!keep.includes(k)) delete st[k]; }
    function build() {
      const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      canvas.width = Math.ceil(r.width * DPR); canvas.height = Math.ceil(r.height * DPR);
      const ctx = canvas.getContext("2d"); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      clear(); lastW = r.width;
      Object.assign(st, { ctx, w: r.width, h: r.height, glow: null });
      scene.build(st); built = true; still = false;
      if (scene.decor) decor = scene.decor(host, st);
      still = scene.frame(st, performance.now()) === "still";
      kick();
    }
    function free() { built = false; clear(); canvas.width = canvas.height = 0; }
    const near = new IntersectionObserver(([e]) => { if (e.isIntersecting && !built) build(); else if (!e.isIntersecting && built) free(); }, { rootMargin: "400px 0px" });
    const vis = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
    near.observe(canvas); vis.observe(canvas);
    const onMove = (e) => { const r = canvas.getBoundingClientRect(); st.px = e.clientX - r.left; st.py = e.clientY - r.top; st.idle = 0; if (still && !reduced) still = false; kick(); };
    host.addEventListener("pointermove", onMove);
    // a rebuild only when the width changes, so the phone's address bar sliding away does not redraw anything
    let rt, lastW = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (built && Math.abs(canvas.getBoundingClientRect().width - lastW) > 1) build(); }, 150); };
    addEventListener("resize", onResize);
    return { stop() { dead = true; near.disconnect(); vis.disconnect(); host.removeEventListener("pointermove", onMove); removeEventListener("resize", onResize); cancelAnimationFrame(raf); free(); } };
  }

  window.InaraScenes = { mount };
})();
