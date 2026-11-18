# Release and Update Standard

One way to release, install and update every app: Voquill, Rusty G6, SomeDrive,
Yambuck and RawTap. Its companion, [`APP_STANDARD.md`](APP_STANDARD.md), covers how
the apps themselves are built. Voquill is the reference implementation; when this document and
Voquill disagree, fix whichever is wrong so they agree again.

Each app's `AGENTS.md` says "follow the Release and Update Standard" and lists
only that app's **Variations** (section 9). Everything else is identical, so a
change made in one app (a bug fix in `install.sh`, a better update dialog) is
copied to the others.

| App | Repo | Install site (`<site>`) | App ID (`<id>`, section 10) | Platforms |
|---|---|---|---|---|
| Voquill | `jackbrumley/voquill` | `https://voquill.org` | `org.voquill.voquill` | Linux, Windows, macOS |
| Rusty G6 | `jackbrumley/rusty-g6` | `https://brumley.info/rusty-g6` | `info.brumley.rustyg6` | Linux, Windows |
| SomeDrive | `jackbrumley/somedrive` | `https://somedrive.org` | `info.brumley.somedrive` | Linux |
| Yambuck | `yambuck/yambuck` | `https://yambuck.com` | `com.yambuck.yambuck` | Linux |
| RawTap | `jackbrumley/rawtap` | `https://brumley.info/rawtap` | `info.brumley.rawtap` | Linux, Windows |
| ComTap | `jackbrumley/comtap` | `https://brumley.info/comtap` | `info.brumley.comtap` | Linux, Windows |
| Lookstow | `jackbrumley/lookstow` | `https://brumley.info/lookstow` | `info.brumley.lookstow` | Linux, Windows |

`<app>` below is the lowercase binary name (`voquill`, `rusty-g6`,
`somedrive`, `yambuck`, `rawtap`); `<APP>` is its environment-variable prefix
(`VOQUILL`, `RUSTY_G6`, `SOMEDRIVE`, `YAMBUCK`, `RAWTAP`). `<config>` is the
app's config folder, `~/.config/<app>` on every platform (App Standard §5;
Voquill: `~/.config/voquill-app`).

---

## 1. Principles

- **GitHub is the only source of truth.** Releases live on GitHub Releases. The
  installers and the in-app updater ask the GitHub API for `releases/latest`.
  There is no hand-maintained update feed to forget.
- **The updater is the installer.** "Update" in the app re-runs the same
  one-line install command a new user runs. One code path, tested on every
  release.
- **Never fail silently.** A failed update relaunches the version that is still
  installed with `--update-failed`, which tells the user and points at the log.
- **Every download is verified** against the SHA-256 `digest` GitHub computes
  for each release asset. No separate checksum files.
- **No AI attribution** in commits, tags, PRs or release notes (no
  `Co-Authored-By:` AI trailers, no "Generated with" footers). GitHub turns them
  into contributors.

## 2. Versions and Names

| Where | Format | Example |
|---|---|---|
| `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` | `X.Y.Z` | `1.8.0` |
| Version bump commit | `chore: bump version to X.Y.Z` | |
| Git tag and GitHub release title | `vX.Y.Z` | `v1.8.0` |
| First line of release notes | `# <Product> vX.Y.Z` | `# Rusty G6 v1.8.0` |
| Asset file names | `<app>-X.Y.Z-<os>-<arch>[-setup].<ext>` | `rusty-g6-1.8.0-linux-x64.deb` |
| Download URL | `https://github.com/<repo>/releases/download/vX.Y.Z/<asset>` | tag has the `v`, file name does not |

- Versions are plain `MAJOR.MINOR.PATCH`: no `-beta.1` suffixes (extra hyphens
  collide with the asset-name separators). The scripts enforce this.
