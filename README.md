# Checks
`python3 tests/e2e.py` starts a local server, opens the site in headless Chromium and runs about 20 checks:
boot over http and file://, every page reachable, no horizontal overflow (320–1280 px), accessibility (names, ids, labels, contrast in day / night / sunset / high contrast), keyboard use, every interaction, persistence, calm mode, text size, data export and delete, offline mode, print, photo-name fallback, performance sampling.

Setup once: `pip install playwright && playwright install chromium`.
Exit code is 0 only if everything passes.
