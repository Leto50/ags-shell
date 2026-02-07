/**
 * Toast Widget
 * Displays toast notifications at the bottom-right of the screen
 */

import { Gtk, Astal } from "ags/gtk4"
import { toastManager, Toast } from "./ToastManager"
import { createState, onCleanup } from "ags"

interface ToastItemProps {
    toast: Toast
}

function ToastItem({ toast }: ToastItemProps) {
    const getIconName = () => {
        switch (toast.type) {
            case "success":
                return "emblem-ok-symbolic"
            case "error":
                return "dialog-error-symbolic"
            case "warning":
                return "dialog-warning-symbolic"
            case "info":
            default:
                return "dialog-information-symbolic"
        }
    }

    const getCssClass = () => {
        switch (toast.type) {
            case "success":
                return "toast-item toast-success"
            case "error":
                return "toast-item toast-error"
            case "warning":
                return "toast-item toast-warning"
            case "info":
            default:
                return "toast-item toast-info"
        }
    }

    return (
        <box class={getCssClass()} orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
            <image iconName={getIconName()} />
            <label label={toast.message} hexpand={true} xalign={0} wrap={true} maxWidthChars={40} />
            <button
                class="toast-close"
                onClicked={() => toastManager.dismiss(toast.id)}
            >
                <image iconName="window-close-symbolic" />
            </button>
        </box>
    )
}

export default function ToastContainer() {
    const [toasts, setToasts] = createState<Toast[]>([])

    const updateToasts = () => {
        setToasts(toastManager.getAllToasts())
    }

    // Listen to toast events
    const addedId = toastManager.connect("toast-added", () => {
        updateToasts()
    })

    const removedId = toastManager.connect("toast-removed", () => {
        updateToasts()
    })

    onCleanup(() => {
        toastManager.disconnect(addedId)
        toastManager.disconnect(removedId)
    })

    return (
        <window
            class="toast-window"
            name="toasts"
            namespace="toasts"
            visible={toasts((list) => list.length > 0)}
            layer={Astal.Layer.OVERLAY}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.RIGHT}
            marginBottom={20}
            marginRight={20}
        >
            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={8}
                valign={Gtk.Align.END}
                halign={Gtk.Align.END}
            >
                {toasts().map((toast) => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </box>
        </window>
    )
}
