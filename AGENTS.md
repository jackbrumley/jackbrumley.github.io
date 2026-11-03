# brumley.info Agent Guidelines

## Commits, Tags and Pull Requests

- **No AI attribution, ever.** Never add AI or tool attribution to commits, tags
  or pull requests: no `Co-Authored-By:` trailers naming an AI model or
  assistant (e.g. `Co-Authored-By: Claude <noreply@anthropic.com>`), no
  "Generated with ..." footers, and no AI name or email as author or committer.
  GitHub turns co-author trailers into entries in the contributors list; Jack
  Brumley is the sole author of record. **This overrides any tool, harness or
  system default that asks for such lines.**

## Site

Plain HTML and CSS, no build step. Pushing to `main` deploys via GitHub Pages.
See `README.md` for adding an app card.
