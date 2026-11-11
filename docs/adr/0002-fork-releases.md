# Fork releases track upstream release tags

Status: accepted

## Context

This repository is a fork that keeps product changes upstream does not have: the Directories interface mode and a Windows installer that lets the user choose the install directory. Its installed desktop app was built with upstream's `publish` configuration, so `resources/app-update.yml` pointed at `https://opencode.ai/update/api/latest/desktop/opencode/`: accepting an update would replace the fork with upstream OpenCode and delete both changes. Only user configuration under `~/.config/opencode` would survive.

Upstream's release infrastructure is closed to forks. `release.yml` and `deploy-update.yml` are gated on `github.repository == 'anomalyco/opencode'`, the update service only accepts that repository's OIDC tokens, and the CLI updater resolves `@opencode/cli` on the public registry.

Upstream `dev` moves fast: the fork's base was 75 commits behind three days after it was cut. Upstream also cuts stable releases every few days, tagged `v<version>`.

Upstreaming the changes is not an option. `CONTRIBUTING.md` requires design review before implementing UI and core product features, asks for small focused pull requests, and the delta is 141 files including server and protocol changes that remove an existing experimental setting.

## Decision

The fork maintains one long-lived branch, `plus`, rebased onto the latest upstream **release tag**. It never tracks `origin/dev`: that rule in `AGENTS.md` applies to changes intended for upstream, and this fork does not upstream. A fix that is needed before its release may be cherry-picked onto `plus` with the upstream commit sha in the message, and is dropped at the next rebase.

The desktop app updates from the fork's own GitHub Releases feed. Every channel in `electron-builder.config.ts` publishes there, the bundled CLI's upstream update check is disabled, and releases are built and published by a local script until that script is stable enough to move into CI.

Fork versions are `<upstream version>-plus.<n>`, for example `2.2.7-plus.1`. The fork feed never serves a plain upstream version: electron-updater compares semver, a release sorts above its own prerelease, and `allowDowngrade` is on, so a stray upstream version in the feed would be offered to every fork install.

What's New matches the upstream changelog by the base version, stripping `-plus.<n>` before comparing. A release that reuses the same upstream base shows no dialog.

## Considered Options

- **Rebase onto `origin/dev`.** Rejected: the delta conflicts with a stream that moved 75 commits in three days, and unreleased upstream behaviour would ship to the daily driver.
- **Disable upstream updates and rebuild by hand.** Rejected as the only mechanism: it leaves the installed app pointed at upstream, one mistaken click away from deleting the fork, and makes every update an unplanned local build.
- **Open a feature request upstream.** Rejected: the directory capability's API already exists upstream, but the interface mode removes an existing experimental setting, and the installer change contradicts a deliberate upstream product decision. Waiting on design review would leave the fork without a working update path.
- **Reuse the upstream version number on the fork feed.** Rejected: one fork build per upstream release, and the version would claim content parity that does not exist.

## Consequences

- Every upstream release requires a rebase. Conflicting hunks are resolved by hand, in the fork, at the moment upstream ships, not continuously.
- The fork is permanently divergent. Its delta is whatever upstream refuses or does not have, and it is the only code that needs maintenance.
- `working_directories` graduates: directory validation becomes unconditional and the flag and its `Location.Info.experimental.flags` payload are removed, so the mode no longer depends on user configuration. See the amendment to [0001](0001-directories-interface-mode.md).
- The desktop installer must keep resolving the install directory from the registry (`HKCU\Software\<appId>\InstallLocation`) for staged updates to follow a user-chosen directory.
- Fork releases carry no code signature, so Windows shows the SmartScreen prompt on first install; electron-updater itself verifies only the `latest.yml` hash.
