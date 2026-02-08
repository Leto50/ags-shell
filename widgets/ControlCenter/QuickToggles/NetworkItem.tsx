import { Gtk } from "ags/gtk4"
import { createBinding } from "ags"
import { WiFiAccessPoint } from "../../../lib/types"
import { getWifiIconFromStrength, uiIcons } from "../utils/icons"

interface NetworkItemProps {
    accessPoint: WiFiAccessPoint
    onClicked: () => void
}

export function NetworkItem({ accessPoint, onClicked }: NetworkItemProps) {
    const signalIcon = getWifiIconFromStrength(accessPoint.strength)
    // Network is secured if it has flags, wpaFlags, or rsnFlags set
    const isSecured = accessPoint.flags > 0 || accessPoint.wpaFlags > 0 || accessPoint.rsnFlags > 0
    const isActive = accessPoint.active

    return (
        <button
            cssClasses={isActive ? ["network-item", "active"] : ["network-item"]}
            onClicked={onClicked}
        >
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={12}
                hexpand={true}
            >
                {/* Signal Strength Icon */}
                <label
                    label={signalIcon}
                    cssClasses={["icon-label"]}
                />

                {/* SSID */}
                <label
                    label={accessPoint.ssid || "Hidden Network"}
                    xalign={0}
                    hexpand={true}
                    cssClasses={["body"]}
                />

                {/* Security Icon */}
                <label
                    label="󰌾"
                    cssClasses={["icon-label"]}
                    visible={isSecured}
                />

                {/* Connected Indicator */}
                <label
                    label={uiIcons.check}
                    cssClasses={["icon-label"]}
                    visible={isActive}
                />
            </box>
        </button>
    )
}
