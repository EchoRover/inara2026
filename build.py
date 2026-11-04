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
  <a class="brand" href="../" data-home aria-label="Inara home"><span class="brand-name">Inara</span><span class="brand-sub">IIT Delhi Abu Dhabi</span></a>
  <nav class="bar-nav" aria-label="Main"><a href="../#events" data-home>All events</a><a href="../schedule/" data-home>Schedule</a><a href="../#where" data-home>Where we are</a><a class="sister" href="https://afkar2026.vercel.app/">Afkar</a></nav>
</header>
<main id="main" tabindex="-1"></main>
<footer class="foot">
  <p><strong>Inara 2026</strong>, the cultural fest of IIT Delhi Abu Dhabi, run by its clubs.</p>
  <p>13 to 15 November 2026. Open to students of every UAE university.</p>
  <p class="sister-note">Afkar, the technical fest, runs alongside: <a href="https://afkar2026.vercel.app/">afkar2026.vercel.app</a></p>
  <p class="credit">Site by the Coding Club, IIT Delhi Abu Dhabi.</p>
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
    desc = f'{e.get("line") or e["name"]} {e["name"]} by {by}. Inara, IIT Delhi Abu Dhabi, 13 to 15 November 2026.'
    write(e["slug"], "event", e["name"], desc)

write("schedule", "schedule", "Schedule",
      "The full Inara 2026 schedule, day by day: every quiz, show, competition and stall. IIT Delhi Abu Dhabi, 13 to 15 November 2026.")
