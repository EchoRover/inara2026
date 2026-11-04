// "Where we are": the UAE draws itself, fills with the Inara lattice, then the camera flies to campus.
// After the fly-in the map is yours: drag to move, pinch or ctrl + scroll (or the buttons) to zoom.
(() => {
  const CAMPUS = { lat: 24.395148, lon: 54.58733 };
  const CITIES = [
    { name: "Dubai", lat: 25.2048, lon: 55.2708 },
    { name: "Abu Dhabi", lat: 24.4539, lon: 54.3773 },
    { name: "Sharjah", lat: 25.3463, lon: 55.4209 },
    { name: "Al Ain", lat: 24.2075, lon: 55.7447 },
  ];
  // Camera stops: whole country, the Abu Dhabi area, campus. span = degrees of latitude in view.
  const STOPS = [{ lon: 54.2, lat: 24.3, span: 3.9 }, { lon: 54.5, lat: 24.42, span: 0.7 }, { lon: CAMPUS.lon, lat: CAMPUS.lat, span: 0.09 }];
  const END = 6.4, MIN_SPAN = 0.025, MAX_SPAN = 4.5;
  const KX = Math.cos((24.4 * Math.PI) / 180);
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function mount(section) {
    const canvas = section.querySelector("canvas"), ctx = canvas.getContext("2d");
    const rings = window.INARA_UAE;
    let w = 0, h = 0, t0 = 0, raf = 0, played = false, colors = {}, user = null, hintTimer, tile = null;
    const LAND = new Path2D(), ROADS = { 1: new Path2D(), 2: new Path2D() };
    for (const r of rings) { for (let i = 0; i < r.length; i += 2) i ? LAND.lineTo(r[i] * KX, -r[i + 1]) : LAND.moveTo(r[i] * KX, -r[i + 1]); LAND.closePath(); }
    for (const r of window.INARA_ROADS || []) for (let i = 1; i < r.length; i += 2) i === 1 ? ROADS[r[0]].moveTo(r[i] * KX, -r[i + 1]) : ROADS[r[0]].lineTo(r[i] * KX, -r[i + 1]);
    // camera -> canvas transform for the world-unit paths; widths are divided by the scale so they stay in pixels
    const world = (cam) => { const s = scale(cam); ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * (w / 2 - cam.lon * KX * s), DPR * (h / 2 + cam.lat * s)); return s; };
    const screen = () => ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // one star of the lattice on a tile, repeated as a pattern instead of drawing thousands of stars
    function makeTile() {
      const T = 256, c = document.createElement("canvas"); c.width = c.height = T;
      const x = c.getContext("2d"), R = T / 2, r = R * 0.62;
      x.strokeStyle = colors.line; x.lineWidth = 2;
      for (const [cx, cy] of [[0, 0], [T, 0], [0, T], [T, T], [T / 2, T / 2]]) {
        if (cx === T / 2) continue;
        x.beginPath(); for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8, d = k % 2 ? r : R; const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.stroke();
      }
      tile = ctx.createPattern(c, "repeat");
    }

    function size() {
      const r = canvas.getBoundingClientRect(); w = r.width; h = r.height;
      canvas.width = Math.ceil(w * DPR); canvas.height = Math.ceil(h * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const cs = getComputedStyle(section);
      colors = { ink: cs.getPropertyValue("--ink").trim(), soft: cs.getPropertyValue("--ink-soft").trim(), accent: cs.getPropertyValue("--accent").trim(), line: cs.getPropertyValue("--line").trim(), page: cs.getPropertyValue("--page").trim() };
      makeTile();
    }
    // the fly-in: zoom interpolates in log space so it feels like a steady fall toward the ground
    function flyCam(t) {
      const seg = t < 2.2 ? [0, 0, 0] : t < 4.4 ? [0, 1, (t - 2.2) / 2.2] : [1, 2, (t - 4.6) / 1.8];
      const a = STOPS[seg[0]], b = STOPS[seg[1]], e = ease(clamp(seg[2], 0, 1));
      return { lon: a.lon + (b.lon - a.lon) * e, lat: a.lat + (b.lat - a.lat) * e, span: Math.exp(Math.log(a.span) + (Math.log(b.span) - Math.log(a.span)) * e) };
    }
    const scale = (cam) => h / cam.span;
    const proj = (cam) => { const s = scale(cam); return (lon, lat) => [w / 2 + (lon - cam.lon) * KX * s, h / 2 - (lat - cam.lat) * s]; };
    const unproj = (cam, x, y) => { const s = scale(cam); return [cam.lon + (x - w / 2) / (KX * s), cam.lat - (y - h / 2) / s]; };

    // Labels go down in priority order and are skipped if they would overlap one already placed.
    function labeler() {
      const boxes = [];
      return (text, x, y, { font = "600 12.5px Inter, sans-serif", color = colors.soft, side = "right", alpha = 1, dot } = {}) => {
        if (alpha <= 0.01 || x < -80 || x > w + 80 || y < -20 || y > h + 20) return;
        ctx.font = font;
        const tw = ctx.measureText(text).width, lx = side === "left" ? x - 10 - tw : x + 10, box = [lx - 3, y - 9, tw + 6, 18];
        if (boxes.some((b) => box[0] < b[0] + b[2] && box[0] + box[2] > b[0] && box[1] < b[1] + b[3] && box[1] + box[3] > b[1])) return;
        boxes.push(box);
        ctx.globalAlpha = alpha;
        if (dot) dot();
        ctx.textBaseline = "middle"; ctx.lineJoin = "round";
        ctx.strokeStyle = colors.page; ctx.lineWidth = 4; ctx.strokeText(text, lx, y);
        ctx.fillStyle = color; ctx.fillText(text, lx, y);
        ctx.globalAlpha = 1;
      };
    }

    function draw(cam, t) {
      const P = proj(cam);
      screen(); ctx.clearRect(0, 0, w, h);
      // land fill and the lattice, clipped to the coastline
      ctx.save();
      const s = world(cam); ctx.clip(LAND);
      ctx.fillStyle = colors.line; ctx.globalAlpha = 0.35; ctx.fill(LAND);
      screen();
      const cell = s * 0.09;
      if (cell >= 10 && cell <= 900 && tile) {
        const [ax, ay] = P(51, 26.5);
        tile.setTransform(new DOMMatrix().translate(ax, ay).scale(cell / 256));
        ctx.globalAlpha = clamp((t - 1.2) / 0.8, 0, 1); ctx.fillStyle = tile; ctx.fillRect(0, 0, w, h);
      }
      ctx.restore(); ctx.globalAlpha = 1;
      // the coastline draws itself on the way in
      world(cam);
      ctx.setLineDash([(clamp(t / 1.6, 0, 1) * 6000) / s, 6000 / s]); ctx.strokeStyle = colors.accent; ctx.lineWidth = 1.6 / s; ctx.lineJoin = "round"; ctx.stroke(LAND); ctx.setLineDash([]);

      const near = clamp((1.6 - cam.span) / 0.9, 0, 1), close = clamp((0.9 - cam.span) / 0.4, 0, 1);
      if (near > 0) {
        ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = colors.soft;
        ctx.globalAlpha = near * 0.28; ctx.lineWidth = 1.2 / s; ctx.stroke(ROADS[2]);
        ctx.globalAlpha = near * 0.5; ctx.lineWidth = 2.4 / s; ctx.stroke(ROADS[1]);
        ctx.globalAlpha = 1;
      }
      screen();

      const label = labeler(), [px, py] = P(CAMPUS.lon, CAMPUS.lat);
      // campus first, so nothing ever covers it
      const pin = clamp((t - 1.6) / 0.5, 0, 1);
      if (pin > 0) {
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.8 + k / 3) % 1;
          ctx.strokeStyle = colors.accent; ctx.globalAlpha = (1 - ph) * 0.6 * pin; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px, py, 8 + ph * 46, 0, 7); ctx.stroke();
        }
        const drop = (1 - ease(pin)) * 40;
        ctx.globalAlpha = 1; ctx.fillStyle = colors.accent; ctx.beginPath(); ctx.arc(px, py - drop, 8, 0, 7); ctx.fill();
        ctx.strokeStyle = colors.page; ctx.lineWidth = 3; ctx.stroke();
        label("IIT Delhi - Abu Dhabi", px + 10, py, { font: "600 17px Inter, sans-serif", color: colors.ink, alpha: clamp((t - 5.8) / 0.6, 0, 1) });
      }
      // neighbouring universities
      for (const [name, la, lo, side] of window.INARA_UNIS || []) {
        const [x, y] = P(lo, la);
        label(name, x, y, { side, alpha: near, color: colors.ink, dot: () => { ctx.strokeStyle = colors.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.stroke(); } });
      }
      // landmarks, then neighbourhoods
      for (const [name, la, lo] of window.INARA_MARKS || []) {
        const [x, y] = P(lo, la);
        label(name, x, y, { alpha: close, dot: () => { ctx.fillStyle = colors.accent; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill(); } });
      }
      for (const [name, la, lo] of window.INARA_AREAS || []) {
        const [x, y] = P(lo, la);
        label(name, x - 10, y, { font: "italic 500 13px Inter, sans-serif", alpha: close * 0.85 });
      }
      // other emirates: university clusters as soft zones in the country view, single campuses up close
      const far = window.INARA_FAR;
      if (far) {
        const wide = clamp((t - 1.4) / 0.6, 0, 1) * clamp((cam.span - 0.9) / 0.5, 0, 1), kmPx = scale(cam) / 111;
        for (const [name, la, lo, rkm, n] of far.clusters) {
          const [x, y] = P(lo, la), r = Math.max(9, rkm * kmPx);
          if (wide > 0) { ctx.globalAlpha = wide * 0.22; ctx.fillStyle = colors.accent; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.globalAlpha = wide * 0.7; ctx.strokeStyle = colors.accent; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1; }
          label(n > 1 ? `${name}, ${n} universities` : name, x + r - 8, y, { alpha: wide, color: colors.ink });
        }
        for (const [name, la, lo] of far.unis) {
          const [x, y] = P(lo, la);
          label(name, x, y, { alpha: near, color: colors.ink, dot: () => { ctx.strokeStyle = colors.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.stroke(); } });
        }
      }
      // the four big cities, only in the country view
      const ca = clamp((t - 1.2) / 0.6, 0, 1) * clamp((cam.span - 1.4) / 1.2, 0, 1);
      for (const c of CITIES) {
        const [x, y] = P(c.lon, c.lat);
        label(c.name, x, y, { font: "600 13px Inter, sans-serif", alpha: ca, dot: () => { ctx.fillStyle = colors.soft; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); } });
      }
    }

    function frame(now) {
      raf = 0;
      const t = reduced ? 99 : (now - t0) / 1000;
      if (user) { draw(user, 99); section.classList.add("arrived"); return; }
      draw(flyCam(t), t);
      section.classList.toggle("arrived", t > END - 0.2);
      if (t > END) { user = flyCam(99); section.classList.add("live"); return; }
      raf = requestAnimationFrame(frame);
    }
    const redraw = () => { if (!raf) raf = requestAnimationFrame(frame); };
    function play() { cancelAnimationFrame(raf); raf = 0; user = null; size(); t0 = performance.now(); raf = requestAnimationFrame(frame); }

    // ---------- moving around ----------
    function zoomAt(f, x = w / 2, y = h / 2) {
      if (!user) return;
      const [lon, lat] = unproj(user, x, y);
      user.span = clamp(user.span * f, MIN_SPAN, MAX_SPAN);
      const [lon2, lat2] = unproj(user, x, y);
      user.lon += lon - lon2; user.lat += lat - lat2;
      redraw();
    }
    const pts = new Map();
    let last = null;
    canvas.addEventListener("pointerdown", (e) => { if (!user) return; canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.offsetX, e.offsetY]); last = null; section.classList.add("dragging"); });
    canvas.addEventListener("pointermove", (e) => {
      if (!user || !pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.offsetX, e.offsetY]);
      const p = [...pts.values()];
      const mid = p.reduce((a, b) => [a[0] + b[0] / p.length, a[1] + b[1] / p.length], [0, 0]);
      const dist = p.length > 1 ? Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) : 0;
      if (last && last.n === p.length) {
        const s = scale(user);
        user.lon -= (mid[0] - last.mid[0]) / (KX * s); user.lat += (mid[1] - last.mid[1]) / s;
        if (p.length > 1 && last.dist && dist) zoomAt(last.dist / dist, mid[0], mid[1]);
        redraw();
      }
      last = { mid, dist, n: p.length };
    });
    const end = (e) => { pts.delete(e.pointerId); last = null; if (!pts.size) section.classList.remove("dragging"); };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
    // a plain scroll keeps scrolling the page; ctrl/cmd + scroll and trackpad pinches zoom the map
    canvas.addEventListener("wheel", (e) => {
      if (!user) return;
      if (!(e.ctrlKey || e.metaKey)) { section.classList.add("hint"); clearTimeout(hintTimer); hintTimer = setTimeout(() => section.classList.remove("hint"), 1400); return; }
      e.preventDefault(); zoomAt(Math.exp(e.deltaY * 0.01), e.offsetX, e.offsetY);
    }, { passive: false });
    section.querySelector("[data-zoom=in]").addEventListener("click", () => zoomAt(0.6));
    section.querySelector("[data-zoom=out]").addEventListener("click", () => zoomAt(1 / 0.6));
    section.querySelector("[data-zoom=home]").addEventListener("click", () => flyTo(STOPS[2]));
    let flight = 0;
    function flyTo(to) {
      if (!user) return;
      const from = { ...user }, start = performance.now(), dur = reduced ? 1 : 1400, id = ++flight;
      (function step(now) {
        if (id !== flight) return;
        const e = ease(clamp((now - start) / dur, 0, 1));
        // zoom out a little mid-flight when travelling far, so the jump reads as travel
        const hop = Math.sin(Math.PI * e) * Math.min(1.2, Math.hypot(to.lon - from.lon, to.lat - from.lat));
        user = { lon: from.lon + (to.lon - from.lon) * e, lat: from.lat + (to.lat - from.lat) * e, span: Math.exp(Math.log(from.span) + (Math.log(to.span) - Math.log(from.span)) * e) + hop };
        draw(user, 99);
        if (e < 1) requestAnimationFrame(step);
      })(start);
    }

    new IntersectionObserver(([e]) => { if (e.isIntersecting && !played) { played = true; play(); } }, { threshold: 0.4 }).observe(section);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { size(); redraw(); }, 150); });
  }
  window.InaraMap = { mount, CAMPUS };
})();
