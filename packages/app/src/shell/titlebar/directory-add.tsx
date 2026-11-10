import { For, onCleanup, Show } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Loader } from "@opencode/ui/loader"
import type { Project } from "@/runtime/server/types"
import { isProjectDirectory } from "@/workspaces/paths"
import { Menu } from "@opencode/ui/menu"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitleGroup } from "@opencode/ui/dialog"
import { useDialog } from "@opencode/ui/context/dialog"
import { useLanguage } from "@/runtime/i18n/language"
import type { ServerCtx } from "@/runtime/server/runtime"
import { useDirectoryPicker } from "@/workspaces/selection/picker"
import {
  directoryAddView,
  transitionDirectoryAdd,
  type DirectoryAddEvent,
  type DirectoryAddState,
} from "./directory-add-machine"

export function DirectoryAdd(props: {
  ctx: ServerCtx
  project?: Pick<Project, "name" | "worktree" | "sandboxes">
  onAdd: (directory: string) => void
  /** Overrides the project button's label when the caller only adds a directory, without opening a session. */
  label?: string
}) {
  const language = useLanguage()
  const picker = useDirectoryPicker()
  const dialog = useDialog()
  const pick = (start?: string) =>
    picker({
      server: props.ctx.sdk.server,
      kind: start ? "server" : undefined,
      start,
      location: start ? { directory: start } : undefined,
      title: language.t(props.project ? "sidebar.directory.chooseWorking" : "sidebar.directory.add"),
      onSelect: (result) => {
        const directory = Array.isArray(result) ? result[0] : result
        if (!directory) return
        dialog.show(() => (
          <DirectoryConfirm ctx={props.ctx} directory={directory} project={props.project} onAdd={props.onAdd} />
        ))
      },
    })
  if (props.project)
    return (
      <IconButton
        icon={<Icon name="folder-add-left" />}
        variant="ghost-muted"
        size="small"
        aria-label={
          props.label ??
          language.t("sidebar.directory.projectNew", {
            project: props.project.name || props.project.worktree,
          })
        }
        onClick={() => pick(props.project?.worktree)}
      />
    )
  return (
    <Menu placement="bottom-start">
      <Menu.Trigger
        as={IconButton}
        icon={<Icon name="folder-add-left" />}
        variant="ghost-muted"
        size="small"
        aria-label={language.t("sidebar.directory.add")}
      />
      <Menu.Portal>
        <Menu.Content>
          <Menu.Item onSelect={() => pick()}>{language.t("sidebar.directory.choose")}</Menu.Item>
          <For each={props.ctx.projects.unique()}>
            {(project) => (
              <Menu.Item onSelect={() => pick(project.worktree)}>
                {language.t("sidebar.directory.browse", {
                  project: project.name || project.worktree.replaceAll("\\", "/").split("/").at(-1) || project.worktree,
                })}
              </Menu.Item>
            )}
          </For>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  )
}

export function DirectoryConfirm(props: {
  ctx: ServerCtx
  directory: string
  project?: Pick<Project, "name" | "worktree" | "sandboxes">
  onAdd: (directory: string) => void
}) {
  const language = useLanguage()
  const dialog = useDialog()
  const [state, setState] = createStore<{ value: DirectoryAddState }>({ value: { type: "ready", attempt: 0 } })
  let timer: ReturnType<typeof setTimeout> | undefined
  const dispatch = (event: DirectoryAddEvent) => {
    const next = transitionDirectoryAdd(state.value, event)
    if (next === state.value) return false
    clearTimeout(timer)
    setState("value", reconcile(next))
    return true
  }
  onCleanup(() => dispatch({ type: "disposed" }))
  const view = () => directoryAddView(state.value)
  const outside = () => props.project && !isProjectDirectory(props.project, props.directory)
  const save = () => {
    if (outside() || !dispatch({ type: "save" })) return
    const attempt = state.value.attempt
    timer = setTimeout(() => dispatch({ type: "timed-out", attempt }), 30_000)
    void props.ctx.projects.add(props.directory).then(
      (project) => {
        if (!dispatch({ type: project ? "saved" : "failed", attempt }) || !project) return
        props.onAdd(props.directory)
        dialog.close()
      },
      () => dispatch({ type: "failed", attempt }),
    )
  }
  return (
    <Dialog fit>
      <DialogHeader>
        <DialogTitleGroup
          title={language.t("sidebar.directory.confirm")}
          description={language.t("sidebar.directory.confirmDescription")}
        />
      </DialogHeader>
      <DialogBody class="flex flex-col gap-2 px-4">
        <div class="flex items-center gap-2 rounded-md border border-v2-border-border-base bg-v2-background-bg-base px-3 py-2">
          <Icon name="folder" size="small" class="shrink-0 text-v2-icon-icon-muted" />
          <code class="min-w-0 select-text break-all font-mono text-13-regular text-v2-text-text-base">
            {props.directory}
          </code>
        </div>
        <Show when={outside()}>
          <p role="alert" class="rounded-md bg-v2-state-bg-warning px-3 py-2 text-12-regular text-v2-state-fg-warning">
            {language.t("sidebar.directory.outsideProject")}
          </p>
        </Show>
        <Show when={view().failed}>
          <p role="alert" class="rounded-md bg-v2-state-bg-danger px-3 py-2 text-12-regular text-v2-state-fg-danger">
            {language.t("common.requestFailed")}
          </p>
        </Show>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" disabled={view().saving} onClick={() => dialog.close()}>
          {language.t("common.cancel")}
        </Button>
        <Button
          variant={view().saving ? "loading" : "contrast"}
          disabled={view().saving || !!outside()}
          onClick={() => void save()}
        >
          <Show when={view().saving}>
            <Loader class="size-3.5 shrink-0" />
          </Show>
          {language.t("sidebar.directory.add")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
