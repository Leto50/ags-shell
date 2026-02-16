import { Astal } from "ags/gtk4"
import { logger } from "../../lib/logger"
import { onCleanup } from "ags"
import app from "ags/gtk4/app"
import { config } from "../../config"

export default function AppMenuButton() {
    return (
        <button
            class="bar-button app-menu-button bar-icon"
            label={config.bar.osIcon}
            onClicked={() => app.toggle_window("app-menu")}
            $={(self) => {
                let signalId: number | null = null
                let window: Astal.Window | null = null
                let retryCount = 0
                const MAX_RETRIES = 50

                const setupListener = () => {
                    window = app.get_window("app-menu")
                    if (!window) {
                        retryCount++
                        if (retryCount >= MAX_RETRIES) {
                            logger.error("AppMenu window not found after 5s, giving up")
                            return
                        }
                        setTimeout(setupListener, 100)
                        return
                    }

                    const updateClass = () => {
                        if (window!.visible) {
                            self.add_css_class("active")
                        } else {
                            self.remove_css_class("active")
                        }
                    }

                    signalId = window.connect("notify::visible", updateClass)
                    updateClass()
                }

                setupListener()

                onCleanup(() => {
                    if (signalId !== null && window) {
                        window.disconnect(signalId)
                    }
                })
            }}
        />
    )
}
