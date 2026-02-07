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

// Helper to check if notification has an image
const notifHasImg = (notif: Notifd.Notification): boolean => {
    return !!(notif.image && notif.image.length > 0)
}

export default function NotificationPopup({ notification, onClose, yOffset }: NotificationPopupProps) {
    const windowName = `notification-popup-${notification.id}`
    const hasImage = notifHasImg(notification)

    // Debug: log ALL notification properties
    console.log(`=== NOTIFICATION ${notification.id} ===`)
    console.log("app_name:", notification.app_name)
    console.log("app_icon:", notification.app_icon)
    console.log("summary:", notification.summary)
    console.log("body:", notification.body)
    console.log("image:", notification.image)
    console.log("actions:", notification.actions)
    console.log("actions.length:", notification.actions?.length)
    if (notification.actions && notification.actions.length > 0) {
        notification.actions.forEach((action: any, i: number) => {
            console.log(`  action[${i}]:`, action)
            console.log(`  action[${i}].id:`, action.id)
            console.log(`  action[${i}].label:`, action.label)
        })
    }
    console.log("===========================")

    // Auto-dismiss timeout state
    let dismissTimeout: number | null = null
    let isPaused = false

    // Actions reveal state
    let actionsRevealer: Gtk.Revealer | null = null
    const showActionsOnHover = config.notifications?.showActionsOnHover ?? false

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
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={12}
                $={(self) => {
                    // Right click gesture
                    const rightClickGesture = new Gtk.GestureClick()
                    rightClickGesture.set_button(3)  // Right click
                    rightClickGesture.connect("pressed", () => {
                        logger.debug(`  🖱️  Right-click dismiss notification ${notification.id}`)
                        onClose()
                    })
                    self.add_controller(rightClickGesture)

                    // Hover controller for actions reveal
                    if (showActionsOnHover) {
                        const hoverController = new Gtk.EventControllerMotion()
                        hoverController.connect("enter", () => {
                            if (actionsRevealer) {
                                actionsRevealer.revealChild = true
                            }
                        })
                        hoverController.connect("leave", () => {
                            if (actionsRevealer) {
                                actionsRevealer.revealChild = false
                            }
                        })
                        self.add_controller(hoverController)
                    }
                }}
            >
                    {/* Large notification image (if available) */}
                    {hasImage && (
                        <box
                            class="notification-image-container"
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                        >
                            <Gtk.Picture
                                class="notification-image"
                                pixbuf={notification.image}
                                contentFit={Gtk.ContentFit.COVER}
                                canShrink={false}
                            />
                        </box>
                    )}

                    {/* App icon (only if no large image) */}
                    {!hasImage && notification.app_icon && (
                        <image
                            file={notification.app_icon.startsWith('/') ? notification.app_icon : undefined}
                            icon-name={!notification.app_icon.startsWith('/') ? notification.app_icon : undefined}
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
                    {/* Header with app name, time, and close button */}
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        class="notification-header"
                    >
                        <label
                            label={notification.app_name || "Notification"}
                            class="notification-app-name"
                            halign={Gtk.Align.START}
                            hexpand={false}
                        />
                        <label
                            label={GLib.DateTime.new_from_unix_local(notification.time).format("%H:%M") || ""}
                            class="notification-time"
                            halign={Gtk.Align.END}
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
                        max-width-chars={hasImage ? 19 : 30}
                    />

                    {/* Body text */}
                    {notification.body && (
                        <label
                            label={notification.body}
                            class="notification-body"
                            halign={Gtk.Align.START}
                            wrap={true}
                            max-width-chars={hasImage ? 28 : 35}
                            lines={2}
                            ellipsize={3}  // END
                        />
                    )}

                    {/* Action buttons */}
                    {config.notifications?.showActions !== false && notification.actions && notification.actions.length > 0 && (() => {
                        // Filter out "default" action and actions without labels
                        const visibleActions = notification.actions.filter((action: NotificationAction) =>
                            action.id !== "default" && action.label?.trim()
                        )

                        if (visibleActions.length === 0) return null

                        return (
                            <Gtk.Revealer
                                transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
                                transitionDuration={200}
                                revealChild={!showActionsOnHover}
                                $={(self) => {
                                    actionsRevealer = self
                                }}
                            >
                                <box
                                    orientation={Gtk.Orientation.HORIZONTAL}
                                    class="notification-actions"
                                    spacing={8}
                                >
                                    {visibleActions.map((action: NotificationAction) => (
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
                            </Gtk.Revealer>
                        )
                    })()}
                </box>
            </box>
        </window>
    )
}
