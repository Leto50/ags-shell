import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { createBinding, createComputed } from "ags"
import UPower from "gi://UPowerGlib?version=1.0"
import { upower } from "../../lib/services"
import { config } from "../../config"

let tooltipWindow: Astal.Window | null = null

export function showBatteryTooltip(show: boolean, buttonX?: number) {
    if (!tooltipWindow) return

    if (show && buttonX !== undefined) {
        tooltipWindow.visible = true

        // Wait for widget to be allocated to get its width
        setTimeout(() => {
            const display = Gdk.Display.get_default()
            if (display) {
                const monitor = display.get_monitors().get_item(0)
                if (monitor) {
                    const geometry = monitor.get_geometry()
                    const tooltipWidth = tooltipWindow.get_allocation().width
                    const distanceFromRight = geometry.width - buttonX
                    const finalMargin = distanceFromRight - (tooltipWidth / 2)
                    tooltipWindow.set_margin_right(Math.max(config.bar.marginHorizontal, finalMargin))
                }
            }
        }, 10)
    } else {
        tooltipWindow.visible = show
    }
}

export default function BatteryTooltip() {
    if (!upower) return <box visible={false} />

    const displayDevice = upower.get_display_device()
    if (!displayDevice || displayDevice.kind === UPower.DeviceKind.UNKNOWN) {
        return <box visible={false} />
    }

    const percentage = createBinding(displayDevice, "percentage")
    const state = createBinding(displayDevice, "state")

    const tooltipText = createComputed(() => {
        const pct = Math.round(percentage())
        const currentState = state()

        if (currentState === UPower.DeviceState.CHARGING) {
            return `Batterie: ${pct}% (en charge)`
        } else if (currentState === UPower.DeviceState.FULLY_CHARGED) {
            return `Batterie: ${pct}% (chargée)`
        } else if (currentState === UPower.DeviceState.DISCHARGING) {
            return `Batterie: ${pct}%`
        }
        return `Batterie: ${pct}%`
    })

    return (
        <window
            class="battery-tooltip-window"
            name="battery-tooltip"
            namespace="battery-tooltip"
            visible={false}
            layer={Astal.Layer.TOP}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
            marginTop={config.menu.marginTop}
            marginRight={config.menu.marginRight}
            application={app}
            $={(self) => {
                tooltipWindow = self
            }}
        >
            <box class="battery-tooltip-box">
                <label label={tooltipText} />
            </box>
        </window>
    )
}
