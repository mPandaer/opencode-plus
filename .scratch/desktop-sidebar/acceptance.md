# Acceptance evidence

Integration: `desktop-directory-groups`, based on user-selected `release-v2.2.6-plus` (`dc2ffcf8bf`). Final independently integrated HEAD `35f58e5db06eb65cba94079b2ad173efc535fda5`. Tickets closed as implemented; manual acceptance remains partial as detailed below.

| Boundary | Evidence | Result |
| --- | --- | --- |
| Directory creation | Full-path confirmation/edit, final create request; registered worktree and worktree-module matrix; flag-off legacy and explicit checkout regressions | Focused E2E passed, expanded matrix70/70 repetitions; final combined keepers146/146 passed |
| Real backend | Root+two modules keep exact Session.location/common Git Project; real file search/sibling permission/VCS branch+diff | Production ServerFetch isolated filesystem tests passed |
| Lifecycle | Empty explicit directories, paginated history, exact parent/child groups, close/reload/re-add, no file/history deletion | Tabs72/72 at05; real backend UI asserts stored Session/file content unchanged |
| Project view | Shared Git identity, per-path non-Git groups, project+ selection, exact final request | Tabs68/68 at03, focused30/30 repetitions |
| Global creation | Current Session → per-server last-used → picker; cancel/edit/reload/server isolation | Focused40/40 at04; stale async lifecycle reviewed and fixed |
| Layout | Real drag, cross-view order, fold, activity stability, reload/server isolation, hidden project order after filtering | Own20/20 repetitions; combined filters/reveal40/40 |
| Filters | Title/directory/project search, multi-select, retained hierarchy, target independence, success-only selective clear+expand, reload reset | Combined40/40; final combined keepers146/146 passed |
| Missing directory | Cold/warm deletion with no cache invalidation, history/control admission intact, typed create/prompt errors, original restore, replacement no move | Backend10/10 repetitions; restored actual shell writes original module not root; app recovery30/30, mounted warm rejection regression passed |
| Server isolation | Directory/closed/view/order/collapse/last-used durable state; transient filters | Product E2Es and final integrated keepers146/146 passed |
| Final review | Independent Standards4 (including1judgment) + Spec3 findings | All7 addressed in707f86e18b; independent merge screening verified |
| Independent integrated checks | Main checkout after final merge35f58e5db0 | App2608/0; client solid-data35/0; critical built E2E4/4 without retries; app/client types and root32/32passed,692warnings0errors. Earlier review-fix lifecycle110/0 and backend18/0 |
| Final E2E keepers | Tabs/new-session/multi-server/location-sync,5workers0retry | Final35f58e5db0:146/146passed (2.9m), focused/recovery90/90passed (2.5m). Earlier143/3 diagnosed as actual regressions vs release baseline3/3green; measured control width and narrow reactive/resource invalidation fixed, original assertions retained. Independent final merger inspected and integrated patch, reran four critical cases successfully; full146/90 not independently repeated |
| E2E typecheck | Separate compiler fixture/Vite declarations | Still fails:181 reported diagnostics in untouched files; no changed-file diagnostics reported. Latest full baseline attribution not independently verified |
| Prior full tabs failure |75/76 inbox working-status assertion | Not reproduced current+parent isolated1/1 or5worker5/5; final146/146also passes unchanged inbox case, no inbox fix or pre-existing classification |
| Desktop visual smoke | Actual Electron development window with isolated backend; directory/project switching and selected subdirectory draft visible | Exercised after integration; screenshots recorded below. No model message submitted |
| Native picker | Actual OS dialog | Not independently verified |
| Desktop restart | Actual process restart persistence/reset | Not exercised; user's live app/server never restarted |
| Disk unavailable | Offline drive/access denied beyond deleted paths | Not exercised |
| Model execution | Restored model-generated tool call | Not exercised; actual shell cwd independently proven, UI+backend guard tests separate |
| Performance | Strobe navigation comparison | Blocked by baseline New session locator/viewport/head startup; no performance conclusion |

Windows text-symlink workaround used only temporarily for verification and restored. No push, external PR, publication, or user live service restart performed. See [review.md](review.md) and [implementation.md](implementation.md) for detailed history. Tickets01–08 closed as implemented, with manual acceptance explicitly outstanding. Task01 residual worktree directory could not be completely removed because Windows reports a file in use; no unknown processes were killed. A later move outside the checkout also failed for the same file-in-use reason; this exact task residue is excluded locally through Git info/exclude, not a repository-wide ignore rule.

Desktop visual smoke screenshots: [directory view](desktop-preview-current.png), [project view](desktop-preview-project.png). [Startup capture](desktop-preview-start.png) shows the splash only and is not feature-verification evidence. The actual preview used its own backend on port31987 after the default isolated port3084 was occupied; the user's existing service was not replaced.
