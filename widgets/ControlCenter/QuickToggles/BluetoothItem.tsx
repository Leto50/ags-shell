import { Gtk } from "ags/gtk4"
import { createBinding, createComputed, createState, createEffect } from "ags"
import Bluetooth from "gi://AstalBluetooth"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { logger } from "../../../lib/logger"

interface BluetoothItemProps {
    device: any
}

export function BluetoothItem({ device }: BluetoothItemProps) {
    const [errorMessage, setErrorMessage] = createState("")
    const [isPairing, setIsPairing] = createState(false)

    // Promisify D-Bus call method
    if (!Gio.DBusProxy.prototype.call_async) {
        Gio._promisify(Gio.DBusProxy.prototype, 'call', 'call_finish')
    }

    const pairDevice = async (): Promise<void> => {
        // Validate device object
        if (!device || !device.adapter || !device.address) {
            throw new Error("Invalid device object: missing adapter or address")
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
        if (device.connecting || isPairing()) return

        // Clear previous error
        setErrorMessage("")

        if (device.connected) {
            // Disconnect
            device.disconnect_device(() => {
                const success = !device.connected
                console.info(`Disconnection ${success ? "successful" : "failed"} for ${device.name}`)
                if (!success) {
                    setErrorMessage("Failed to disconnect")
                }
            })
        } else if (device.paired) {
            // Connect (already paired)
            device.connect_device(() => {
                const success = device.connected
                console.info(`Connection ${success ? "successful" : "failed"} for ${device.name}`)
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
            } catch (err: any) {
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
        if (error !== "") return "dialog-warning-symbolic"
        if (isPairing()) return "bluetooth-acquiring-symbolic"
        if (isConnectingBinding.get()) return "bluetooth-acquiring-symbolic"
        if (isConnectedBinding.get()) return "object-select-symbolic"
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
                    <image iconName={device.icon || "bluetooth-symbolic"} />

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
                    <image
                        iconName={indicatorIcon}
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
                <image iconName="user-trash-symbolic" />
            </button>
        </box>
    )
}
