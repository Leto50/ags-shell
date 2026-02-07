import { Gtk } from "ags/gtk4"
import { logger } from "../../lib/logger"
import { onCleanup } from "ags"
import app from "ags/gtk4/app"

export default function ControlCenterToggle() {
    return (
        <button
            class="bar-button control-center-toggle"
            onClicked={() => app.toggle_window("control-center")}
            $={(self) => {
                let signalId: number | null = null
                let window: any = null
                let retryCount = 0
                const MAX_RETRIES = 50  // 5 seconds max (50 × 100ms)

                // Get window and setup listener
                const setupListener = () => {
                    window = app.get_window("control-center")
                    if (!window) {
                        retryCount++
                        if (retryCount >= MAX_RETRIES) {
                            logger.error("ControlCenter window not found after 5s, giving up")
                            return
                        }
                        // Window not ready yet, retry in a bit
                        setTimeout(setupListener, 100)
                        return
                    }

                    const updateClass = () => {
                        if (window.visible) {
                            self.add_css_class("active")
                        } else {
                            self.remove_css_class("active")
                        }
                    }

                    // Listen to visibility changes and save signal ID
                    signalId = window.connect("notify::visible", updateClass)

                    // Set initial state
                    updateClass()
                }

                setupListener()

                // Cleanup: disconnect signal when widget is destroyed
                onCleanup(() => {
                    if (signalId !== null && window) {
                        window.disconnect(signalId)
                    }
                })
            }}
        >
            <label label="" class="bar-icon" />
        </button>
    )
}
