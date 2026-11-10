import { For, Match, Switch, createMemo, createUniqueId } from "solid-js"
import { useQuery } from "@tanstack/solid-query"
import { useLanguage } from "@/runtime/i18n/language"
import { useServerCtx } from "@/runtime/server/runtime"
import { type TabLayout, useSettings } from "@/settings/model"
import { SettingsRow } from "@/settings/row"
import { useSettingsSurface } from "@/settings/surface"
import "./interface-mode.css"

const modes = [
  { id: "top", layout: "horizontal" },
  { id: "side", layout: "vertical" },
  { id: "inbox", layout: "inbox" },
  { id: "directories", layout: "directories" },
] as const satisfies { id: string; layout: TabLayout }[]

export function InterfaceModeSetting() {
  const language = useLanguage()
  const settings = useSettings()
  const surface = useSettingsSurface()
  const id = createUniqueId()

  // The fourth mode is only offered when the selected server supports working directories. Reading the
  // selected server's own Location keeps the setting consistent with what the shell can render.
  const ctx = useServerCtx(() => surface.server()?.connection)
  const policy = useQuery(() => ({
    queryKey: ["interface-mode-policy", ctx()?.sdk.scope ?? "none"],
    queryFn: ({ signal }) => ctx()!.sdk.api.location.get({}, { signal }),
    enabled: !!ctx(),
    retry: false,
    staleTime: 30_000,
  }))
  const directoriesAvailable = createMemo(
    () =>
      settings.appearance.tabLayout() === "directories" ||
      (!!ctx() &&
        (policy.isPending || policy.data?.experimental?.flags?.working_directories === true)),
  )
  const availableModes = createMemo(() => modes.filter((mode) => mode.id !== "directories" || directoriesAvailable()))

  return (
    <SettingsRow
      title={language.t("settings.general.row.interfaceMode.title")}
      description={language.t("settings.general.row.interfaceMode.description")}
      align="start"
    >
      <fieldset data-component="interface-mode" data-action="settings-tab-layout">
        <legend class="sr-only">{language.t("settings.general.row.interfaceMode.title")}</legend>
        <For each={availableModes()}>
          {(mode) => (
            <label
              data-slot="interface-mode-option"
              data-checked={settings.appearance.tabLayout() === mode.layout ? "" : undefined}
            >
              <input
                type="radio"
                name={id}
                value={mode.id}
                checked={settings.appearance.tabLayout() === mode.layout}
                onChange={() => settings.appearance.setTabLayout(mode.layout)}
              />
              <span data-slot="interface-mode-sketch" data-mode={mode.id} aria-hidden="true">
                <Switch>
                  <Match when={mode.id === "top"}>
                    <span data-slot="preview-strip">
                      <For each={[0, 1, 2]}>
                        {(index) => <span data-slot="preview-tab" data-active={index === 0 ? "" : undefined} />}
                      </For>
                    </span>
                  </Match>
                  <Match when={mode.id === "side"}>
                    <span data-slot="preview-rail">
                      <For each={[0, 1, 2, 3]}>
                        {(index) => <span data-slot="preview-tab" data-active={index === 0 ? "" : undefined} />}
                      </For>
                    </span>
                  </Match>
                  <Match when={mode.id === "inbox"}>
                    <span data-slot="preview-rail">
                      <For each={inboxRows}>
                        {(status, index) => (
                          <span data-slot="preview-tab" data-active={index() === 0 ? "" : undefined}>
                            <i data-status={status} />
                          </span>
                        )}
                      </For>
                    </span>
                  </Match>
                  <Match when={mode.id === "directories"}>
                    <span data-slot="preview-rail">
                      <For each={directoryRows}>
                        {(kind, index) => (
                          <span
                            data-slot={kind === "directory" ? "preview-directory" : "preview-tab"}
                            data-nested={kind === "session" ? "" : undefined}
                            data-active={index() === 1 ? "" : undefined}
                          />
                        )}
                      </For>
                    </span>
                  </Match>
                </Switch>
                <span data-slot="preview-page">
                  <span data-slot="preview-line" />
                  <span data-slot="preview-line" />
                  <span data-slot="preview-composer" />
                </span>
              </span>
              <span data-slot="interface-mode-name">{language.t(`settings.general.row.interfaceMode.${mode.id}`)}</span>
            </label>
          )}
        </For>
      </fieldset>
    </SettingsRow>
  )
}

// Mirrors the inbox: a session that needs you, then finished work, then sessions still running.
const inboxRows = ["approval", "done", "working", "working"] as const

// Mirrors the directory tree: two directory headings with nested session rows.
const directoryRows = ["directory", "session", "session", "directory", "session"] as const
