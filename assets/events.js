/*
  INARA 2026: THE EVENT LIST. This is the only file the cultural secretaries need to edit.
  After editing, run  python3 build.py  in the inara folder. It makes one page per event.

  Events, clubs, team sizes, durations and venues come from the cultural clubs' sheet (2 Nov 2026).
  Days, times and booked venues come from the Schedule tab of the Student Activities Week list (3 Nov 2026).
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
    open         true when people can register now, false shows "Registrations will open soon" and no form
    entry        "free" for shows, stalls and workshops anyone can walk into: no registration, the
                 page shows "Free to attend" instead of "Opens soon"
    cap          optional: most teams that can take part. Teams after that go on the waitlist
    placeholder  true while the event is invented. Shows a "Placeholder" tag. Delete the line when real
    team         [smallest, largest] team size. [1, 1] makes it a SOLO event: no team name, no team size,
                 and the form reads "Register" and "Your details". [2, 4] means teams of 2 to 4
    hours        how long the event runs, as a number (1.5 means an hour and a half), or text
                 like "3 to 4 hours" or "All through the fest"
    day          which day it happens, written exactly as one of the "days" below, like "Saturday 14 November".
                 "TBC" until it is fixed
    time         optional: [start, end] in 24-hour UAE time, like ["18:00", "20:00"] for 6 to 8 PM.
                 With a day and a time the event appears on the schedule page in its slot. Stalls that run
                 all fest leave it out and keep "hours": "All through the fest"
    venue        where on campus. "TBC" until it is fixed
    prizes       list of prize amounts in AED for 1st, 2nd, 3rd, like [3000, 2000, 1500].
                 Leave it empty ([]) until the prizes are confirmed, and no prize section is shown
    tags         short topic words, used to suggest similar events on each page
    guidelines   the rules document: a full web address, or a PDF put in the rulebooks folder, written as
                 "rulebooks/error-404.pdf". Empty text shows "Guidelines will be released soon"
                 (shows and stalls with "entry": "free" show no guidelines button at all)
    line         one short sentence under the event name
    blurb        two or three sentences about the event, shown on the About tab
    prelim       what the online round is, if there is one. Empty text means there is no online round
    final        what happens at the event itself
    bring        what people should bring, or what is provided

  Events that are not open yet only need slug, name, scene, hosts, open, hours, tags and guidelines.
  Clubs: add a club by giving it an id and a name under "clubs". "short" gives an abbreviation.
  Days: the fest days in order. The schedule page (/schedule/) shows one section per day.
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
  "days": [
    {"name": "Friday 13 November", "date": "2026-11-13"},
    {"name": "Saturday 14 November", "date": "2026-11-14"},
    {"name": "Sunday 15 November", "date": "2026-11-15"}
  ],
  "events": [
    {"slug": "melomachia", "name": "Melomachia", "scene": "pulse", "hosts": ["music"], "open": false, "team": [4, 5], "cap": 5, "hours": 2, "day": "Saturday 14 November", "time": ["18:00", "20:00"], "venue": "Al Dhowaher Auditorium", "prizes": [], "tags": ["music", "performance", "battle"], "guidelines": "", "line": "An inter-university Battle of the Bands.", "blurb": "Melomachia, hosted by the IITDAD Music Club, is an inter-university Battle of the Bands. After an opening set from IITDAD’s musicians, competing bands perform and are judged on skill, coordination, stage presence, vocals and arrangement.", "prelim": "", "final": "Each band performs its set on the Auditorium stage.", "bring": "Instruments from the music room are available on stage."},
    {"slug": "crescendo", "name": "Crescendo", "scene": "screen", "hosts": ["music"], "open": false, "team": [1, 1], "hours": 3, "day": "Sunday 15 November", "time": ["14:00", "17:00"], "venue": "Al Dhowaher Auditorium", "prizes": [], "tags": ["music", "quiz"], "guidelines": "", "line": "A high-stakes music quiz.", "blurb": "Crescendo is a high-stakes music quiz hosted by the IITDAD Music Club. Contestants compete in a fastest-finger qualifier to win the hot seat, then climb a prize ladder of song questions. A wrong answer means spinning a penalty wheel of music challenges to survive.", "prelim": "", "final": "A fastest-finger qualifier, then a prize ladder of song questions.", "bring": "Just yourself."},
    {"slug": "brush-off", "name": "Brush Off Brush Competition", "scene": "dawn", "hosts": ["fine-arts"], "open": false, "team": [1, 2], "hours": 3, "day": "Saturday 14 November", "time": ["14:00", "17:00"], "venue": "Promenade", "prizes": [], "tags": ["art", "painting"], "guidelines": "", "line": "A hands-only painting competition.", "blurb": "Brush Off Brush is a hands-only painting competition at IIT Delhi-Abu Dhabi, where brushes, knives, sticks, and palette tools are strictly off-limits. Teams of up to 2 participants will have 3 hours to create an artwork using nothing but their hands, fingers, tissues and acrylic paint. Materials will be provided at the venue, including an A3 size sheet for the artwork.", "prelim": "", "final": "Teams paint with their hands for 3 hours.", "bring": "Materials are provided at the venue, including an A3 sheet."},
    {"slug": "genesis", "name": "GENesis", "scene": "pulse", "hosts": ["quizzing"], "open": true, "team": [4, 4], "hours": "3 to 4 hours", "day": "Saturday 14 November", "time": ["10:00", "14:00"], "venue": "Al Maria Auditorium", "prizes": [], "tags": ["quiz", "general knowledge"], "guidelines": "", "line": "A General Knowledge Quiz.", "blurb": "GENesis is a general knowledge quiz that tests both what you know and how you think, spanning science and technology, history, geography, sport, business, current affairs, but also test your critical thinking and reasoning. Teams start with a fast-paced, timed round where quicker answers earn more points, then move on to a mix of formats including Connect, logic puzzles and Closest Wins. Bring your team, your sharpest minds and your best guesses!", "prelim": "", "final": "Six teams quiz it out on the Auditorium stage.", "bring": "Just your team."},
    {"slug": "error-404", "name": "Error 404! (Not Jeopardy!)", "scene": "screen", "hosts": ["quizzing", "coding"], "open": true, "team": [4, 4], "hours": "3 to 4 hours", "day": "Friday 13 November", "time": ["15:00", "18:00"], "venue": "Al Maria Auditorium", "prizes": [], "tags": ["quiz", "science", "coding"], "guidelines": "rulebooks/error-404.pdf", "line": "A Jeopardy-inspired buzzer quiz.", "blurb": "Error 404! is a Jeopardy-inspired buzzer quiz covering biology, chemistry, physics, history of science, inventions, and more. Teams race to buzz in first and on widely varying topics with a few hidden surprises in the formats.", "prelim": "", "final": "Six teams quiz it out on the Auditorium stage.", "bring": "Just your team."},
    {"slug": "riwayaat", "name": "Riwayaat (روايات)", "scene": "lanterns", "hosts": ["drama"], "open": false, "entry": "free", "hours": 1, "day": "Sunday 15 November", "time": ["18:00", "19:00"], "venue": "Al Dhowaher Auditorium", "tags": ["theatre", "performance"], "guidelines": "", "line": "Stories Beyond the Curtain.", "blurb": "The first theatrical production by IITD-AD's Drama Club, written and directed by members of the club."},
    {"slug": "film-festival", "name": "Short Film Festival", "scene": "screen", "hosts": ["dadc"], "open": false, "entry": "free", "hours": 3, "day": "Sunday 15 November", "time": ["19:00", "22:00"], "venue": "Al Dhowaher Auditorium", "tags": ["film", "screening", "performance"], "guidelines": "", "line": "This year's theme is Gravity.", "blurb": "The second edition of DADC's Short Film Festival open to undergraduate students. The theme for this year is Gravity: Some things are drawn together. Some are held in place. Some drift for a long time before they finally fall. It isn't always something you can see, but it's always there, quietly shaping where things end up. Film submissions have closed. Come and watch the screening."},
    {"slug": "music-stalls", "name": "Music Stalls", "scene": "pulse", "hosts": ["music"], "open": false, "entry": "free", "hours": "All through the fest", "day": "TBC", "venue": "Stalls outside", "tags": ["music", "stall"], "guidelines": "", "line": "Blind Listening, Finish the Lyrics and Karaoke Scorer.", "blurb": "Guess the song, finish the lyrics or chase a karaoke score at the Music Club stalls. Drop by any time during the fest."},
    {"slug": "pipe-cleaner-workshop", "name": "Pipe Cleaner Workshop", "scene": "dawn", "hosts": ["fine-arts"], "open": false, "entry": "free", "hours": "All through the fest", "day": "TBC", "venue": "Stalls outside", "tags": ["art", "workshop", "stall"], "guidelines": "", "line": "Make something small with your hands.", "blurb": "Twist pipe cleaners into something of your own at the Fine Arts Club stall. Drop by any time during the fest."},
    {"slug": "face-painting", "name": "Face Painting", "scene": "dawn", "hosts": ["fine-arts"], "open": false, "entry": "free", "hours": "All through the fest", "day": "TBC", "venue": "Stalls outside", "tags": ["art", "stall"], "guidelines": "", "line": "Get your face painted.", "blurb": "The Fine Arts Club paints faces at its stall. Drop by any time during the fest."},
    {"slug": "tote-bag-workshop", "name": "Tote Bag Painting Workshop", "scene": "dawn", "hosts": ["majlis"], "open": false, "entry": "free", "hours": "4 hours a day, on two days", "day": "TBC", "venue": "Promenade", "tags": ["art", "workshop", "heritage"], "guidelines": "", "line": "Paint a tote bag of your own and take it home.", "blurb": "The Majlis runs a tote bag painting workshop on the Promenade on two days of the fest. Drop by, paint a bag and take it with you."},
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
