import { Gtk } from "ags/gtk4"
import { createBinding, createComputed } from "ags"
import UPower from "gi://UPowerGlib?version=1.0"
import { upower } from "../../lib/services"
import { getBatteryIcon } from "../ControlCenter/utils/icons"
import { showBatteryTooltip } from "./BatteryTooltip"

export default function BatteryIndicator() {
    // Hide if no UPower
    if (!upower) return <box visible={false} />

    const displayDevice = upower.get_display_device()

    // Hide if no battery
    if (!displayDevice || displayDevice.kind === UPower.DeviceKind.UNKNOWN) {
        return <box visible={false} />
    }

    // Reactive bindings
    const percentage = createBinding(displayDevice, "percentage")
    const state = createBinding(displayDevice, "state")

    const icon = createComputed(() =>
        getBatteryIcon(
            percentage(),
            state() === UPower.DeviceState.CHARGING,
            state() === UPower.DeviceState.FULLY_CHARGED
        )
    )

    // CSS classes for state
    const cssClass = createComputed(() => {
        const classes = ["battery-indicator"]
        const pct = percentage()
        if (pct <= 10) classes.push("battery-critical")
        else if (pct <= 20) classes.push("battery-low")
        if (state() === UPower.DeviceState.CHARGING) {
            classes.push("battery-charging")
        }
        return classes.join(" ")
    })

    return (
        <box
            class={cssClass}
            $={(self) => {
                const hoverController = new Gtk.EventControllerMotion()
                hoverController.connect("enter", () => {
                    let totalX = 0
                    let widget: Gtk.Widget | null = self
                    while (widget) {
                        totalX += widget.get_allocation().x
                        const parent = widget.get_parent()
                        if (!parent || parent === widget.get_root()) break
                        widget = parent
                    }
                    const buttonCenterX = totalX + (self.get_allocation().width / 2)
                    showBatteryTooltip(true, buttonCenterX)
                })
                hoverController.connect("leave", () => showBatteryTooltip(false))
                self.add_controller(hoverController)
            }}
        >
            <label label={icon} class="bar-icon" />
        </box>
    )
}
