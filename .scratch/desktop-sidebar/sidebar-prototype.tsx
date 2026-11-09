// Archived throwaway sidebar study; user selected A on 2026-11-09.
// Former preview: /?prototype=sidebar&variant=A. The application entry hook has been removed.
// All interactions use local fixtures; this file is not part of the production application.
import { For, Show, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import "./sidebar-prototype.css"

const projects = [
  { name: "opencode-plus", mark: "oc", directories: [
    { name: "opencode-plus", path: "D:/projects/opencode-plus", branch: "dev", sessions: ["优化侧边栏显示效果", "目录分组与工作区导航", "修复会话切换后的滚动位置"] },
    { name: "desktop-directory-groups", path: "D:/worktrees/desktop-directory-groups", branch: "desktop-directory-groups", sessions: ["验证桌面端目录分组", "处理长路径的显示与截断"] },
  ] },
  { name: "personal-site", mark: "ps", directories: [
    { name: "personal-site", path: "D:/projects/personal-site", branch: "main", sessions: ["调整文章页排版", "添加深色主题"] },
  ] },
  { name: "notes", mark: "n", directories: [
    { name: "notes", path: "D:/notes", branch: "", sessions: ["整理本周的开发记录"] },
  ] },
]
const variants = [
  { key: "A", name: "安静目录树", detail: "保留全局视野，收起常驻操作，让目录和会话各占一个清晰层级。" },
  { key: "B", name: "项目导航轨", detail: "先选项目，再看目录。只展开当前工作范围。" },
  { key: "C", name: "会话优先", detail: "先找到对话，再看它属于哪里。目录变成筛选条件和次要信息。" },
]

function Glyph(props: { name: string }) {
  const paths: Record<string, string> = {
    folder: "M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z",
    search: "M16 16l5 5M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0",
    plus: "M12 5v14M5 12h14", chevron: "m9 5 7 7-7 7",
    home: "m3 11 9-8 9 8v10h-7v-7h-4v7H3Z",
    panel: "M3 4h18v16H3ZM9 4v16", settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 3v2m0 14v2M3 12h2m14 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
    more: "M5 12h.01M12 12h.01M19 12h.01", branch: "M6 3v12a4 4 0 0 0 8 0V9m-8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4m8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  }
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[props.name] ?? paths.more} /></svg>
}

export function SidebarPrototype() {
  const initial = new URLSearchParams(location.search).get("variant") ?? "A"
  const [state, setState] = createStore({
    variant: variants.some((v) => v.key === initial) ? initial : "A",
    project: 0, selected: "优化侧边栏显示效果", search: "", collapsed: [] as string[], dark: false, narrow: false,
  })
  const variant = () => variants.find((v) => v.key === state.variant)!
  const switchTo = (key: string) => {
    setState({ variant: key, project: state.project < 0 && key === "B" ? 0 : state.project })
    const url = new URL(location.href)
    url.searchParams.set("variant", key)
    history.replaceState(null, "", url)
    console.info("Sidebar prototype", JSON.stringify(state))
  }
  const cycle = (step: number) => switchTo(variants[(variants.findIndex((v) => v.key === state.variant) + step + 3) % 3].key)
  const keyboard = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return
    if (event.key === "ArrowLeft") { event.preventDefault(); cycle(-1) }
    if (event.key === "ArrowRight") { event.preventDefault(); cycle(1) }
  }
  window.addEventListener("keydown", keyboard)
  onCleanup(() => window.removeEventListener("keydown", keyboard))
  const matches = (title: string) => title.toLowerCase().includes(state.search.toLowerCase())
  const row = (title: string, detail?: string) => <button class="sp-session" classList={{ selected: state.selected === title }} onClick={() => setState("selected", title)} title={title}>
    <span class="sp-session-copy"><span class="sp-truncate">{title}</span><Show when={detail}><small class="sp-truncate">{detail}</small></Show></span>
    <Show when={title === "验证桌面端目录分组"}><span class="sp-working" title="正在运行">⠿</span></Show>
    <Show when={title === "目录分组与工作区导航"}><span class="sp-unread" title="未读" /></Show>
  </button>
  const directory = (dir: typeof projects[number]["directories"][number]) => <section class="sp-directory">
    <div class="sp-directory-heading">
      <button class="sp-directory-name" aria-expanded={!state.collapsed.includes(dir.path)} onClick={() => setState("collapsed", (items) => items.includes(dir.path) ? items.filter((p) => p !== dir.path) : [...items, dir.path])} title={dir.path}>
        <span class="sp-chevron" classList={{ expanded: !state.collapsed.includes(dir.path) }}><Glyph name="chevron" /></span><Glyph name="folder" /><span class="sp-truncate">{dir.name}</span>
      </button>
      <button class="sp-hover-action" title="新建会话" onClick={() => setState("selected", "新会话")}><Glyph name="plus" /></button>
    </div>
    <Show when={!state.collapsed.includes(dir.path)}><div class="sp-directory-sessions"><For each={dir.sessions.filter(matches)}>{(title) => row(title)}</For></div></Show>
  </section>
  const search = () => <label class="sp-search"><Glyph name="search" /><input placeholder="搜索会话…" value={state.search} onInput={(e) => setState("search", e.currentTarget.value)} /><kbd>⌘ K</kbd></label>
  return <div class="sp-study" data-dark={state.dark} data-variant={state.variant} data-narrow={state.narrow}>
    <div class="sp-window">
      <aside class="sp-sidebar">
        <header class="sp-brand"><strong>opencode</strong><Glyph name="panel" /></header>
        <nav class="sp-global"><button onClick={() => setState("selected", "主页")}><Glyph name="home" />主页</button><button onClick={() => setState("selected", "新会话")}><Glyph name="plus" />新建会话<kbd>⌘ N</kbd></button></nav>
        <Show when={state.variant === "A"}>
          <div class="sp-toolbar"><span>工作目录</span><button title="添加目录（原型）" onClick={() => setState("selected", "选择工作目录")}><Glyph name="plus" /></button></div>
          {search()}
          <div class="sp-scroll" data-scrollable><For each={projects}>{(project) => <div class="sp-project"><div class="sp-project-label">{project.name}<span>{project.directories.length}</span></div><For each={project.directories}>{directory}</For></div>}</For><button class="sp-add" onClick={() => setState("selected", "选择工作目录")}><Glyph name="plus" />添加工作目录</button></div>
        </Show>
        <Show when={state.variant === "B"}>
          <div class="sp-split"><nav class="sp-rail"><For each={projects}>{(project, index) => <button classList={{ active: state.project === index() }} title={project.name} onClick={() => setState("project", index())}>{project.mark}</button>}</For><button title="添加项目（原型）" onClick={() => setState("selected", "选择工作目录")}><Glyph name="plus" /></button></nav><div class="sp-project-panel"><div class="sp-project-title"><strong class="sp-truncate">{projects[state.project].name}</strong><span>{projects[state.project].directories.length} 个工作目录</span></div>{search()}<div class="sp-scroll" data-scrollable><For each={projects[state.project].directories}>{(dir) => <div class="sp-workspace"><div class="sp-workspace-path" title={dir.path}><Glyph name="branch" />{dir.branch || "本地目录"}</div>{directory(dir)}</div>}</For><button class="sp-add" onClick={() => setState("selected", "选择工作目录")}><Glyph name="plus" />添加目录</button></div></div></div>
        </Show>
        <Show when={state.variant === "C"}>
          <div class="sp-focus-heading">会话<button title="新建会话" onClick={() => setState("selected", "新会话")}><Glyph name="plus" /></button></div>
          <label class="sp-project-select"><Glyph name="folder" /><select value={state.project} onChange={(e) => setState("project", Number(e.currentTarget.value))}><option value={-1}>所有工作目录</option><For each={projects}>{(project, index) => <option value={index()}>{project.name}</option>}</For></select></label>
          {search()}<div class="sp-scroll sp-flat" data-scrollable><div class="sp-date">最近</div><For each={projects.filter((_, i) => state.project === -1 || i === state.project)}>{(project) => <For each={project.directories}>{(dir) => <For each={dir.sessions.filter(matches)}>{(title) => row(title, dir.name)}</For>}</For>}</For></div>
          <button class="sp-manage" onClick={() => setState("selected", "管理工作目录")}><Glyph name="folder" />管理工作目录<Glyph name="chevron" /></button>
        </Show>
        <footer class="sp-sidebar-footer"><button title="设置（原型）" onClick={() => setState("selected", "设置")}><Glyph name="settings" /></button><span>本地服务器</span><span class="sp-connection" /></footer>
      </aside>
      <main class="sp-main"><header class="sp-tabbar"><span class="sp-tab">{state.selected}<span>×</span></span><Glyph name="plus" /><span class="sp-tabbar-end"><Glyph name="panel" /></span></header><div class="sp-session-header"><strong>{state.selected}</strong><span>opencode-plus <span class="sp-slash">/</span> dev</span></div><div class="sp-conversation"><div class="sp-user-message">目前侧边栏的 UI 我一眼感觉不舒服。你出几版我看看。</div><div class="sp-answer"><span class="sp-answer-mark">oc</span><div><p>可以，我们先把侧边栏的信息层级理清楚。</p><p>目录告诉你「在哪里」，会话告诉你「在做什么」。让当前任务更容易被找到，同时保留切换项目的上下文。</p><p>左侧是可操作的设计原型。试试搜索、展开目录，或切换到另一条会话。</p></div></div></div><div class="sp-composer"><span>描述你想完成的任务…</span><div><span>Build <span class="sp-slash">/</span> 选择模型</span><button title="发送（原型）" onClick={() => setState("selected", "新会话")}>↑</button></div></div><div class="sp-composer-note">所有预览操作仅影响本地样例</div></main>
    </div>
    <div class="sp-review"><div class="sp-review-copy"><strong>{variant().key} / {variant().name}</strong><span>{variant().detail}</span></div><div class="sp-controls"><button aria-label="上一版" onClick={() => cycle(-1)}>←</button><For each={variants}>{(v) => <button classList={{ active: state.variant === v.key }} onClick={() => switchTo(v.key)}>{v.key}</button>}</For><button aria-label="下一版" onClick={() => cycle(1)}>→</button><span class="sp-control-divider" /><button onClick={() => setState("dark", !state.dark)}>{state.dark ? "浅色" : "深色"}</button><button onClick={() => setState("narrow", !state.narrow)}>{state.narrow ? "标准宽度" : "窄侧栏"}</button><button onClick={() => setState({ project: 0, selected: "优化侧边栏显示效果", search: "", collapsed: [] })}>重置</button></div><details><summary>原型状态</summary><pre>{JSON.stringify(state, null, 2)}</pre></details></div>
  </div>
}
