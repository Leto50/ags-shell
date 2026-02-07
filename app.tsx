import app from "ags/gtk4/app"
import { Gtk, Gdk } from "ags/gtk4"
import Bar from "./widgets/Bar"
import ControlCenter from "./widgets/ControlCenter"
import TrayMenu from "./widgets/Bar/TrayMenu/index"
import NotificationCenter from "./widgets/Notifications/NotificationCenter"
import ToastContainer from "./widgets/Toast/ToastWidget"
import "./widgets/Notifications/NotificationManager"  // Initialize notification manager
import scss from "./style.scss"

// Force Adwaita icon theme for AGS only
const settings = Gtk.Settings.get_default()
if (settings) {
    settings.set_property("gtk-icon-theme-name", "Adwaita")
}

const css = new Gtk.CssProvider()
css.load_from_string(scss)
Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default()!,
    css,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
)

app.start({
    main() {
        const monitors = Gdk.Display.get_default()?.get_monitors()

        if (monitors) {
            for (let i = 0; i < monitors.get_n_items(); i++) {
                const monitor = monitors.get_item(i)
                if (monitor) {
                    Bar(monitor)
                }
            }
        }

        ControlCenter()
        TrayMenu()
        NotificationCenter()
        ToastContainer()
    }
})
