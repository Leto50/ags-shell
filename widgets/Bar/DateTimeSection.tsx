import { Gtk } from "ags/gtk4"
import { logger } from "../../lib/logger"
import { createPoll } from "ags/time"
import { onCleanup } from "ags"
import app from "ags/gtk4/app"
import { config } from "../../config"

export default function DateTimeSection() {
    const time = createPoll("", 1000, () => {
        const now = new Date()
        const options: any = {}
        if (config.datetime.timeHour) options.hour = config.datetime.timeHour
        if (config.datetime.timeMinute) options.minute = config.datetime.timeMinute
        if (config.datetime.timeSecond) options.second = config.datetime.timeSecond
        return now.toLocaleTimeString(config.datetime.locale, options)
    })

    const date = createPoll("", 60000, () => {
        const now = new Date()
        const options: any = {}
        if (config.datetime.dateWeekday) options.weekday = config.datetime.dateWeekday
        if (config.datetime.dateDay) options.day = config.datetime.dateDay
        if (config.datetime.dateMonth) options.month = config.datetime.dateMonth
        if (config.datetime.dateYear) options.year = config.datetime.dateYear
        return now.toLocaleDateString(config.datetime.locale, options)
    })

    return (
        <button
            class="bar-button date-time-button"
            onClicked={() => app.toggle_window("notification-center")}
            $={(self) => {
                let signalId: number | null = null
                let window: any = null
                let retryCount = 0
                const MAX_RETRIES = 50  // 5 seconds max (50 × 100ms)

                // Get window and setup listener
                const setupListener = () => {
                    window = app.get_window("notification-center")
                    if (!window) {
                        retryCount++
                        if (retryCount >= MAX_RETRIES) {
                            logger.error("NotificationCenter window not found after 5s, giving up")
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
            <box spacing={config.datetime.labelSpacing} class="bar-center">
                <label label={date} class="bar-date" />
                <label label={time} class="bar-time" />
            </box>
        </button>
    )
}
