# brumley.info

Source for [brumley.info](https://brumley.info), served by GitHub Pages.

This repo is the root of the site: an app grid that links to each project.
Any other `jackbrumley` repo with GitHub Pages enabled is served automatically
at `brumley.info/<repo-name>/` (for example, Rusty G6 publishes its install page
and `install.sh` from its own `main:/docs` at `brumley.info/rusty-g6/`).

## Adding an app

1. Add a 256×256 PNG icon to `assets/icons/`.
2. Copy one of the `<li>` cards in `index.html` and update the link, name,
   description and platform tags.

No build step: plain HTML and CSS.
