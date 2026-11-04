"""Stamp out one static page per event so every event has its own shareable link
(/quiz-night/) with its own title and link preview, plus the schedule page (/schedule/).
Run after editing assets/events.js:

    python3 build.py      (on Windows: python build.py)
"""
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
THEME_COLOR = "#282829"

src = (ROOT / "assets" / "events.js").read_text(encoding="utf-8")
data = json.loads(re.search(r"window\.INARA\s*=\s*(\{.*\});", src, re.S).group(1))

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{name}, Inara 2026</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{name}, Inara 2026">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta name="theme-color" content="{color}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="../assets/styles.css">
</head>
<body data-page="{page}" data-event="{slug}">
<a class="skip" href="#main">Skip to content</a>
<header class="bar" id="bar">
  <div class="brand-row"><a class="inst" href="https://www.iitdabudhabi.ac.ae" target="_blank" rel="noopener"><img src="../assets/iitdad-logo-carbon.png" alt="IIT Delhi – Abu Dhabi" width="215" height="60"></a><a class="brand" href="../" data-home aria-label="Inara home"><img src="../assets/inara-logo-240.webp" alt="Inara 2026" width="111" height="56"></a></div>
  <nav class="bar-nav" aria-label="Main"><a href="../#events" data-home>Events</a><a href="../schedule/" data-home>Schedule</a><a href="../#where" data-home>Where we are</a><a class="sister" href="https://afkar2026.vercel.app/">Afkar</a></nav>
</header>
<main id="main" tabindex="-1"></main>
<footer class="foot">
  <div class="foot-inner">
    <a class="foot-logo" href="https://www.iitdabudhabi.ac.ae" target="_blank" rel="noopener"><img src="../assets/iitdad-logo-white.png" alt="IIT Delhi – Abu Dhabi" width="287" height="80"></a>
    <nav class="foot-links" aria-label="Footer"><a href="../#events" data-home>Events</a><a href="../schedule/" data-home>Schedule</a><a href="../#where" data-home>Where we are</a><a href="https://afkar2026.vercel.app/">Afkar 2026</a></nav>
    <div class="foot-rule" aria-hidden="true"></div>
    <p class="copy">&copy; 2026 Indian Institute of Technology Delhi – Abu Dhabi</p>
    <div class="foot-meta">
      <p class="foot-about"><strong>Inara 2026</strong>, the Cultural Fest of IIT Delhi – Abu Dhabi. 13-15&nbsp;November, on&nbsp;campus.</p>
      <p class="made">Afkar and Inara pages are developed and managed by the Coding Club, IIT Delhi – Abu Dhabi</p>
    </div>
  </div>
</footer>
<script src="../assets/events.js" defer></script>
<script src="../assets/scenes.js" defer></script>
<script src="../assets/app.js" defer></script>
</body>
</html>
"""


def write(slug, page, name, desc):
    out = ROOT / slug / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(TEMPLATE.format(name=html.escape(name), desc=html.escape(desc), color=THEME_COLOR, page=page, slug=slug), encoding="utf-8")
    print("wrote", out.relative_to(ROOT))


for e in data["events"]:
    hosts = " and ".join(data["clubs"][h] for h in e["hosts"])
    by = hosts if hosts.startswith("The ") else "the " + hosts
    line = (e.get("line") or e["name"]).rstrip()
    line += "" if line[-1] in ".!?" else "."
    desc = f'{line} {e["name"]} by {by}. Inara, IIT Delhi – Abu Dhabi, 13-15 November, 2026.'
    write(e["slug"], "event", e["name"], desc)

write("schedule", "schedule", "Schedule",
      "The full Inara 2026 schedule, day by day: every quiz, show and competition. IIT Delhi – Abu Dhabi, 13-15 November, 2026.")
