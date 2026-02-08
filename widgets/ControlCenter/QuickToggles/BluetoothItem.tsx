import { Gtk } from "ags/gtk4"
import { createBinding, createComputed, createState, createEffect } from "ags"
import Bluetooth from "gi://AstalBluetooth"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { logger } from "../../../lib/logger"
import { BluetoothDevice } from "../../../lib/types"
import { getBluetoothDeviceIcon, uiIcons } from "../utils/icons"

interface BluetoothItemProps {
    device: BluetoothDevice
}

// Promisify D-Bus call method (module level, not in render)
if (!Gio.DBusProxy.prototype.call_async) {
    Gio._promisify(Gio.DBusProxy.prototype, 'call', 'call_finish')
}

export function BluetoothItem({ device }: BluetoothItemProps) {
    const [errorMessage, setErrorMessage] = createState("")
    const [isPairing, setIsPairing] = createState(false)

    // Atomic lock for preventing TOCTOU race condition
    let pairingLock = false

    const pairDevice = async (): Promise<void> => {
        // Validate device object
        if (!device || !device.adapter || !device.address) {
            throw new Error("Invalid device object: missing adapter or address")
        }

        // Validate Bluetooth MAC address format (XX:XX:XX:XX:XX:XX)
        const BLUETOOTH_MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/
        if (!BLUETOOTH_MAC_REGEX.test(device.address)) {
            throw new Error("Invalid Bluetooth address format")
        }

        // Validate adapter path format (should be /org/bluez/hciX)
        if (!/^\/org\/bluez\/hci\d+$/.test(device.adapter)) {
            throw new Error("Invalid adapter path format")
        }

        // Construct D-Bus path from device address and adapter
        const devicePath = `${device.adapter}/dev_${device.address.replace(/:/g, '_')}`

        // Create D-Bus proxy to BlueZ Device1 interface
        const proxy = Gio.DBusProxy.new_for_bus_sync(
            Gio.BusType.SYSTEM,
            Gio.DBusProxyFlags.NONE,
            null,
            'org.bluez',
            devicePath,
            'org.bluez.Device1',
            null
        )

        // Call Pair method asynchronously (non-blocking)
        await proxy.call(
            'Pair',
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null
        )

        logger.debug(`Successfully paired with ${device.name}`)
    }

    const handleClick = async () => {
        // Prevent TOCTOU race condition with atomic lock
        if (device.connecting || isPairing() || pairingLock) return

        pairingLock = true

        // Clear previous error
        setErrorMessage("")

        if (device.connected) {
            // Disconnect
            device.disconnect_device(() => {
                const success = !device.connected
                logger.info(`Disconnection ${success ? "successful" : "failed"} for ${device.name}`)
                if (!success) {
                    setErrorMessage("Failed to disconnect")
                }
            })
        } else if (device.paired) {
            // Connect (already paired)
            device.connect_device(() => {
                const success = device.connected
                logger.info(`Connection ${success ? "successful" : "failed"} for ${device.name}`)
                if (!success) {
                    setErrorMessage("Failed to connect")
                }
            })
        } else {
            // Pair
            setIsPairing(true)

            try {
                await pairDevice()
                setIsPairing(false)
            } catch (err: unknown) {
                setIsPairing(false)

                // Debug: log full error to understand structure
                logger.debug(`Bluetooth pairing error:`, {
                    type: err.constructor?.name,
                    code: err.code,
                    domain: err.domain,
                    message: err.message,
                    matches_TIMED_OUT: err.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.TIMED_OUT)
                })

                // Check for GIO timeout error (locale-independent)
                if (err.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.TIMED_OUT)) {
                    logger.warn(`Device not reachable: ${device.name}`)
                    setErrorMessage("Device not reachable")
                }
                else {
                    // Get D-Bus remote error name (constant, not localized)
                    const remoteError = Gio.DBusError.get_remote_error(err)

                    if (remoteError === "org.bluez.Error.AuthenticationCanceled") {
                        logger.warn(`Pairing cancelled for ${device.name}`)
                        setErrorMessage("Pairing cancelled")
                    }
                    else if (remoteError === "org.bluez.Error.AuthenticationFailed") {
                        logger.warn(`Pairing rejected for ${device.name}`)
                        setErrorMessage("Pairing rejected")
                    }
                    else if (remoteError === "org.bluez.Error.ConnectionAttemptFailed") {
                        logger.warn(`Device not reachable: ${device.name}`)
                        setErrorMessage("Device not reachable")
                    }
                    else {
                        logger.error(`Pairing failed for ${device.name}:`, err)
                        setErrorMessage("Pairing failed")
                    }
                }
            } finally {
                pairingLock = false
            }
        }
    }

    const bluetooth = Bluetooth.get_default()

    const isConnectedBinding = createBinding(device, "connected")
    const isPairedBinding = createBinding(device, "paired")
    const isConnectingBinding = createBinding(device, "connecting")

    // Reactive computed values - automatically update when dependencies change
    const statusText = createComputed(() => {
        const pairing = isPairing()
        const connecting = isConnectingBinding.get()
        const connected = isConnectedBinding.get()
        const paired = isPairedBinding.get()

        if (pairing) return "Pairing..."
        if (connecting) return connected ? "Disconnecting..." : "Connecting..."
        if (connected) return "Connected"
        if (paired) return "Paired"
        return ""
    })

    const statusVisible = createComputed(() => {
        const pairing = isPairing()
        const error = errorMessage()
        const connecting = isConnectingBinding.get()
        const connected = isConnectedBinding.get()
        const paired = isPairedBinding.get()

        return pairing || (error === "" && (connecting || connected || paired))
    })

    const indicatorIcon = createComputed(() => {
        const error = errorMessage()
        if (error !== "") return "⚠"
        if (isPairing()) return "󰂴"
        if (isConnectingBinding.get()) return "󰂴"
        if (isConnectedBinding.get()) return uiIcons.check
        return ""
    })

    const indicatorVisible = createComputed(() => {
        const error = errorMessage()
        if (error !== "") return true
        if (isPairing()) return true
        return isConnectingBinding.get() || isConnectedBinding.get()
    })

    const buttonSensitive = createComputed(() => {
        return !isPairing() && !isConnectingBinding.get()
    })

    const handleForget = () => {
        if (!bluetooth?.adapter) return

        try {
            bluetooth.adapter.remove_device(device)
            logger.debug(`Removed device: ${device.name}`)
        } catch (err) {
            logger.error("Failed to remove device:", err)
        }
    }

    return (
        <box orientation={Gtk.Orientation.HORIZONTAL} spacing={4}>
            <button
                cssClasses={isConnectedBinding((c) =>
                    c ? ["bluetooth-item", "active"] : ["bluetooth-item"]
                )}
                onClicked={handleClick}
                sensitive={buttonSensitive}
                hexpand={true}
            >
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={12}
                    hexpand={true}
                >
                    {/* Device Icon */}
                    <label
                        label={getBluetoothDeviceIcon(device.icon || "bluetooth")}
                        cssClasses={["icon-label"]}
                    />

                    {/* Device Name */}
                    <label
                        label={device.name || "Unknown Device"}
                        xalign={0}
                        hexpand={true}
                        cssClasses={["body"]}
                    />

                    {/* Status Label */}
                    <label
                        label={statusText}
                        cssClasses={["caption"]}
                        visible={statusVisible}
                    />

                    {/* Error Label */}
                    <label
                        label={errorMessage}
                        cssClasses={["caption", "error"]}
                        visible={errorMessage((msg) => msg !== "")}
                    />

                    {/* Connecting/Connected/Error Indicator */}
                    <label
                        label={indicatorIcon}
                        cssClasses={["icon-label"]}
                        visible={indicatorVisible}
                    />
                </box>
            </button>

            {/* Forget/Remove Button */}
            <button
                cssClasses={["icon-button", "bluetooth-forget-button"]}
                onClicked={handleForget}
                visible={isPairedBinding}
                tooltipText="Forget this device"
            >
                <label label={uiIcons.trash} cssClasses={["icon-label"]} />
            </button>
        </box>
    )
}
