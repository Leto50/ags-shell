import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { config } from "../../config"
import PowerSection from "./PowerSection"
import ShortcutsSection from "./ShortcutsSection"
import MonitoringSection from "./MonitoringSection"

export default function AppMenu() {
    let contentBox: Gtk.Box | null = null
    const monitoring = MonitoringSection()

    return (
        <window
            class="app-menu"
            name="app-menu"
            namespace="app-menu"
            visible={false}
            layer={Astal.Layer.TOP}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT}
            marginTop={config.menu.marginTop}
            marginLeft={config.menu.marginLeft}
            keymode={Astal.Keymode.EXCLUSIVE}
            application={app}
            $={(self) => {
                self.connect("notify::visible", () => {
                    if (self.visible) {
                        self.present()
                        monitoring.startPolling()
                    } else {
                        monitoring.stopPolling()
                    }
                })

                const keyController = new Gtk.EventControllerKey()
                keyController.connect("key-pressed", (_controller, keyval) => {
                    if (keyval === Gdk.KEY_Escape) {
                        app.toggle_window("app-menu")
                        return true
                    }
                    return false
                })
                self.add_controller(keyController)

                const clickController = new Gtk.GestureClick()
                clickController.set_propagation_phase(Gtk.PropagationPhase.BUBBLE)
                clickController.connect("pressed", (_gesture, _n, x, y) => {
                    if (!contentBox) return

                    const allocation = contentBox.get_allocation()
                    const isOutside = x < allocation.x ||
                                    x > allocation.x + allocation.width ||
                                    y < allocation.y ||
                                    y > allocation.y + allocation.height

                    if (isOutside) {
                        app.toggle_window("app-menu")
                    }
                })
                self.add_controller(clickController)
            }}
        >
            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={15}
                class="app-menu-box"
                $={(self) => {
                    contentBox = self
                    self.set_overflow(Gtk.Overflow.HIDDEN)
                }}
            >
                <PowerSection />
                <ShortcutsSection />
                {monitoring.widget}
            </box>
        </window>
    )
}
