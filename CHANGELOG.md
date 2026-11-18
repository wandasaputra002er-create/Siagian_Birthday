# Changelog
## Countdown lock
- Added `js/lock.js` and `css/lock.css`: the site opens only from 3 January 2027 (00:00 WIB), with a live countdown. `sw.js` cache bumped to v7.
## Hardening release
- Content-Security-Policy, no-referrer, noindex (the site is a private gift), robots.txt, `_headers` for Netlify / Cloudflare Pages.
- Safety net: a broken feature shows a small notice instead of breaking the page; `<noscript>` message; fallbacks for browsers without `<dialog>`, Web Audio or localStorage.
- Photo path forgiveness: `natan.jpg` also finds `.jpeg`, `.png`, `.webp`, `.JPG`, `.jpg.jpg`.
- Comfort settings: text size, high contrast, calm mode (less motion), export / delete all saved data.
- Print the letter (clean print stylesheet).
- Secondary text colours now meet WCAG AA contrast in every time of day.
- Automated checks in `tests/` (see `tests/README.md`).
## Earlier
- Pages: home, letter, memories (6 flip frames), surprise (20-tap secret), wish, cake, numbers, open-when, universe map.
- Time-of-day theme, sound engine with mixer, offline support, personal text in `js/content.js`.
