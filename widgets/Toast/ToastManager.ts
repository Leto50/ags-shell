/**
 * Toast Notification Manager
 * Singleton for displaying temporary toast messages (success, error, info, warning)
 */

import GObject from "gi://GObject"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
    id: string
    message: string
    type: ToastType
    duration: number
    timestamp: number
}

class ToastManagerClass extends GObject.Object {
    static {
        GObject.registerClass(
            {
                Signals: {
                    "toast-added": {
                        param_types: [GObject.TYPE_STRING], // Toast ID
                    },
                    "toast-removed": {
                        param_types: [GObject.TYPE_STRING], // Toast ID
                    },
                },
            },
            this
        )
    }

    private toasts: Map<string, Toast> = new Map()
    private timeouts: Map<string, number> = new Map()

    /**
     * Show a toast message
     */
    show(message: string, type: ToastType = "info", duration: number = 3000): string {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const toast: Toast = {
            id,
            message,
            type,
            duration,
            timestamp: Date.now(),
        }

        this.toasts.set(id, toast)
        this.emit("toast-added", id)

        // Auto-dismiss after duration
        const timeoutId = setTimeout(() => {
            this.dismiss(id)
        }, duration)

        this.timeouts.set(id, timeoutId)

        return id
    }

    /**
     * Dismiss a toast by ID
     */
    dismiss(id: string): void {
        const timeoutId = this.timeouts.get(id)
        if (timeoutId) {
            clearTimeout(timeoutId)
            this.timeouts.delete(id)
        }

        if (this.toasts.has(id)) {
            this.toasts.delete(id)
            this.emit("toast-removed", id)
        }
    }

    /**
     * Get a toast by ID
     */
    getToast(id: string): Toast | undefined {
        return this.toasts.get(id)
    }

    /**
     * Get all active toasts
     */
    getAllToasts(): Toast[] {
        return Array.from(this.toasts.values())
    }

    /**
     * Convenience methods
     */
    success(message: string, duration?: number): string {
        return this.show(message, "success", duration)
    }

    error(message: string, duration?: number): string {
        return this.show(message, "error", duration)
    }

    info(message: string, duration?: number): string {
        return this.show(message, "info", duration)
    }

    warning(message: string, duration?: number): string {
        return this.show(message, "warning", duration)
    }
}

// Singleton instance
export const toastManager = new ToastManagerClass()
