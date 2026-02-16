import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { logger } from "../../lib/logger"
import app from "ags/gtk4/app"

interface PowerAction {
    readonly icon: string
    readonly label: string
    readonly command: string
    readonly destructive: boolean
}

const POWER_ACTIONS: readonly PowerAction[] = [
    { icon: "󰐥", label: "Shutdown", command: "systemctl poweroff", destructive: true },
    { icon: "󰜉", label: "Reboot", command: "systemctl reboot", destructive: true },
    { icon: "󰍃", label: "Logout", command: "hyprctl dispatch exit", destructive: false },
    { icon: "󰌾", label: "Lock", command: "hyprlock", destructive: false },
]

function executeAction(action: PowerAction) {
    app.toggle_window("app-menu")
    execAsync(action.command).catch((err) => {
        logger.error(`Failed to execute ${action.label}:`, err)
    })
}

export default function PowerSection() {
    return (
        <box spacing={15} homogeneous>
            {POWER_ACTIONS.map((action) => (
                <button
                    class={`card card-padding${action.destructive ? " destructive" : ""}`}
                    onClicked={() => executeAction(action)}
                    tooltipText={action.label}
                >
                    <label label={action.icon} cssClasses={["icon-label"]} />
                </button>
            ))}
        </box>
    )
}