- `<os>` is `linux`, `windows` or `macos`; `<arch>` is `x64` or `arm64`.
- Standard asset set (an app ships the subset for its platforms):

  | Asset | Purpose |
  |---|---|
  | `<app>-X.Y.Z-linux-x64.deb` | Debian, Ubuntu, Mint (system install) |
  | `<app>-X.Y.Z-linux-x64.rpm` | Fedora, RHEL (system install) |
  | `<app>-X.Y.Z-linux-x64.AppImage` | Any distro (user install, `~/.local/bin`) |
  | `<app>-X.Y.Z-windows-x64-setup.exe` | Windows per-user install (no admin) |
  | `<app>-X.Y.Z-windows-x64.msi` | Windows system-wide install (admin) |
  | `<app>-X.Y.Z-macos-arm64.zip` | macOS app bundle |

- Asset names, the expected-asset list and download links come **only** from
  `scripts/release-assets.mjs`. Never type or rename them by hand.

## 3. Branches

- Development happens on `dev`. Releases are tagged on `dev`.
- `main` only moves by promotion (fast-forward to the release tag), so `main`
  always equals the latest published release (plus any site-only updates,
  below). Never commit to `main` directly.
- GitHub Pages serves the install site from `main:/docs`, so promotion is also
  what deploys installer changes. An installer change can't reach users before
  the release it was tested with.
- **Site-only update:** when every commit between `main` and `dev` only touches
  site pages under `docs/` or Markdown documentation (`AGENTS.md`, `README.md`),
  not the installers nor any file the app or its updater reads, `main` may fast-forward to `dev` without a release
  (`git push origin dev:main`), when the maintainer asks. Check with
  `git diff --name-only origin/main origin/dev` first. Anything else waits for
  the next release.
