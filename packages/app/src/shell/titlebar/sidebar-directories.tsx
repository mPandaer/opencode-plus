import { Schema } from "effect"
import { createEffect, createMemo, For, onCleanup, Show, untrack, type Accessor, type JSX } from "solid-js"
import { Key } from "@solid-primitives/keyed"
import { DragDropProvider, PointerSensor } from "@dnd-kit/solid"
import { isSortable, useSortable } from "@dnd-kit/solid/sortable"
import { Accessibility, Feedback, PointerActivationConstraints } from "@dnd-kit/dom"
import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers"
import { arrayMove } from "@/runtime/array-move"
import { createStore } from "solid-js/store"
import { useQuery } from "@tanstack/solid-query"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Menu } from "@opencode/ui/menu"
import { Loader } from "@opencode/ui/loader"
import type { SessionInfo } from "@opencode/client/promise"
import { useLanguage } from "@/runtime/i18n/language"
import { Persistence } from "@/runtime/persistence/schema"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { ServerConnection, useServers } from "@/runtime/server/registry"
import { useServerCtx, type ServerCtx } from "@/runtime/server/runtime"
import { useLayout } from "@/shell/state/layout"
import { ProjectIcon } from "@/shell/layout/project-icon"
import { useTabs, type Tab } from "@/shell/tabs/tabs"
import { createProjectSessionActions } from "@/shell/tabs/project-sessions"
import { pathKey } from "@/workspaces/path-key"
import { ProjectSessionRow } from "./project-session-row"
import { DirectoryAdd } from "./directory-add"
import { createSidebarSessionActivity, mergeSidebarSessions } from "./sidebar-sessions"

const DirectoryState = Persistence.struct({
  directories: Schema.mutable(Schema.Array(Schema.String)),
  directoryOrder: Persistence.optional(Schema.mutable(Schema.Array(Schema.String))),
  projectOrder: Persistence.optional(Schema.mutable(Schema.Array(Schema.String))),
  collapsed: Persistence.optional(Schema.mutable(Schema.Array(Schema.String))),
  collapsedProjects: Persistence.optional(Schema.mutable(Schema.Array(Schema.String))),
  view: Persistence.optional(Schema.Literals(["directories", "projects", "list"])),
})

export function SidebarDirectories(props: {
  currentTab: Tab | undefined
  children: (highlightActive: Accessor<boolean>, onNavigate: () => void) => JSX.Element
  fallback: () => JSX.Element
}) {
  const servers = useServers()
  const layout = useLayout()
  const connection = createMemo(
    () =>
      servers.visible.find(
        (conn) => ServerConnection.key(conn) === (props.currentTab?.server ?? layout.home.selection().server),
      ) ?? servers.visible[0],
  )
  const ctx = useServerCtx(connection)

  return (
    <Show when={ctx()} fallback={props.fallback()}>
      {(current) => (
        <Key each={[current()]} by={(value) => value.sdk.scope}>
          {(value) => (
            <DirectorySidebar ctx={value()} currentTab={props.currentTab} fallback={props.fallback}>
              {props.children}
            </DirectorySidebar>
          )}
        </Key>
      )}
    </Show>
  )
}

