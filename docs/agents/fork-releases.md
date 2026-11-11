# Fork Releases

How this fork ships the desktop app it runs every day. Read this before changing anything in the fork delta, before publishing, and every time upstream publishes a release. The rules behind it are in [ADR 0002](../adr/0002-fork-releases.md).

The fork delta is the only code this repository maintains. Upstream `opencode` owns everything else, and upstream's own updater, installers and update service stay upstream's: an install that reads them is an install this fork's changes disappear from.

## Shape

- `plus` is the long-lived branch: the latest upstream release tag plus the fork delta, kept to a handful of logical commits.
- Fork versions are `<upstream>-plus.<n>`, for example `2.2.7-plus.1`. Raise `<n>` for another build on the same upstream base; restart at `.1` after rebasing onto a newer base.
- Every channel in `packages/desktop/electron-builder.config.ts` publishes to `https://github.com/mPandaer/opencode-plus/releases/latest/download/`. Never restore an `opencode.ai` feed.
- The installed app reads `resources/app-update.yml`, which is generated at pack time from that publish configuration.

## Changing the fork delta

1. Work on `plus`, not on a feature branch, and commit in a logical commit that belongs to the delta. A fix needed before its upstream release may be cherry-picked, with the upstream sha in the message; the next rebase drops it.
2. Keep the delta a handful of commits. A new unrelated file is usually a sign it belongs behind a plugin, a flag or upstream instead.
3. Verify before publishing:
   - `bun run check` from the repository root. It runs the whole-repo lint and every package's typecheck.
   - `bun test test/session-create.test.ts` from `packages/server` when the change touches sessions or locations.
   - The e2e keepers that own the area, in built mode, from `packages/app`:
     `PLAYWRIGHT_PORT=4311 bun run test:e2e:built -- e2e/regression/<file>.spec.ts`
     The directory work owns `tabs.spec.ts`, `new-session.spec.ts`, `session-location-sync.spec.ts`, `home.spec.ts`, and the interface-mode cases in `settings.spec.ts`.

## Publishing

From `packages/desktop` on Windows, with `gh` authenticated:

```powershell
$env:OPENCODE_VERSION = "2.2.7-plus.2"
bun run release:plus --no-upload   # build, pack, validate; uploads nothing
bun run release:plus               # the same, then creates the GitHub release
```

`bun run release:plus` runs `script/release-plus.ts`, which:

- builds both halves with `OPENCODE_CHANNEL=latest`, never `prod`. The desktop's `resolveChannel` maps `latest` to its prod configuration, but a CLI only names its background service `service.json` and its database `opencode.db` for the standard channels (`latest`, `dev`, `beta`, `next`). A `prod` CLI registers `service-prod.json`, which the desktop never probes, so the app waits on its loading screen forever;
- builds the CLI for `windows-x64-baseline` (the package the desktop bundles for x64) and the desktop app for `windows-x64`;
- packs the unpacked app, then wraps that copy in the assisted NSIS installer;
- rejects any version that does not match `^\d+\.\d+\.\d+-plus\.\d+$`;
- rejects a `latest.yml` whose `version:` is not the requested one, or a missing installer;
- copies `latest.yml` and `opencode-desktop-win-x64.exe` to `dist/desktop` and uploads both to a `gh release create --latest` release tagged `v<version>`.

It takes about fifteen minutes, because the CLI build dominates. `dist/desktop/app` does not survive the installer pass; the packaged app lives in `packages/desktop/dist/win-unpacked` until the next clean, and the installer and `latest.yml` stay in `packages/desktop/dist`.

Why the version shape matters: electron-updater compares semver and the desktop updater allows downgrades, so a plain upstream version in the feed sorts above the fork's prerelease and would be offered to every install. Never publish `2.2.8`; publish `2.2.8-plus.1`.

What's New maps `<upstream>-plus.<n>` back to `<upstream>` before matching upstream's changelog, so a fork build shows what the upstream release it is based on changed. A second build on the same base shows nothing.

After publishing, check the feed answers:

```
https://github.com/mPandaer/opencode-plus/releases/latest/download/latest.yml
```

An installed app polls it every ten minutes, and "Check for Updates…" reads it on demand. A machine still on an upstream build must install one fork installer by hand once; nothing in the app can rewrite its own `app-update.yml`.

If a release is wrong, publish a higher `-plus.<n>` with the fix. Do not delete the release and do not reuse the version: installed clients have already cached that `latest.yml`.

## Rebasing onto an upstream release

```powershell
git fetch --no-tags upstream "refs/tags/v2.2.*:refs/tags/v2.2.*"
git rebase --onto v2.2.8 v2.2.7
```

`--onto` is required. Each upstream tag is a release commit of its own, not an ancestor of the next one, so a plain `git rebase v2.2.8` also replays `release: v2.2.7` and conflicts in every `package.json`, `CHANGELOG.md` and `bun.lock`.

Then:

1. Resolve conflicts in favour of upstream when upstream solved the same problem differently. Example: 2.2.7 replaced the client's boot retries with asynchronous plugin loading and deleted `syncWhileBooting`, so that fork wrapper was dropped rather than re-ported.
2. Keep the fork's behaviour where upstream has no equivalent, but re-read the surrounding code: upstream restructures files between releases, and a clean textual merge can still be a semantic conflict.
3. `bun install`, then `bun install --frozen-lockfile`. A textual lockfile merge is not trustworthy.
4. `bun run check`, the server session test, and the e2e keepers listed above.
5. Publish the first build on that base as `<new upstream>-plus.1`.

Expect the surface to be small but not empty: 2.2.6 to 2.2.7 changed 995 files upstream and overlapped the fork delta in 15 of them, with one real conflict.

## Tests the fork owns

The delta owns its keepers, so keep them on observable behaviour. An assertion about how many times the client retries an endpoint is upstream's policy, not the fork's contract; when upstream changes it, relax the count and keep what the user sees. State the reason in a comment.

## First-time setup on a machine

- `git remote add upstream https://github.com/anomalyco/opencode.git`
- `gh auth status` must succeed before publishing.
- Installing the fork build once replaces an upstream `app-update.yml`. Until then, the installed app's own updater still points at upstream.
