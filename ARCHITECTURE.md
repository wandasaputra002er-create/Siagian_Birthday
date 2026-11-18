# Architecture
Plain HTML, CSS and JavaScript. No build step, no backend.

| File | Role |
|---|---|
| `index.html` | All pages as `<section class="page">`, menu, mixer, overlays |
| `css/style.css` | Base design, pages, components |
| `css/extras.css` | Detail layer: transitions, decoration, accessibility, print |
| `js/content.js` | **All personal text** (frames, notes, secret, reminders, whispers) |
| `js/audio.js` | `window.NatanAudio`: mixer, music, ambience, 26 synthesised effects, event map |
| `js/script.js` | App core: routing, theme, sky canvas, pages, settings. Exposes `window.NatanApp` |
| `js/extras.js` | Per-page decoration and small interactions, built on `NatanApp` |
| `sw.js`, `manifest.webmanifest` | Offline support and install |

## Flow
1. `content.js` defines `window.CONTENT`. `audio.js` defines `window.NatanAudio`.
2. `script.js` builds the app and exposes `NatanApp` (`emit`, `burst`, `onPage`, `reduce`, `dateInfo`).
3. `extras.js` registers a page hook with `NatanApp.onPage` and decorates pages.
4. Sounds are triggered by **events** (`emit('letter.open')`), never by calling a sound directly; `audio.js` maps events to effects.

## Storage (localStorage, keys start with `natan.`)
`theme`, `fs`, `hc`, `calm`, `pets`, `wishes`, `opened`, `read`, `hand`, `best…`, memory edits (`caption.N`, `date.N`, `note.N`), audio levels. The Settings panel can export or delete all of it.

## Safety
CSP limits scripts to the site itself; only Google Fonts is allowed from outside. Wishes never leave the browser. The microphone (cake page) is used only after a button press and nothing is recorded.