function DirectorySidebar(props: {
  ctx: ServerCtx
  currentTab: Tab | undefined
  children: (highlightActive: Accessor<boolean>, onNavigate: () => void) => JSX.Element
  fallback: () => JSX.Element
}) {
  const language = useLanguage()
  const tabs = useTabs()
  const actions = createProjectSessionActions()
  const activity = createSidebarSessionActivity()
  const server = ServerConnection.key(props.ctx.sdk.server)
  const [local, setLocal] = createStore<{ limits: Record<string, number> }>({ limits: {} })
  const [state, setState, , ready] = persisted(
    Persist.serverGlobal(props.ctx.sdk.scope, "sidebar.directories"),
    DirectoryState,
    {
      directories: [],
    },
  )

  // One coherent, location-scoped policy for the server sidebar: its default Location, not the active tab's
  // project config. The server owns channel/env/config precedence; the browser never resolves flags itself.
  const policy = useQuery(() => ({
    queryKey: ["sidebar-directory-policy", props.ctx.sdk.scope],
    queryFn: ({ signal }) => props.ctx.sdk.api.location.get({}, { signal }),
    retry: false,
    staleTime: 30_000,
  }))
  const enabled = () => policy.data?.experimental?.flags?.working_directories === true
  const history = useQuery(() => ({
    queryKey: ["sidebar-directory-history", props.ctx.sdk.scope],
    enabled: enabled() && ready() && state.view !== "list",
    queryFn: async ({ signal }) => {
      const sessions: SessionInfo[] = []
      let cursor: string | undefined
      do {
        const page = await props.ctx.sdk.api.session.list(
          { limit: 500, order: "desc", parentID: null, cursor },
          { signal },
        )
        sessions.push(...page.data)
        cursor = page.cursor?.next ?? undefined
      } while (cursor)
      return sessions
    },
    select: (sessions: SessionInfo[]) => () => sessions,
    retry: false,
    staleTime: 30_000,
  }))
  const sessions = createMemo(() =>
    props.ctx.data.session
      .apply(
        mergeSidebarSessions(history.data?.() ?? [], props.ctx.data.session.list(), (id) => activity.get(server, id)),
        { activity: false },
      )
      .toSorted((a, b) => b.time.updated - a.time.updated),
  )
  const grouped = createMemo(() => Map.groupBy(sessions(), (session) => pathKey(session.location.directory)))
  const directories = createMemo(() =>
    state.directories.toSorted(
      (a, b) => (state.directoryOrder?.indexOf(pathKey(a)) ?? -1) - (state.directoryOrder?.indexOf(pathKey(b)) ?? -1),
    ),
  )
  const projects = createMemo(() => {
    const entries = directories().map((directory) => {
      const session = grouped().get(pathKey(directory))?.[0]
      const project = session ? props.ctx.projects.forSession(session) : props.ctx.projects.forDirectory(directory)
      return { directory, project: project?.vcs === "git" ? project : undefined }
    })
    return Array.from(
      Map.groupBy(entries, (entry) => entry.project?.id ?? pathKey(entry.directory)),
      ([key, entries]) => ({
        key,
        project: entries[0].project,
        name: entries[0].project ? entries[0].project.name || entries[0].project.worktree : entries[0].directory,
        directories: entries.map((entry) => entry.directory),
      }),
    )
  })

  createEffect(() => {
    if (!ready() || !enabled()) return
    const added = state.directories.map(pathKey).filter((key) => !state.directoryOrder?.includes(key))
    if (added.length) untrack(() => setState("directoryOrder", (items) => [...(items ?? []), ...added]))
  })
  createEffect(() => {
    if (!ready() || !enabled()) return
    const added = projects()
      .map((project) => project.key)
      .filter((key) => !state.projectOrder?.includes(key))
    if (added.length) untrack(() => setState("projectOrder", (items) => [...(items ?? []), ...added]))
  })
  const orderedProjects = createMemo(() =>
    projects().toSorted(
      (a, b) => (state.projectOrder?.indexOf(a.key) ?? -1) - (state.projectOrder?.indexOf(b.key) ?? -1),
    ),
  )
  const toggle = (field: "collapsed" | "collapsedProjects", key: string) =>
    setState(field, (items) => (items?.includes(key) ? items.filter((item) => item !== key) : [...(items ?? []), key]))
  const reorderDirectories = (items: string[]) => {
    const keys = items.map(pathKey)
    const selected = new Set<string>(keys)
    const positions = (state.directoryOrder ?? []).filter((key) => selected.has(key))
    setState("directoryOrder", (order) =>
      (order ?? []).map((key) => (selected.has(key) ? keys[positions.indexOf(key)] : key)),
    )
  }

  onCleanup(props.ctx.data.listen(({ details }) => activity.update(server, details)))
  createEffect(() => {
    if (!ready() || !enabled()) return
    const known = new Set(state.directories.map(pathKey))
    const added = sessions().flatMap((session) => {
      const directory = session.location.directory
      if (known.has(pathKey(directory))) return []
      known.add(pathKey(directory))
      return [directory]
    })
    if (added.length) untrack(() => setState("directories", (items) => [...items, ...added]))
  })

  const addDirectory = (directory: string) => {
    if (!state.directories.some((item) => pathKey(item) === pathKey(directory)))
      setState("directories", (items) => [...items, directory])
  }
  const directoryRow = (directory: string, index: Accessor<number>) => (
    <SortableGroup
      id={pathKey(directory)}
      index={index()}
      reorderLabel={language.t("sidebar.directory.reorder", { directory })}
    >
      {(handle) => (
        <>
          <div role="group" aria-label={directory} class="mb-2 flex min-w-0 flex-col gap-[3px]">
            <div class="flex min-w-0 items-center gap-2 rounded-[6px] px-2 py-1 text-13-medium text-v2-text-text-muted">
              {handle}
              <button
                type="button"
                aria-label={language.t("sidebar.directory.fold", { directory })}
                aria-expanded={!state.collapsed?.includes(pathKey(directory))}
                onClick={() => toggle("collapsed", pathKey(directory))}
                class="flex min-w-0 flex-1 items-center gap-2 text-start rounded-[6px] focus-visible:outline focus-visible:outline-1"
              >
                <Icon
                  name="fill-triangle-down"
                  size="small"
                  classList={{ "-rotate-90": state.collapsed?.includes(pathKey(directory)) }}
                />
                <Icon name="folder" size="small" />
                <div class="min-w-0 flex-1" title={directory}>
                  <div class="truncate">
                    {directory.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ?? directory}
                  </div>
                  <div class="truncate font-mono text-11-regular text-v2-text-text-faint">{directory}</div>
                </div>
              </button>
              <IconButton
                icon={<Icon name="plus" />}
                variant="ghost-muted"
                size="small"
                aria-label={language.t("sidebar.directory.new", { directory })}
                onClick={() => void tabs.newDraft({ server, directory, worktree: "main" })}
              />
            </div>
            <Show when={!state.collapsed?.includes(pathKey(directory))}>
              <For
                each={(grouped().get(pathKey(directory)) ?? []).slice(0, local.limits[pathKey(directory)] ?? 5)}
                fallback={
                  <div class="ps-8 py-2 text-12-regular text-v2-text-text-faint">
                    {language.t("sidebar.organize.empty")}
                  </div>
                }
              >
                {(session) => (
                  <ProjectSessionRow
                    server={server}
                    session={session}
                    openTab={tabs.store.some(
                      (tab) => tab.type === "session" && tab.server === server && tab.sessionId === session.id,
                    )}
                    active={
                      props.currentTab?.type === "session" &&
                      props.currentTab.server === server &&
                      props.currentTab.sessionId === session.id
                    }
                    onOpen={() =>
                      actions.openProjectSession(props.ctx.sdk.server, directory, session, { preview: true })
                    }
                  />
                )}
              </For>
              <Show when={(grouped().get(pathKey(directory))?.length ?? 0) > (local.limits[pathKey(directory)] ?? 5)}>
                <Button
                  variant="ghost-muted"
                  size="small"
                  class="ms-[23px] self-start"
                  onClick={() => setLocal("limits", pathKey(directory), (value) => (value ?? 5) + 5)}
                >
                  {language.t("sidebar.organize.showMore")}
                </Button>
              </Show>
            </Show>
          </div>
        </>
      )}
    </SortableGroup>
  )

  return (
    <Show when={enabled() && ready()} fallback={props.fallback()}>
      <div class="flex min-h-0 flex-1 flex-col gap-2">
        <Menu placement="bottom-start">
          <Menu.Trigger
            as={Button}
            variant="ghost-muted"
            size="small"
            aria-label={language.t("sidebar.directory.view")}
          >
            {language.t(
              state.view === "list"
                ? "sidebar.directory.flat"
                : state.view === "projects"
                  ? "sidebar.directory.projects"
                  : "sidebar.directory.directories",
            )}
            <Icon name="fill-triangle-down" size="small" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content>
              <Menu.Item onSelect={() => setState("view", "directories")}>
                {language.t("sidebar.directory.directories")}
              </Menu.Item>
              <Menu.Item onSelect={() => setState("view", "projects")}>
                {language.t("sidebar.directory.projects")}
              </Menu.Item>
              <Menu.Item onSelect={() => setState("view", "list")}>{language.t("sidebar.directory.flat")}</Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu>
        <DirectoryAdd
          ctx={props.ctx}
          onAdd={(directory) => {
            addDirectory(directory)
            setState("view", "directories")
          }}
        />
        <Show
          when={state.view !== "list"}
          fallback={props.children(
            () => true,
            () => undefined,
          )}
        >
          <div data-scrollable class="min-h-0 flex-1 overflow-y-auto">
            <Show when={history.isPending}>
              <Loader />
            </Show>
            <Show when={history.isError}>
              <Button variant="ghost-muted" onClick={() => void history.refetch()}>
                {language.t("common.retry")}
              </Button>
            </Show>
            <Show
              when={state.view === "projects"}
              fallback={
                <SortableList items={directories()} onReorder={reorderDirectories}>
                  {directoryRow}
                </SortableList>
              }
            >
              <SortableList
                items={orderedProjects().map((project) => project.key)}
                onReorder={(keys) => setState("projectOrder", keys)}
              >
                {(key, index) => {
                  const project = () => orderedProjects().find((item) => item.key === key)!
                  return (
                    <SortableGroup
                      id={key}
                      index={index()}
                      reorderLabel={language.t("sidebar.directory.projectReorder", { project: project().name })}
                    >
                      {(handle) => (
                        <>
                          <div
                            role="group"
                            aria-label={language.t("sidebar.directory.projectGroup", { project: project().name })}
                            class="mb-3 min-w-0"
                          >
                            <div class="flex min-w-0 items-center gap-2 px-2 py-1 text-13-medium text-v2-text-text-muted">
                              {handle}
                              <button
                                type="button"
                                aria-label={language.t("sidebar.directory.projectFold", { project: project().name })}
                                aria-expanded={!state.collapsedProjects?.includes(key)}
                                onClick={() => toggle("collapsedProjects", key)}
                                class="flex min-w-0 flex-1 items-center gap-2 text-start rounded-[6px] focus-visible:outline focus-visible:outline-1"
                              >
                                <Icon
                                  name="fill-triangle-down"
                                  size="small"
                                  classList={{ "-rotate-90": state.collapsedProjects?.includes(key) }}
                                />
                                <Show when={project().project} fallback={<Icon name="folder" size="small" />}>
                                  {(value) => <ProjectIcon project={value()} />}
                                </Show>
                                <div
                                  class="min-w-0 flex-1 truncate"
                                  title={project().project?.worktree ?? project().name}
                                >
                                  {project().name}
                                </div>
                              </button>
                              <DirectoryAdd
                                ctx={props.ctx}
                                project={
                                  project().project ?? { name: project().name, worktree: project().name, sandboxes: [] }
                                }
                                onAdd={(directory) => {
                                  addDirectory(directory)
                                  void tabs.newDraft({ server, directory, worktree: "main" })
                                }}
                              />
                            </div>
                            <Show when={!state.collapsedProjects?.includes(key)}>
                              <div class="ms-3 border-s border-v2-border-base ps-1">
                                <SortableList items={project().directories} onReorder={reorderDirectories}>
                                  {directoryRow}
                                </SortableList>
                              </div>
                            </Show>
                          </div>
                        </>
                      )}
                    </SortableGroup>
                  )
                }}
              </SortableList>
            </Show>
            {/* Keep tab shortcuts registered without duplicating session rows in the directory view. */}
            <div class="hidden">
              {props.children(
                () => true,
                () => undefined,
              )}
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}

function SortableList(props: {
  items: string[]
  onReorder: (items: string[]) => void
  children: (item: string, index: Accessor<number>) => JSX.Element
}) {
  return (
    <DragDropProvider
      sensors={[
        PointerSensor.configure({ activationConstraints: [new PointerActivationConstraints.Distance({ value: 4 })] }),
      ]}
      modifiers={[RestrictToVerticalAxis]}
      plugins={(defaults) => [
        ...defaults.filter((plugin) => plugin !== Accessibility),
        Feedback.configure({ dropAnimation: null }),
      ]}
      onDragEnd={(event) => {
        const source = event.operation.source
        if (event.canceled || !isSortable(source) || source.initialIndex === source.index) return
        props.onReorder(arrayMove(props.items, source.initialIndex, source.index))
      }}
    >
      <For each={props.items}>{props.children}</For>
    </DragDropProvider>
  )
}

function SortableGroup(props: {
  id: string
  index: number
  reorderLabel: string
  children: (handle: JSX.Element) => JSX.Element
}) {
  const sortable = useSortable({
    get id() {
      return props.id
    },
    get index() {
      return props.index
    },
  })
  return (
    <div ref={sortable.ref} class="min-w-0">
      {props.children(
        <button
          ref={(element) => {
            sortable.handleRef(element)
            sortable.targetRef(element)
          }}
          type="button"
          aria-label={props.reorderLabel}
          class="shrink-0 cursor-grab rounded-[4px] text-v2-text-text-faint hover:text-v2-text-text-base focus-visible:outline focus-visible:outline-1 active:cursor-grabbing"
        >
          <Icon name="menu" size="small" />
        </button>,
      )}
    </div>
  )
}
