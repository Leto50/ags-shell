import { Gtk } from "ags/gtk4"
import { createBinding, onCleanup } from "ags"
import { speaker } from "../../lib/services"

export default function VolumeSlider() {
    // Handle case where audio service is unavailable
    if (!speaker) {
        return (
            <box
                orientation={Gtk.Orientation.VERTICAL}
                class="control-section card card-padding"
            >
                <label label="Volume" halign={Gtk.Align.START} class="caption-heading" />
                <label label="Audio service unavailable" halign={Gtk.Align.CENTER} class="error-message" />
            </box>
        )
    }

    const volumeBinding = createBinding(speaker, "volume")

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            class="control-section card card-padding"
        >
            <label label="Volume" halign={Gtk.Align.START} class="caption-heading" />
            <overlay>
                <slider
                    value={volumeBinding}
                    min={0}
                    max={1}
                    $={(self) => {
                        const signalId = self.connect("value-changed", () => {
                            if (speaker) {
                                speaker.volume = self.value
                            }
                        })

                        // Cleanup: disconnect signal when widget is destroyed
                        onCleanup(() => {
                            self.disconnect(signalId)
                        })
                    }}
                    class="volume-slider"
                />
                <box
                    $type="overlay"
                    valign={Gtk.Align.CENTER}
                    class="icon-container"
                    $={(self) => {
                        self.set_can_target(false)
                    }}
                >
                    <image icon-name="audio-volume-high-symbolic" class="volume-icon"/>
                </box>
            </overlay>
        </box>
    )
}