- **Keep `main` an ancestor of `dev`.** Any commit made on `main` (a site-only
  update, or an edit in GitHub's web editor such as `FUNDING.yml`) is merged
  into `dev` straight away. Otherwise promotion can't fast-forward.
  `release:promote` fetches `main` and refuses before publishing anything if
  `main` has commits the tag lacks, listing them; it never marks a release
  latest and then fails to move `main`.

## 4. Repository Layout (identical in every app)

```
.node-version                         pinned Node version
rust-toolchain.toml                   pinned Rust version
.github/workflows/release.yml         tag push -> pre-release, build, verify, install test
scripts/release-assets.mjs            REPOSITORY, VERSION, TAG, ASSET_NAMES, EXPECTED_ASSETS, DOWNLOAD_LINKS
scripts/prepare-release.mjs           npm run release:prepare -- X.Y.Z
scripts/release-notes-template.mjs    npm run --silent release:notes
scripts/build-linux-release.mjs       npm run release:linux (podman, Ubuntu 22.04 container)
scripts/package-release.mjs           names build outputs into release-artifacts/
scripts/verify-release.mjs            npm run release:verify
scripts/promote-release.mjs           npm run release:promote
scripts/test-in-app-update.mjs        install test: runs the installed build's real update path
src-tauri/packaging/linux/Containerfile
src-tauri/packaging/linux/build-in-container.sh
docs/RELEASE.md                       this app's copy of the procedure (section 5)
docs/index.html                       install page with the Linux / Windows / macOS command picker
docs/install.sh  docs/uninstall.sh    Linux (and macOS hand-off where shipped)
docs/install.ps1 docs/install-system.ps1 docs/uninstall.ps1    Windows (where shipped)
docs/update.sh  docs/update.ps1      the in-app updater's procedure (section 7)
```

`package.json` scripts: `release:linux`, `release:prepare`, `release:notes`,
`release:verify`, `release:promote`.

## 5. Release Procedure

```bash
# on dev
npm run release:prepare -- X.Y.Z     # bumps the 3 version files + lockfiles, commits, tags vX.Y.Z
git push origin dev vX.Y.Z           # starts the Release workflow
```

The **Release** workflow:
1. **Prepare**: checks the tag matches `tauri.conf.json`, creates a
   **pre-release** with the notes skeleton.
2. **Build**: one job per platform. Linux builds inside the pinned Ubuntu 22.04
   container (glibc 2.35 floor) via `npm run release:linux`; Windows and macOS
   build on GitHub runners. Each job runs `package-release.mjs` and uploads to
   the pre-release (`--clobber`, so re-runs are safe).
3. **Verify**: fails unless the release carries exactly `EXPECTED_ASSETS`, each
   with a digest.
4. **Install test**: installs the pre-release with the installer scripts from
   the tag (`--version vX.Y.Z --yes --no-relaunch`), every install mode, and
   checks `<binary> --version` prints the version.

A pre-release is invisible to `releases/latest`, so nobody is offered it yet.

Then:
```bash
npm run --silent release:notes > release-notes.md   # fill every TODO
gh release edit vX.Y.Z --notes-file release-notes.md
npm run release:promote     # only when the maintainer asks
```

`release:promote` refuses while assets are missing or notes contain `TODO`,
then marks the release latest and fast-forwards `main` to the tag. From that
moment installers and in-app updaters serve the new version.

Release notes: `# <Product> vX.Y.Z`, one summary paragraph, themed `###`
sections of `- Label: sentence` bullets separated by `---`, then the generated
Downloads block (never edited). Written for users, not developers.

Failed build: nothing was promoted, so nobody received it. Fix on `dev`, then
`gh release delete vX.Y.Z --cleanup-tag --yes && git tag -d vX.Y.Z`, re-tag and
push. Dry run of all builds: `gh workflow run release.yml --ref dev`.

## 6. Installer Contract

### Commands shown on the install page

| Platform | Variant | Command |
|---|---|---|
| Linux | System Install (default) | `curl --proto '=https' --tlsv1.2 -sSf <site>/install.sh \| bash` |
| Linux | AppImage | `curl --proto '=https' --tlsv1.2 -sSf <site>/install.sh \| bash -s -- --appimage` |
| Linux | Uninstall | `curl --proto '=https' --tlsv1.2 -sSf <site>/uninstall.sh \| bash` |
| Windows | User Install (default) | `irm <site>/install.ps1 \| iex` |
| Windows | System Wide | `irm <site>/install-system.ps1 \| iex` (Administrator) |
| Windows | Uninstall | `irm <site>/uninstall.ps1 \| iex` |

The install page (`docs/index.html`) has the platform picker (detects the
visitor's OS), variant buttons, a hint ("Open **Terminal** and run:"), the
command with a copy button, and a manual-download link to
`releases/latest`.

Older Windows 10 PCs fail on the Windows commands before any script runs:
their Windows PowerShell offers only TLS 1.0 by default, and GitHub refuses it
("Could not create SSL/TLS secure channel"). The shared install widget
(`shared/v1/install-widget.js`) adds a line under every Windows `irm` command
whose button copies it with TLS 1.2 turned on first
(`[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; irm … | iex`).
Pages need no change for it.

### `install.sh` options (same names in every app)

| Option | Meaning |
|---|---|
| *(none)* | System install via `apt`/`dnf` when available and root can be obtained; otherwise AppImage |
| `--system` | Force system install (fail if impossible) |
| `--appimage` | User install to `~/.local/bin/<app>` with a desktop launcher |
| `--version vX.Y.Z` | Install a specific release instead of latest |
| `--yes` | No confirmation prompt (automatic when stdin isn't a terminal) |
| `--no-relaunch` | Don't start the app afterwards (default: start it) |
| `--relaunch` | Start the app afterwards even when `<APP>_NO_RELAUNCH` is set |
| `--insecure-skip-verify` | Skip checksum verification |
| `-h`, `--help` | Usage |

`install.ps1` mirrors them: `-System`, `-Version`, `-NoRelaunch`,
`-InsecureSkipVerify`; `install-system.ps1` sets `<APP>_SYSTEM=1` and runs
`install.ps1`.

### Behaviour every installer must have

- Resolve the release tag from `https://api.github.com/repos/<repo>/releases/latest`
  unless `--version` is given. `<APP>_GITHUB_TOKEN`, if set, is sent as a
  bearer token (shared IPs and CI hit the 60/hour anonymous limit).
- Build the asset name exactly as in section 2 and download it from the
  release.
- Verify against the asset's `digest` from
  `releases/tags/<tag>`; fail on mismatch or missing digest unless
  `--insecure-skip-verify`.
- Stop the running app, remove any install of the *other* mode that would
  shadow this one (a user AppImage shadowing a system package), install, then
  refresh desktop/icon/KDE menu caches.
- **Never stop the process the installer runs under.** The in-app updater
  runs the installer as a descendant of the app, and an AppImage's runtime is
  a process with the app's name. `pkill -x <app>` closes it too (RawTap 0.13.0
  before the fix: the terminal came back to a prompt mid-update). List
  `pgrep -x <app>`, drop the installer's own ancestors (walk `$$` up through
  `/proc/<pid>/stat`, reading the parent PID after the last `)`, because the
  name can contain spaces), and stop the rest.
- **Windows: ignore PowerShell 7's module folders.** Windows PowerShell
  started from PowerShell 7, or from a program started there, inherits
  PowerShell 7's `PSModulePath`, loads its modules, and fails on
  `Get-FileHash` ("is not recognized"). At the top of `install.ps1`, when
  `$PSVersionTable.PSEdition` is not `Core`, drop every `PSModulePath` entry
  matching `\PowerShell\` (Windows PowerShell's own folders are named
  `WindowsPowerShell`). Older app versions run `install.ps1` directly, so
  this fix reaches them too (RawTap 0.12.1 and earlier failed to update from
  a PowerShell 7 terminal).
- **Windows: turn on TLS 1.2 before the first download.** Every `.ps1` the
  site serves (`install.ps1`, `install-system.ps1`, `uninstall.ps1` and any
  other wrapper) starts with
  `[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12`.
  The setting lasts only for the PowerShell session, so the copy a script
  starts as administrator (UAC) would otherwise fail on its own downloads on
  older Windows 10 PCs, even after the page's older-Windows command (ComTap
  1.3.0 and earlier).
- **One root call per install.** Piped through `curl | bash` (and from the
  in-app updater) there is no terminal on stdin, so root goes through
  `pkexec`, which remembers nothing: every separate root command is another
  password prompt. Put all of an install's root work in one
  `run_as_root bash -c '…'` (RawTap: the package install plus the
  serial-port group change).
- Before installing a `.deb`, run `apt-get update` (a warning, not a failure,
  if it fails) in that same root call: a stale package list makes apt fail
  with exit code 100 on the package's dependencies. Make the download folder
  readable (`chmod 0755` on the `mktemp -d` folder) so apt's `_apt` sandbox
  user can read the `.deb`.
- Log every line to `<config>/debug/update.log` (Windows:
  `%USERPROFILE%\.config\<app>\debug\update.log`) as well as the terminal.
- Exit non-zero on any failure. Never prompt when piped (`curl | bash`).
- Relaunch the app at the end unless `--no-relaunch` or `<APP>_NO_RELAUNCH=1`.
- Re-running is always safe: it is how updates work.
- **Windows: remove only this app.** When `install.ps1` or `uninstall.ps1`
  looks for installed copies in the registry's `Uninstall` keys, match the
  app's own exact `DisplayName` (`-eq "<productName>"`), never a wildcard and
  never the publisher alone: every app shares the publisher "Jack Brumley",
  and a publisher match uninstalls the other apps too.

## 7. In-App Update Contract

### The website owns the update, not the app

An app can only be fixed by installing a new version of it, so any bug in its
update code strands every user on that version until they reinstall by hand
(Voquill 1.11.2 and earlier on Windows: Update Now closed the app and did
nothing, for months). The rule is therefore:

- **The app does as little as possible:** start one hidden process that
  downloads `<site>/update.sh` or `<site>/update.ps1` and runs it. Everything
  else (logging, which installer and options, relaunching on failure,
  workarounds for old versions) lives in that script, so a fix reaches every
  installed version on its next update, with no release.
- **The app never closes into nothing:** the script's first output line is
  `[<app>-update] started`. The app exits only after it sees that line in the
  update log. If the process exits or 30 s pass without it, the app stays
  open, says the updater could not start, and offers the download page.
- **The release proves it works:** the install test runs the installed
  build's real update path on every platform (below), so a build with a
  broken updater never gets published.

### Backend (`src-tauri/src/app/commands/update.rs`)

- `check_for_updates() -> UpdateCheckResult` (camelCase JSON):
  `{ currentVersion, latestVersion, updateAvailable, releaseUrl, notesUrl }`.
  Reads `releases/latest` from the GitHub API with
  `User-Agent: <app>-update-checker`; compares plain `X.Y.Z` versions.
- `install_update()`: calls `start_updater()`, then exits the app. On error
  it returns the message and the app stays open.
- `start_updater()`: empties `<config>/debug/update.log`, starts the launcher
  below with stdout/stderr appended to it, then polls the log every 250 ms
  for the started line. Started: return `Ok`. Exited or 30 s without it: kill
  the process, copy the update log into the session log, return the user
  message "The updater could not start, so nothing was changed. Download the
  new version from the release page instead."
- The launcher, the only update code in the app:
  - Linux/macOS: `bash -c 'curl --proto '\''=https'\'' --tlsv1.2 -fsSL --retry 3 --connect-timeout 10 "$1/update.sh" | bash -s -- --base-url "$1" --relaunch "$2"' <app>-update <base-url> <relaunch>`
    under `setsid`. The URL and path are positional arguments, never shell
    code. A failed download pipes an empty script, so no started line.
  - AppImage: remove every environment entry under `$APPDIR` from the
    launcher's environment (drop a variable left empty; keep `APPIMAGE`).
    The AppImage runtime points `LD_LIBRARY_PATH` and other search paths
    into its bundle, and the system `curl` then loads a bundled library and
    dies ("symbol lookup error"), so the updater never starts (Voquill
    1.11.4 and earlier).
  - Windows: `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command`
    with TLS 1.2 enabled, then
    `$updater = Invoke-RestMethod -Uri '<base-url>/update.ps1' -ErrorAction Stop`
    and `& ([scriptblock]::Create($updater)) -BaseUrl '<base-url>' -Relaunch '<relaunch>'`
    (values single-quoted, embedded quotes doubled). Creation flags
    `CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP`. **Never `DETACHED_PROCESS`:**
    Windows PowerShell started with no console exits at once without running
    a line. Remove `PSModulePath` from its environment, so Windows PowerShell
    builds its own (see "Windows: ignore PowerShell 7's module folders"
    above; an inherited one breaks `Get-FileHash`).
  - `<relaunch>` is the `$APPIMAGE` path when set, otherwise the current
    executable. `<base-url>` is `<site>` (e.g. `https://voquill.org`).
- `<APP>_UPDATE_BASE_URL` replaces `<base-url>`; it must be `https://` (fail
  otherwise). Only the install test uses it.
- `--update` (hidden CLI flag): runs `start_updater()` without showing the
  window and exits 0 once the script started, 1 if it never did. The install
  test drives the real update path through it.
- `--update-failed` (hidden CLI flag, parsed with `clap`) shows a warning
  dialog: "<Product> could not install the update, so this version is still
  installed", with **Open Update Log** / **Close**.
- `--version` (clap's built-in) prints the version; the release install test
  depends on it.
- Unit tests: PowerShell quoting of the relaunch path; removing `$APPDIR`
  entries from the environment; the base URL default
  and the https-only override; and that `docs/update.ps1` and
  `docs/update.sh` print the started line before anything else
  (`include_str!` the scripts, so the contract cannot drift).

### Update scripts (`docs/update.sh`, `docs/update.ps1`)

Every shipped version runs the current copy, so their interface is a
contract: document it at the top of each script and change it only
compatibly (new optional parameters are fine; renaming or removing one is
not).
- Parameters: `--base-url` / `-BaseUrl` (where the script came from, no
  trailing slash) and `--relaunch` / `-Relaunch`. Ignore unknown arguments.
- First line: `[<app>-update] started`, before anything that can fail.
- Linux/macOS: before installing, wait up to 15 s for the app that started
  the update to exit (walk `$PPID` up with `ps -o comm=` / `ps -o ppid=` to
  the first process named `<app>`, then poll `kill -0`). The app is the
  script's ancestor, so the installer will not stop it, and installing over
  a running app can fail.
- Download `<base-url>/install.sh` or `install.ps1` to a temporary file and
  run it from the file (PowerShell: its `exit 1` then sets
  `$global:LASTEXITCODE`; reset that to 0 first and read it with `$global:`,
  because the script block has its own scope). Pass `--yes` on Linux/macOS
  and `--appimage` when `$APPIMAGE` is set or `<relaunch>` is under
  `~/.local/bin`.
- Last line: `[<app>-update] finished: updated` (exit 0) or
  `[<app>-update] finished: failed` (exit 1). On failure, wait up to 15 s for
  the old app to exit (`Wait-Process`, or a `pgrep -x` loop) so the single
  instance guard does not hand the relaunch to the exiting copy, then start
  `<relaunch> --update-failed`.
- Keep `install.sh` / `install.ps1` working for the old way too: versions
  from before this pattern download and run them directly.

### Install test

The last step of the release workflow's install test, on every platform:
`node scripts/test-in-app-update.mjs <installed binary>` with
`<APP>_UPDATE_BASE_URL=https://raw.githubusercontent.com/<repo>/<tag>/docs`
(the tag's own scripts) and `<APP>_NO_RELAUNCH=1` (Linux under
`dbus-run-session -- xvfb-run -a`, AppImage with
`APPIMAGE_EXTRACT_AND_RUN=1`). It runs `<binary> --update`, requires exit 0
and the started line, then waits up to 10 minutes for
`finished: updated`. It updates the build to the latest published release,
so it runs last.

### Terminal apps (RawTap)

The same contract, adapted to an app that runs inside a terminal, which a
detached process can't relaunch into:
- `rawtap update`, Ctrl+U and the menu's **Update now** leave the TUI,
  restore the terminal and start the same launcher as the GUI apps, so the
  procedure stays on the website. No started-line wait is needed, because
  the output is on screen.
  - Linux: RawTap replaces itself (`exec`) with
    `bash -c` that downloads `update.sh` into a variable and runs it with
    `exec bash -c "$updater"`, in the foreground of the same terminal (stdin
    stays the terminal, so `sudo` can ask for a password).
  - Windows: PowerShell runs in a console window of its own
    (`CREATE_NEW_CONSOLE`, so the output is visible) and RawTap exits, so the
    installer can replace the executable.
  - If the script can't be downloaded, the launcher says so on screen and in
    the update log, and starts the installed version with `--update-failed`
    (Windows: and waits for Enter).
- The update script runs the installer with `--yes --no-relaunch`
  (`-NoRelaunch`), prints its finished line, then starts the new version
  itself: in the terminal on `/dev/tty` on Linux, through `conhost.exe` on
  Windows so it gets its own window. It writes its own lines to the update
  log as well as the screen. On failure the installed version starts with
  `--update-failed` and shows the standard warning with the update log's
  path. `RAWTAP_NO_RELAUNCH=1` starts neither.
- `--update` (hidden) runs the launcher without a check; the install test
  uses it. On Linux it exits with the update script's status; on Windows it
  exits 0 once the updater's window is started, and the test then waits for
  the finished line in the update log.
- The AppImage's `AppRun` is a symlink to the binary, so its environment has
  no `$APPDIR` search paths to remove.
- The update check runs in the background at start-up (failures only
  logged); the start screen shows "Update available: A → B" and the menu has
  **Check for Updates** with "Last checked: …".

### Frontend (`useUpdates` hook + update modal)

- Check silently on startup; failures are only logged.
- Settings has **Check for Updates** with "Last checked: …"; a manual check
  that finds nothing shows "You are already on the latest version."
- When an update is available, the modal shows current → latest version with
  **Update Now**, **View Release Notes** (opens `releaseUrl`) and **Later**.
- **Update Now** shows "Starting the updater. <Product> will close, install
  the update and reopen." and calls `install_update`. If it returns an error,
  the modal shows the message in red and replaces **Update Now** and
  **View Release Notes** with **Open Download Page** (opens `releaseUrl`).

## 8. Agent Checklist

- [ ] Version via `npm run release:prepare`; tag `vX.Y.Z`; no suffix.
- [ ] Workflow green: build, verify and install test (including the in-app
      update step) on every platform.
- [ ] Notes from `release:notes`; no `TODO`; Downloads block untouched.
- [ ] Assets come only from the workflow or `package-release.mjs`.
- [ ] `release:promote` only when the maintainer asks.
- [ ] No AI attribution anywhere.

## 9. Variations

Each app documents its variations in its own `AGENTS.md`. Allowed kinds:

- **Platforms shipped** (and therefore the asset subset and which installer
  scripts exist).
- **Package format**: Yambuck ships one tarball
  (`yambuck-X.Y.Z-linux-x64.tar.gz`) installed to `~/.local/bin` or
  `/usr/local/bin` instead of deb/rpm/AppImage. Its `install.sh` keeps the
  standard options that apply (`--system`, `--version`, `--yes`,
  `--no-relaunch`, `--insecure-skip-verify`) and its updater passes
  `--system` when the running binary is under `/usr/local/bin`.
- **Post-install steps**: e.g. Rusty G6 installs a udev rule for the AppImage
  (the deb/rpm install it themselves).
- **Pre-update hook**: work the app must finish before `install_update` exits
  it. SomeDrive must drain or pause in-progress sync and persist its state
  first, so an update never interrupts a transfer.
- **Extra build dependencies** in the Containerfile and CI setup.
- **Extra installer options**: e.g. Voquill's `--clean` (purge cached models
  and data). An option kept only so commands from older shipped updaters keep
  working (e.g. `--channel`) is accepted and ignored, with a comment, and
  removed once no supported install uses it.

## 10. App Identity

Every app has one reverse-DNS **app ID** (`<id>`) used on every surface: the
Tauri `identifier`, the Wayland `app_id` / GTK prgname, the desktop file name,
the metainfo ID and any portal registration. Desktop environments and
xdg-desktop-portal match a running window to its launcher by
`<app_id>.desktop`; when they differ, the taskbar shows a generic icon and
portal features (global shortcuts, background permission) misbehave.

Rules (learned the hard way on Voquill):
- Reverse-DNS on a domain you own, then the app name: the app's own domain
  if it has one at first release (`org.voquill.voquill`,
  `com.yambuck.yambuck`), otherwise `info.brumley.<app>`
  (`info.brumley.rustyg6`, `info.brumley.somedrive`, `info.brumley.rawtap`).
  An app that gets its own domain later keeps its ID.
- Lowercase letters and digits only in each segment: no hyphens (not valid
  in every ID system), no underscores.
- Never ends in `.desktop` (KDE's kglobalacceld treats such names as
  desktop-file launch shortcuts and silently drops portal global shortcuts) or
  `.app` (collides with macOS bundle names; Tauri warns).
- Chosen once and never changed after release, even for consistency.
  Changing it moves the webview data dir (`~/.local/share/<id>`) and the
  Windows install identity, and loses what the system grants per ID, which no
  update can move: macOS Microphone and Accessibility permissions and Linux
  portal approvals such as global shortcuts. A forced rename needs a
  migration and a legacy-cleanup list in the installers.

Implementation (identical in every app, as in Voquill):
- `tauri.conf.json` `identifier` = `<id>`; `productName` = `<app>` (the
  lowercase binary and package name). User-visible names come from the
  window title and the desktop file's `Name=`.
- `APP_ID` constant in Rust equal to `<id>`, with a unit test asserting it
  equals the Tauri `identifier` and that `src-tauri/packaging/<id>.desktop`
  exists. On Linux, call `gtk::glib::set_prgname(Some(APP_ID))` (and
  `set_application_name`) at the very start of `main`, before any GTK or
  portal use, so the Wayland `app_id` is `<id>`.
- The real launcher is `src-tauri/packaging/<id>.desktop` (with
  `StartupWMClass=<id>`), shipped via `bundle.linux.deb.files` /
  `bundle.linux.rpm.files` to `/usr/share/applications/<id>.desktop`.
  Tauri's bundler always generates a desktop file named after
  `productName`; render it from `src-tauri/packaging/bundler-stub.desktop.hbs`
  (`desktopTemplate`) with `Hidden=true` so it never shows as a second
  launcher. The AppImage reuses that template, so
  `bundle.linux.appimage.files` overwrites
  `/usr/share/applications/<app>.desktop` with the real entry, and the build
  checks the AppImage's top-level launcher isn't the hidden stub.
- `install.sh` writes the AppImage user launcher as
  `~/.local/share/applications/<id>.desktop`; `install.sh` and `uninstall.sh`
  remove launchers left by any earlier ID (legacy-cleanup list).
- Config and data directories are named by `<app>` (`~/.config/<app>`), not
  by `<id>`, so they survive an ID change.

## 11. App Shell (tray, close and start-up)

Apps that are meant to keep running in the background (Voquill, Rusty G6,
SomeDrive; not Yambuck, which is opened on demand) share one window and tray
behaviour, implemented as in Voquill's `src-tauri/src/app/tray/`.

**Tray icon**
- Linux: a StatusNotifierItem published with `ksni` (Tauri's libappindicator
  tray reports no clicks), with `id()` = the app ID (section 10). Windows and
  macOS: Tauri's `TrayIconBuilder`.
- Left click opens the main window; right click shows the menu. The menu is
  one ordered list (`TrayMenuItem::ALL`) both backends build from:
  **Open <Product>**, any app-specific items, then **Quit**.
- `is_tray_available()`: Linux checks for the `org.kde.StatusNotifierWatcher`
  bus name (absent on stock GNOME without the AppIndicator extension);
  Windows/macOS always true.

**Closing and minimising**
- Setting `close_to_tray` (default **on**), shown in Settings as "Close to
  tray".
- Every close request (title-bar button, Alt+F4, taskbar "Close window") goes
  through one `close_main_window`: with `close_to_tray` on, the window is
  *parked*; off, the app quits.
- The window's minimise button calls `minimize_to_tray_or_taskbar`, which
  parks the window.
- Parking hides the window when a tray exists, otherwise minimises it to the
  taskbar (so it is never unreachable) and the UI says so once.
- Tray **Quit** and closing with `close_to_tray` off call one `quit()`, which
  exits through `RunEvent::Exit`, where the app releases resources (and runs
  any shutdown work, e.g. SomeDrive draining sync).

**Start-up**
- `tauri-plugin-single-instance`: a second launch (menu, desktop file,
  autostart) hands its arguments to the running instance and exits; the
  running instance shows its window unless that launch passed
  `--start-hidden`.
- `--start-hidden` (clap flag): start without showing the window. Autostart
  registers the app with `--start-hidden`
  (`tauri_plugin_autostart::Builder::new().app_name("<app>").arg("--start-hidden")`).
  If no tray is available, the window is shown anyway so the app stays
  reachable.
- **State before windows.** Mark every window in `tauri.conf.json`
  `"create": false` and build them in the setup hook right after
  `app.manage(...)`
  (`WebviewWindowBuilder::from_config(app.handle(), &config)?.build()?` for
  each `app.config().app.windows`). Tauri otherwise builds config windows
  *before* the setup hook, and a page that loads first calls commands whose
  state is not managed yet ("state not managed for field `state` on command
  `get_config`", seen in Voquill 1.11.2 at start-up).
- Unit tests: menu order (Open first, Quit last), menu id round-trip, and
  `launch_shows_window` for plain, `--start-hidden` and unparsable arguments.
