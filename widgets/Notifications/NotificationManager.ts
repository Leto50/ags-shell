import Notifd from "gi://AstalNotifd"
import { notification } from "../../lib/services"
import { config } from "../../config"
import app from "ags/gtk4/app"
import GObject from "gi://GObject"
import { createRoot } from "ags"

interface ActivePopup {
    id: number
    windowName: string
    height: number
    dismissTimeout: number | null
}

// Custom GObject class for signal emission
class NotificationManagerClass extends GObject.Object {
    static {
        GObject.registerClass({
            Signals: {
                'history-changed': {},
            },
        }, this)
    }
}

class NotificationManager {
    private activePopups: Map<number, ActivePopup> = new Map()
    private notificationHistory: Notifd.Notification[] = []
    private notifdSignalId: number | null = null
    private signaler = new NotificationManagerClass()

    constructor() {
        if (!notification) {
            console.warn("Notification service not available")
            return
        }

        // Load existing notifications from notifd
        try {
            const existingNotifs = notification.get_notifications()
            if (existingNotifs && existingNotifs.length > 0) {
                // Sort by timestamp (newest first)
                this.notificationHistory = [...existingNotifs].sort((a, b) => b.time - a.time)
                console.log(`📚 Loaded ${existingNotifs.length} existing notifications from history (sorted by time)`)
            }
        } catch (err) {
            console.warn("Failed to load existing notifications:", err)
        }

        // Listen for new notifications
        this.notifdSignalId = notification.connect('notified', (_: unknown, id: number) => {
            this.handleNotification(id)
        })

        console.log("✅ NotificationManager initialized")
    }

    private handleNotification(id: number): void {
        if (!notification) return

        const notif = notification.get_notification(id)
        if (!notif) {
            console.warn(`Notification ${id} not found`)
            return
        }

        console.log(`📬 New notification: ${notif.summary} (ID: ${id})`)

        // Add to history
        this.addToHistory(notif)

        // Check if we need to dismiss oldest popup to make room
        const maxVisible = config.notifications?.maxVisiblePopups || 3
        if (this.activePopups.size >= maxVisible) {
            // Dismiss oldest popup
            const oldestId = Array.from(this.activePopups.keys())[0]
            this.dismissPopup(oldestId)
        }

        // Calculate position for new popup
        const yOffset = this.calculateYOffset()

        // Create popup window dynamically
        this.createPopup(notif, yOffset)
    }

    private createPopup(notif: Notifd.Notification, yOffset: number): void {
        const windowName = `notification-popup-${notif.id}`

        // Import NotificationPopup dynamically to avoid circular dependencies
        import("./NotificationPopup").then(({ default: NotificationPopup }) => {
            // Create window in a root scope to have tracking context
            createRoot(() => {
                const popupWindow = NotificationPopup({
                    notification: notif,
                    onClose: () => this.dismissPopup(notif.id),
                    yOffset: yOffset
                })

                // Track popup (estimate height based on content)
                const estimatedHeight = this.estimatePopupHeight(notif)
                const timeout = this.setupAutoDismiss(notif.id)

                this.activePopups.set(notif.id, {
                    id: notif.id,
                    windowName: windowName,
                    height: estimatedHeight,
                    dismissTimeout: timeout
                })

                console.log(`  📍 Popup created at yOffset=${yOffset}px`)
            })
        }).catch(err => {
            console.error("Failed to load NotificationPopup:", err)
        })
    }

    private calculateYOffset(): number {
        const spacing = config.notifications?.popupSpacing || 8
        let totalOffset = 0

        for (const popup of this.activePopups.values()) {
            totalOffset += popup.height + spacing
        }

        return totalOffset
    }

    private estimatePopupHeight(notif: Notifd.Notification): number {
        // Base height: 60px (icon + header + summary)
        let height = 60

        // Add height for body text (if present)
        if (notif.body && notif.body.length > 0) {
            // Rough estimate: 20px per line, max 4 lines
            const estimatedLines = Math.min(Math.ceil(notif.body.length / 50), 4)
            height += estimatedLines * 20
        }

        // Add height for actions (if present)
        if (notif.actions && notif.actions.length > 0) {
            height += 40  // Action buttons row
        }

        // Add padding
        height += 24  // Top + bottom padding

        return height
    }

    private setupAutoDismiss(notifId: number): number | null {
        const timeout = config.notifications?.popupTimeout || 5000

        if (timeout <= 0) {
            return null  // No auto-dismiss
        }

        const timeoutId = setTimeout(() => {
            this.dismissPopup(notifId)
        }, timeout)

        return timeoutId as unknown as number
    }

    dismissPopup(notifId: number): void {
        const popup = this.activePopups.get(notifId)
        if (!popup) return

        console.log(`  ❌ Dismissing popup ${notifId}`)

        // Clear auto-dismiss timeout
        if (popup.dismissTimeout !== null) {
            clearTimeout(popup.dismissTimeout)
        }

        // Close window
        const window = app.get_window(popup.windowName)
        if (window) {
            window.visible = false
            // Window will be destroyed by GTK
        }

        // Remove from active popups
        this.activePopups.delete(notifId)

        // Recalculate positions for remaining popups
        this.recalculatePositions()
    }

    private recalculatePositions(): void {
        const spacing = config.notifications?.popupSpacing || 8
        let currentOffset = 0

        for (const popup of this.activePopups.values()) {
            const window = app.get_window(popup.windowName)
            if (window) {
                window.set_margin_top(10 + currentOffset)
            }
            currentOffset += popup.height + spacing
        }
    }

    private addToHistory(notif: Notifd.Notification): void {
        // Add to beginning of history
        this.notificationHistory = [notif, ...this.notificationHistory]

        // Limit history size to 50 notifications
        const maxHistory = 50
        if (this.notificationHistory.length > maxHistory) {
            this.notificationHistory = this.notificationHistory.slice(0, maxHistory)
        }

        // Emit signal for UI updates
        this.signaler.emit('history-changed')
    }

    getHistory(): Notifd.Notification[] {
        return this.notificationHistory
    }

    connectHistoryChanged(callback: () => void): number {
        return this.signaler.connect('history-changed', callback)
    }

    disconnectHistoryChanged(signalId: number): void {
        this.signaler.disconnect(signalId)
    }

    clearHistory(): void {
        console.log("🗑️  Clearing notification history")
        this.notificationHistory = []
        this.signaler.emit('history-changed')
    }

    removeFromHistory(notifId: number): void {
        this.notificationHistory = this.notificationHistory.filter(n => n.id !== notifId)
        this.signaler.emit('history-changed')
    }

    clearAllHistory(): void {
        console.log("🗑️ Clearing all notification history")

        // Dismiss all notifications from AstalNotifd first
        for (const notif of this.notificationHistory) {
            try {
                notif.dismiss()
            } catch (err) {
                // Ignore error - notification might already be dismissed
            }
        }

        // Clear local history
        this.notificationHistory = []
        this.signaler.emit('history-changed')
    }

    cleanup(): void {
        console.log("🧹 NotificationManager cleanup")

        // Disconnect from notifd service
        if (notification && this.notifdSignalId !== null) {
            notification.disconnect(this.notifdSignalId)
            this.notifdSignalId = null
        }

        // Clear all active popups
        for (const popup of this.activePopups.values()) {
            if (popup.dismissTimeout !== null) {
                clearTimeout(popup.dismissTimeout)
            }
        }
        this.activePopups.clear()

        // Clear history
        this.notificationHistory = []
    }
}

// Export singleton instance
export const notificationManager = new NotificationManager()
