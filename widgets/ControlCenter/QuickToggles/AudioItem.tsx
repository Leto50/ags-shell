import { Gtk } from "ags/gtk4"
import { createBinding } from "ags"
import AstalWp from "gi://AstalWp"
import { getAudioDeviceIcon, uiIcons } from "../utils/icons"
import { logger } from "../../../lib/logger"

interface AudioItemProps {
    endpoint: AstalWp.Endpoint
}

export function AudioItem({ endpoint }: AudioItemProps) {
    const isDefaultBinding = createBinding(endpoint, "is-default")
    const volumeBinding = createBinding(endpoint, "volume")
    const descriptionBinding = createBinding(endpoint, "description")

    const volumePercent = volumeBinding((v) => `${Math.round(v * 100)}%`)

    const handleClick = () => {
        try {
            endpoint.set_is_default(true)
        } catch (err) {
            logger.error("Failed to set default audio output:", err)
        }
    }

    return (
        <button
            cssClasses={isDefaultBinding((d) =>
                d ? ["audio-item", "active"] : ["audio-item"]
            )}
            onClicked={handleClick}
            hexpand={true}
        >
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={12}
                hexpand={true}
            >
                {/* Device Icon */}
                <label
                    label={descriptionBinding((desc) => getAudioDeviceIcon(desc || ""))}
                    cssClasses={["icon-label"]}
                />

                {/* Device Name */}
                <label
                    label={descriptionBinding((desc) => desc || "Unknown Device")}
                    xalign={0}
                    hexpand={true}
                    cssClasses={["body"]}
                />

                {/* Volume % */}
                <label
                    label={volumePercent}
                    cssClasses={["caption"]}
                />

                {/* Default Indicator */}
                <label
                    label={uiIcons.check}
                    cssClasses={["icon-label"]}
                    visible={isDefaultBinding}
                />
            </box>
        </button>
    )
}
