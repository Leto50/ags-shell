import { Gtk } from "ags/gtk4"
import { logger } from "../../lib/logger"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { createBinding, createState } from "ags"
import { execAsync } from "ags/process"
import { network, bluetooth, notification } from "../../lib/services"
import { uiIcons } from "./utils/icons"

interface QuickTogglesProps {
    onNavigate: (page: "wifi" | "bluetooth") => void
}

function ToggleButton({ icon_bind, on_click, className }) {
    return (
        <button
            class={className}
            onClicked={on_click}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
        >
          <label label={icon_bind} cssClasses={["icon-label"]} />
        </button>
    )
}

function CardButton({ icon_bind, on_click, className }) {
    return (
        <button
            class={className}
            onClicked={on_click}
        >
          <label label={icon_bind} cssClasses={["icon-label"]} />
        </button>
    )
}

export default function QuickToggles({ onNavigate }: QuickTogglesProps) {
    const wifiEnabledBinding = createBinding(network.wifi, "enabled")
    const bluetoothEnabledBinding = createBinding(bluetooth, "is-powered")
    const notificationEnabledBinding = createBinding(notification, "dont_disturb")

    // Idle inhibit state using D-Bus (org.freedesktop.ScreenSaver)
    // true = idle timeouts active, false = idle inhibited
    const [hypridleEnabled, setHypridleEnabled] = createState(true)
    const [inhibitCookie, setInhibitCookie] = createState<number | null>(null)

    const toggleHypridle = async () => {
        if (hypridleEnabled()) {
            // Disable idle: call D-Bus Inhibit
            try {
                const result = await new Promise<GLib.Variant>((resolve, reject) => {
                    Gio.DBus.session.call(
                        "org.freedesktop.ScreenSaver",
                        "/org/freedesktop/ScreenSaver",
                        "org.freedesktop.ScreenSaver",
                        "Inhibit",
                        new GLib.Variant("(ss)", ["AGS", "User disabled auto-idle"]),
                        new GLib.VariantType("(u)"),
                        Gio.DBusCallFlags.NONE,
                        -1,
                        null,
                        (connection, res) => {
                            try {
                                const result = connection.call_finish(res)
                                resolve(result)
                            } catch (e) {
                                reject(e)
                            }
                        }
                    )
                })
                const cookie = result?.get_child_value(0)?.get_uint32()
                if (cookie !== undefined) {
                    setInhibitCookie(cookie)
                    setHypridleEnabled(false)
                }
            } catch (err) {
                logger.error("Failed to inhibit idle:", err)
            }
        } else {
            // Enable idle: call D-Bus UnInhibit
            const cookie = inhibitCookie()
            if (cookie !== null) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        Gio.DBus.session.call(
                            "org.freedesktop.ScreenSaver",
                            "/org/freedesktop/ScreenSaver",
                            "org.freedesktop.ScreenSaver",
                            "UnInhibit",
                            new GLib.Variant("(u)", [cookie]),
                            null,
                            Gio.DBusCallFlags.NONE,
                            -1,
                            null,
                            (connection, res) => {
                                try {
                                    connection.call_finish(res)
                                    resolve()
                                } catch (e) {
                                    reject(e)
                                }
                            }
                        )
                    })
                    setInhibitCookie(null)
                    setHypridleEnabled(true)
                } catch (err) {
                    logger.error("Failed to uninhibit idle:", err)
                }
            }
        }
    }

    const wifiIconBinding = wifiEnabledBinding((e) =>
        e ? '󰤨' : '󰤭'
    )
    const bluetoothIconBinding = bluetoothEnabledBinding((e) =>
        e ? '󰂯' : '󰂲'
    )
    const notificationIconBinding = notificationEnabledBinding((e) =>
        e ? '󰂛' : '󰂚'
    )
    const hypridleIconBinding = hypridleEnabled((e) =>
        e ? '󰤄' : '󰖙'
    )

    const wifiClassBinding = wifiEnabledBinding((e) => e ? "active circular button" : "circular button")
    const bluetoothClassBinding = bluetoothEnabledBinding((e) => e ? "active circular button" : "circular button")
    const notificationClassBinding = notificationEnabledBinding((e) => e ? "active circular button" : "circular button")
    const hypridleClassBinding = hypridleEnabled((e) => e ? "active circular button" : "circular button")

    const wifiLabel = createBinding(network.wifi, "ssid")((ssid) =>
        ssid || (network.wifi.enabled ? "Not Connected" : "WiFi Off")
    )

    const bluetoothLabel = "Bluetooth"

    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={15}
        >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={15} class="card card-padding">
                {/* WiFi - Click to navigate */}
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={15}>
                    <ToggleButton
                        className={wifiClassBinding}
                        icon_bind={wifiIconBinding}
                        on_click={() => network.wifi.enabled = !network.wifi.enabled}
                    />
                    <button
                        class="nav-label-button"
                        onClicked={() => onNavigate("wifi")}
                    >
                        <box spacing={8}>
                            <label label={wifiLabel} class="body" xalign={0} hexpand={true} />
                            <label label={uiIcons.chevronRight} cssClasses={["icon-label"]} />
                        </box>
                    </button>
                </box>

                {/* Bluetooth - Click to navigate */}
                {bluetooth ? (
                    <box orientation={Gtk.Orientation.HORIZONTAL} spacing={15}>
                        <ToggleButton
                            className={bluetoothClassBinding}
                            icon_bind={bluetoothIconBinding}
                            on_click={() => bluetooth.toggle()}
                        />
                        <button
                            class="nav-label-button"
                            onClicked={() => onNavigate("bluetooth")}
                        >
                            <box spacing={8}>
                                <label label={bluetoothLabel} class="body" xalign={0} hexpand={true} />
                                <label label={uiIcons.chevronRight} cssClasses={["icon-label"]} />
                            </box>
                        </button>
                    </box>
                ) : (
                    <box orientation={Gtk.Orientation.HORIZONTAL} spacing={15}>
                        <button class="circular" sensitive={false}>
                            <label label="󰂲" cssClasses={["icon-label"]} />
                        </button>
                        <label label="Bluetooth ⚠️" class="body"/>
                    </box>
                )}

                {/* Idle Toggle */}
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={15}>
                    <ToggleButton
                        className={hypridleClassBinding}
                        icon_bind={hypridleIconBinding}
                        on_click={toggleHypridle}
                    />
                    <label label="Idle" class="body" />
                </box>
            </box>

            <box orientation={Gtk.Orientation.VERTICAL}
                homogeneous={true}
                spacing={15}
            >
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={15} class="card card-padding">
                    <ToggleButton
                        className={notificationClassBinding}
                        icon_bind={notificationIconBinding}
                        on_click={() => notification.set_dont_disturb(!notification.dont_disturb)}
                    />
                    <label label="Do Not Disturb" class="body" hexpand={true} halign={Gtk.Align.FILL} xalign={0} />
                </box>

                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={15}
                    homogeneous={true}
                >
                    <CardButton
                        className="card card-padding"
                        icon_bind="󰒲"
                        on_click={() => execAsync(["sh", "-c", "systemctl suspend || loginctl suspend"]).catch((err) => logger.error("Failed to suspend:", err))}
                    />
                    <CardButton
                        className="card card-padding"
                        icon_bind="󰄜"
                        on_click={() => {}}
                    />
                </box>
            </box>
        </box>
    )
}
