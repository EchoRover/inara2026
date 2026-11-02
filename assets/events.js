/*
  INARA 2026: THE EVENT LIST. This is the only file the cultural secretaries need to edit.
  After editing, run  python3 build.py  in the inara folder. It makes one page per event.

  Events, clubs, team sizes, durations and venues come from the cultural clubs' sheet (2 Nov 2026).
  The "line" and "blurb" text is a first draft: each club should check and rewrite its own.

  Keep this file valid JSON after the "window.INARA =" line: double quotes, no trailing commas,
  and no comments inside the object. Write plain text with no em-dashes.

  Fields of one event:
    slug         web address of the event page (inara.../quiz-night/). Lowercase, digits and hyphens only.
                 It is also sent to the registration backend, so do not change it after registrations open.
    name         the event's name as shown to people
    scene        the moving background: "screen" (light through a lattice that follows the cursor),
                 "lanterns" (lanterns rising at dusk), "pulse" (waves of light across the lattice)
                 or "dawn" (a slow sunrise behind arches)
    hosts        list of club ids from "clubs" below. Two ids means a collaboration
    open         true when people can register now, false shows "Opens soon" and no form
    entry        "free" for shows, stalls and workshops anyone can walk into: no registration, the
                 page shows "Free to attend" instead of "Opens soon"
    cap          optional: most teams that can take part. Teams after that go on the waitlist
    placeholder  true while the event is invented. Shows a "Placeholder" tag. Delete the line when real
    team         [smallest, largest] team size. [1, 1] makes it a SOLO event: no team name, no team size,
                 and the form reads "Register" and "Your details". [2, 4] means teams of 2 to 4
    hours        how long the event runs, as a number (1.5 means an hour and a half), or text
                 like "3 to 4 hours" or "All through the fest"
    day          which day it happens, like "Saturday 14 November". "TBC" until it is fixed
    venue        where on campus. "TBC" until it is fixed
    prizes       list of prize amounts in AED for 1st, 2nd, 3rd, like [3000, 2000, 1500].
                 Leave it empty ([]) until the prizes are confirmed, and no prize section is shown
    tags         short topic words, used to suggest similar events on each page
    guidelines   link to the rules document. Empty text shows "Guidelines coming soon"
    line         one short sentence under the event name
    blurb        two or three sentences about the event, shown on the About tab
    prelim       what the online round is, if there is one. Empty text means there is no online round
    final        what happens at the event itself
    bring        what people should bring, or what is provided

  Events that are not open yet only need slug, name, scene, hosts, open, hours, tags and guidelines.
  Clubs: add a club by giving it an id and a name under "clubs". "short" gives an abbreviation.
*/
window.INARA = {
  "clubs": {
      "music": "Music Club",
      "fine-arts": "Fine Arts Club",
      "quizzing": "Quizzing Club",
      "drama": "Drama Club",
      "dadc": "Digital Arts and Design Club",
      "majlis": "The Majlis",
      "coding": "Coding Club"
  },
  "short": {"dadc": "DADC"},
  "events": [
    {"slug": "melomachia", "name": "Melomachia", "scene": "pulse", "hosts": ["music"], "open": true, "team": [4, 5], "cap": 5, "hours": 2, "day": "TBC", "venue": "Auditorium", "prizes": [], "tags": ["music", "performance", "battle"], "guidelines": "", "line": "Bands go head to head on the Auditorium stage.", "blurb": "A music battle for bands of 4 to 5. Five bands take the Auditorium stage, and the Music Club will share the rules and judging soon.", "prelim": "", "final": "Each band performs its set on the Auditorium stage.", "bring": "Instruments from the music room are available on stage."},
    {"slug": "music-hot-seat", "name": "Music Club Hot Seat", "scene": "screen", "hosts": ["music"], "open": true, "team": [1, 1], "hours": 3, "day": "TBC", "venue": "Classroom", "prizes": [], "tags": ["music", "quiz"], "guidelines": "", "line": "One player, one seat, all music.", "blurb": "A solo music challenge from the Music Club, one player at a time in the hot seat. The Music Club will share the format soon.", "prelim": "", "final": "Players take turns in the hot seat.", "bring": "Just yourself."},
    {"slug": "brush-off", "name": "Brush Off Brush Competition", "scene": "dawn", "hosts": ["fine-arts"], "open": true, "team": [1, 3], "hours": 3, "day": "TBC", "venue": "Promenade", "prizes": [], "tags": ["art", "painting"], "guidelines": "", "line": "Paint it out on the Promenade.", "blurb": "A painting competition on the Promenade, solo or in teams of up to 3. The Fine Arts Club will share the theme and rules soon.", "prelim": "", "final": "Teams paint on the Promenade within the time limit.", "bring": ""},
    {"slug": "genesis", "name": "GENesis", "scene": "pulse", "hosts": ["quizzing"], "open": true, "team": [4, 4], "hours": "3 to 4 hours", "day": "TBC", "venue": "Auditorium", "prizes": [], "tags": ["quiz", "general knowledge"], "guidelines": "", "line": "A General Knowledge Quiz.", "blurb": "A general knowledge quiz for teams of 4. Six teams make it to the stage in the Auditorium.", "prelim": "", "final": "Six teams quiz it out on the Auditorium stage.", "bring": "Just your team."},
    {"slug": "are-you-not-entertained", "name": "Are You Not Entertained?", "scene": "lanterns", "hosts": ["quizzing", "music"], "open": true, "team": [4, 4], "hours": "3 to 4 hours", "day": "TBC", "venue": "Auditorium", "prizes": [], "tags": ["quiz", "music"], "guidelines": "", "line": "A quiz on music and entertainment.", "blurb": "The Quizzing Club and the Music Club team up for a quiz for teams of 4. Six teams make it to the stage in the Auditorium.", "prelim": "", "final": "Six teams quiz it out on the Auditorium stage.", "bring": "Just your team."},
    {"slug": "error-404", "name": "Error 404! (Not Jeopardy!)", "scene": "screen", "hosts": ["quizzing", "coding"], "open": true, "team": [4, 4], "hours": "3 to 4 hours", "day": "TBC", "venue": "Auditorium", "prizes": [], "tags": ["quiz", "coding"], "guidelines": "", "line": "A quiz board where the answers compile.", "blurb": "The Quizzing Club and the Coding Club run a board quiz on tech and code for teams of 4. Six teams make it to the stage in the Auditorium.", "prelim": "", "final": "Six teams quiz it out on the Auditorium stage.", "bring": "Just your team."},
    {"slug": "riwayaat", "name": "Riwayaat (روايات)", "scene": "lanterns", "hosts": ["drama"], "open": false, "entry": "free", "hours": 2, "day": "TBC", "venue": "Auditorium", "tags": ["theatre", "performance"], "guidelines": "", "line": "Stories Beyond the Curtain. An evening of theatre by the Drama Club.", "blurb": "The Drama Club's own production, staged in the Auditorium. Come and watch, no registration needed."},
    {"slug": "music-stalls", "name": "Music Stalls", "scene": "pulse", "hosts": ["music"], "open": false, "entry": "free", "hours": "All through the fest", "day": "TBC", "venue": "Stalls outside", "tags": ["music", "stall"], "guidelines": "", "line": "Blind Listening, Finish the Lyrics and Karaoke Scorer.", "blurb": "Guess the song, finish the lyrics or chase a karaoke score at the Music Club stalls. Drop by any time during the fest."},
    {"slug": "pipe-cleaner-workshop", "name": "Pipe Cleaner Workshop", "scene": "dawn", "hosts": ["fine-arts"], "open": false, "entry": "free", "hours": "All through the fest", "day": "TBC", "venue": "Stalls outside", "tags": ["art", "workshop", "stall"], "guidelines": "", "line": "Make something small with your hands.", "blurb": "Twist pipe cleaners into something of your own at the Fine Arts Club stall. Drop by any time during the fest."},
    {"slug": "face-painting", "name": "Face Painting", "scene": "dawn", "hosts": ["fine-arts"], "open": false, "entry": "free", "hours": "All through the fest", "day": "TBC", "venue": "Stalls outside", "tags": ["art", "stall"], "guidelines": "", "line": "Get your face painted.", "blurb": "The Fine Arts Club paints faces at its stall. Drop by any time during the fest."},
    {"slug": "wheel-of-fortune", "name": "Wheel of Fortune", "scene": "screen", "hosts": ["quizzing"], "open": false, "entry": "free", "hours": "All through the fest", "day": "TBC", "venue": "Stalls outside", "tags": ["quiz", "stall"], "guidelines": "", "line": "Spin the wheel, answer the question.", "blurb": "Spin the Quizzing Club's wheel and take on whatever it lands on. Drop by any time during the fest."}
  ],
  "universities": [
    {"name": "IIT Delhi Abu Dhabi", "aka": ["iitd", "iitdad", "iit delhi", "iit abu dhabi", "iitd ad"]},
    {"name": "Khalifa University", "aka": ["ku", "khalifa", "kustar"]},
    {"name": "NYU Abu Dhabi", "aka": ["nyuad", "nyu", "new york university abu dhabi"]},
    {"name": "Mohamed bin Zayed University of AI", "aka": ["mbzuai", "mbz"]},
    {"name": "United Arab Emirates University", "aka": ["uaeu", "uae university"]},
    {"name": "Zayed University", "aka": ["zu"]},
    {"name": "Abu Dhabi University", "aka": ["adu"]},
    {"name": "Sorbonne University Abu Dhabi", "aka": ["sorbonne", "suad"]},
    {"name": "Abu Dhabi Polytechnic", "aka": ["adpoly"]},
    {"name": "American University of Sharjah", "aka": ["aus"]},
    {"name": "University of Sharjah", "aka": ["uos", "sharjah university"]},
    {"name": "Ajman University", "aka": ["ajman"]},
    {"name": "American University in Dubai", "aka": ["aud"]},
    {"name": "Canadian University Dubai", "aka": ["cud"]},
    {"name": "BITS Pilani Dubai", "aka": ["bits", "bpdc", "bits dubai"]},
    {"name": "Heriot-Watt University Dubai", "aka": ["hwu", "heriot watt"]},
    {"name": "Manipal Academy of Higher Education Dubai", "aka": ["manipal", "mahe"]},
    {"name": "Middlesex University Dubai", "aka": ["mdx", "middlesex"]},
    {"name": "Rochester Institute of Technology Dubai", "aka": ["rit"]},
    {"name": "University of Birmingham Dubai", "aka": ["birmingham", "uob"]},
    {"name": "University of Wollongong in Dubai", "aka": ["uowd", "wollongong"]},
    {"name": "Amity University Dubai", "aka": ["amity"]},
    {"name": "Higher Colleges of Technology", "aka": ["hct"]}
  ]
};
