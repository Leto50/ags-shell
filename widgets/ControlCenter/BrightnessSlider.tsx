import { Gtk } from "ags/gtk4"
import { onCleanup } from "ags"
import { execAsync } from "ags/process"

export default function BrightnessSlider() {
    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            class="control-section card card-padding"
        >
            <label label="Brightness" halign={Gtk.Align.START} class="caption-heading" />
            <overlay>
                <slider
                    min={0}
                    max={1}
                    $={(self) => {
                        // Read initial brightness (using Promises to stay in tracking context)
                        Promise.all([
                            execAsync(["brightnessctl", "get"]),
                            execAsync(["brightnessctl", "max"])
                        ])
                            .then(([current, max]) => {
                                self.value = parseInt(current.trim()) / parseInt(max.trim())
                            })
                            .catch(e => {
                                console.error("Failed to read brightness:", e)
                                self.value = 0.5
                            })

                        // Listen for changes and save signal ID
                        const signalId = self.connect("value-changed", async () => {
                            try {
                                const percent = Math.round(self.value * 100)
                                await execAsync(["brightnessctl", "set", `${percent}%`])
                            } catch (e) {
                                console.error("Failed to set brightness:", e)
                            }
                        })

                        // Cleanup: disconnect signal when widget is destroyed
                        onCleanup(() => {
                            self.disconnect(signalId)
                        })
                    }}
                    class="brightness-slider"
                />
                <box
                    $type="overlay"
                    valign={Gtk.Align.CENTER}
                    class="icon-container"
                    $={(self) => {
                        self.set_can_target(false)
                    }}
                >
                    <image icon-name="weather-clear-symbolic" class="brightness-icon"/>
                </box>
            </overlay>
        </box>
    )
}
