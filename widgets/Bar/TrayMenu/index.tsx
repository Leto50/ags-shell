import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { config } from "../../../config"
import { logger } from "../../../lib/logger"
import { TrayItem } from "../../../lib/types"
import { getMenuLayoutViaDBus } from "./DBusMenu"
import { buildMenuFromData, resetMenuStack } from "./MenuBuilder"

let contentBox: Gtk.Box | null = null
let menuWindow: Astal.Window | null = null

export async function showTrayMenu(item: TrayItem, buttonX: number) {
    logger.debug("showTrayMenu called", {
        itemId: item.item_id,
        menuPath: item.menu_path
    })

    if (!contentBox || !menuWindow) {
        logger.error("Missing contentBox or menuWindow!")
        return
    }

    // Clear old menu items and reset navigation
    while (contentBox.get_first_child()) {
        contentBox.remove(contentBox.get_first_child())
    }
    resetMenuStack()

    try {
        // Get ENTIRE menu structure via ONE DBus GetLayout() call!
        const menuData = await getMenuLayoutViaDBus(item.item_id, item.menu_path)
        logger.debug(`Retrieved ${menuData.length} menu items from GetLayout`)

        // Extract busName and menuPath for Event calls
        const busName = item.item_id.split('/')[0]
        const menuPath = item.menu_path
        logger.debug("Extracted DBus info:", { busName, menuPath })

        // Position the menu
        if (buttonX && menuWindow) {
            const display = Gdk.Display.get_default()
            if (display) {
                const monitor = display.get_monitors().get_item(0)
                if (monitor) {
                    const geometry = monitor.get_geometry()
                    const distanceFromRight = geometry.width - buttonX
                    const finalMargin = Math.max(config.bar.marginHorizontal, distanceFromRight - 100)
                    logger.debug("Setting margin right:", finalMargin)
                    menuWindow.set_margin_right(finalMargin)
                }
            }
        }

        logger.debug("Building menu UI...")
        // Build menu from extracted data
        // Pass busName and menuPath for DBus Event calls
        buildMenuFromData(menuData, contentBox, busName, menuPath, menuWindow)
        logger.debug("Menu UI built")

        // Show window directly instead of toggle
        menuWindow.visible = true
        logger.debug("showTrayMenu completed successfully")
    } catch (e) {
        logger.error("Error showing tray menu:", e)
    }
}

export default function TrayMenu() {
    return (
        <window
            class="tray-menu-window"
            name="tray-menu"
            namespace="tray-menu"
            visible={false}
            layer={Astal.Layer.TOP}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
            marginTop={config.menu.marginTop}
            marginRight={config.menu.marginRight}
            keymode={Astal.Keymode.EXCLUSIVE}
            application={app}
            $={(self) => {
                menuWindow = self

                const keyController = new Gtk.EventControllerKey()
                keyController.connect("key-pressed", (_controller, keyval) => {
                    if (keyval === Gdk.KEY_Escape) {
                        logger.debug("Escape pressed, hiding menu")
                        self.visible = false
                        return true
                    }
                    return false
                })
                self.add_controller(keyController)

                const clickController = new Gtk.GestureClick()
                clickController.set_propagation_phase(Gtk.PropagationPhase.BUBBLE)
                clickController.connect("pressed", (_gesture, _n, x, y) => {
                    if (!contentBox) return
                    try {
                        const allocation = contentBox.get_allocation()
                        const isOutside = x < allocation.x || x > allocation.x + allocation.width ||
                                        y < allocation.y || y > allocation.y + allocation.height
                        if (isOutside) {
                            logger.debug("Click outside, hiding menu")
                            self.visible = false
                        }
                    } catch (e) {
                        logger.warn("Failed to get tray menu allocation:", e)
                    }
                })
                self.add_controller(clickController)
            }}
        >
            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={2}
                class="tray-menu-box"
                $={(self) => {
                    contentBox = self
                    self.set_overflow(Gtk.Overflow.HIDDEN)
                    self.set_size_request(200, -1)
                }}
            />
        </window>
    )
}
