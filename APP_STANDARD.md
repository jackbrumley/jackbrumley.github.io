# App Standard

How every desktop app is built: Voquill, Rusty G6, SomeDrive, Yambuck, RawTap
and anything new. It sits beside the
[Release and Update Standard](RELEASE_STANDARD.md), which covers releases,
installers, in-app updates, app identity and the tray/app shell. Together they
are the core reference: a new app starts from both, and each app's `AGENTS.md`
links here and lists only its own variations.

Voquill is the reference implementation unless a section names a better one.
When an app and this document disagree, fix whichever is wrong so they agree.

Stack assumed: Tauri 2, Rust backend, Preact + TypeScript + Vite frontend.

**Terminal apps** (RawTap: Rust and ratatui, no webview) follow every section
that doesn't need a window: sections 3 and 5, the Debug items of sections 4
and 6 (in the app's own menu), 7 without the frontend checks, and 8. Sections
1 and 2, the modal and toast rules, and the typecheck and lint commands don't
apply. The panic hook restores the terminal before it logs.

---

## 1. Window

- **Custom title bar.** `decorations: false`, with a title bar component that
  has `data-tauri-drag-region`, minimise / maximise-restore / close buttons
  (each with an `aria-label`), and a maximise icon that swaps to "restore"
  while maximised. Double-clicking the title bar toggles maximise.
  Minimise and close go through the App Shell commands
  (`minimize_to_tray_or_taskbar`, `close_main_window`; Release Standard §11).
- **Corner resize handles.** An undecorated window has no native resize
  border, so each corner gets a large grab area:
  - an overlay (`position: absolute; inset: 0; pointer-events: none;`
    z-index above content) holding four 36×36 px corner elements with
    `pointer-events: auto`, `user-select: none`, `touch-action: none`,
    transparent background and a `clip-path` triangle so only the outer half
    of each square grabs;
  - cursors `nwse-resize` (top-left, bottom-right) and `nesw-resize`;
  - `onMouseDown`: act only when `event.buttons === 1` and the window is not
    maximised, then `preventDefault()`, `stopPropagation()` and
    `getCurrentWindow().startResizeDragging('NorthWest' | 'NorthEast' |
    'SouthWest' | 'SouthEast')`, logging any failure;
  - permission `core:window:allow-start-resize-dragging`.
  Reference: SomeDrive `src/components/shell/AppShell.tsx`,
  `src/styles/shell.css`, `src/hooks/useWindowControls.ts`.
- **Minimum size.** The main window sets `minWidth`/`minHeight` so the layout
  can't collapse.
- **Capabilities in one place:** `src-tauri/capabilities/main.json`, no inline
  `app.security.capabilities` and no unused capability files.

## 2. Linux Start-up Environment

At the very start of `main()`, before Tauri, GTK or any portal call
(Voquill `src-tauri/src/platform/linux/wayland/env.rs`):
- set the GTK prgname / application name (Release Standard §10);
- `WEBKIT_DISABLE_DMABUF_RENDERER=1` and `WEBKIT_DISABLE_GPU_SANDBOX=1`, which
  prevent WebKitGTK's blank window / `EGL_BAD_PARAMETER` crash on Arch-based
  distros (CachyOS, Manjaro) and some NVIDIA setups;
- `GDK_BACKEND=wayland` only when the session is Wayland
  (`XDG_SESSION_TYPE=wayland`) **and** `WAYLAND_DISPLAY` is set, and never when
  the user already set `GDK_BACKEND` (otherwise GTK fails to start where no
  Wayland display is reachable).
- An app that launches other programs (Yambuck) restores the variables it
  overrode for those child processes.

## 3. Logging and Crashes

- One session log: `<config>/debug/session.log`, where `<config>` is the app's
  config folder (section 5). At start-up the previous run's log is renamed to
  `last-session.log`, so the run before a crash or restart is never lost.
- Header on every session: app name and version, build profile, executable
  path, OS / distro, architecture, desktop and session type (Wayland/X11).
- Timestamps are RFC 3339 local time with milliseconds and offset, e.g.
  `2026-11-03T19:55:39.123+11:00`.
- Line format: `[<timestamp>] LEVEL: message`, e.g.
  `[2026-11-03T19:55:39.123+11:00] INFO: SESSION START`.
- Levels via the `log` crate; the level is configurable in Settings → Debug.
- **Panic hook:** installed first thing; writes the panic message, location
  and thread to the session log before the default hook runs.
- The update log (`debug/update.log`, Release Standard §6–7) sits beside it.
- Paths have one owner: a `paths.rs` module returns the config, debug and data
  directories; nothing else calls `dirs::` directly.

## 4. Diagnostics UI

Settings → Debug has one **Logs** block, the same in every app:
- **Copy log** (session log to clipboard), **Open log**, **Open log folder**;
- **System info**: app version, OS / distro, architecture, desktop and session
  type, with a copy button;
- the log level selector.
Backend commands: `copy_session_log`, `open_session_log`, `open_log_folder`,
`get_system_info`. Bug reports ask for "Copy log" + "System info".

## 5. Settings Storage

- **One folder on every platform:** `~/.config/<app>/`, on Linux, Windows and
  macOS alike (Windows: `%USERPROFILE%\.config\<app>\`; never `%APPDATA%`, so
  nothing large roams with an enterprise profile). Linux honours
  `XDG_CONFIG_HOME` (`dirs::config_dir()`); Windows and macOS use
  `dirs::home_dir().join(".config")` (Voquill `src-tauri/src/paths.rs`).
  Everything the app writes lives under it: settings, state, logs.
- **Folder name** is `<app>`, the lowercase binary name, never the app ID, so
  it survives an ID change. Before choosing a name, check that no other
  well-known app uses `~/.config/<name>`; if one does, use `<app>-app`.
  Current exception: Voquill uses `voquill-app`, because an unrelated app is
  also called Voquill.
- **Settings file:** `settings.json`, owned by one module. Other state goes
  in its own named files beside it (e.g. `state.json`).
- **Atomic writes:** write to a temp file in the same directory, `fsync`,
  then rename over the original. A crash mid-save can never leave a truncated
  file.
- **Unparseable file:** rename it to `<file>.invalid-<timestamp>`, log a
  warning, start with defaults and tell the user once.
- **Unreadable file** (permissions, I/O): show a native error dialog naming the
  path and exit, rather than silently overwriting it.
- New fields have serde defaults; renamed fields are handled by one
  `migrate_legacy_fields` step.
- A moved folder or renamed file is migrated once at start-up, before the
  session log opens: rename (copy as a fallback), log it, and never overwrite
  a newer copy.

## 6. Settings Layout and Shared UI

- Settings sections, in order: **General**, **Updates** (current version, Check
  for Updates, last checked), app-specific sections, **Debug** (Logs, UI Lab,
  developer options).
- **Modals:** `role="dialog"`, `aria-modal="true"`, labelled by their heading,
  close on Escape, initial focus inside the dialog, focus returned on close.
- **Toasts:** info/success ~3 s, errors ~10 s, paused while hovered; every
  toast is also logged.
- Icon-only buttons always have an `aria-label`. Respect
  `prefers-reduced-motion`.

## 7. Continuous Integration

`.github/workflows/ci.yml` on every push and pull request to `dev` and `main`,
on each platform the app ships (Voquill: `ci.yml` + `.github/actions/setup-build`),
using `actions/checkout@v7`, `actions/setup-node@v7` and
`actions/upload-artifact@v7`:
- `npm run typecheck`, `npm run lint`, `npm run check:structure`;
- `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`,
  `cargo test`;
- `bash -n` on every shell installer;
- the frontend build.
Zero warnings: dead code is deleted, not silenced; a necessary `#[allow]`
carries a comment saying why.

## 8. Repository Conventions

- **AGENTS.md** (with `CLAUDE.md` containing `@AGENTS.md`): a shared core —
  no AI attribution, philosophy (integrity over expediency, fail loudly, no
  shims), the pre-submit checklist below, file size budget, common pitfalls —
  then the app's own architecture, platform notes and Variations from both
  standards. Never document commands that don't exist.
- **Identity module:** the `APP_ID` constant (Release Standard §10) lives in
  `src-tauri/src/app/identity.rs` (Yambuck: `support/identity.rs`, its own
  layout), with its unit test.
- **Pre-submit checklist** (run before every commit, all must pass with zero
  warnings): `npm run typecheck`, `npm run lint`, `npm run check:structure`,
  `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`,
  `cargo test`.
- **ESLint:** `eslint.config.js` with typescript-eslint recommended
  (Voquill's), run as `npm run lint`.
- **File size budget:** 600 lines soft, 1000 hard, enforced by
  `scripts/check-file-lines.mjs` (`npm run check:structure`, SomeDrive's
  script) with a short, commented allowlist for files being split.
- **`.gitattributes`:** `* text=auto eol=lf` (a CRLF `install.sh` breaks
  installs).
- `temp/`, `release-artifacts/`, build output and local reference folders are
  git-ignored; nothing scratch is committed.
- Toolchains pinned in `.node-version` and `rust-toolchain.toml`.
- Plans and known bugs live in `docs/TODO.md` with **Now / Next / Ideas**
  sections.
- Commits are Conventional Commits; work happens on `dev` (Release
  Standard §3).
