/**
 * Toast Widget
 * Displays toast notifications at the bottom-right of the screen
 */

import { Gtk, Astal } from "ags/gtk4"
import { toastManager, Toast } from "./ToastManager"
import { createState, onCleanup, For } from "ags"
import { uiIcons } from "../ControlCenter/utils/icons"

interface ToastItemProps {
    toast: Toast
}

function ToastItem({ toast }: ToastItemProps) {
    const getIcon = () => {
        switch (toast.type) {
            case "success":
                return "󰄬" // check
            case "error":
                return "󰅖" // close
            case "warning":
                return "⚠"  // warning
            case "info":
            default:
                return "󰋽" // info
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
            <label label={getIcon()} cssClasses={["icon-label"]} />
            <label label={toast.message} hexpand={true} xalign={0} wrap={true} maxWidthChars={40} />
            <button
                class="toast-close"
                onClicked={() => toastManager.dismiss(toast.id)}
            >
                <label label={uiIcons.close} cssClasses={["icon-label"]} />
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
                <For each={toasts}>
                    {(toast) => <ToastItem toast={toast} />}
                </For>
            </box>
        </window>
    )
}
