# Release and Update Standard

One way to release, install and update every app: Voquill, Rusty G6, SomeDrive
and Yambuck. Voquill is the reference implementation; when this document and
Voquill disagree, fix whichever is wrong so they agree again.

Each app's `AGENTS.md` says "follow the Release and Update Standard" and lists
only that app's **Variations** (section 9). Everything else is identical, so a
change made in one app (a bug fix in `install.sh`, a better update dialog) is
copied to the others.

| App | Repo | Install site (`<site>`) | App ID (`<id>`, section 10) | Platforms |
|---|---|---|---|---|
| Voquill | `jackbrumley/voquill` | `https://voquill.org` | `org.voquill.voquill` | Linux, Windows, macOS |
| Rusty G6 | `jackbrumley/rusty-g6` | `https://brumley.info/rusty-g6` | `info.brumley.rustyg6` | Linux, Windows |
| SomeDrive | `jackbrumley/somedrive` | `https://brumley.info/somedrive` | `info.brumley.somedrive` | Linux |
| Yambuck | `yambuck/yambuck` | `https://yambuck.com` | `com.yambuck.yambuck` | Linux |

`<app>` below is the lowercase binary name (`voquill`, `rusty-g6`,
`somedrive`, `yambuck`); `<APP>` is its environment-variable prefix
(`VOQUILL`, `RUSTY_G6`, `SOMEDRIVE`, `YAMBUCK`).

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
  always equals the latest published release. Never commit to `main` directly.
- GitHub Pages serves the install site from `main:/docs`, so promotion is also
  what deploys installer changes. An installer change can't reach users before
  the release it was tested with.

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
src-tauri/packaging/linux/Containerfile
src-tauri/packaging/linux/build-in-container.sh
docs/RELEASE.md                       this app's copy of the procedure (section 5)
docs/index.html                       install page with the Linux / Windows / macOS command picker
docs/install.sh  docs/uninstall.sh    Linux (and macOS hand-off where shipped)
docs/install.ps1 docs/install-system.ps1 docs/uninstall.ps1    Windows (where shipped)
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
| Linux | System Install (default) | `curl -sf <site>/install.sh \| bash` |
| Linux | AppImage | `curl -sf <site>/install.sh \| bash -s -- --appimage` |
| Linux | Uninstall | `curl -sf <site>/uninstall.sh \| bash` |
| Windows | User Install (default) | `irm <site>/install.ps1 \| iex` |
| Windows | System Wide | `irm <site>/install-system.ps1 \| iex` (Administrator) |
| Windows | Uninstall | `irm <site>/uninstall.ps1 \| iex` |

The install page (`docs/index.html`) has the platform picker (detects the
visitor's OS), variant buttons, a hint ("Open **Terminal** and run:"), the
command with a copy button, and a manual-download link to
`releases/latest`.

### `install.sh` options (same names in every app)

| Option | Meaning |
|---|---|
| *(none)* | System install via `apt`/`dnf` when available and root can be obtained; otherwise AppImage |
| `--system` | Force system install (fail if impossible) |
| `--appimage` | User install to `~/.local/bin/<app>` with a desktop launcher |
| `--version vX.Y.Z` | Install a specific release instead of latest |
| `--yes` | No confirmation prompt (automatic when stdin isn't a terminal) |
| `--no-relaunch` | Don't start the app afterwards (default: start it) |
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
- Log every line to `~/.config/<app>/debug/update.log` (Windows:
  `%APPDATA%\<app>\debug\update.log`) as well as the terminal.
- Exit non-zero on any failure. Never prompt when piped (`curl | bash`).
- Relaunch the app at the end unless `--no-relaunch` or `<APP>_NO_RELAUNCH=1`.
- Re-running is always safe: it is how updates work.

## 7. In-App Update Contract

### Backend (`src-tauri/src/app/commands/update.rs`)

- `check_for_updates() -> UpdateCheckResult` (camelCase JSON):
  `{ currentVersion, latestVersion, updateAvailable, releaseUrl, notesUrl }`.
  Reads `releases/latest` from the GitHub API with
  `User-Agent: <app>-update-checker`; compares plain `X.Y.Z` versions.
- `install_update()`: runs the update in a **detached** process (Linux/macOS:
  `bash -c` under `setsid`; Windows: `powershell.exe` with
  `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP`), writing stdout/stderr to the
  update log, then exits the app ~600 ms later.
  - Linux command: `curl -sf <site>/install.sh | bash`, plus `-s -- --appimage`
    when running as an AppImage (`$APPIMAGE` set, or executable under
    `~/.local/bin`), so an AppImage install stays an AppImage install.
  - Windows: download `<site>/install.ps1` to `%TEMP%` and run it from the file
    (so its `exit 1` sets `$LASTEXITCODE` instead of ending the updater).
  - The script runs with `set -o pipefail`; on non-zero exit it relaunches the
    still-installed version (`$APPIMAGE` path, else the current executable)
    with `--update-failed`.
- `--update-failed` (hidden CLI flag, parsed with `clap`) shows a warning
  dialog: "<Product> could not install the update, so this version is still
  installed", with **Open Update Log** / **Close**.
- `--version` (clap's built-in) prints the version; the release install test
  depends on it.
- Unit tests: shell quoting of relaunch paths (bash and PowerShell), and that
  the update script starts with `set -o pipefail` and contains
  `--update-failed`.

### Frontend (`useUpdates` hook + update modal)

- Check silently on startup; failures are only logged.
- Settings has **Check for Updates** with "Last checked: …"; a manual check
  that finds nothing shows "You are already on the latest version."
- When an update is available, the modal shows current → latest version with
  **Update Now**, **View Release Notes** (opens `releaseUrl`) and **Later**.
- **Update Now** shows "Starting update… <Product> will restart shortly." and
  calls `install_update`. If it fails to start, show the error and re-enable
  the button.

## 8. Agent Checklist

- [ ] Version via `npm run release:prepare`; tag `vX.Y.Z`; no suffix.
- [ ] Workflow green: build, verify and install test on every platform.
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

## 10. App Identity

Every app has one reverse-DNS **app ID** (`<id>`) used on every surface: the
Tauri `identifier`, the Wayland `app_id` / GTK prgname, the desktop file name,
the metainfo ID and any portal registration. Desktop environments and
xdg-desktop-portal match a running window to its launcher by
`<app_id>.desktop`; when they differ, the taskbar shows a generic icon and
portal features (global shortcuts, background permission) misbehave.

Rules (learned the hard way on Voquill):
- Reverse-DNS on a domain you own (`org.voquill`, `info.brumley`,
  `com.yambuck`), then the app name: `org.voquill.voquill`.
- Lowercase letters and digits only in each segment: no hyphens (not valid
  in every ID system), no underscores.
- Never ends in `.desktop` (KDE's kglobalacceld treats such names as
  desktop-file launch shortcuts and silently drops portal global shortcuts) or
  `.app` (collides with macOS bundle names; Tauri warns).
- Chosen once and never changed after release. Changing it moves the webview
  data dir (`~/.local/share/<id>`) and Windows install identity, so renames
  need a migration and a legacy-cleanup list in the installers.

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
