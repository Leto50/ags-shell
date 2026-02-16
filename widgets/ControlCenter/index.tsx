import { Astal, Gtk, Gdk } from "ags/gtk4"
import { logger } from "../../lib/logger"
import app from "ags/gtk4/app"
import { createState, With } from "ags"
import Bluetooth from "gi://AstalBluetooth"
import QuickToggles from "./QuickToggles"
import VolumeSlider from "./VolumeSlider"
import BrightnessSlider from "./BrightnessSlider"
import MediaPlayer from "./MediaPlayer/index"
import { WiFiMenu } from "./QuickToggles/WiFiMenu"
import { BluetoothMenu } from "./QuickToggles/BluetoothMenu"
import { config } from "../../config"

type Page = "main" | "wifi" | "bluetooth"

export default function ControlCenter() {
    let contentBox: Gtk.Box | null = null
    const [currentPage, setCurrentPage] = createState<Page>("main")

    const navigateTo = (page: Page) => {
        setCurrentPage(page)
    }

    const goBack = () => {
        setCurrentPage("main")
    }

    return (
        <window
            class="control-center"
            name="control-center"
            namespace="control-center"
            visible={false}
            layer={Astal.Layer.TOP}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
            marginTop={config.menu.marginTop}
            marginRight={config.menu.marginRight}
            keymode={Astal.Keymode.EXCLUSIVE}
            application={app}
            $={(self) => {
                // Auto-focus when window becomes visible (popup behavior)
                self.connect("notify::visible", () => {
                    if (self.visible) {
                        self.present()
                        setCurrentPage("main")
                    } else {
                        // Stop Bluetooth scan when Control Center is hidden
                        const bluetooth = Bluetooth.get_default()
                        if (bluetooth.adapter && bluetooth.adapter.discovering) {
                            try {
                                bluetooth.adapter.stop_discovery()
                                logger.debug("Bluetooth discovery stopped (window hidden)")
                            } catch (err: unknown) {
                                if (!err.message?.includes("No discovery started")) {
                                    logger.error("Failed to stop Bluetooth discovery:", err)
                                }
                            }
                        }
                    }
                })

                // Escape key handler
                const keyController = new Gtk.EventControllerKey()
                keyController.connect("key-pressed", (_controller, keyval) => {
                    if (keyval === Gdk.KEY_Escape) {
                        app.toggle_window("control-center")
                        return true
                    }
                    return false
                })
                self.add_controller(keyController)

                // Click outside handler
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
                        app.toggle_window("control-center")
                    }
                })
                self.add_controller(clickController)
            }}
        >
            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={15}
                class="control-center-box"
                $={(self) => {
                    contentBox = self
                    self.set_overflow(Gtk.Overflow.HIDDEN)
                    self.set_size_request(340, -1)
                }}
            >
                {/* Main Page */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={15}
                    visible={currentPage((page) => page === "main")}
                >
                    <QuickToggles onNavigate={navigateTo} />
                    <VolumeSlider />
                    <BrightnessSlider />
                    <MediaPlayer />
                </box>

                {/* WiFi Menu Page */}
                <With value={currentPage((page) => page === "wifi")}>
                    {(isWifi) => isWifi && <WiFiMenu onBack={goBack} />}
                </With>

                {/* Bluetooth Menu Page */}
                <With value={currentPage((page) => page === "bluetooth")}>
                    {(isBluetooth) => isBluetooth && <BluetoothMenu onBack={goBack} />}
                </With>
            </box>
        </window>
    )
}
