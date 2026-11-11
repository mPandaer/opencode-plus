import {
  batch,
  createEffect,
  createMemo,
  For,
  onCleanup,
  onMount,
  Show,
  untrack,
  type Accessor,
  type JSX,
} from "solid-js"
import { Key } from "@solid-primitives/keyed"
import { DragDropProvider, PointerSensor } from "@dnd-kit/solid"
import { isSortable, useSortable } from "@dnd-kit/solid/sortable"
import { Accessibility, Feedback, PointerActivationConstraints } from "@dnd-kit/dom"
import { CollisionPriority, CollisionType } from "@dnd-kit/abstract"
import { OptimisticSortingPlugin } from "@dnd-kit/dom/sortable"
import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers"
import { arrayMove } from "@/runtime/array-move"
import { createStore } from "solid-js/store"
import { useQuery } from "@tanstack/solid-query"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Menu } from "@opencode/ui/menu"
import { Loader } from "@opencode/ui/loader"
import { TextField } from "@opencode/ui/text-field"
import { MenuScroll } from "@opencode/ui/menu-scroll"
import { isLocationNotFoundError, type SessionInfo } from "@opencode/client/promise"
import { containsDirectory } from "@opencode/util/path"
import { useLanguage } from "@/runtime/i18n/language"
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
import "./sidebar-directories.css"

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
  const [local, setLocal] = createStore({
    search: "",
    searchOpen: false,
    projects: [] as string[],
    directories: [] as string[],
  })
  const state = props.ctx.directories.state
  const setState = props.ctx.directories.set
  const ready = props.ctx.directories.ready

  const history = useQuery(() => ({
    queryKey: ["sidebar-directory-history", props.ctx.sdk.scope],
    enabled: ready(),
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
      Map.groupBy(entries, (entry) => entry.project?.id ?? "local"),
      ([key, entries]) => ({
        key,
        project: entries[0].project,
        name: entries[0].project
          ? entries[0].project.name || entries[0].project.worktree
          : language.t("sidebar.directory.localGroup"),
        directories: entries.map((entry) => entry.directory),
      }),
    )
  })

  const query = createMemo(() => local.search.trim().toLocaleLowerCase())
  const owns = (project: string, directory: string) =>
    (!local.projects.length && !local.directories.length) ||
    local.projects.includes(project) ||
    local.directories.includes(pathKey(directory))
  const matches = (directory: string, project: string, title = "") =>
    !query() || `${directory}\n${project}\n${title}`.toLocaleLowerCase().includes(query())
  const filtered = createMemo(() =>
    projects().flatMap((project) => {
      const directories = project.directories.filter(
        (directory) =>
          owns(project.key, directory) &&
          (matches(directory, project.name) ||
            grouped()
              .get(pathKey(directory))
              ?.some((session) => matches(directory, project.name, session.title))),
      )
      return directories.length ? [{ ...project, directories }] : []
    }),
  )
  const visibleSessions = createMemo(
    () =>
      new Map(
        filtered().flatMap((project) =>
          project.directories.map(
            (directory) =>
              [
                pathKey(directory),
                (grouped().get(pathKey(directory)) ?? []).filter((session) =>
                  matches(directory, project.name, session.title),
                ),
              ] as const,
          ),
        ),
      ),
  )
  const clearFilters = () => setLocal({ search: "", projects: [], directories: [] })
  createEffect(() => {
    const id = props.ctx.directories.revealed()
    if (!id || !ready()) return
    const session = props.ctx.data.session.get(id)
    if (!session) return
    const directory = session.location.directory
    if (!state.directories.some((item) => pathKey(item) === pathKey(directory))) {
      untrack(() => props.ctx.directories.add(directory))
      return
    }
    const project = projects().find((project) =>
      project.directories.some((item) => pathKey(item) === pathKey(directory)),
    )
    if (!project) return
    untrack(() =>
      batch(() => {
        if (!matches(directory, project.name, session.title)) setLocal("search", "")
        if (!owns(project.key, directory)) setLocal({ projects: [], directories: [] })
        setState("collapsed", (items) => (items ?? []).filter((item) => item !== pathKey(directory)))
        props.ctx.directories.revealedDone()
      }),
    )
  })
  createEffect(() => {
    if (!ready()) return
    const added = state.directories.map(pathKey).filter((key) => !state.directoryOrder?.includes(key))
    if (added.length) untrack(() => setState("directoryOrder", (items) => [...(items ?? []), ...added]))
  })
  createEffect(() => {
    if (!ready()) return
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
  const toggle = (key: string) =>
    setState("collapsed", (items) => (items?.includes(key) ? items.filter((item) => item !== key) : [...(items ?? []), key]))
  const reorder = (field: "directoryOrder" | "projectOrder", keys: string[]) => {
    const selected = new Set(keys)
    const positions = (state[field] ?? []).filter((key) => selected.has(key))
    setState(field, (order) => (order ?? []).map((key) => (selected.has(key) ? keys[positions.indexOf(key)] : key)))
  }
  const reorderDirectories = (items: string[]) => reorder("directoryOrder", items.map(pathKey))

  onCleanup(props.ctx.data.listen(({ details }) => activity.update(server, details)))
  createEffect(() => {
    if (!ready()) return
    // Closing is an explicit preference, so historical discovery must never resurrect it.
    const known = new Set([...state.directories, ...(state.closed ?? [])].map(pathKey))
    const added = sessions().flatMap((session) => {
      const directory = session.location.directory
      if (known.has(pathKey(directory))) return []
      known.add(pathKey(directory))
      return [directory]
    })
    // A directory's own ancestors precede it when a server's whole history arrives in one batch, so a child
    // group never appears ahead of the group it belongs to. Unrelated directories keep recency order.
    const ancestors = (directory: string) =>
      added.filter((item) => pathKey(item) !== pathKey(directory) && containsDirectory(item, directory)).length
    const ordered = added.toSorted((a, b) => ancestors(a) - ancestors(b))
    if (ordered.length) untrack(() => setState("directories", (items) => [...items, ...ordered]))
  })

  const addDirectory = props.ctx.directories.add
  const directoryRow = (directory: string, index: Accessor<number>) => {
    const availability = useQuery(() => ({
      queryKey: ["sidebar-directory-availability", props.ctx.sdk.scope, directory],
      queryFn: ({ signal }) => props.ctx.sdk.api.location.get({ location: { directory } }, { signal }),
      retry: false,
      staleTime: 0,
    }))
    return (
      <SortableGroup
        id={pathKey(directory)}
        index={index()}
        reorderLabel={language.t("sidebar.directory.reorder", { directory })}
      >
        {(handle, handleProps, dragState) => (
          <>
            <div role="group" aria-label={directory} class="sidebar-directory flex min-w-0 flex-col gap-[2px]">
              <div
                ref={handleProps}
                class="sidebar-directory-heading flex min-w-0 cursor-grab items-center gap-2 rounded-[6px] px-2 py-1 text-13-medium text-v2-text-text-base active:cursor-grabbing"
                classList={{
                  "bg-v2-overlay-simple-overlay-hover shadow-[inset_0_0_0_1px_var(--v2-border-border-focus)]":
                    dragState.dropTarget(),
                  "opacity-60": dragState.dragSource(),
                }}
              >
                <button
                  type="button"
                  aria-label={language.t("sidebar.directory.fold", { directory })}
                  aria-expanded={!state.collapsed?.includes(pathKey(directory))}
                  onClick={() => toggle(pathKey(directory))}
                  title={directory}
                  class="sidebar-directory-fold flex min-w-0 flex-1 items-center gap-2 text-start rounded-[6px] focus-visible:outline focus-visible:outline-1"
                >
                  <Icon
                    name="chevron-down"
                    size="normal"
                    classList={{ "-rotate-90": state.collapsed?.includes(pathKey(directory)) }}
                  />
                  <Icon name="folder" size="small" />
                  <div class="min-w-0 flex-1" title={directory}>
                    <div class="truncate">
                      {directory.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ?? directory}
                    </div>
                  </div>
                </button>
                <IconButton
                  class="sidebar-directory-new"
                  icon={<Icon name="plus" />}
                  variant="ghost-muted"
                  size="small"
                  aria-label={language.t("sidebar.directory.new", { directory })}
                  disabled={availability.isFetching || isLocationNotFoundError(availability.error)}
                  onClick={async () => {
                    const result = await availability.refetch()
                    if (result.isSuccess) await tabs.newDraft({ server, directory, worktree: "main" })
                  }}
                />
                <Menu placement="bottom-end">
                  <Menu.Trigger
                    as={IconButton}
                    class="sidebar-directory-menu"
                    icon={<Icon name="dot-grid" />}
                    variant="ghost-muted"
                    size="small"
                    aria-label={language.t("sidebar.directory.actions")}
                  />
                  <Menu.Portal>
                    <Menu.Content>
                      <div class="max-w-56 px-2 py-1 text-12-regular text-v2-text-text-muted">
                        {language.t("sidebar.directory.kept")}
                      </div>
                      <Menu.Item onSelect={() => props.ctx.directories.close(directory)}>
                        {language.t("sidebar.directory.close")}
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Portal>
                </Menu>
                {handle}
              </div>
              <Show when={isLocationNotFoundError(availability.error)}>
                <div class="sidebar-directory-error flex items-center gap-2 ps-[42px] text-12-regular text-v2-text-text-muted">
                  <span role="status">{language.t("sidebar.directory.unavailable")}</span>
                  <Button variant="ghost-muted" size="small" onClick={() => void availability.refetch()}>
                    {language.t("common.retry")}
                  </Button>
                </div>
              </Show>
              <Show when={!state.collapsed?.includes(pathKey(directory))}>
                <For each={visibleSessions().get(pathKey(directory)) ?? []}>
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
              </Show>
            </div>
          </>
        )}
      </SortableGroup>
    )
  }

  return (
    <Show when={ready()} fallback={props.fallback()}>
      <div class="sidebar-directories flex min-h-0 flex-1 flex-col gap-1">
        <div class="sidebar-directory-toolbar flex h-7 shrink-0 items-center gap-1 px-1">
          <IconButton
            icon={<Icon name="magnifying-glass" size="small" />}
            variant="ghost-muted"
            size="small"
            aria-label={language.t("sidebar.directory.search")}
            aria-expanded={local.searchOpen}
            onClick={() => setLocal("searchOpen", !local.searchOpen)}
          />
          <Menu placement="bottom-end">
            <Menu.Trigger
              as={IconButton}
              icon={<Icon name="sliders" size="small" />}
              variant="ghost-muted"
              size="small"
              aria-label={language.t("sidebar.directory.filter")}
            />
            <Menu.Portal>
              <Menu.Content>
                <MenuScroll class="max-h-80">
                  <For each={projects()}>
                    {(project) => (
                      <>
                        <Menu.CheckboxItem
                          checked={local.projects.includes(project.key)}
                          closeOnSelect={false}
                          onChange={(checked) =>
                            setLocal("projects", (items) =>
                              checked ? [...items, project.key] : items.filter((item) => item !== project.key),
                            )
                          }
                        >
                          {language.t("sidebar.directory.projectGroup", { project: project.name })}
                        </Menu.CheckboxItem>
                        <For each={project.directories}>
                          {(directory) => (
                            <Menu.CheckboxItem
                              checked={local.directories.includes(pathKey(directory))}
                              closeOnSelect={false}
                              onChange={(checked) =>
                                setLocal("directories", (items) =>
                                  checked
                                    ? [...items, pathKey(directory)]
                                    : items.filter((item) => item !== pathKey(directory)),
                                )
                              }
                            >
                              {language.t("sidebar.directory.filterDirectory", { directory })}
                            </Menu.CheckboxItem>
                          )}
                        </For>
                      </>
                    )}
                  </For>
                </MenuScroll>
              </Menu.Content>
            </Menu.Portal>
          </Menu>
          <span class="flex-1" />
          <DirectoryAdd ctx={props.ctx} onAdd={props.ctx.directories.add} />
        </div>
        <Show when={local.searchOpen}>
          <div
            class="sidebar-directory-search flex items-center gap-1 px-1"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return
              event.preventDefault()
              setLocal({ searchOpen: false, search: "" })
            }}
          >
            <TextField
              type="search"
              label={language.t("sidebar.directory.search")}
              hideLabel
              placeholder={language.t("sidebar.directory.search")}
              value={local.search}
              onChange={(search) => setLocal("search", search)}
            />
          </div>
        </Show>
        <Show when={local.search || local.projects.length || local.directories.length}>
          <Button variant="ghost-muted" size="small" class="mx-1 self-start" onClick={clearFilters}>
            {language.t("sidebar.directory.clearFilters")}
          </Button>
        </Show>
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
            when={directories().length > 0}
            fallback={
              <Show when={!history.isPending}>
                <div class="sidebar-directory-empty flex flex-col items-start gap-2 px-3 py-6 text-12-regular text-v2-text-text-muted">
                  <div class="text-13-medium text-v2-text-text-base">
                    {language.t("sidebar.directory.empty.title")}
                  </div>
                  <div>{language.t("sidebar.directory.empty.description")}</div>
                  <DirectoryAdd ctx={props.ctx} onAdd={props.ctx.directories.add} />
                </div>
              </Show>
            }
          >
            <Show
              when={filtered().length > 0}
              fallback={
                <div class="sidebar-directory-empty flex flex-col items-start gap-2 px-3 py-6 text-12-regular text-v2-text-text-muted">
                  <div class="text-13-medium text-v2-text-text-base">
                    {language.t("sidebar.directory.noMatches.title")}
                  </div>
                  <div>{language.t("sidebar.directory.noMatches.description")}</div>
                  <Button variant="ghost-muted" size="small" onClick={clearFilters}>
                    {language.t("sidebar.directory.clearFilters")}
                  </Button>
                </div>
              }
            >
              <SortableList
                items={orderedProjects()
                  .filter((project) => filtered().some((item) => item.key === project.key))
                  .map((project) => project.key)}
                onReorder={(keys) => reorder("projectOrder", keys)}
              >
                {(key, index) => {
                  const project = () => filtered().find((item) => item.key === key)!
                  return (
                    <SortableGroup
                      id={key}
                      index={index()}
                      reorderLabel={language.t("sidebar.directory.projectReorder", { project: project().name })}
                    >
                      {(handle, handleProps, dragState) => (
                        <div
                          role="group"
                          aria-label={language.t("sidebar.directory.projectGroup", { project: project().name })}
                          class="sidebar-directory-project mb-2 min-w-0"
                        >
                          <div
                            ref={handleProps}
                            class="sidebar-directory-project-title flex min-w-0 cursor-grab items-center gap-2 rounded-[6px] px-2 py-1 text-12-regular text-v2-text-text-muted active:cursor-grabbing"
                            classList={{
                              "bg-v2-overlay-simple-overlay-hover shadow-[inset_0_0_0_1px_var(--v2-border-border-focus)]":
                                dragState.dropTarget(),
                              "opacity-60": dragState.dragSource(),
                            }}
                          >
                            <Show when={project().project} fallback={<Icon name="folder" size="small" />}>
                              {(value) => <ProjectIcon project={value()} />}
                            </Show>
                            <div
                              class="min-w-0 flex-1 truncate"
                              title={project().project?.worktree ?? project().name}
                            >
                              {project().name}
                            </div>
                            <span class="sidebar-directory-project-add">
                              <DirectoryAdd
                                ctx={props.ctx}
                                project={project().project}
                                label={language.t("sidebar.directory.addToProject", { project: project().name })}
                                onAdd={addDirectory}
                              />
                            </span>
                            {handle}
                          </div>
                          <SortableList items={project().directories} onReorder={reorderDirectories}>
                            {directoryRow}
                          </SortableList>
                        </div>
                      )}
                    </SortableGroup>
                  )
                }}
              </SortableList>
            </Show>
          </Show>
          {/* Keep tab shortcuts registered without duplicating session rows in the directory view. */}
          <div class="hidden">
            {props.children(
              () => true,
              () => undefined,
            )}
          </div>
        </div>
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
        const target = event.operation.target
        if (event.canceled || !isSortable(source) || !isSortable(target) || source.id === target.id) return
        props.onReorder(arrayMove(props.items, source.initialIndex, target.index))
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
  children: (
    handle: JSX.Element | undefined,
    handleProps: (element: HTMLElement) => void,
    state: { dropTarget: Accessor<boolean>; dragSource: Accessor<boolean> },
  ) => JSX.Element
}) {
  const sortable = useSortable({
    // Solid owns the group order; optimistic DOM moves would be applied a second time on drop.
    plugins: (defaults) => defaults.filter((plugin) => plugin !== OptimisticSortingPlugin),
    // Collide by pointer, not by the dragged group's shape: that shape spans many rows and would match
    // several groups at once. Outside every band, fall back to the nearest group so a drag that goes a
    // little past the first or last row still lands somewhere instead of losing its target.
    collisionDetector: ({ dragOperation, droppable }) => {
      if (!droppable.shape) return null
      const pointer = dragOperation.position.current
      if (droppable.shape.containsPoint(pointer)) {
        return {
          id: droppable.id,
          value: 1,
          type: CollisionType.PointerIntersection,
          priority: CollisionPriority.High,
        }
      }
      const center = droppable.shape.center
      return {
        id: droppable.id,
        value: 1 / Math.max(Math.hypot(pointer.x - center.x, pointer.y - center.y), 1),
        type: CollisionType.Collision,
        priority: CollisionPriority.Low,
      }
    },
    get id() {
      return props.id
    },
    get index() {
      return props.index
    },
  })
  const handleProps = (element: HTMLElement) => {
    sortable.handleRef(element)
    // The whole group is the drop band, not only its heading row: dragging over any session in another
    // group must target that group, and the heading row alone is too narrow to hit reliably.
    onMount(() => sortable.targetRef(element.parentElement ?? element))
  }
  return (
    <div ref={sortable.ref} class="min-w-0">
      {props.children(
        <button
          type="button"
          aria-label={props.reorderLabel}
          title={props.reorderLabel}
          class="shrink-0 cursor-grab rounded-[4px] p-1 text-v2-text-text-faint hover:text-v2-text-text-base focus-visible:outline focus-visible:outline-1 active:cursor-grabbing"
        >
          <Icon name="menu" size="small" />
        </button>,
        handleProps,
        { dropTarget: sortable.isDropTarget, dragSource: sortable.isDragSource },
      )}
    </div>
  )
}
