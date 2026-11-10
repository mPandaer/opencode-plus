// Throwaway interactive study for the fourth Directories interface mode.
// Entry: /?prototype=directories&variant=A. All data is local fixture; nothing talks to a server.
import { For, Show, createMemo, onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { Icon } from "@opencode/ui/icon"
import { ProjectIcon } from "@/shell/layout/project-icon"
import {
  badGroups,
  emptyGroups,
  normalGroups,
  type DirectoryFault,
  type PrototypeDirectory,
  type PrototypeGroup,
  type PrototypeSession,
} from "./fixture"
import "./prototype.css"

type VariantKey = "A" | "B" | "C"
type ScenarioKey = "normal" | "bad" | "empty"

const variants = [
  { key: "A", name: "目录优先", detail: "目录是折叠单元，项目退为安静的位置标记。" },
  { key: "B", name: "项目优先", detail: "项目是一级树，目录嵌在项目下，层级更明确。" },
  { key: "C", name: "筛选优先", detail: "筛选和芯片主导，目录变成紧凑的分组标签。" },
] as const

const scenarios = [
  { key: "normal", name: "常规" },
  { key: "bad", name: "坏路径" },
  { key: "empty", name: "空状态" },
] as const

const faultLabel: Record<DirectoryFault, string> = {
  missing: "不存在",
  file: "不是目录",
  denied: "无权限",
  offline: "离线",
}

const faultDetail: Record<DirectoryFault, string> = {
  missing: "目录不存在，历史会话仍然保留",
  file: "这个路径不是目录",
  denied: "没有读取这个目录的权限",
  offline: "磁盘或网络位置当前不可用",
}

interface VariantProps {
  groups: PrototypeGroup[]
  collapsed: string[]
  selected: string
  onToggle(id: string): void
  onSelect(id: string): void
  onNew(directory: PrototypeDirectory): void
  onMenu(directory: PrototypeDirectory): void
}

function SessionRow(props: { session: PrototypeSession; selected: boolean; onSelect(): void }) {
  return (
    <button class="dp-session" data-selected={props.selected ? "" : undefined} onClick={props.onSelect} title={props.session.title}>
      <span class="dp-session-title">{props.session.title}</span>
      <Show when={props.session.status}>
        <span class="dp-status" data-status={props.session.status} aria-label={props.session.status} />
      </Show>
    </button>
  )
}

function RowActions(props: { onNew(): void; onMenu(): void }) {
  return (
    <span class="dp-actions">
      <button
        class="dp-action"
        aria-label="新建会话"
        onClick={(event) => {
          event.stopPropagation()
          props.onNew()
        }}
      >
        <Icon name="plus" size="small" />
      </button>
      <button
        class="dp-action"
        aria-label="更多操作"
        onClick={(event) => {
          event.stopPropagation()
          props.onMenu()
        }}
      >
        <Icon name="outline-dots" size="small" />
      </button>
    </span>
  )
}

function FaultNote(props: { fault: DirectoryFault }) {
  return (
    <div class="dp-fault" title={faultDetail[props.fault]}>
      <Icon name="outline-hexagonal-warning" size="small" />
      <span>{faultLabel[props.fault]}</span>
      <button class="dp-fault-action" aria-label="选择新位置" title="选择新位置">
        <Icon name="folder-add-left" size="small" />
      </button>
    </div>
  )
}

function DirectorySection(props: {
  directory: PrototypeDirectory
  collapsed: boolean
  selected: string
  nested?: boolean
  onToggle(): void
  onSelect(id: string): void
  onNew(): void
  onMenu(): void
}) {
  return (
    <section class="dp-directory" data-nested={props.nested ? "" : undefined} data-fault={props.directory.fault}>
      <div class="dp-dir-heading">
        <button class="dp-dir-fold" aria-expanded={!props.collapsed} onClick={props.onToggle} title={props.directory.path}>
          <Icon name={props.collapsed ? "outline-chevron-right" : "chevron-down"} size="small" class="dp-chevron" />
          <Icon name={props.directory.fault === "file" ? "file-document" : "folder"} size="small" class="dp-folder" />
          <span class="dp-dir-name">{props.directory.name}</span>
        </button>
        <RowActions onNew={props.onNew} onMenu={props.onMenu} />
      </div>
      <Show when={!props.collapsed}>
        <div class="dp-guide">
          <Show when={props.directory.fault}>{(fault) => <FaultNote fault={fault()} />}</Show>
          <For each={props.directory.sessions}>
            {(session) => <SessionRow session={session} selected={props.selected === session.id} onSelect={() => props.onSelect(session.id)} />}
          </For>
        </div>
      </Show>
    </section>
  )
}

function VariantA(props: VariantProps) {
  return (
    <div class="dp-nav dp-tone-quiet">
      <For each={props.groups}>
        {(group) => (
          <section class="dp-group">
            <div class="dp-project-title">
              <Show when={group.project} fallback={<><Icon name="folder" size="small" /><span>本地目录</span></>}>
                {(project) => (
                  <>
                    <ProjectIcon project={project()} fallback={project().name} class="dp-project-title-mark" />
                    <span>{project().name}</span>
                  </>
                )}
              </Show>
              <span class="dp-actions">
                <button
                  class="dp-action"
                  aria-label={group.project ? `在 ${group.project.name} 下添加工作目录` : "添加本地工作目录"}
                  title="添加工作目录"
                >
                  <Icon name="folder-add-left" size="small" />
                </button>
              </span>
            </div>
            <For each={group.directories}>
              {(directory) => (
                <DirectorySection
                  directory={directory}
                  collapsed={props.collapsed.includes(directory.id)}
                  selected={props.selected}
                  onToggle={() => props.onToggle(directory.id)}
                  onSelect={props.onSelect}
                  onNew={() => props.onNew(directory)}
                  onMenu={() => props.onMenu(directory)}
                />
              )}
            </For>
          </section>
        )}
      </For>
    </div>
  )
}

function VariantB(props: VariantProps) {
  return (
    <div class="dp-nav dp-tone-layered">
      <For each={props.groups}>
        {(group) => {
          const key = () => `project:${group.project?.id ?? "local"}`
          return (
            <section class="dp-project">
              <div class="dp-project-heading">
                <button class="dp-project-fold" aria-expanded={!props.collapsed.includes(key())} onClick={() => props.onToggle(key())}>
                  <Icon name={props.collapsed.includes(key()) ? "outline-chevron-right" : "chevron-down"} size="small" class="dp-chevron" />
                  <Show when={group.project} fallback={<Icon name="folder" size="small" />}>
                    {(project) => <ProjectIcon project={project()} fallback={project().name} class="dp-project-mark" />}
                  </Show>
                  <span class="dp-project-name">{group.project?.name ?? "本地目录"}</span>
                </button>
                <span class="dp-actions">
                  <button class="dp-action" aria-label="添加工作目录">
                    <Icon name="folder-add-left" size="small" />
                  </button>
                  <button class="dp-action" aria-label="更多操作">
                    <Icon name="outline-dots" size="small" />
                  </button>
                </span>
              </div>
              <Show when={!props.collapsed.includes(key())}>
                <div class="dp-project-body">
                  <For each={group.directories}>
                    {(directory) => (
                      <DirectorySection
                        directory={directory}
                        nested
                        collapsed={props.collapsed.includes(directory.id)}
                        selected={props.selected}
                        onToggle={() => props.onToggle(directory.id)}
                        onSelect={props.onSelect}
                        onNew={() => props.onNew(directory)}
                        onMenu={() => props.onMenu(directory)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </section>
          )
        }}
      </For>
    </div>
  )
}

function VariantC(props: VariantProps) {
  const flat = createMemo(() =>
    props.groups.flatMap((group) =>
      group.directories.map((directory) => ({ directory, project: group.project })),
    ),
  )
  return (
    <div class="dp-nav dp-tone-dense">
      <For each={flat()}>
        {(item) => (
          <section class="dp-flat-group" data-fault={item.directory.fault}>
            <div class="dp-flat-label">
              <button class="dp-flat-fold" onClick={() => props.onToggle(item.directory.id)} title={item.directory.path}>
                <Icon name={props.collapsed.includes(item.directory.id) ? "outline-chevron-right" : "chevron-down"} size="small" class="dp-chevron" />
                <Icon name={item.directory.fault === "file" ? "file-document" : "folder"} size="small" class="dp-folder" />
                <span class="dp-dir-name">{item.directory.name}</span>
                <Show when={item.project && item.project.name !== item.directory.name}>
                  <span class="dp-flat-tag">{item.project!.name}</span>
                </Show>
              </button>
              <RowActions onNew={() => props.onNew(item.directory)} onMenu={() => props.onMenu(item.directory)} />
            </div>
            <Show when={!props.collapsed.includes(item.directory.id)}>
              <Show when={item.directory.fault}>{(fault) => <FaultNote fault={fault()} />}</Show>
              <For each={item.directory.sessions}>
                {(session) => <SessionRow session={session} selected={props.selected === session.id} onSelect={() => props.onSelect(session.id)} />}
              </For>
            </Show>
          </section>
        )}
      </For>
    </div>
  )
}

export function DirectoriesPrototype() {
  const params = new URLSearchParams(location.search)
  const requested = params.get("variant")?.toUpperCase()
  const initialVariant: VariantKey = requested === "B" || requested === "C" ? requested : "A"
  const [state, setState] = createStore({
    variant: initialVariant,
    scenario: "normal" as ScenarioKey,
    narrow: false,
    search: "",
    searchOpen: false,
    filterOpen: false,
    filters: [] as string[],
    collapsed: [] as string[],
    selected: "ses_1",
  })

  const scenarioGroups = createMemo(() =>
    state.scenario === "bad" ? badGroups : state.scenario === "empty" ? emptyGroups : normalGroups,
  )
  const query = createMemo(() => state.search.trim().toLowerCase())
  const matches = (session: PrototypeSession, directory: PrototypeDirectory, group: PrototypeGroup) =>
    !query() ||
    session.title.toLowerCase().includes(query()) ||
    directory.name.toLowerCase().includes(query()) ||
    (group.project?.name.toLowerCase().includes(query()) ?? false)
  const included = (directory: PrototypeDirectory, group: PrototypeGroup) =>
    state.filters.length === 0 ||
    state.filters.includes(`directory:${directory.id}`) ||
    (group.project ? state.filters.includes(`project:${group.project.id}`) : false)
  const groups = createMemo(() =>
    scenarioGroups()
      .filter((group) => group.project || group.directories.some((directory) => included(directory, group)))
      .map((group) => ({
        ...group,
        directories: group.directories
          .filter((directory) => included(directory, group))
          .map((directory) => {
            if (!query() || directory.name.toLowerCase().includes(query()) || group.project?.name.toLowerCase().includes(query()))
              return directory
            return { ...directory, sessions: directory.sessions.filter((session) => matches(session, directory, group)) }
          })
          .filter((directory) => directory.fault || directory.sessions.length > 0 || !query()),
      }))
      .filter((group) => group.directories.length > 0),
  )
  const totalSessions = createMemo(() => scenarioGroups().reduce((count, group) => count + group.directories.reduce((sum, directory) => sum + directory.sessions.length, 0), 0))
  const selected = createMemo(() => {
    for (const group of scenarioGroups()) {
      for (const directory of group.directories) {
        const session = directory.sessions.find((item) => item.id === state.selected)
        if (session) return { session, directory, group }
      }
    }
    return undefined
  })
  const projects = createMemo(() => scenarioGroups().flatMap((group) => (group.project ? [group.project] : [])))
  const directories = createMemo(() => scenarioGroups().flatMap((group) => group.directories))
  const variant = createMemo(() => variants.find((item) => item.key === state.variant)!)

  const toggle = (id: string) =>
    setState("collapsed", (items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]))
  const toggleFilter = (id: string) =>
    setState("filters", (items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]))
  const reset = () => setState({ scenario: "normal", search: "", searchOpen: false, filterOpen: false, filters: [], collapsed: [], selected: "ses_1" })
  const choose = (key: VariantKey) => {
    setState({ variant: key, filterOpen: false })
    const url = new URL(location.href)
    url.searchParams.set("variant", key)
    history.replaceState(null, "", url)
  }
  const cycle = (step: number) => choose(variants[(variants.findIndex((item) => item.key === state.variant) + step + variants.length) % variants.length].key)
  const keyboard = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      cycle(-1)
    }
    if (event.key === "ArrowRight") {
      event.preventDefault()
      cycle(1)
    }
    if (event.key.toLowerCase() === "n") setState("narrow", !state.narrow)
    if (event.key.toLowerCase() === "f") setState("filterOpen", !state.filterOpen)
  }
  onMount(() => window.addEventListener("keydown", keyboard))
  onCleanup(() => window.removeEventListener("keydown", keyboard))

  const variantProps = (): VariantProps => ({
    groups: groups(),
    collapsed: state.collapsed,
    selected: state.selected,
    onToggle: toggle,
    onSelect: (id) => setState("selected", id),
    onNew: (directory) => setState({ selected: directory.sessions[0]?.id ?? state.selected, searchOpen: false }),
    onMenu: () => setState("filterOpen", false),
  })

  return (
    <div class="dp-study" data-narrow={state.narrow ? "" : undefined}>
      <div class="dp-window">
        <aside class="dp-sidebar">
          <header class="dp-brand">
            <strong>opencode</strong>
            <button class="dp-action" aria-label="折叠侧边栏">
              <Icon name="filetree" size="small" />
            </button>
          </header>
          <div class="dp-toolbar">
            <button class="dp-action" aria-label="主页">
              <Icon name="grid-plus" size="small" />
            </button>
            <span class="dp-spacer" />
            <Show when={state.variant !== "C"}>
              <button class="dp-action" aria-label="搜索" data-active={state.searchOpen ? "" : undefined} onClick={() => setState("searchOpen", !state.searchOpen)}>
                <Icon name="magnifying-glass" size="small" />
              </button>
            </Show>
            <button class="dp-action" aria-label="添加工作目录">
              <Icon name="folder-add-left" size="small" />
            </button>
          </div>
          <Show when={state.variant !== "C"}>
            <Show when={state.searchOpen}>
              <div class="dp-search-row">
                <label class="dp-search">
                  <Icon name="magnifying-glass" size="small" />
                  <input
                    type="search"
                    autofocus
                    placeholder="搜索会话、目录或项目"
                    value={state.search}
                    onInput={(event) => setState("search", event.currentTarget.value)}
                  />
                </label>
                <button class="dp-action" aria-label="筛选" data-active={state.filters.length > 0 ? "" : undefined} onClick={() => setState("filterOpen", !state.filterOpen)}>
                  <Icon name="outline-sliders" size="small" />
                </button>
              </div>
              <Show when={state.filterOpen}>
                <div class="dp-filter-panel">
                  <div class="dp-filter-heading">项目</div>
                  <For each={projects()}>
                    {(project) => (
                      <label class="dp-filter-row">
                        <input type="checkbox" checked={state.filters.includes(`project:${project.id}`)} onChange={() => toggleFilter(`project:${project.id}`)} />
                        <span>{project.name}</span>
                      </label>
                    )}
                  </For>
                  <div class="dp-filter-heading">工作目录</div>
                  <For each={directories()}>
                    {(directory) => (
                      <label class="dp-filter-row">
                        <input type="checkbox" checked={state.filters.includes(`directory:${directory.id}`)} onChange={() => toggleFilter(`directory:${directory.id}`)} />
                        <span>{directory.name}</span>
                      </label>
                    )}
                  </For>
                  <button class="dp-clear" onClick={() => setState("filters", [])}>清除筛选</button>
                </div>
              </Show>
            </Show>
          </Show>
          <Show when={state.variant === "C"}>
            <div class="dp-search-row">
              <label class="dp-search">
                <Icon name="magnifying-glass" size="small" />
                <input type="search" placeholder="搜索会话、目录或项目" value={state.search} onInput={(event) => setState("search", event.currentTarget.value)} />
              </label>
              <button class="dp-action" aria-label="筛选工作目录" data-active={state.filters.length > 0 ? "" : undefined} onClick={() => setState("filterOpen", !state.filterOpen)}>
                <Icon name="outline-sliders" size="small" />
              </button>
            </div>
            <div class="dp-chips">
              <button class="dp-chip" data-active={state.filters.length === 0 ? "" : undefined} onClick={() => setState("filters", [])}>
                全部
              </button>
              <For each={projects()}>
                {(project) => (
                  <button class="dp-chip" data-active={state.filters.includes(`project:${project.id}`) ? "" : undefined} onClick={() => toggleFilter(`project:${project.id}`)}>
                    {project.name}
                  </button>
                )}
              </For>
            </div>
            <Show when={state.filterOpen}>
              <div class="dp-filter-panel">
                <div class="dp-filter-heading">工作目录</div>
                <For each={directories()}>
                  {(directory) => (
                    <label class="dp-filter-row">
                      <input type="checkbox" checked={state.filters.includes(`directory:${directory.id}`)} onChange={() => toggleFilter(`directory:${directory.id}`)} />
                      <span>{directory.name}</span>
                    </label>
                  )}
                </For>
                <button class="dp-clear" onClick={() => setState("filters", [])}>清除筛选</button>
              </div>
            </Show>
          </Show>
          <div class="dp-scroll" data-scrollable>
            <Show
              when={state.scenario !== "empty" && groups().length > 0}
              fallback={
                <EmptyState
                  scenario={state.scenario}
                  filtering={state.filters.length > 0 || !!query()}
                  onAdd={() => setState({ scenario: "normal", filters: [], search: "" })}
                />
              }
            >
              <Show when={state.variant === "A"}>
                <VariantA {...variantProps()} />
              </Show>
              <Show when={state.variant === "B"}>
                <VariantB {...variantProps()} />
              </Show>
              <Show when={state.variant === "C"}>
                <VariantC {...variantProps()} />
              </Show>
            </Show>
          </div>
          <footer class="dp-footer">
            <span>{totalSessions()} 个会话</span>
            <span class="dp-connection" />
          </footer>
        </aside>
        <main class="dp-main">
          <header class="dp-tabbar">
            <span class="dp-tab-title">{selected()?.session.title ?? "主页"}</span>
            <button class="dp-action" aria-label="新建会话">
              <Icon name="plus" size="small" />
            </button>
          </header>
          <div class="dp-session-header">
            <strong>{selected()?.session.title ?? "主页"}</strong>
            <span>{selected()?.directory.name ?? "选择一个工作目录"}</span>
          </div>
          <div class="dp-conversation">
            <div class="dp-user">侧边栏现在看起来还是一堆平铺的会话，我先分不清它们属于哪个模块。</div>
            <div class="dp-assistant">
              <p>目录负责说明「在哪里」，会话负责说明「在做什么」。</p>
              <p>这一版把项目退成位置标记，让目录成为可折叠的一级单元；新建、更多这些操作只在悬停时出现。</p>
            </div>
          </div>
          <div class="dp-composer">
            <span>描述你想完成的任务…</span>
            <button class="dp-send" aria-label="发送">
              <Icon name="outline-arrow-up-right" size="small" />
            </button>
          </div>
        </main>
      </div>
      <div class="dp-review">
        <div class="dp-review-copy">
          <strong>{variant().key} / {variant().name}</strong>
          <span>{variant().detail}</span>
        </div>
        <div class="dp-controls">
          <button aria-label="上一版" onClick={() => cycle(-1)}>←</button>
          <For each={variants}>{(item) => <button data-active={state.variant === item.key ? "" : undefined} onClick={() => choose(item.key)}>{item.key}</button>}</For>
          <button aria-label="下一版" onClick={() => cycle(1)}>→</button>
          <span class="dp-divider" />
          <For each={scenarios}>{(item) => <button data-active={state.scenario === item.key ? "" : undefined} onClick={() => setState("scenario", item.key)}>{item.name}</button>}</For>
          <span class="dp-divider" />
          <button data-active={state.narrow ? "" : undefined} onClick={() => setState("narrow", !state.narrow)}>窄侧栏</button>
          <button onClick={reset}>重置</button>
        </div>
        <details>
          <summary>原型状态</summary>
          <pre>{JSON.stringify(state, null, 2)}</pre>
        </details>
      </div>
    </div>
  )
}

function EmptyState(props: { scenario: ScenarioKey; filtering: boolean; onAdd(): void }) {
  if (props.scenario === "empty")
    return (
      <div class="dp-empty">
        <Icon name="folder-add-left" size="large" />
        <strong>还没有工作目录</strong>
        <span>添加一个目录，只为它里面的会话导航。</span>
        <button onClick={props.onAdd}>添加工作目录</button>
      </div>
    )
  if (props.filtering)
    return (
      <div class="dp-empty">
        <Icon name="magnifying-glass" size="large" />
        <strong>没有匹配的会话</strong>
        <span>试试别的关键词，或清除筛选。</span>
      </div>
    )
  return (
    <div class="dp-empty">
      <Icon name="folder" size="large" />
      <strong>没有可显示的目录</strong>
      <span>重新添加一个之前关闭的目录。</span>
    </div>
  )
}
