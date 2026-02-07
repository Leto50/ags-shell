import { Gtk, Gdk, Astal } from "ags/gtk4"
import { onCleanup } from "ags"
import Notifd from "gi://AstalNotifd"
import GLib from "gi://GLib"
import app from "ags/gtk4/app"
import { config } from "../../config"
import { logger } from "../../lib/logger"

interface NotificationAction {
    id: string
    label: string
}

interface NotificationPopupProps {
    notification: Notifd.Notification
    onClose: () => void
    yOffset: number
}

export default function NotificationPopup({ notification, onClose, yOffset }: NotificationPopupProps) {
    const windowName = `notification-popup-${notification.id}`

    // Auto-dismiss timeout state
    let dismissTimeout: number | null = null
    let isPaused = false

    // Setup auto-dismiss
    const setupAutoDismiss = () => {
        const timeout = config.notifications?.popupTimeout || 5000
        if (timeout <= 0) return

        dismissTimeout = setTimeout(() => {
            logger.debug(`  ⏱️  Auto-dismissing notification ${notification.id}`)
            onClose()
        }, timeout) as unknown as number
    }

    const pauseAutoDismiss = () => {
        if (dismissTimeout !== null && !isPaused) {
            clearTimeout(dismissTimeout)
            dismissTimeout = null
            isPaused = true
            logger.debug(`  ⏸️  Paused auto-dismiss for notification ${notification.id}`)
        }
    }

    const resumeAutoDismiss = () => {
        if (isPaused) {
            setupAutoDismiss()
            isPaused = false
            logger.debug(`  ▶️  Resumed auto-dismiss for notification ${notification.id}`)
        }
    }

    // Get urgency class
    const getUrgencyClass = () => {
        switch (notification.urgency) {
            case Notifd.Urgency.LOW:
                return "urgency-low"
            case Notifd.Urgency.CRITICAL:
                return "urgency-critical"
            default:
                return "urgency-normal"
        }
    }

    return (
        <window
            name={windowName}
            namespace="notification-popup"
            class={`notification-popup ${getUrgencyClass()}`}
            visible={true}
            layer={Astal.Layer.OVERLAY}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
            marginTop={10 + yOffset}
            marginRight={15}
            keymode={Astal.Keymode.NONE}
            application={app}
            $={(self) => {
                // Start auto-dismiss timer
                setupAutoDismiss()

                // Mouse enter/leave handlers for pause/resume
                const motionController = new Gtk.EventControllerMotion()

                motionController.connect("enter", () => {
                    pauseAutoDismiss()
                })

                motionController.connect("leave", () => {
                    resumeAutoDismiss()
                })

                self.add_controller(motionController)

                // Listen for notification resolution (external dismiss)
                let resolvedSignalId: number | null = null
                try {
                    resolvedSignalId = notification.connect('resolved', () => {
                        logger.debug(`  🔔 Notification ${notification.id} resolved externally`)
                        onClose()
                    })
                } catch (err) {
                    logger.warn(`Failed to connect to resolved signal for notification ${notification.id}:`, err)
                }

                // Cleanup on destroy
                onCleanup(() => {
                    logger.debug(`  🧹 Cleaning up popup ${notification.id}`)

                    if (dismissTimeout !== null) {
                        clearTimeout(dismissTimeout)
                        dismissTimeout = null
                    }

                    if (resolvedSignalId !== null) {
                        try {
                            notification.disconnect(resolvedSignalId)
                        } catch (err) {
                            // Notification might have been dismissed already
                        }
                    }
                })
            }}
        >
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                {/* App icon */}
                {notification.app_icon && (
                    <image
                        icon-name={notification.app_icon}
                        class="notification-icon"
                        pixel-size={32}
                    />
                )}

                {/* Content */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    class="notification-content"
                    hexpand={true}
                    spacing={4}
                >
                    {/* Header with app name and close button */}
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        class="notification-header"
                    >
                        <label
                            label={notification.app_name || "Notification"}
                            class="notification-app-name"
                            halign={Gtk.Align.START}
                            hexpand={true}
                        />
                        <button
                            class="notification-close"
                            onClicked={onClose}
                            valign={Gtk.Align.START}
                        >
                            <image icon-name="window-close-symbolic" pixel-size={16} />
                        </button>
                    </box>

                    {/* Summary (title) */}
                    <label
                        label={notification.summary || ""}
                        class="notification-summary"
                        halign={Gtk.Align.START}
                        wrap={true}
                        max-width-chars={40}
                    />

                    {/* Body text */}
                    {notification.body && (
                        <label
                            label={notification.body}
                            class="notification-body"
                            halign={Gtk.Align.START}
                            wrap={true}
                            max-width-chars={40}
                            lines={4}
                            ellipsize={3}  // END
                        />
                    )}

                    {/* Action buttons */}
                    {config.notifications?.showActions !== false && notification.actions && notification.actions.length > 0 && (
                        <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            class="notification-actions"
                            spacing={8}
                        >
                            {notification.actions.map((action: NotificationAction) => (
                                <button
                                    class="notification-action-button"
                                    onClicked={() => {
                                        logger.debug(`  🔘 Invoking action: ${action.id}`)
                                        notification.invoke(action.id)
                                        onClose()
                                    }}
                                >
                                    <label label={action.label} />
                                </button>
                            ))}
                        </box>
                    )}
                </box>
            </box>
        </window>
    )
}
