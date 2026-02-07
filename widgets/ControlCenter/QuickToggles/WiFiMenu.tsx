import { Gtk } from "ags/gtk4"
import Adw from "gi://Adw?version=1"
import Network from "gi://AstalNetwork"
import { createBinding, createState, For, onCleanup } from "ags"
import { interval } from "ags/time"
import { execAsync } from "ags/process"
import { NetworkItem } from "./NetworkItem"
import { PasswordDialog } from "./PasswordDialog"

interface WiFiMenuProps {
    onBack: () => void
}

export function WiFiMenu({ onBack }: WiFiMenuProps) {
    const network = Network.get_default()
    const [showPasswordDialog, setShowPasswordDialog] = createState(false)
    const [selectedNetwork, setSelectedNetwork] = createState<any>(null)
    const [savedNetworks, setSavedNetworks] = createState<string[]>([])
    const [isScanning, setIsScanning] = createState(false)

    // Load saved networks
    const loadSavedNetworks = async () => {
        try {
            const output = await execAsync(["bash", "-c", "nmcli -t -f NAME,TYPE connection show"])
            if (typeof output === "string") {
                const saved = output
                    .split("\n")
                    .filter((line) => line.includes("802-11-wireless"))
                    .map((line) => line.split(":")[0].trim())
                setSavedNetworks(saved)
            }
        } catch (err) {
            console.error("Failed to load saved networks:", err)
        }
    }

    // Access points with filtering and sorting
    const accessPoints = createBinding(network.wifi, "access-points")
    const sortedNetworks = accessPoints((aps) => {
        if (!aps || aps.length === 0) return []

        // Filter out duplicates (same SSID), keep strongest signal
        const unique = new Map()
        for (const ap of aps) {
            if (!ap.ssid || ap.ssid === "") continue
            if (!unique.has(ap.ssid) || ap.strength > unique.get(ap.ssid).strength) {
                unique.set(ap.ssid, ap)
            }
        }

        // Sort by strength descending
        return Array.from(unique.values()).sort((a, b) => b.strength - a.strength)
    })

    const handleNetworkClick = async (ap: any) => {
        if (ap.active) {
            return
        }

        const isSecured = ap.flags > 0 || ap.wpaFlags > 0 || ap.rsnFlags > 0
        const isSaved = savedNetworks().includes(ap.ssid)

        if (isSecured && !isSaved) {
            // Show password dialog for secured networks that aren't saved
            setSelectedNetwork(ap)
            setShowPasswordDialog(true)
        } else {
            // Connect directly (saved network or open network)
            try {
                if (isSaved) {
                    // Try to bring up existing connection, fall back to new connection
                    try {
                        await execAsync(["nmcli", "connection", "up", ap.ssid])
                    } catch {
                        await execAsync(["nmcli", "device", "wifi", "connect", ap.ssid])
                    }
                } else {
                    await execAsync(["nmcli", "device", "wifi", "connect", ap.ssid])
                }
            } catch (err: any) {
                console.error("Failed to connect to network:", err)
            }
        }
    }

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={0}
            class="card card-padding"
            $={(self) => {
                // Auto-scan when menu is shown (only if WiFi is enabled)
                if (network.wifi && network.wifi.enabled) {
                    network.wifi.scan()
                }
                loadSavedNetworks()

                const timer = interval(10000, () => {
                    if (network.wifi && network.wifi.enabled) {
                        network.wifi.scan()
                    }
                    loadSavedNetworks()
                })

                onCleanup(() => {
                    timer.cancel()
                })
            }}
        >
            {/* Header with back button */}
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} cssClasses={["menu-header"]}>
                <button cssClasses={["icon-button"]} onClicked={onBack}>
                    <image iconName="go-previous-symbolic" />
                </button>
                <label label="WiFi Networks" cssClasses={["menu-title"]} xalign={0} hexpand={true} />
                <button
                    cssClasses={["icon-button"]}
                    onClicked={() => {
                        if (network.wifi && network.wifi.enabled && !isScanning()) {
                            setIsScanning(true)
                            network.wifi.scan()
                            setTimeout(() => setIsScanning(false), 3000)
                        }
                    }}
                >
                    <box>
                        <Adw.Spinner
                            visible={isScanning}
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                        />
                        <image iconName="view-refresh-symbolic" visible={isScanning((s) => !s)} />
                    </box>
                </button>
            </box>

            {/* Password Dialog */}
            <box visible={showPasswordDialog}>
                <PasswordDialog
                    network={selectedNetwork}
                    onClose={() => setShowPasswordDialog(false)}
                    onSuccess={() => loadSavedNetworks()}
                />
            </box>

            {/* Networks List */}
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4} cssClasses={["networks-list"]}>
                {/* Empty state */}
                <box visible={sortedNetworks((nets) => nets.length === 0)}>
                    <label
                        label="No networks found"
                        cssClasses={["empty-label"]}
                        halign={Gtk.Align.CENTER}
                        hexpand={true}
                    />
                </box>

                {/* Networks */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={2}
                    visible={sortedNetworks((nets) => nets.length > 0)}
                >
                    <For each={sortedNetworks}>
                        {(ap) => (
                            <NetworkItem
                                accessPoint={ap}
                                onClicked={() => handleNetworkClick(ap)}
                            />
                        )}
                    </For>
                </box>
            </box>

            {/* Settings Button */}
            <box cssClasses={["menu-footer"]}>
                <button
                    cssClasses={["settings-button"]}
                    hexpand={true}
                    onClicked={() => {
                        import("ags/process").then(({ execAsync }) => {
                            execAsync(["nm-connection-editor"]).catch(console.error)
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
