import { Gtk } from "ags/gtk4"
import { logger } from "../../lib/logger"
import Notifd from "gi://AstalNotifd"
import { notificationManager } from "./NotificationManager"
import { config } from "../../config"
import { uiIcons } from "../ControlCenter/utils/icons"

interface NotificationItemProps {
    notification: Notifd.Notification
}

export default function NotificationItem({ notification }: NotificationItemProps) {
    // Format relative time
    const getRelativeTime = (timestamp: number): string => {
        const now = Date.now()
        const diff = now - timestamp
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) return `${days}d ago`
        if (hours > 0) return `${hours}h ago`
        if (minutes > 0) return `${minutes}m ago`
        if (seconds > 5) return `${seconds}s ago`
        return "Just now"
    }

    // Dismiss notification
    const dismissNotification = () => {
        logger.debug(`Dismissing notification ${notification.id}`)

        // Try to dismiss from AstalNotifd (might fail if already dismissed)
        try {
            notification.dismiss()
        } catch (err) {
            // Ignore error - notification might already be dismissed
        }

        // Always remove from history
        notificationManager.removeFromHistory(notification.id)
    }

    const hasImage = !!(notification.image && notification.image.length > 0)

    return (
        <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} class="notification-item-wrapper">
            {/* Notification image (if available) */}
            {hasImage && (
                <image
                    class="notification-item-icon"
                    file={typeof notification.image === 'string' ? notification.image : undefined}
                    pixbuf={typeof notification.image !== 'string' ? notification.image : undefined}
                    pixelSize={32}
                />
            )}

            {/* App icon (only if no image) */}
            {!hasImage && notification.app_icon && (
                <image
                    file={notification.app_icon.startsWith('/') ? notification.app_icon : undefined}
                    iconName={!notification.app_icon.startsWith('/') ? notification.app_icon : undefined}
                    class="notification-item-icon"
                    pixelSize={32}
                />
            )}

            {/* Content */}
            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={4}
                hexpand={true}
                class="notification-item-content"
            >
                {/* Header: app name + time + close button */}
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <label
                        label={notification.app_name || "Notification"}
                        cssClasses={["notification-item-app-name"]}
                        halign={Gtk.Align.START}
                        hexpand={true}
                    />
                    <label
                        label={getRelativeTime(notification.time * 1000)}
                        cssClasses={["caption"]}
                        halign={Gtk.Align.END}
                    />
                    <button
                        cssClasses={["icon-button", "notification-item-close"]}
                        onClicked={dismissNotification}
                        tooltipText="Dismiss"
                        valign={Gtk.Align.START}
                    >
                        <label label={uiIcons.close} cssClasses={["icon-label"]} />
                    </button>
                </box>

                {/* Summary (title) */}
                {notification.summary && (
                    <label
                        label={notification.summary}
                        cssClasses={["notification-item-summary"]}
                        halign={Gtk.Align.START}
                        wrap={true}
                        xalign={0}
                        maxWidthChars={35}
                    />
                )}

                {/* Body text */}
                {notification.body && (
                    <label
                        label={notification.body}
                        cssClasses={["notification-item-body"]}
                        halign={Gtk.Align.START}
                        wrap={true}
                        xalign={0}
                        maxWidthChars={35}
                        lines={3}
                        ellipsize={3}  // END
                    />
                )}

                {/* Action buttons */}
                {config.notifications?.showActions !== false && notification.actions && notification.actions.length > 0 && (() => {
                    // Filter out "default" action and actions without labels
                    const visibleActions = notification.actions.filter((action: any) =>
                        action.id !== "default" && action.label?.trim()
                    )

                    if (visibleActions.length === 0) return null

                    return (
                        <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={8}
                            cssClasses={["notification-item-actions"]}
                        >
                            {visibleActions.map((action: any) => (
                                <button
                                    cssClasses={["notification-action-button"]}
                                    onClicked={() => {
                                        try {
                                            notification.invoke(action.id)
                                            dismissNotification()
                                        } catch (err) {
                                            logger.error("Failed to invoke action:", err)
                                        }
                                    }}
                                >
                                    <label label={action.label} />
                                </button>
                            ))}
                        </box>
                    )
                })()}
            </box>
        </box>
    )
}
