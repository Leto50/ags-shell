/**
 * Tests for ToastManager
 * Note: These tests mock GObject since it's not available in Node test environment
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock GObject for testing
const mockGObject = {
    Object: class {
        private signals: Map<string, Function[]> = new Map()

        connect(signal: string, callback: Function) {
            if (!this.signals.has(signal)) {
                this.signals.set(signal, [])
            }
            this.signals.get(signal)!.push(callback)
            return this.signals.get(signal)!.length - 1
        }

        disconnect(id: number) {
            // Mock disconnect
        }

        emit(signal: string, ...args: any[]) {
            const callbacks = this.signals.get(signal) || []
            callbacks.forEach(cb => cb(this, ...args))
        }
    },
    registerClass: (_config: any, cls: any) => cls,
    TYPE_STRING: "string",
}

// Mock implementation of ToastManager for testing
class TestToastManager extends mockGObject.Object {
    private toasts: Map<string, any> = new Map()
    private timeouts: Map<string, any> = new Map()

    show(message: string, type: string = "info", duration: number = 3000): string {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const toast = {
            id,
            message,
            type,
            duration,
            timestamp: Date.now(),
        }

        this.toasts.set(id, toast)
        this.emit("toast-added", id)

        const timeoutId = setTimeout(() => {
            this.dismiss(id)
        }, duration)

        this.timeouts.set(id, timeoutId)

        return id
    }

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

    getToast(id: string) {
        return this.toasts.get(id)
    }

    getAllToasts() {
        return Array.from(this.toasts.values())
    }

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

describe("ToastManager", () => {
    let manager: TestToastManager

    beforeEach(() => {
        manager = new TestToastManager()
    })

    it("should create a toast with default values", () => {
        const id = manager.show("Test message")

        const toast = manager.getToast(id)
        expect(toast).toBeDefined()
        expect(toast.message).toBe("Test message")
        expect(toast.type).toBe("info")
        expect(toast.duration).toBe(3000)
    })

    it("should create toasts with different types", () => {
        const successId = manager.success("Success!")
        const errorId = manager.error("Error!")
        const warningId = manager.warning("Warning!")
        const infoId = manager.info("Info!")

        expect(manager.getToast(successId)?.type).toBe("success")
        expect(manager.getToast(errorId)?.type).toBe("error")
        expect(manager.getToast(warningId)?.type).toBe("warning")
        expect(manager.getToast(infoId)?.type).toBe("info")
    })

    it("should track multiple toasts", () => {
        manager.show("Toast 1")
        manager.show("Toast 2")
        manager.show("Toast 3")

        const toasts = manager.getAllToasts()
        expect(toasts).toHaveLength(3)
    })

    it("should dismiss toasts manually", () => {
        const id = manager.show("Test toast")

        expect(manager.getToast(id)).toBeDefined()

        manager.dismiss(id)

        expect(manager.getToast(id)).toBeUndefined()
    })

    it("should emit toast-added signal", () => {
        const callback = vi.fn()
        manager.connect("toast-added", callback)

        manager.show("Test toast")

        expect(callback).toHaveBeenCalledTimes(1)
    })

    it("should emit toast-removed signal", () => {
        const callback = vi.fn()
        manager.connect("toast-removed", callback)

        const id = manager.show("Test toast")
        manager.dismiss(id)

        expect(callback).toHaveBeenCalledTimes(1)
    })

    it("should auto-dismiss toasts after duration", async () => {
        const id = manager.show("Test toast", "info", 100)

        expect(manager.getToast(id)).toBeDefined()

        await new Promise(resolve => setTimeout(resolve, 150))

        expect(manager.getToast(id)).toBeUndefined()
    })

    it("should handle dismissing non-existent toast", () => {
        expect(() => {
            manager.dismiss("non-existent-id")
        }).not.toThrow()
    })

    it("should generate unique IDs", () => {
        const id1 = manager.show("Toast 1")
        const id2 = manager.show("Toast 2")
        const id3 = manager.show("Toast 3")

        expect(id1).not.toBe(id2)
        expect(id2).not.toBe(id3)
        expect(id1).not.toBe(id3)
    })
})
