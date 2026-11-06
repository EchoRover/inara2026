# Inara 2026 website

The website of Inara 2026, the cultural fest of IIT Delhi – Abu Dhabi (13 to 15 November 2026).
Live at https://www.iitdabudhabi.ac.ae/inara/

The site runs on the university web server. The university web team copies files onto the server
when the Coding Club sends them; nothing goes live straight from this repo.

Questions: Coding Club, sc.coding@iitdabudhabi.ac.ae

## How a change gets to the live site

1. **Start from the latest version.** `git pull` on `main`, then make a branch for your change,
   for example `git switch -c prizes-melomachia`.
2. **Make the change.** Most changes are in `assets/events.js` (see "What to change where" below).
3. **Rebuild the pages.** Run `python3 build.py` in this folder. It fails with an error if
   `events.js` is no longer valid JSON, so it doubles as a check.
4. **Check it in a browser.** Run `php -S 127.0.0.1:8769` in this folder and open
   http://127.0.0.1:8769/. Look at every page you changed on a wide window and on a phone-sized
   one (about 390 px wide): the text is right, nothing overlaps, there is no sideways scrolling, and
   the browser console shows no errors.
5. **Send it for review.** Commit with a message that says what changed, push your branch, and open
   a pull request. In the description, list every file you changed with one line on what and why.
6. **The Coding Club checks it**, merges it, and sends the changed files to the university web
   team. You will hear back when it is live.

Please don't push straight to `main`; the review in step 6 is how the live site and this repo stay
the same.

## What to change where

| You want to change | Edit this | Notes |
|---|---|---|
| Event text, dates, times, venues, team sizes, prizes, contacts | `assets/events.js` | The comment at the top explains every field. |
| Open or close registration for an event | `"open"` in `assets/events.js` | See "Before opening registration" below. |
| Add or replace a rulebook | `rulebooks/<slug>.pdf` | `<slug>` is the event's `slug` in `events.js` (for example `genesis.pdf`). The page shows the rulebook link by itself. Keep PDFs under about 5 MB so they open quickly on phones. |
| Colours, layout, animations | `assets/styles.css`, `assets/scenes.js` | Ask the Coding Club first. |
| The registration form | `assets/app.js` | Ask the Coding Club first; it talks to the registration backend. |

## Things to know

- **The event pages (`index.html`) are not sent to the server.** The web team edits them on the
  server (search-engine text and links), so sending them would undo that work. `build.py` still
  makes them so the local preview works. If a change only shows up in an `index.html` (for example
  a page title), say so in the pull request.
- **Don't change an event's `slug` once registration is open.** It is part of the page address and
  is sent with every registration.
- **Before opening registration for a new event**, tell the Coding Club. Registrations go to the
  university's Zoho CRM, which has to know the event's name first, or the registrations are refused.
- **Don't touch `api/`** (the registration backend) and never commit `api/config.php`; it holds the
  CRM keys and is ignored by git on purpose.
- Write plain text: no em dashes, and the university's name as "IIT Delhi – Abu Dhabi" (with an en
  dash).

## If an AI assistant is helping you

Follow the steps above. Change only what was asked, run `python3 build.py` and the browser check
before committing, never push to `main`, and put the list of changed files in the pull request.
