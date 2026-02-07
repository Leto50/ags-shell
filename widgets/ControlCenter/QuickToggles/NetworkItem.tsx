import { Gtk } from "ags/gtk4"
import { createBinding } from "ags"

interface NetworkItemProps {
    accessPoint: any
    onClicked: () => void
}

export function NetworkItem({ accessPoint, onClicked }: NetworkItemProps) {
    // Get signal strength icon
    const getSignalIcon = (strength: number): string => {
        if (strength >= 80) return "network-wireless-signal-excellent-symbolic"
        if (strength >= 60) return "network-wireless-signal-good-symbolic"
        if (strength >= 40) return "network-wireless-signal-ok-symbolic"
        if (strength >= 20) return "network-wireless-signal-weak-symbolic"
        return "network-wireless-signal-none-symbolic"
    }

    const signalIcon = getSignalIcon(accessPoint.strength)
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
                <image iconName={signalIcon} />

                {/* SSID */}
                <label
                    label={accessPoint.ssid || "Hidden Network"}
                    xalign={0}
                    hexpand={true}
                    cssClasses={["body"]}
                />

                {/* Security Icon */}
                <image
                    iconName="network-wireless-encrypted-symbolic"
                    visible={isSecured}
                />

                {/* Connected Indicator */}
                <image
                    iconName="object-select-symbolic"
                    visible={isActive}
                />
            </box>
        </button>
    )
}
