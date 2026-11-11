#!/usr/bin/env bun
import { $ } from "bun"
import { cp, mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

// Publishes a fork desktop release to this repository's GitHub Releases, which the app's feed reads.
// See docs/adr/0002-fork-releases.md.
//
//   OPENCODE_VERSION=2.2.7-plus.1 bun run release:plus
//
// Run it from packages/desktop on Windows with `gh` authenticated. It builds the CLI and the app for the
// host target, packs the unpacked app and the NSIS installer, then uploads the installer and latest.yml.
const VERSION = process.env.OPENCODE_VERSION

const CHANNEL = "prod"

const REPOSITORY = "mPandaer/opencode-plus"

if (process.platform !== "win32") throw new Error("release:plus packs the Windows desktop only")

if (!VERSION) throw new Error("Set OPENCODE_VERSION, for example OPENCODE_VERSION=2.2.7-plus.1")

// A feed version that is not a fork release would be offered to every install, and a plain upstream version
// sorts above its own prerelease (electron-updater compares semver and allows downgrades).
if (!/^\d+\.\d+\.\d+-plus\.\d+$/.test(VERSION))
  throw new Error(`OPENCODE_VERSION must look like <upstream>-plus.<n>, got ${VERSION}`)

const dir = path.resolve(import.meta.dir, "..")

const root = path.resolve(dir, "../..")

const cli = path.resolve(root, "packages/cli")

const target = `windows-${process.arch === "arm64" ? "arm64" : "x64"}`

// The desktop bundles the baseline CLI for x64: that is the package its own target resolves to.
const cliTarget = target === "windows-x64" ? "windows-x64-baseline" : target

const env = { OPENCODE_CHANNEL: CHANNEL, OPENCODE_VERSION: VERSION, OPENCODE_TARGET: target }

const run = (cwd: string, command: string[], extra: Record<string, string> = {}) =>
  $`${command}`.cwd(cwd).env({ ...process.env, ...env, ...extra })

console.log(`releasing ${VERSION} (${target})`)

await run(cli, ["bun", "run", "build"], { OPENCODE_TARGET: cliTarget })

await run(dir, ["bun", "run", "build"])

await run(dir, ["bun", "run", "pack"])

// The unpacked app is what the installer wraps, and pack removes both outputs it would otherwise sit beside.
const unpacked = path.join(root, "dist/desktop/app")

const staging = await mkdtemp(path.join(tmpdir(), "opencode-plus-release-"))

try {
  await cp(unpacked, staging, { recursive: true })
  await run(dir, ["bun", "run", "pack"]).env({ ...process.env, ...env, OPENCODE_DESKTOP_APP: staging })
} finally {
  await rm(staging, { recursive: true, force: true })
}

const packed = path.join(dir, "dist")

const installer = `opencode-desktop-win-${process.arch === "arm64" ? "arm64" : "x64"}.exe`

const manifest = path.join(packed, "latest.yml")

if (!(await readdir(packed)).includes(installer)) throw new Error(`Missing ${installer} in ${packed}`)

if (!(await readdir(packed)).includes("latest.yml")) throw new Error(`Missing latest.yml in ${packed}`)

const feed = await Bun.file(manifest).text()

const published = feed.match(/^version:\s*(.+)$/m)?.[1]?.trim()

if (published !== VERSION) throw new Error(`latest.yml publishes ${published ?? "no version"}, expected ${VERSION}`)

await cp(path.join(packed, installer), path.join(root, "dist/desktop", installer))

await cp(manifest, path.join(root, "dist/desktop", "latest.yml"))

if (process.argv.includes("--no-upload")) {
  console.log(`packed ${VERSION}; skipped uploading`)
  process.exit(0)
}

await $`gh release create ${`v${VERSION}`} ${installer} latest.yml
  --repo ${REPOSITORY}
  --title ${`v${VERSION}`}
  --notes ${`Fork desktop release on upstream ${VERSION.replace(/-plus\.\d+$/, "")}.`}
  --latest`.cwd(packed)

console.log(`published ${VERSION} to ${REPOSITORY}`)
