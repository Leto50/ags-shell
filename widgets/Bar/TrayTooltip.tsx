import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { createState } from "ags"
import { config } from "../../config"

let tooltipWindow: Astal.Window | null = null
const [tooltipText, setTooltipText] = createState("")

export function showTrayTooltip(show: boolean, text?: string, buttonX?: number) {
    if (!tooltipWindow) return

    if (show && text && buttonX !== undefined) {
        setTooltipText(text)
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

export default function TrayTooltip() {
    return (
        <window
            class="tray-tooltip-window"
            name="tray-tooltip"
            namespace="tray-tooltip"
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
            <box class="tray-tooltip-box">
                <label label={tooltipText} />
            </box>
        </window>
    )
}
