import { Gtk, Gdk } from "ags/gtk4"
import { onCleanup } from "ags"
import AstalTray from "gi://AstalTray?version=0.1"
import { showTrayMenu } from "./TrayMenu/index"
import { config } from "../../config"
import { logger } from "../../lib/logger"

export default function SystemTray() {
    const tray = AstalTray.get_default()

    return (
        <box
            class="bar-system-tray"
            spacing={config.systemTray.iconSpacing}
            $={(self) => {
                // Track signal IDs for cleanup
                let signalIds: Array<{ item: any, ids: number[] }> = []

                const rebuild = () => {
                    // Disconnect old signals before clearing
                    signalIds.forEach(({ item, ids }) => {
                        ids.forEach(id => item.disconnect(id))
                    })
                    signalIds = []

                    // Clear existing items
                    while (self.get_first_child()) {
                        self.remove(self.get_first_child())
                    }

                    // Add tray items
                    const items = tray.get_items()
                    items.forEach(item => {
                        const btn = new Gtk.Button({
                            tooltipMarkup: item.tooltipMarkup,
                        })
                        btn.set_css_classes(["bar-button", "tray-item"])

                        // Left-click: activate item
                        btn.connect("clicked", () => {
                            logger.debug("Tray item activated:", item.tooltipMarkup || "(no tooltip)")
                            item.activate(0, 0)
                        })

                        // Right-click: show menu via GetLayout DBus call
                        if (item.menuModel) {
                            const gesture = new Gtk.GestureClick()
                            gesture.set_button(Gdk.BUTTON_SECONDARY)
                            gesture.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)

                            gesture.connect("released", () => {
                                logger.debug("Tray menu requested:", item.tooltipMarkup || "(no tooltip)")

                                // Calculate button position
                                let totalX = 0
                                let widget: Gtk.Widget | null = btn
                                while (widget) {
                                    totalX += widget.get_allocation().x
                                    const parent = widget.get_parent()
                                    if (!parent || parent === widget.get_root()) break
                                    widget = parent
                                }
                                const buttonCenterX = totalX + (btn.get_allocation().width / 2) + 20

                                // Show menu using GetLayout DBus call
                                showTrayMenu(item, buttonCenterX)
                            })

                            btn.add_controller(gesture)
                        }

                        const icon = new Gtk.Image({
                            gicon: item.gicon,
                        })
                        icon.set_pixel_size(17)
                        icon.set_css_classes(["bar-icon"])
                        // Let CSS control the size via font-size on .bar-icon

                        // Listen for icon changes and save signal IDs
                        const giconId = item.connect("notify::gicon", () => {
                            icon.set_from_gicon(item.gicon)
                        })

                        // Listen for tooltip changes
                        const tooltipId = item.connect("notify::tooltip-markup", () => {
                            btn.set_tooltip_markup(item.tooltipMarkup)
                        })

                        // Track signal IDs for cleanup
                        signalIds.push({ item, ids: [giconId, tooltipId] })

                        btn.set_child(icon)
                        self.append(btn)
                    })
                }

                // Initial build
                rebuild()

                // Listen to changes and save signal ID
                const traySignalId = tray.connect("notify::items", rebuild)

                // Cleanup: disconnect all signals when widget is destroyed
                onCleanup(() => {
                    // Disconnect tray signal
                    tray.disconnect(traySignalId)

                    // Disconnect all item signals
                    signalIds.forEach(({ item, ids }) => {
                        ids.forEach(id => item.disconnect(id))
                    })
                })
            }}
        />
    )
}
