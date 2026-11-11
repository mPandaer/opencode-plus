import { Button } from "@opencode/ui/button"
import { DirectoryConfirm } from "@/shell/titlebar/directory-add"
import { useDialog } from "@opencode/ui/context/dialog"
import { DockShell, DockTray } from "@opencode/ui/dock-surface"
import { Icon } from "@opencode/ui/icon"
import { useLanguage } from "@/runtime/i18n/language"
import { useServer } from "@/runtime/server/current"
import { useWorkspaceLocation } from "@/workspaces/location"
import { useDirectoryPicker } from "@/workspaces/selection/picker"
import "./location-missing.css"

export function SessionLocationMissing(props: { directory: string }) {
  const language = useLanguage()
  const server = useServer()
  const location = useWorkspaceLocation()
  const dialog = useDialog()
  const picker = useDirectoryPicker()

  return (
    <div data-component="session-location-missing">
      <DockShell data-slot="location-body">
        <div role="group" aria-label={language.t("session.location.unavailable")} data-slot="location-status">
          <Icon name="warning" />
          <div data-slot="location-details">
            <div role="status" data-slot="location-title">
              {language.t("session.location.unavailable")}
            </div>
            <div data-slot="location-path">{props.directory}</div>
            <div data-slot="location-description">{language.t("sidebar.directory.recovery")}</div>
          </div>
        </div>
      </DockShell>
      <DockTray data-slot="location-footer">
        <Button onClick={() => location().retry()}>{language.t("sidebar.directory.retry")}</Button>
        <Button
          disabled={!server.ctx.directories.ready()}
          onClick={() =>
            picker({
              server: server.conn,
              title: language.t("sidebar.directory.add"),
              onSelect: (result) => {
                const directory = Array.isArray(result) ? result[0] : result

                if (directory)
                  dialog.show(() => (
                    <DirectoryConfirm ctx={server.ctx} directory={directory} onAdd={server.ctx.directories.add} />
                  ))
              },
            })
          }
        >
          {language.t("sidebar.directory.replacement")}
        </Button>
      </DockTray>
    </div>
  )
}
