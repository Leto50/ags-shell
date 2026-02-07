import { Gtk } from "ags/gtk4"
import { logger } from "../../../lib/logger"
import Bluetooth from "gi://AstalBluetooth"
import { createBinding, For, onCleanup } from "ags"
import { BluetoothItem } from "./BluetoothItem"

interface BluetoothMenuProps {
    onBack: () => void
}

// Global session tracking (shared across all component instances)
let globalDiscoverySession = false

export function BluetoothMenu({ onBack }: BluetoothMenuProps) {
    const bluetooth = Bluetooth.get_default()

    // Get devices and filter by status
    const devices = createBinding(bluetooth, "devices")
    const connectedDevices = devices((list) =>
        list.filter((d) => d.name && d.connected && d.paired)
    )
    const pairedDevices = devices((list) =>
        list.filter((d) => d.name && d.paired && !d.connected)
    )
    const unpairedDevices = devices((list) =>
        list.filter((d) => d.name && !d.paired && !d.connected)
    )

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={0}
            class="card card-padding"
            $={(self) => {
                // Auto-start scan when menu is shown (use global session tracking)
                if (bluetooth.adapter && !globalDiscoverySession) {
                    try {
                        bluetooth.adapter.start_discovery()
                        globalDiscoverySession = true
                    } catch (err: unknown) {
                        // Ignore "Operation already in progress" - still claim ownership
                        if (err.message?.includes("Operation already in progress")) {
                            globalDiscoverySession = true
                        } else {
                            logger.error("Failed to start Bluetooth discovery:", err)
                        }
                    }
                }

                onCleanup(() => {
                    if (bluetooth.adapter && globalDiscoverySession) {
                        try {
                            bluetooth.adapter.stop_discovery()
                            globalDiscoverySession = false
                        } catch (err: unknown) {
                            // Ignore "No discovery started" error (BlueZ state bug #807)
                            if (!err.message?.includes("No discovery started")) {
                                logger.error("Failed to stop Bluetooth discovery:", err)
                            }
                            // Reset even on error to avoid stuck state
                            globalDiscoverySession = false
                        }
                    }
                })
            }}
        >
            {/* Header with back button */}
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} cssClasses={["menu-header"]}>
                <button cssClasses={["icon-button"]} onClicked={onBack}>
                    <image iconName="go-previous-symbolic" />
                </button>
                <label label="Bluetooth Devices" cssClasses={["menu-title"]} xalign={0} hexpand={true} />
            </box>

            {/* Devices List */}
            <box orientation={Gtk.Orientation.VERTICAL} spacing={8} cssClasses={["devices-list"]}>
                {/* Empty state */}
                <box visible={devices((d) => d.filter(dev => dev.name).length === 0)}>
                    <label
                        label="No devices found"
                        cssClasses={["empty-label"]}
                        halign={Gtk.Align.CENTER}
                        hexpand={true}
                    />
                </box>

                {/* My Devices Section */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={4}
                    visible={connectedDevices((c) => c.length > 0 || pairedDevices.get().length > 0)}
                >
                    <label
                        label="My Devices"
                        cssClasses={["section-label"]}
                        xalign={0}
                    />

                    {/* Connected Devices */}
                    <box
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={2}
                        visible={connectedDevices((c) => c.length > 0)}
                    >
                        <For each={connectedDevices} key={(device) => device.address || device.name}>
                            {(device) => <BluetoothItem device={device} />}
                        </For>
                    </box>

                    {/* Paired Devices */}
                    <box
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={2}
                        visible={pairedDevices((p) => p.length > 0)}
                    >
                        <For each={pairedDevices} key={(device) => device.address || device.name}>
                            {(device) => <BluetoothItem device={device} />}
                        </For>
                    </box>
                </box>

                {/* Available Devices Section */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={4}
                    visible={unpairedDevices((u) => u.length > 0)}
                >
                    <label
                        label="Available Devices"
                        cssClasses={["section-label"]}
                        xalign={0}
                    />

                    <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <For each={unpairedDevices} key={(device) => device.address || device.name}>
                            {(device) => <BluetoothItem device={device} />}
                        </For>
                    </box>
                </box>
            </box>

            {/* Settings Button */}
            <box cssClasses={["menu-footer"]}>
                <button
                    cssClasses={["settings-button"]}
                    hexpand={true}
                    onClicked={() => {
                        import("ags/process").then(({ execAsync }) => {
                            execAsync(["blueman-manager"]).catch((err) => logger.error("Failed to open Bluetooth manager:", err))
                        })
                    }}
                >
                    <box spacing={8}>
                        <image iconName="emblem-system-symbolic" />
                        <label label="Advanced Settings" />
                    </box>
                </button>
            </box>
        </box>
    )
}
