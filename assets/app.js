(() => {
  const { clubs, short = {}, events, universities, days = [] } = window.INARA;
  const main = document.getElementById("main");
  const bar = document.getElementById("bar");
  const page = document.body.dataset.page;
  const bySlug = Object.fromEntries(events.map((e) => [e.slug, e]));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const aed = (n) => "AED " + n.toLocaleString("en-US");
  // prizes are [1st, 2nd, 3rd] in AED; "awards" are named awards [name, AED or null] instead
  const awards = (e) => (Array.isArray(e.awards) ? e.awards : []);
  const places = (e) => (Array.isArray(e.prizes) ? e.prizes : []);
  const hasPrizes = (e) => places(e).length > 0 || awards(e).length > 0;
  const pool = (e) => aed([...places(e), ...awards(e).map((a) => a[1] || 0)].reduce((a, b) => a + b, 0));
  // team [1, 1] is a solo event: no team name, no team size, and the form talks to one person
  const solo = (e) => e.team?.[0] === 1 && e.team?.[1] === 1;
  const clubName = (id) => clubs[id] + (short[id] ? ` (${short[id]})` : "");
  // Collabs credit every host club equally.
  const hosts = (e) => e.hosts.map(clubName).join(" × ");
  const teamLine = (e) => (solo(e) ? "Individual entry" : e.team[0] === e.team[1] ? `Teams of ${e.team[0]}` : e.team[0] === 1 ? `Solo or teams of up to ${e.team[1]}` : `Teams of ${e.team[0]}-${e.team[1]}`);
  // "hours" is a number (2 -> "2 hours") or text like "3-4 hours"
  const dur = (e) => (typeof e.hours === "string" ? e.hours : `${e.hours} ${e.hours === 1 ? "hour" : "hours"}`);
  // entry: "free" = a show anyone can walk into, no registration
  const free = (e) => e.entry === "free";
  // "status" in events.js overrides the line, like "Registrations closed" or "Theatrical Production"
  const status = (e) => e.status || (e.open ? "Registration open" : free(e) ? "No registration required" : "Registrations will open soon");
  // ranges are written with a hyphen, never "to": "13-15 November", "Teams of 5-6", "6-8 PM"
  const known = (v) => v && v !== "TBC";
  // "time" is [start, end] in 24-hour UAE time, like ["18:00", "20:00"]
  const timed = (e) => known(e.day) && Array.isArray(e.time) && e.time.length === 2;
  const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
  const clock = (m, ampm = true) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ""}${ampm ? (h < 12 ? " AM" : " PM") : ""}`; };
  // "6-8 PM", "10 AM-2 PM"
  const clockRange = (a, b) => `${clock(a, a < 720 !== b < 720)}-${clock(b)}`;
  const timeRange = (e) => { const [a, b] = e.time.map(mins); return clockRange(a, b); };
  const dayLine = (e) => (known(e.day) ? e.day + (timed(e) ? `, ${timeRange(e)}` : "") : "Day to be confirmed");
  // "Saturday 14 November" -> "Sat 14 Nov"
  const shortDay = (d) => d.replace(/^(\w{3})\w*\s+(\d+)\s+(\w{3})\w*$/, "$1 $2 $3");
  // a free show with a slot reads as its slot, otherwise as how long it runs
  const whenLine = (e) => (timed(e) ? dayLine(e) : dur(e));
  const tag = (e) => (e.placeholder ? `<span class="t-ph">Placeholder</span>` : "");
  // Opened straight from disk, folders don't resolve to index.html, so spell it out.
  const local = location.protocol === "file:";
  const link = (path) => (local ? path.replace(/(^|\/)(#|$)/, "$1index.html$2") : path);
  const root = page === "home" ? "" : "../";
  const eventHref = (e, hash = "") => link(`${root}${e.slug}/${hash}`);
  // Registrations go to the PHP API in the site's own api/ folder (root is "" on the home page
  // and "../" on event pages, so this works under any path). It sends each one to the university's CRM.
  const API = window.INARA_API ?? `${root}api`;
  const smooth = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

  let scenes = [];
  function mountScenes() {
    scenes.forEach((s) => s.stop());
    scenes = [...main.querySelectorAll("canvas[data-scene]")].map((c) => window.InaraScenes.mount(c, c.dataset.scene));
  }
  // What the form asks of members other than the lead, per field (events.js "memberFields"):
  // "required" (default), "optional" (may be left blank, checked if filled) or "lead" (only the lead is asked).
  // The lead always gives name, email and phone. "phones": "lead" is the short way to ask only the lead's phone.
  const ask = (e, k) => e.memberFields?.[k] || (k === "phone" && e.phones === "lead" ? "lead" : "required");
  // Guidelines: a PDF named after the event in the rulebooks/ folder (rulebooks/genesis.pdf) is found when
  // the page loads, so adding a rulebook is just dropping the file in. "guidelines" in events.js (a file in
  // the site or a full web address) still works and wins. Shows have no rules, so they get no button at all.
  const guidelinesHref = (e) => (/^https?:\/\//.test(e.guidelines) ? e.guidelines : root + e.guidelines);
  function guidelinesBtn(e, cls = "btn ghost") {
    if (e.guidelines) {
      return `<a class="${cls}" href="${esc(guidelinesHref(e))}" target="_blank" rel="noopener">Read the guidelines</a>`;
    }
    return free(e) ? "" : `<span class="${cls}" aria-disabled="true" data-guide-soon>Guidelines will be released soon</span>`;
  }
  const guideWord = (e) => (e.guidelines ? `<a href="${esc(guidelinesHref(e))}" target="_blank" rel="noopener">guidelines</a>` : `<span data-guide-word>guidelines</span>`);
  const guideLede = (e) => (e.guidelines ? ` or read the <a href="${esc(guidelinesHref(e))}" target="_blank" rel="noopener">guidelines</a>` : "");
  function findGuidelines(e, scope) {
    if (e.guidelines || free(e)) return;
    const file = `rulebooks/${e.slug}.pdf`;
    fetch(root + file, { method: "HEAD", cache: "no-cache" })
      .then((r) => {
        // some servers answer every address with a web page, so only a real PDF counts
        if (!r.ok || !(r.headers.get("content-type") || "").includes("pdf")) return;
        e.guidelines = file;
        scope.querySelectorAll("[data-guide-soon]").forEach((el) => (el.outerHTML = guidelinesBtn(e, el.className)));
        scope.querySelectorAll("[data-guide-word]").forEach((el) => (el.outerHTML = guideWord(e)));
        scope.querySelectorAll("[data-guide-lede]").forEach((el) => (el.innerHTML = guideLede(e)));
      })
      .catch(() => {});
  }
  // "contact" in events.js: who people can reach about the event. Optional; without it there is no block.
  function contactBlock(e) {
    const c = e.contact;
    if (!c || !c.name) return "";
    const digits = (c.phone || "").replace(/[^0-9]/g, "");
    const ways = [
      c.email && `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`,
      digits && `<a href="https://wa.me/${digits}" target="_blank" rel="noopener">${esc(c.phone)}</a> (WhatsApp)`,
    ].filter(Boolean);
    return `<h2 class="h3">Questions</h2>
      <p class="contact">For questions about ${esc(e.name)} or registration, contact ${esc(c.name)}${c.role ? `, ${esc(c.role)}` : ""}.</p>
      ${ways.length ? `<p class="contact-ways">${ways.join("<br>")}</p>` : ""}`;
  }
  // The line added to a failed registration: who to contact if it keeps failing.
  const contactLine = (e) => ` If it keeps failing, contact the organizers${e.contact?.email ? ` at <a href="mailto:${esc(e.contact.email)}">${esc(e.contact.email)}</a>` : ""}${e.contact?.phone ? ` or on WhatsApp at <a href="https://wa.me/${esc(e.contact.phone.replace(/[^0-9]/g, ""))}" target="_blank" rel="noopener">${esc(e.contact.phone)}</a>` : ""}.`;

  // Prizes as three lattice arches, 2nd, 1st, 3rd, like the arches of the dawn scene
  const PLACES = ["1st place", "2nd place", "3rd place"];
  // named awards: the top award as a wide gold arch, the rest as smaller arches beneath it
  const awardList = (e) => { const [top, ...rest] = awards(e); return `<h2 class="h3">Awards</h2>
    <ol class="awards" aria-label="Awards">${[top, ...rest].map(([name, amt], i) => `<li class="${i ? "aw" : "aw top"}"><span class="aw-name">${esc(name)}</span><span class="aw-amt">${amt ? aed(amt) : "Award"}</span></li>`).join("")}</ol>`; };
  const podium = (e) => (awards(e).length ? awardList(e) : places(e).length ? `<h2 class="h3">Prizes</h2>
    <ol class="podium" aria-label="Prizes">${[1, 0, 2].filter((i) => e.prizes[i] != null).map((i) => `<li class="p${i + 1}"><span class="amt">${aed(e.prizes[i])}</span><span class="block"><b>${i + 1}</b></span><span class="place">${PLACES[i]}</span></li>`).join("")}</ol>` : "");

  // One cell of the star lattice as an SVG, used as a mask so each tile tints it with its own light.
  const PATTERN_TILE = (() => {
    const R = 32, r = R * 0.62, c = 32, pts = [];
    for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8, d = k % 2 ? r : R; pts.push(`${(c + Math.cos(a) * d).toFixed(2)},${(c + Math.sin(a) * d).toFixed(2)}`); }
    const dm = (x) => `M${x},${c - r * 0.42}L${x + r * 0.42},${c}L${x},${c + r * 0.42}L${x - r * 0.42},${c}Z`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="black" stroke-width="1.2"><polygon points="${pts.join(" ")}"/><path d="${dm(0)}${dm(64)}"/></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  })();
  // The page backdrop draws the same lattice faintly behind the frosted panes (see "foggy panes" in styles.css).
  document.documentElement.style.setProperty("--pat", `url("${PATTERN_TILE}")`);

  // Sparkles over the hero logo: where each one sits on the logo (% across, % down), its size
  // (% of the logo's width), how long one twinkle takes (s) and when it starts (s).
  const TWINKLES = [
    [54.8, 2.4, 5.1, 3.2, 0], [39.1, 17.3, 3.9, 2.8, 1.1], [70.8, 17.6, 4.2, 3.6, 0.5], [77.2, 17.6, 4.8, 3, 1.9],
    [3.2, 8.8, 4.5, 4, 2.6], [87.1, 26.4, 3.9, 3.4, 0.8], [98.8, 73.5, 4.5, 3.8, 1.5], [58.9, 51.9, 3.3, 2.6, 2.2],
    [21, 28.8, 3.6, 4.2, 3.1], [50.8, 68.7, 3.6, 3.4, 0.3], [64.5, 76.7, 3.3, 3, 2.9], [35.5, 91.4, 3.9, 3.8, 1.3],
  ].map(([x, y, s, d, w]) => `<i style="--x:${x}%;--y:${y}%;--s:${s}%;--d:${d}s;--w:${w}s"></i>`).join("");

  // ================= home =================
  function home() {
    main.innerHTML = `
      <section class="stage hero" id="top" aria-label="Inara 2026">
        <canvas data-scene="hero" aria-hidden="true"></canvas>
        <div class="stage-content">
          <h1 class="hero-logo"><img src="assets/inara-logo-hero.webp" alt="Inara 2026" width="620" height="315"><span class="twinkles" aria-hidden="true">${TWINKLES}</span></h1>
          <span class="hero-inst">The Cultural Fest of IIT Delhi – Abu Dhabi</span>
          <span class="hero-meta">13-15 November, 2026</span>
          <div class="hero-actions"><a class="btn" href="#events">See the events</a><a class="btn ghost" href="${link("schedule/")}">See the schedule</a></div>
        </div>
      </section>

      <section class="section" id="events">
        <div class="wrap">
          <h2 class="h2">Events</h2>
          <ul class="tiles">${events.map((e) => `
            <li class="tile scene-${e.scene}"><a href="${eventHref(e)}">
              <span class="t-status">${status(e)}</span>${tag(e)}
              <span class="t-name">${esc(e.name)}</span>
              <span class="t-host">${esc(hosts(e))}</span>
              ${hasPrizes(e) ? `<span class="t-facts"><b>${pool(e)}</b> in prizes</span>` : free(e) && e.note ? `<span class="t-facts">${esc(e.note)}</span>` : ""}
              ${timed(e) ? `<span class="t-when">${esc(`${shortDay(e.day)}, ${timeRange(e)}`)}</span>` : ""}
            </a></li>`).join("")}</ul>
        </div>
      </section>

      ${slides()}

      <section class="section" id="how">
        <div class="wrap">
          <h2 class="h2">How it works</h2>
          <p class="lede">Free to enter. Every event has its own page.</p>
          <ol class="steps">
            <li><h3>Pick an event</h3><p>Read its page to see what you'll do, who it's for and what to bring.</p></li>
            <li><h3>Register</h3><p>One short form on the event's page. A confirmation email follows.</p></li>
            <li><h3>Come along</h3><p>Everything happens on campus, 13-15 November.</p></li>
          </ol>
        </div>
      </section>

      <section class="where" id="where" aria-labelledby="where-h">
        <canvas aria-hidden="true"></canvas>
        <small class="map-credit">Outline © geoBoundaries (CC BY 4.0). Roads © OpenStreetMap contributors</small>
        <div class="map-ctl" aria-label="Map controls"><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="out" aria-label="Zoom out">−</button><button type="button" data-zoom="home" aria-label="Back to campus">◎</button></div>
        <p class="map-hint" aria-hidden="true">Use ctrl + scroll, or pinch, to zoom the map</p>
        <div class="wrap where-card">
          <h2 class="h2" id="where-h">Where we are</h2>
          <div class="actions">
            <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=24.395148,54.58733" target="_blank" rel="noopener">Get directions</a>
            <a class="btn ghost" href="https://maps.app.goo.gl/NpHGPbLYVEjPSU8c8" target="_blank" rel="noopener">Open in Google Maps</a>
          </div>
        </div>
      </section>`;
    if (window.InaraMap) window.InaraMap.mount(main.querySelector("#where"));
  }

  // One slide per event, in its own scene. Events that are not open yet get a quieter slide.
  function band(e) {
    const facts = e.open
      ? [teamLine(e), hasPrizes(e) ? `${pool(e)} in prizes` : "", dayLine(e), e.prelim ? "Online round first" : ""]
      : [whenLine(e), free(e) && known(e.venue) ? e.venue : "", hasPrizes(e) ? `${pool(e)} in prizes` : "", status(e), e.note];
    const reg = e.open ? `<a class="btn ghost" href="${eventHref(e, "#register")}">${solo(e) ? "Register" : "Register your team"}</a>` : "";
    return `
      <section class="stage band" id="${esc(e.slug)}-band" aria-labelledby="${esc(e.slug)}-h" aria-roledescription="slide" aria-label="${esc(e.name)}">
        <canvas data-scene="${e.scene}" aria-hidden="true"></canvas>
        <div class="stage-content">
          <p class="kicker">${esc(hosts(e))}${e.placeholder ? ", placeholder" : ""}</p>
          <h2 class="big" id="${esc(e.slug)}-h">${esc(e.name)}</h2>
          ${e.line ? `<p class="tagline">${esc(e.line)}</p>` : ""}
          <p class="facts">${facts.filter(Boolean).map((f) => `<span>${esc(f)}</span>`).join("")}</p>
          <div class="actions"><a class="btn" href="${eventHref(e)}">See the event</a>${reg}</div>
        </div>
      </section>`;
  }

  // The events as full-screen slides you swipe through, like a deck.
  function slides(list = events, label = "Events") {
    return `
      <section class="slides" aria-roledescription="carousel" aria-label="${esc(label)}">
        <div class="track" tabindex="0">${list.map(band).join("")}</div>
        <button class="arrow prev" type="button" aria-label="Previous event">‹</button>
        <button class="arrow next" type="button" aria-label="Next event">›</button>
        <button class="play" type="button" aria-label="Pause the slides" aria-pressed="false"><span aria-hidden="true"></span></button>
        <div class="dots" role="tablist" aria-label="Choose an event">${list.map((e, i) => `<button type="button" role="tab" aria-label="${esc(e.name)}" data-i="${i}"><span>${esc(e.name)}</span></button>`).join("")}</div>
      </section>`;
  }
  // Every slideshow on the page runs on its own.
  function wireSlides() { main.querySelectorAll(".slides").forEach(wireDeck); }
  function wireDeck(root) {
    const track = root.querySelector(".track"), dots = [...root.querySelectorAll(".dots button")], n = dots.length;
    const clampI = (i) => Math.max(0, Math.min(n - 1, i));
    const go = (i) => track.scrollTo({ left: clampI(i) * track.clientWidth, behavior: smooth() });
    const cur = () => Math.round(track.scrollLeft / track.clientWidth);
    root.querySelector(".prev").onclick = () => go(cur() - 1);
    root.querySelector(".next").onclick = () => go(cur() + 1);
    dots.forEach((d) => (d.onclick = () => go(+d.dataset.i)));
    track.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(cur() + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(cur() - 1); } });
    const sync = () => { const i = cur(); dots.forEach((d, j) => d.setAttribute("aria-selected", String(i === j))); root.querySelector(".prev").disabled = i === 0; root.querySelector(".next").disabled = i === n - 1; };
    track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
    sync();

    // Auto-advance: about 7 s a slide, looping. Holds while someone is hovering, touching or tabbing
    // through the slides, while they're off screen, and never runs with reduced motion on.
    const DWELL = 7000, play = root.querySelector(".play");
    let held = 0, stopped = matchMedia("(prefers-reduced-motion: reduce)").matches, visible = false, last = performance.now(), elapsed = 0;
    const hold = (on) => { held = Math.max(0, held + (on ? 1 : -1)); };
    root.addEventListener("pointerenter", () => hold(true)); root.addEventListener("pointerleave", () => hold(false));
    root.addEventListener("focusin", () => hold(true)); root.addEventListener("focusout", () => hold(false));
    track.addEventListener("touchstart", () => { elapsed = 0; }, { passive: true });
    const setStopped = (v) => { stopped = v; play.setAttribute("aria-pressed", String(v)); play.setAttribute("aria-label", v ? "Play the slides" : "Pause the slides"); root.classList.toggle("stopped", v); };
    play.onclick = () => setStopped(!stopped);
    setStopped(stopped);
    new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.5 }).observe(root);
    let shown = cur();
    (function tick(now) {
      const dt = now - last; last = now;
      if (cur() !== shown) { shown = cur(); elapsed = 0; }
      if (visible && !held && !stopped && !document.hidden) elapsed += dt;
      if (elapsed >= DWELL) { elapsed = 0; go(cur() === n - 1 ? 0 : cur() + 1); }
      root.style.setProperty("--progress", String(Math.min(1, elapsed / DWELL)));
      requestAnimationFrame(tick);
    })(last);
  }

  // ================= event page: About and Register tabs =================
  function eventPage(e) {
    document.title = `${e.name}, Inara 2026`;
    const one = solo(e), regLabel = one ? "Register" : "Register your team";
    // Suggestions share something with this event, and say what. Ties go to events you can register for now.
    const recs = events.filter((x) => x.slug !== e.slug)
      .map((x) => { const shared = x.tags.filter((t) => e.tags.includes(t) && t !== "culture"); return { x, shared, score: shared.length * 3 + (x.open ? 1 : 0) }; })
      .filter((r) => r.score > 1).sort((a, b) => b.score - a.score).slice(0, 3);
    const more = recs.length ? `<div class="narrow" style="padding-bottom:96px"><h2 class="h2" style="margin-top:56px">You might also like</h2>
      <ul class="more">${recs.map((r) => `<li><a href="${eventHref(r.x)}">${esc(r.x.name)}</a><span>${esc(hosts(r.x))}</span></li>`).join("")}</ul></div>` : `<div style="padding-bottom:96px"></div>`;
    // a competition that is not open yet says so in its buttons, so the facts stay to when and where
    const facts = e.open ? [teamLine(e), hasPrizes(e) ? `${pool(e)} in prizes` : "", dayLine(e)].filter(Boolean)
      : free(e) ? [whenLine(e), known(e.venue) ? e.venue : "", status(e), e.note].filter(Boolean)
      : [teamLine(e), hasPrizes(e) ? `${pool(e)} in prizes` : "", dayLine(e), e.status, e.note].filter(Boolean);
    const soon = `<span class="btn" aria-disabled="true">Registrations will open soon</span>`;
    const phNote = e.placeholder ? `<p class="ph-note"><b>Placeholder.</b> This event is a stand-in until the club confirms the details.</p>` : "";
    const top = `
      <section class="stage ev-top" aria-labelledby="ev-h">
        <canvas data-scene="${e.scene}" aria-hidden="true"></canvas>
        <div class="stage-content">
          <p class="kicker">${esc(hosts(e))}</p>
          <h1 class="big" id="ev-h">${esc(e.name)}</h1>
          ${e.line ? `<p class="tagline">${esc(e.line)}</p>` : ""}
          <p class="facts">${facts.map((f) => `<span>${esc(f)}</span>`).join("")}</p>
          ${e.open ? `<div class="actions"><a class="btn" href="#register" data-tab="register">${regLabel}</a>${guidelinesBtn(e)}</div>`
            : free(e) ? (e.guidelines ? `<div class="actions">${guidelinesBtn(e)}</div>` : "")
            : `<div class="actions">${e.status ? "" : soon}${guidelinesBtn(e)}</div>`}
        </div>
      </section>`;

    if (!e.open) {
      const fallback = `The ${esc(e.hosts.map((h) => clubs[h]).join(" and "))} ${e.hosts.length > 1 ? "are" : "is"} putting the final details together.`;
      main.innerHTML = `${top}
        <div class="narrow" style="padding-top:48px">
          ${phNote}
          <p class="lead">${e.blurb ? esc(e.blurb) : fallback}</p>
          ${podium(e)}
          <dl class="panel" style="margin-top:32px">
            ${!free(e) && e.team ? `<div><dt>${solo(e) ? "Entry" : "Team size"}</dt><dd>${solo(e) ? "Individual" : e.team[0] === e.team[1] ? `${e.team[0]} people` : `${e.team[0]}-${e.team[1]} people`}</dd></div>` : ""}
            <div><dt>Date &amp; Time</dt><dd>${timed(e) ? esc(dayLine(e)) : `${known(e.day) ? esc(e.day) + ", " : ""}${esc(dur(e))}`}</dd></div>
            <div><dt>Venue</dt><dd>${known(e.venue) ? esc(e.venue) : "To be confirmed"}</dd></div>
            ${hasPrizes(e) ? `<div><dt>Prize pool</dt><dd>${pool(e)}</dd></div>` : ""}
            ${free(e) ? `<div><dt>Registration</dt><dd>${esc(e.note || status(e))}</dd></div>`
              : e.status ? `<div><dt>Registration</dt><dd>${esc(e.status + (e.note ? ", " + e.note.charAt(0).toLowerCase() + e.note.slice(1) : ""))}</dd></div>` : ""}
          </dl>
          ${contactBlock(e) ? `<div class="copy" style="margin-top:32px">${contactBlock(e)}</div>` : ""}
        </div>${more}`;
      findGuidelines(e, main);
      return;
    }
    const steps = [
      [regLabel, `${one ? "One short form" : teamLine(e)}, on the Register tab.`],
      e.prelim && ["Online round", e.prelim],
      e.prelim && ["Finalists announced", "We email everyone who is invited on to the event."],
      !e.prelim && [one ? "You're confirmed" : "Teams confirmed", "We email the schedule before the fest."],
      [known(e.day) ? `The event, ${dayLine(e)}` : "The event, day to be confirmed", `${e.final} ${e.bring || ""}`],
    ].filter(Boolean);
    main.innerHTML = `${top}
      <nav class="tabs" aria-label="${esc(e.name)}">
        <div class="wrap" role="tablist">
          <a class="tab" role="tab" id="tab-about" href="#about" data-tab="about" aria-controls="about">About</a>
          <a class="tab" role="tab" id="tab-register" href="#register" data-tab="register" aria-controls="register">Register</a>
          <span class="spacer"></span>
          <a class="btn" href="#register" data-tab="register" data-only="about">${regLabel}</a>
        </div>
      </nav>
      <div class="panes">
        <section role="tabpanel" id="about" aria-labelledby="tab-about" tabindex="-1">
          <div class="wrap ev-body">
            <div class="copy">
              ${phNote}
              <p class="lead">${esc(e.blurb)}</p>
              <h2 class="h3">Timeline</h2>
              <ol class="timeline">${steps.map(([h, p]) => `<li><h4>${esc(h)}</h4><p>${esc(p)}</p></li>`).join("")}</ol>
              ${contactBlock(e)}
              ${podium(e)}
            </div>
            <aside class="panel" aria-label="At a glance">
              <dl>
                <div><dt>${one ? "Entry" : "Team size"}</dt><dd>${one ? "Individual" : e.team[0] === e.team[1] ? `${e.team[0]} people` : `${e.team[0]}-${e.team[1]} people`}</dd></div>
                ${e.prelim ? `<div><dt>Online round</dt><dd>Yes, before the fest</dd></div>` : ""}
                <div><dt>Date &amp; Time</dt><dd>${timed(e) ? esc(dayLine(e)) : `${known(e.day) ? esc(e.day) : "To be confirmed"}, ${esc(dur(e))}`}</dd></div>
                <div><dt>Venue</dt><dd>${known(e.venue) ? esc(e.venue) : "To be confirmed"}</dd></div>
                ${hasPrizes(e) ? `<div><dt>Prize pool</dt><dd>${pool(e)}</dd></div>` : ""}
              </dl>
              <a class="btn" href="#register" data-tab="register">${regLabel}</a>
              ${guidelinesBtn(e, "btn ghost")}
            </aside>
          </div>
        </section>
        <section role="tabpanel" id="register" aria-labelledby="tab-register" tabindex="-1" class="wrap reg"></section>
      </div>${more}`;
    registration(e, main.querySelector("#register"));
    findGuidelines(e, main);

    const tabs = main.querySelector(".tabs");
    function select(name, scroll, write = true) {
      main.querySelectorAll('[role="tab"]').forEach((t) => { const on = t.dataset.tab === name; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      main.querySelectorAll('[role="tabpanel"]').forEach((p) => (p.hidden = p.id !== name));
      main.querySelectorAll("[data-only]").forEach((b) => (b.hidden = b.dataset.only !== name));
      // only user clicks rewrite the link; doing it during load makes the browser jump to the anchor
      if (write && location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
      if (scroll) tabs.scrollIntoView({ behavior: smooth() });
    }
    main.addEventListener("click", (ev) => {
      const a = ev.target.closest("[data-tab]"); if (!a) return;
      ev.preventDefault(); select(a.dataset.tab, true);
    });
    tabs.querySelector('[role="tablist"]').addEventListener("keydown", (ev) => {
      if (!["ArrowLeft", "ArrowRight"].includes(ev.key)) return;
      const next = main.querySelector('[role="tab"][aria-selected="false"]');
      next.focus(); select(next.dataset.tab, false);
    });
    addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h === "about" || h === "register") select(h, true); });
    const start = location.hash.slice(1);
    select(start === "register" ? "register" : "about", start === "register", false);
  }

  // ================= registration =================
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  function edits(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  // Exact abbreviation, then prefix, then every typed word starting some word, then substring, then small typos.
  function matchUnis(q) {
    const n = norm(q);
    if (!n) return universities.map((u) => ({ u, s: 0 }));
    const toks = n.split(" ");
    return universities.map((u) => {
      const name = norm(u.name), aka = u.aka.map(norm), words = (name + " " + aka.join(" ")).split(" ");
      let s = 0;
      if (aka.includes(n)) s = 100;
      else if (name.startsWith(n) || aka.some((a) => a.startsWith(n))) s = 80;
      else if (toks.every((t) => words.some((w) => w.startsWith(t)))) s = 60;
      else if (name.includes(n)) s = 40;
      else if (toks.every((t) => t.length < 4 ? words.some((w) => w.startsWith(t)) : words.some((w) => edits(t, w.slice(0, t.length + 1), t.length >= 8 ? 2 : 1) <= (t.length >= 8 ? 2 : 1)))) s = 20;
      return { u, s };
    }).filter((m) => m.s > 0).sort((a, b) => b.s - a.s).slice(0, 6);
  }

  const PUBLIC_MAIL = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "live.com"];
  function mailTypo(email) {
    const [user, dom] = email.split("@");
    if (!user || !dom || PUBLIC_MAIL.includes(dom)) return null;
    const hit = PUBLIC_MAIL.find((d) => edits(dom, d, 2) <= 2);
    return hit ? `${user}@${hit}` : null;
  }
  const initials = (name) => (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  // Country code and number are separate; UAE is the default, India right after.
  const CODES = [["+971", "UAE", "AE"], ["+91", "India", "IN"], ...[
    ["+93", "Afghanistan", "AF"], ["+213", "Algeria", "DZ"], ["+61", "Australia", "AU"], ["+973", "Bahrain", "BH"], ["+880", "Bangladesh", "BD"],
    ["+86", "China", "CN"], ["+20", "Egypt", "EG"], ["+251", "Ethiopia", "ET"], ["+33", "France", "FR"], ["+49", "Germany", "DE"],
    ["+62", "Indonesia", "ID"], ["+98", "Iran", "IR"], ["+964", "Iraq", "IQ"], ["+39", "Italy", "IT"], ["+962", "Jordan", "JO"],
    ["+254", "Kenya", "KE"], ["+965", "Kuwait", "KW"], ["+961", "Lebanon", "LB"], ["+60", "Malaysia", "MY"], ["+212", "Morocco", "MA"],
    ["+977", "Nepal", "NP"], ["+234", "Nigeria", "NG"], ["+968", "Oman", "OM"], ["+92", "Pakistan", "PK"], ["+970", "Palestine", "PS"],
    ["+63", "Philippines", "PH"], ["+974", "Qatar", "QA"], ["+7", "Russia or Kazakhstan", "RU"], ["+966", "Saudi Arabia", "SA"],
    ["+65", "Singapore", "SG"], ["+27", "South Africa", "ZA"], ["+94", "Sri Lanka", "LK"], ["+249", "Sudan", "SD"], ["+963", "Syria", "SY"],
    ["+216", "Tunisia", "TN"], ["+90", "Turkey", "TR"], ["+256", "Uganda", "UG"], ["+44", "UK", "GB"], ["+1", "US or Canada", "US"],
    ["+967", "Yemen", "YE"],
  ]];
  const CODE_LIST = CODES.map((c) => c[0]).sort((a, b) => b.length - a.length);
  // E.164: at most 15 digits including the country code. UAE mobiles are 5X XXX XXXX.
  function phoneE164(code, num) {
    const d = (num || "").replace(/\D/g, "").replace(/^0/, "");
    if (!/^\+[1-9]\d{0,3}$/.test(code || "")) return null;
    const ok = /^\d{6,12}$/.test(d);
    return ok && code.length - 1 + d.length <= 15 ? code + d : null;
  }


  function registration(e, host) {
    // A club can run its own Microsoft Form instead: set "formUrl" on the event in events.js.
    if (e.formUrl) {
      host.innerHTML = `
        <div class="reg-card">
          <h2 class="h2" id="reg-h">Register for ${esc(e.name)}</h2>
          <p class="lede">The ${esc(e.hosts.map((h) => clubs[h]).join(" and "))} ${e.hosts.length > 1 ? "take" : "takes"} registrations for ${esc(e.name)} on an official form. ${esc(teamLine(e))}.</p>
          <a class="btn" href="${esc(e.formUrl)}" target="_blank" rel="noopener">Open the registration form</a>
        </div>`;
      return;
    }
    const [lo, hi] = e.team;
    const key = `inara-draft-${e.slug}`;
    const one = solo(e);
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(key)); } catch (_) {}
    const state = draft || { team: "", uni: "", uniOther: false, count: lo, people: [], agree: false, optin: false };
    state.count = Math.max(lo, Math.min(hi, state.count || lo));
    // 8 to 64 characters of letters, digits, dot, dash and underscore: what the backend accepts
    const formId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).padEnd(12, "0");
    let sending = false, touched = new Set(), tried = false;

    const sizes = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const uniField = `<div class="field" data-f="uni"><label for="uni">University</label><p class="err"></p>
              <input class="input" id="uni" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="uni-list" aria-describedby="uni-hint" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="next" placeholder="Start typing, like NYUAD or Khalifa" value="${esc(state.uni)}">
              <span class="sr" id="uni-hint">${one ? "Your university." : "One university for the whole team."} Suggestions appear as you type.</span>
              <ul class="combo-list" id="uni-list" role="listbox" aria-label="Universities" hidden></ul>
              <div class="sr" role="status" aria-live="polite"></div></div>`;
    const sizeSec = one ? "" : `
          <section class="reg-sec" aria-labelledby="s-size">
            <h3 class="sec-t" id="s-size">Team size</h3>
            <div class="seg" role="radiogroup" aria-labelledby="s-size">${sizes.map((n) => `<label><input type="radio" name="count" value="${n}" ${n === state.count ? "checked" : ""}><span>${n} people</span></label>`).join("")}</div>
          </section>`;
    host.innerHTML = `
      <div class="reg-grid">
        <form class="reg-form" id="reg-form" novalidate>
          <h2 class="h2" id="reg-h">${one ? "Register" : "Register your team"}</h2>
          <p class="lede">For ${esc(e.name)}${one ? "" : `: ${esc(teamLine(e).toLowerCase())}`}${known(e.day) ? `, on ${esc(e.day)}` : ""}. <a href="#about" data-tab="about">About ${esc(e.name)}</a><span data-guide-lede>${guideLede(e)}</span></p>
          ${draft ? `<p class="notice">We kept what you typed last time. <button type="button" class="linkish" data-reset>Start over</button></p>` : ""}

          ${one ? `
          <section class="reg-sec" aria-labelledby="s-members">
            <h3 class="sec-t" id="s-members">Your details</h3>
            <div id="members"></div>
            ${uniField}
          </section>` : `
          <section class="reg-sec" aria-labelledby="s-team">
            <h3 class="sec-t" id="s-team">Your team</h3>
            <div class="field" data-f="team"><label for="team">Team name</label><p class="err"></p>
              <input class="input" id="team" maxlength="40" autocomplete="off" value="${esc(state.team)}"></div>
            ${uniField}
          </section>
          ${sizeSec}
          <section class="reg-sec" aria-labelledby="s-members">
            <h3 class="sec-t" id="s-members">Members</h3>
            <div id="members"></div>
          </section>`}

          <section class="reg-sec">
            <div class="field" data-f="agree"><p class="err"></p>
              <label class="checkline"><input type="checkbox" id="agree" ${state.agree ? "checked" : ""}><span>${one ? `I've read the ${guideWord(e)} and agree to follow them.` : `I've read the ${guideWord(e)}, and everyone on my team agrees to follow them.`}</span></label></div>
            <div class="media-note">
              <p>Photos and videos will be taken at the event.</p>
              <details class="policy">
                <summary>Photo and video policy</summary>
                <p>Photos and videos at Inara are taken by IIT Delhi – Abu Dhabi. They are used only to publicize and promote IIT Delhi – Abu Dhabi and its events, for example on its website, social media and printed materials.</p>
                <p>If ${one ? "you would" : "someone on your team would"} rather not appear, tell the organizers at the registration desk on the day, and we will make sure ${one ? "you are" : "they are"} not featured.</p>
              </details></div>
            <label class="checkline"><input type="checkbox" id="optin" ${state.optin ? "checked" : ""}><span>Email me about future IIT Delhi – Abu Dhabi events</span></label>
          </section>

          <input type="text" name="website" id="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="trap">
          <datalist id="codes">${CODES.map(([c, n]) => `<option value="${c}" label="${n}"></option>`).join("")}</datalist>
          <p class="form-err" id="form-err" role="alert" hidden></p>
          <div class="submit-row"><button class="btn" type="submit">${one ? "Register" : "Register team"}</button><span class="saved" id="progress" aria-live="polite"></span></div>
        </form>

        <aside class="team-card${one ? " solo" : ""}" aria-label="${one ? "Your registration so far" : "Your team so far"}">
          <p class="tc-event">${esc(e.name)}</p>
          <p class="tc-team" id="tc-team"></p>
          <p class="tc-uni" id="tc-uni"></p>
          <ul class="tc-members" id="tc-members"></ul>
          <div class="tc-bar" aria-hidden="true"><span id="tc-fill"></span></div>
          <p class="tc-prog" id="tc-prog"></p>
          <button class="btn" type="submit" form="reg-form">${one ? "Register" : "Register team"}</button>
        </aside>
      </div>`;

    const form = host.querySelector("form"), members = host.querySelector("#members");
    const $ = (s) => host.querySelector(s);
    // messages are built from escaped text, so the contact links can be real links
    const formErr = (html) => { const p = $("#form-err"); p.innerHTML = html; p.hidden = !html; if (html) p.scrollIntoView({ block: "center", behavior: smooth() }); };
    const save = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {} };
    host.querySelector("[data-reset]")?.addEventListener("click", () => { try { localStorage.removeItem(key); } catch (_) {} registration(e, host); });

    // ----- members -----
    const leadDomain = () => { const d = (state.people[0]?.email || "").split("@")[1]; return d && !PUBLIC_MAIL.includes(d) ? d : ""; };
    function drawMembers() {
      while (state.people.length < hi) state.people.push({ name: "", email: "", code: "+971", phone: "" });
      state.people.forEach((p) => (p.code = p.code || "+971"));
      members.innerHTML = state.people.slice(0, state.count).map((p, i) => {
        const id = (f) => `m${i}-${f}`, lead = i === 0, ac = (t) => (lead ? t : "off");
        const opt = (k) => (!lead && ask(e, k) === "optional" ? " (optional)" : "");
        return `
          <fieldset class="member" data-i="${i}">
            <legend class="sr">${one ? "Your details" : lead ? "Member 1, team lead" : `Member ${i + 1}`}</legend>
            <div class="member-head"><span class="av" aria-hidden="true">${initials(p.name) || i + 1}</span><h4>${one ? "You" : lead ? "Team lead" : `Member ${i + 1}`}</h4><span class="tick" aria-hidden="true"></span></div>
            ${!lead && ask(e, "name") === "lead" ? "" : `<div class="field" data-f="${id("name")}"><label for="${id("name")}">Full name, as on the certificate${opt("name")}</label><p class="err"></p>
              <input class="input" id="${id("name")}" data-k="name" maxlength="120" autocomplete="${ac("name")}" autocapitalize="words" spellcheck="false" value="${esc(p.name)}"></div>`}
            <div class="row2">
              ${!lead && ask(e, "email") === "lead" ? "" : `<div class="field" data-f="${id("email")}"><label for="${id("email")}">Email${opt("email")}</label><p class="err"></p>
                <input class="input" id="${id("email")}" data-k="email" type="email" inputmode="email" maxlength="254" spellcheck="false" autocapitalize="off" autocomplete="${ac("email")}" placeholder="${!lead && leadDomain() ? "name@" + leadDomain() : ""}" value="${esc(p.email)}">
                <p class="suggest" hidden></p></div>`}
              ${!lead && ask(e, "phone") === "lead" ? "" : `<div class="field" data-f="${id("phone")}"><label for="${id("phone")}">WhatsApp${opt("phone")}</label><p class="err"></p>
                <div class="phone">
                  <span class="code"><input class="input" id="${id("code")}" data-k="code" list="codes" inputmode="tel" maxlength="5" autocomplete="${ac("tel-country-code")}" aria-label="${one ? "Country code" : `Member ${i + 1} country code`}" value="${esc(p.code)}"></span>
                  <input class="input" id="${id("phone")}" data-k="phone" type="text" inputmode="tel" maxlength="24" autocomplete="${ac("tel-national")}" placeholder="${p.code === "+971" ? "50 123 4567" : ""}" value="${esc(p.phone)}">
                </div></div>`}
            </div>
          </fieldset>`;
      }).join("");
      progress();
    }
    drawMembers();

    // ----- validation -----
    const RULES = {
      team: () => (state.team.trim() ? "" : "Enter a team name"),
      uni: () => (state.uni.trim() ? "" : "Choose your university, or type its name"),
      agree: () => (state.agree ? "" : one ? "Confirm you've read the guidelines" : "Confirm your team has read the guidelines"),
    };
    function memberError(i, k) {
      const p = state.people[i];
      // members' fields that are optional or asked only of the lead may stay empty (members may share an email)
      if (i > 0 && ask(e, k === "code" ? "phone" : k) !== "required" && !String(p[k === "code" ? "phone" : k] || "").trim()) return "";
      if (k === "name") return p.name.trim().length >= 2 ? "" : "Enter the full name";
      if (k === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email.trim()) ? "" : "Enter an email address";
      if (k === "phone") return phoneE164(p.code, p.phone) ? "" : !/^\+[1-9]\d{0,3}$/.test(p.code || "") ? "Enter a country code, like +971" : "Enter a phone number, like 50 123 4567";
      return "";
    }
    function show(fieldKey, msg) {
      const f = host.querySelector(`[data-f="${fieldKey}"]`); if (!f) return;
      const input = f.querySelector("input:not([type=radio]), select");
      f.classList.toggle("bad", !!msg);
      f.querySelector(".err").textContent = msg;
      if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
    }
    function check(fieldKey) {
      const m = fieldKey.match(/^m(\d+)-(\w+)$/);
      const msg = m ? memberError(+m[1], m[2]) : RULES[fieldKey]?.() || "";
      show(fieldKey, msg);
      return msg;
    }
    function progress() {
      const ready = state.people.slice(0, state.count).map((_, i) => ["name", "email", "phone"].every((k) => !memberError(i, k)));
      const done = ready.filter(Boolean).length, line = one ? (done ? "Details ready" : "Details needed") : `${done} of ${state.count} members ready`;
      $("#progress").textContent = line;
      $("#tc-prog").textContent = line;
      $("#tc-fill").style.width = `${(done / state.count) * 100}%`;
      const who = one ? (state.people[0]?.name || "").trim() : state.team.trim();
      $("#tc-team").textContent = who || (one ? "Your name" : "Your team");
      $("#tc-team").classList.toggle("empty", !who);
      $("#tc-uni").textContent = state.uni.trim() || "University";
      $("#tc-uni").classList.toggle("empty", !state.uni.trim());
      $("#tc-members").innerHTML = state.people.slice(0, state.count).map((p, i) =>
        `<li class="${ready[i] ? "ok" : ""}"><span class="av">${esc(initials(p.name) || i + 1)}</span><span class="nm">${esc(p.name.trim() || (i ? `Member ${i + 1}` : "Team lead"))}</span>${ready[i] ? '<span class="tick"></span>' : ""}</li>`).join("");
      members.querySelectorAll(".member").forEach((m, i) => { m.classList.toggle("ok", !!ready[i]); m.querySelector(".av").textContent = initials(state.people[i].name) || i + 1; });
    }

    // ----- input wiring -----
    form.addEventListener("input", (ev) => {
      const t = ev.target, mi = t.closest(".member")?.dataset.i;
      if (t.id === "team") state.team = t.value;
      else if (t.id === "agree") state.agree = t.checked;
      else if (t.id === "optin") state.optin = t.checked;
      else if (mi !== undefined && t.dataset.k) {
        const p = state.people[+mi];
        if (t.dataset.k === "phone") {
          // a pasted +44 7700... picks the country and keeps only the number
          const raw = t.value.trim().replace(/^00/, "+").replace(/[^\d+]/g, "");
          const c = raw.startsWith("+") && CODE_LIST.find((x) => raw.startsWith(x));
          if (c) { p.code = c; host.querySelector(`#m${mi}-code`).value = c; t.value = raw.slice(c.length); }
          else t.value = t.value.replace(/[^\d ]/g, "");
        }
        if (t.dataset.k === "code") {
          // always a plus and up to four digits
          t.value = "+" + t.value.replace(/\D/g, "").slice(0, 4);
          host.querySelector(`#m${mi}-phone`).placeholder = t.value === "+971" ? "50 123 4567" : "";
        }
        p[t.dataset.k] = t.value;
      }
      const fk = t.closest(".field")?.dataset.f;
      if (fk && host.querySelector(`[data-f="${fk}"]`).classList.contains("bad")) check(fk);
      progress(); save();
    });
    form.addEventListener("change", (ev) => {
      const t = ev.target;
      if (t.name === "count") { state.count = +t.value; drawMembers(); live(`${state.count} member sections shown`); save(); }
      if (t.id === "agree") { state.agree = t.checked; if (tried) check("agree"); save(); }
      if (t.id === "optin") { state.optin = t.checked; save(); }
    });
    form.addEventListener("focusout", (ev) => {
      const t = ev.target, fk = t.closest(".field")?.dataset.f;
      if (!fk || fk === "uni" || fk === "count") return;
      if (t.dataset.k === "name") { t.value = t.value.replace(/\s+/g, " ").trim(); state.people[+t.closest(".member").dataset.i].name = t.value; }
      if (t.value || tried) { touched.add(fk); check(fk); }
      if (t.dataset.k === "email") {
        const s = t.closest(".field").querySelector(".suggest"), fix = mailTypo(t.value.trim().toLowerCase());
        s.hidden = !fix;
        if (fix) { s.innerHTML = `Did you mean <button type="button">${esc(fix)}</button>?`; s.querySelector("button").onclick = () => { t.value = fix; state.people[+t.closest(".member").dataset.i].email = fix; s.hidden = true; check(fk); save(); }; }
        if (t.closest(".member").dataset.i === "0") members.querySelectorAll('[data-k="email"]').forEach((x, j) => j && (x.placeholder = leadDomain() ? "name@" + leadDomain() : ""));
      }
      save();
    });

    // ----- university combobox (WAI-ARIA list autocomplete, manual selection) -----
    const uni = $("#uni"), list = $("#uni-list"), status = host.querySelector('[role="status"]');
    let opts = [], active = -1, liveTimer, typingOwn = false;
    function live(msg) { clearTimeout(liveTimer); liveTimer = setTimeout(() => (status.textContent = msg), 300); }
    function openList() {
      const q = uni.value, hits = matchUnis(q);
      opts = hits.map((h) => ({ label: h.u.name, other: false }));
      if (q.trim() && !opts.some((o) => norm(o.label) === norm(q))) opts.push({ label: q.trim(), other: true });
      if (!q.trim()) opts.push({ label: "", other: true, blank: true });
      const n = norm(q);
      list.innerHTML = opts.map((o, i) => {
        const label = o.blank ? `My university isn't listed<small>Type its full name instead</small>` : o.other ? `Use “${esc(o.label)}”<small>My university isn't listed</small>` : n ? esc(o.label).replace(new RegExp(`(${n.split(" ").map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig"), "<mark>$1</mark>") : esc(o.label);
        return `<li role="option" id="uni-opt-${i}" class="${o.other ? "other" : ""}" aria-selected="false">${label}</li>`;
      }).join("");
      list.hidden = !opts.length; uni.setAttribute("aria-expanded", String(!!opts.length));
      highlight(q.trim() && opts.length && !opts[0].other ? 0 : -1);
      const real = opts.filter((o) => !o.other).length;
      live(real ? `${real} universit${real === 1 ? "y" : "ies"} found. Use up and down to review, Enter to pick.` : "No match. Press Enter to use what you typed.");
    }
    function closeList() { list.hidden = true; uni.setAttribute("aria-expanded", "false"); uni.removeAttribute("aria-activedescendant"); active = -1; }
    function highlight(i) {
      active = i;
      list.querySelectorAll("li").forEach((li, j) => li.setAttribute("aria-selected", String(j === i)));
      if (i >= 0) { uni.setAttribute("aria-activedescendant", `uni-opt-${i}`); list.children[i].scrollIntoView({ block: "nearest" }); }
      else uni.removeAttribute("aria-activedescendant");
    }
    function choose(i) {
      const o = opts[i]; if (!o) return;
      if (o.blank) {
        // switch the box to free typing for an unlisted university
        uni.value = ""; state.uni = ""; state.uniOther = true; typingOwn = true;
        uni.placeholder = "Type your university's full name"; closeList(); uni.focus(); return;
      }
      uni.value = o.label; state.uni = o.label; state.uniOther = o.other;
      closeList(); save(); if (touched.has("uni") || tried) check("uni");
    }
    uni.addEventListener("input", () => { state.uni = uni.value; state.uniOther = true; if (!typingOwn || matchUnis(uni.value).some((m) => m.s >= 60)) openList(); else closeList(); });
    uni.addEventListener("focus", () => { if (!uni.value && !typingOwn) openList(); });
    uni.addEventListener("click", () => { if (list.hidden) openList(); });
    uni.addEventListener("keydown", (ev) => {
      const n = opts.length;
      if (ev.key === "ArrowDown") { ev.preventDefault(); if (list.hidden) openList(); if (!ev.altKey) highlight(n ? (active + 1) % n : -1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); if (list.hidden) openList(); highlight(n ? (active - 1 + n) % n : -1); }
      else if (ev.key === "Enter" && !list.hidden) { ev.preventDefault(); choose(active >= 0 ? active : opts.length - 1); }
      else if (ev.key === "Escape") { if (!list.hidden) closeList(); else { uni.value = ""; state.uni = ""; } }
    });
    uni.addEventListener("blur", () => setTimeout(() => {
      if (!list.hidden && active >= 0) choose(active);
      else closeList();
      // a typed name that matches a listed university exactly becomes that university
      const exact = universities.find((u) => norm(u.name) === norm(uni.value) || u.aka.map(norm).includes(norm(uni.value)));
      if (exact) { uni.value = exact.name; state.uni = exact.name; state.uniOther = false; }
      if (uni.value) { touched.add("uni"); check("uni"); }
      save();
    }, 120));
    list.addEventListener("pointerdown", (ev) => { const li = ev.target.closest("li"); if (!li) return; ev.preventDefault(); choose([...list.children].indexOf(li)); });

    // ----- submit -----
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (sending) return;
      tried = true;
      const keys = [...(one ? [] : ["team"]), "uni", ...state.people.slice(0, state.count).flatMap((_, i) => ["name", "email", "phone"].map((k) => `m${i}-${k}`)), "agree"];
      const errs = keys.map((k) => [k, check(k)]).filter(([, m]) => m);
      if (errs.length) {
        const f = host.querySelector(`[data-f="${errs[0][0]}"]`);
        f.scrollIntoView({ block: "center", behavior: smooth() });
        (f.querySelector("input:not([type=radio])") || f.querySelector("input")).focus({ preventScroll: true });
        live(`${errs.length} field${errs.length > 1 ? "s" : ""} to fix`);
        return;
      }
      formErr(""); document.title = `${e.name}, Inara 2026`;
      const entry = {
        id: formId, event: e.slug, team: one ? "" : state.team.trim(), university: state.uni.trim(), universityListed: !state.uniOther,
        agree: state.agree, optin: !!state.optin,
        members: state.people.slice(0, state.count).map((p, i) => ({
          lead: i === 0,
          name: i > 0 && ask(e, "name") === "lead" ? "" : p.name.trim(),
          email: i > 0 && ask(e, "email") === "lead" ? "" : p.email.trim().toLowerCase(),
          phone: i > 0 && (ask(e, "phone") === "lead" || !p.phone.trim()) ? "" : phoneE164(p.code, p.phone),
        })),
      };
      const btn = form.querySelector("[type=submit]");
      sending = true; btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Registering…";
      try {
        const res = await fetch(`${API}/register.php`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": formId }, body: JSON.stringify({ ...entry, fest: "inara", website: $("#website").value }) });
        const data = await res.json().catch(() => ({}));
        // no JSON error means the API itself didn't answer (not installed, or the server failed)
        const said = typeof data.error === "string" ? data.error : "";
        if (!res.ok) throw Object.assign(new Error(said || "Registration isn't working right now"), { status: said ? res.status : 503 });
        try { localStorage.removeItem(key); } catch (_) {}
        done(e, host, entry);
      } catch (err) {
        sending = false; btn.disabled = false; btn.removeAttribute("aria-busy"); btn.textContent = one ? "Register" : "Register team";
        // a refusal (event closed, a bad field) is final; a server or network failure is worth retrying
        const retry = !err.status || err.status >= 500 || err.status === 429;
        // the browser's own wording for "no connection" (NetworkError, Failed to fetch) means nothing to people
        if (!err.status) err = new Error("We couldn't reach the registration service");
        const msg = esc(err.message.replace(/[.!?]+$/, "")) + ".";
        formErr(`${one ? "You aren't" : "Your team isn't"} registered yet. ${msg}${retry ? ` Your details are still here${/try again|wait/i.test(err.message) ? "" : ", so try again in a minute"}.${contactLine(e)}` : ""}`);
      }
    });
  }


  function done(e, host, entry) {
    const one = solo(e);
    host.innerHTML = `
      <div class="reg-card">
        <p class="kicker">You're in</p>
        <h2 class="h2" id="reg-h">${one ? `You're registered for ${esc(e.name)}` : `${esc(entry.team)} is registered for ${esc(e.name)}`}</h2>
        <p class="lede">${esc(entry.university)}. ${entry.members.map((m) => esc(m.name)).filter(Boolean).join(", ")}.</p>
        <ol class="next">
          ${e.confirmation ? `<li><h3>What happens next</h3><p>${esc(e.confirmation)}</p></li>` : ""}
          <li><h3>Check your email</h3><p>The organizers contact ${one ? "you" : "your team lead"} by email before the fest.</p></li>
          ${e.prelim ? `<li><h3>Get ready for the online round</h3><p>${esc(e.prelim)} We'll email the details.</p></li>` : `<li><h3>Watch for the schedule</h3><p>We email the timing before the fest.</p></li>`}
          <li><h3>Got something wrong?</h3><p>Email the organizers${one ? "" : " from the team lead's address"} with the fix, and they will update ${one ? "your registration" : "your team"}.</p></li>
        </ol>
        ${entry.optin ? `<p class="fine">You'll also hear from us about future IIT Delhi – Abu Dhabi events.</p>` : ""}
        <a class="btn ghost" href="${link(`${root}#events`)}">See more events</a>
      </div>`;
    host.scrollIntoView({ block: "start" });
    host.querySelector("#reg-h").setAttribute("tabindex", "-1"); host.querySelector("#reg-h").focus({ preventScroll: true });
  }

  // ================= schedule: every event, day by day =================
  // Built from "days" and each event's "day" and "time" in events.js, so it never needs editing by hand.
  function schedulePage() {
    document.title = "Schedule, Inara 2026";
    const dayNames = days.map((d) => d.name);
    const startOf = (e) => (timed(e) ? mins(e.time[0]) : Infinity);
    const perDay = days
      .map((d) => ({ ...d, id: d.name.split(" ")[0].toLowerCase(), label: shortDay(d.name).replace(/\s+\w+$/, ""), list: events.filter((e) => e.day === d.name).sort((a, b) => startOf(a) - startOf(b)) }))
      .filter((d) => d.list.length);
    // Anything without a day yet goes under "Still being scheduled".
    const later = events.filter((e) => !dayNames.includes(e.day));
    const slotted = perDay.flatMap((d) => d.list.filter(timed));
    const openCount = events.filter((e) => e.open).length;
    // UAE time is GMT+4 all year, so each slot is one fixed moment wherever the visitor is
    const at = (date, m) => Date.parse(`${date}T00:00:00+04:00`) + m * 60000;
    const span = (d, e) => `data-start="${at(d.date, mins(e.time[0]))}" data-end="${at(d.date, mins(e.time[1]))}"`;
    const h0 = slotted.length ? Math.floor(Math.min(...slotted.map((e) => mins(e.time[0]))) / 60) : 0;
    const h1 = slotted.length ? Math.ceil(Math.max(...slotted.map((e) => mins(e.time[1]))) / 60) : 0;
    // events that overlap on the same day share the column side by side
    function lanes(list) {
      const ends = [], lane = new Map();
      list.filter(timed).forEach((e) => {
        const [s, en] = e.time.map(mins);
        let i = ends.findIndex((x) => x <= s);
        if (i < 0) i = ends.length;
        ends[i] = en; lane.set(e, i);
      });
      return { lane, n: Math.max(1, ends.length) };
    }

    const top = `
      <section class="stage ev-top sched-top" aria-labelledby="sc-h">
        <canvas data-scene="lanterns" aria-hidden="true"></canvas>
        <div class="stage-content">
          <p class="kicker">Inara 2026</p>
          <h1 class="big" id="sc-h">Schedule</h1>
          <p class="facts"><span>13-15 November, 2026</span><span>${slotted.length} events</span><span>All times UAE (GMT+4)</span></p>
        </div>
      </section>`;

    const navItems = [
      slotted.length && ["glance", "At a glance"],
      ...perDay.map((d) => [d.id, d.label]),
      later.length && ["later", "To be confirmed"],
    ].filter(Boolean);
    const nav = `
      <nav class="tabs daynav" aria-label="Schedule sections">
        <div class="wrap">${navItems.map(([id, t]) => `<a class="tab" href="#${id}">${esc(t)}</a>`).join("")}<span class="spacer"></span><span class="tz">All times UAE (GMT+4)</span></div>
      </nav>`;

    const glance = slotted.length ? `
      <section class="section glance-sec" id="glance" aria-labelledby="glance-h">
        <div class="wrap">
          <h2 class="h2" id="glance-h">At a glance</h2>
          <div class="glance" style="--h0:${h0};--rows:${h1 - h0};--days:${perDay.length}">
            <div class="g-axis" aria-hidden="true">${Array.from({ length: h1 - h0 + 1 }, (_, k) => h0 + k).filter((h) => (h - h0) % 2 === 0).map((h) => `<span style="--at:${h}">${clock(h * 60)}</span>`).join("")}</div>
            ${perDay.map((d) => { const { lane, n } = lanes(d.list); return `
            <div class="g-day">
              <h3 class="g-head"><a href="#${d.id}">${esc(d.label)}</a></h3>
              <div class="g-col" data-date="${d.date}">
                ${d.list.filter(timed).map((e) => { const [s, en] = e.time.map(mins); return `<a class="g-ev scene-${e.scene}${en - s <= 90 ? " short" : ""}" href="${eventHref(e)}" ${span(d, e)} style="--s:${s / 60};--e:${en / 60};--lane:${lane.get(e)};--lanes:${n}"><b>${esc(e.name)}</b><span>${esc(timeRange(e))}</span></a>`; }).join("")}
                <i class="g-now" hidden></i>
              </div>
            </div>`; }).join("")}
          </div>
        </div>
      </section>` : "";

    const row = (d, e) => `
      <li class="slot scene-${e.scene}" ${timed(e) ? span(d, e) : ""}>
        <div class="s-time">${timed(e) ? `<b>${timeRange(e)}</b><span>${esc(dur(e))}</span>` : `<b>Time TBC</b><span>${esc(dur(e))}</span>`}</div>
        <div class="s-body">
          <span class="s-live" hidden></span>
          <a class="s-name" href="${eventHref(e)}">${esc(e.name)}</a>
          <p class="s-meta"><span>${esc(hosts(e))}</span>${known(e.venue) ? `<span>${esc(e.venue)}</span>` : ""}<span class="s-status">${esc(status(e))}</span>${e.note ? `<span>${esc(e.note)}</span>` : ""}</p>
        </div>
        ${e.open ? `<a class="btn ghost s-btn" href="${eventHref(e, "#register")}">${solo(e) ? "Register" : "Register your team"}</a>` : ""}
      </li>`;
    const dayLists = perDay.map((d) => `
      <section class="sched-day" id="${d.id}" aria-labelledby="${d.id}-h">
        <div class="wrap">
          <h2 class="h2" id="${d.id}-h">${esc(d.name)}</h2>
          <ol class="slots">${d.list.map((e) => row(d, e)).join("")}</ol>
        </div>
      </section>`).join("");

    const listOf = (list) => `<ul class="more">${list.map((e) => `<li><a href="${eventHref(e)}">${esc(e.name)}</a><span>${esc([hosts(e), known(e.venue) ? e.venue : "", dur(e)].filter(Boolean).join(", "))}</span></li>`).join("")}</ul>`;
    const tbc = later.length ? `
      <section class="sched-day" id="later" aria-labelledby="later-h">
        <div class="wrap">
          <h2 class="h2" id="later-h">Still being scheduled</h2>
          ${listOf(later)}
        </div>
      </section>` : "";
    const end = openCount ? `
      <section class="section sched-end">
        <div class="wrap">
          <h2 class="h2">Want to compete?</h2>
          <a class="btn" href="${link(`${root}#events`)}">See the events</a>
        </div>
      </section>` : `<div style="padding-bottom:96px"></div>`;

    main.innerHTML = top + nav + glance + dayLists + tbc + end;

    // Live during the fest: "On now" and "Up next" tags, earlier slots dimmed, and a line on the clock.
    function live() {
      const now = Date.now();
      const els = [...main.querySelectorAll("[data-start]")];
      if (!els.length) return;
      const festLeft = now < Math.max(...els.map((el) => +el.dataset.end));
      const nextStart = Math.min(...els.map((el) => +el.dataset.start).filter((s) => s > now));
      els.forEach((el) => {
        const s = +el.dataset.start, en = +el.dataset.end;
        const on = now >= s && now < en;
        const next = !on && s === nextStart && s - now < 864e5; // only once it is less than a day away
        el.classList.toggle("on", on);
        el.classList.toggle("past", festLeft && now >= en);
        const t = el.querySelector(".s-live");
        if (t) { t.hidden = !(on || next); t.textContent = on ? "On now" : next ? "Up next" : ""; }
      });
      main.querySelectorAll(".g-col").forEach((col) => {
        const a = at(col.dataset.date, h0 * 60), b = at(col.dataset.date, h1 * 60), line = col.querySelector(".g-now");
        line.hidden = !(now >= a && now <= b);
        if (!line.hidden) line.style.setProperty("--t", String(h0 + (now - a) / 36e5));
      });
    }
    live();
    setInterval(live, 30000);

    // the section you are reading is underlined in the bar
    const navLinks = [...main.querySelectorAll(".daynav .tab")];
    const targets = navLinks.map((a) => document.getElementById(a.hash.slice(1)));
    const spy = () => {
      let cur = -1;
      targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
      navLinks.forEach((a, i) => (i === cur ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    };
    addEventListener("scroll", () => requestAnimationFrame(spy), { passive: true });
    spy();
  }

  // ================= boot =================
  if (page === "home") { home(); wireSlides(); }
  else if (page === "schedule") schedulePage();
  else {
    const e = bySlug[document.body.dataset.event];
    if (e) eventPage(e);
  }
  document.querySelectorAll("[data-home]").forEach((a) => (a.href = link(a.getAttribute("href"))));
  mountScenes();
  // the bar turns solid once the first stage has scrolled away
  const onScroll = () => { const s = main.querySelector(".stage"); bar.classList.toggle("solid", !s || scrollY > s.offsetHeight - 70); };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  // a refresh starts at the top instead of jumping back down to an old anchor
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const reload = performance.getEntriesByType("navigation")[0]?.type === "reload";
  // (event pages handle their own #about / #register)
  const anchored = page !== "event" && location.hash;
  if (reload) { if (anchored) history.replaceState(null, "", location.pathname + location.search); scrollTo(0, 0); }
  else if (anchored) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();
