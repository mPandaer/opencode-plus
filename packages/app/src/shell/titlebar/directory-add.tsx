import { For, onCleanup, Show } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
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
        icon={<Icon name="plus" />}
        variant="ghost-muted"
        size="small"
        aria-label={language.t("sidebar.directory.projectNew", {
          project: props.project.name || props.project.worktree,
        })}
        onClick={() => pick(props.project?.worktree)}
      />
    )
  return (
    <Menu placement="bottom-start">
      <Menu.Trigger
        as={IconButton}
        icon={<Icon name="plus" />}
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
        <DialogTitleGroup title={language.t("sidebar.directory.confirm")} />
      </DialogHeader>
      <DialogBody>
        <code class="block break-all text-13-regular">{props.directory}</code>
        <Show when={outside()}>
          <p role="alert">{language.t("sidebar.directory.outsideProject")}</p>
        </Show>
        <Show when={view().failed}>
          <p role="alert">{language.t("common.requestFailed")}</p>
        </Show>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" disabled={view().saving} onClick={() => dialog.close()}>
          {language.t("common.cancel")}
        </Button>
        <Button disabled={view().saving || !!outside()} onClick={() => void save()}>
          {language.t(props.project ? "sidebar.directory.create" : "sidebar.directory.add")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
