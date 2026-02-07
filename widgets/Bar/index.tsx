import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import AppMenuButton from "./AppMenuButton"
import WorkspaceButtons from "./WorkspaceButtons"
import SystemTray from "./SystemTray"
import ControlCenterToggle from "./ControlCenterToggle"
import DateTimeSection from "./DateTimeSection"
import { config } from "../../config"

export default function Bar(gdkmonitor: Gdk.Monitor) {
    return (
        <window
            class="bar"
            namespace="bar"
            visible
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
            marginTop={config.bar.marginTop}
            marginLeft={config.bar.marginHorizontal}
            marginRight={config.bar.marginHorizontal}
            marginBottom={0}
            application={app}
        >
            <centerbox class="bar-container">
                <box $type="start" spacing={config.bar.widgetSpacing} halign={Gtk.Align.START}>
                    <AppMenuButton />
                    <WorkspaceButtons gdkmonitor={gdkmonitor} />
                </box>

                <box $type="center" halign={Gtk.Align.CENTER} />

                <box $type="end" spacing={config.bar.widgetSpacing} halign={Gtk.Align.END}>
                    <SystemTray />
                    <ControlCenterToggle />
                    <DateTimeSection />
                </box>
            </centerbox>
        </window>
    )
}
