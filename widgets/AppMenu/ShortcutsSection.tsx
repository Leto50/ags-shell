import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { logger } from "../../lib/logger"
import app from "ags/gtk4/app"

interface Shortcut {
    readonly icon: string
    readonly label: string
    readonly command: string
    readonly delay: number
}

const SHORTCUTS: readonly Shortcut[] = [
    { icon: "󰹑", label: "Screenshot", command: "hyprshot -m region", delay: 300 },
    { icon: "󰈋", label: "Picker", command: "hyprpicker -a", delay: 300 },
]

function executeShortcut(shortcut: Shortcut) {
    app.toggle_window("app-menu")

    const run = () => {
        execAsync(shortcut.command).catch((err) => {
            logger.error(`Failed to execute ${shortcut.label}:`, err)
        })
    }

    if (shortcut.delay > 0) {
        setTimeout(run, shortcut.delay)
    } else {
        run()
    }
}

export default function ShortcutsSection() {
    return (
        <box spacing={15} homogeneous>
                {SHORTCUTS.map((shortcut) => (
                    <button
                        class="card card-padding"
                        onClicked={() => executeShortcut(shortcut)}
                        tooltipText={shortcut.label}
                    >
                        <label label={shortcut.icon} cssClasses={["icon-label"]} />
                    </button>
                ))}
        </box>
    )
}
