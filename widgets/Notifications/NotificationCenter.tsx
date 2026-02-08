import { Gtk, Gdk, Astal, GLib } from "ags/gtk4"
import { logger } from "../../lib/logger"
import { onCleanup, For, createState, With, createComputed } from "ags"
import app from "ags/gtk4/app"
import { notificationManager } from "./NotificationManager"
import NotificationItem from "./NotificationItem"
import { config } from "../../config"
import { paginateItems } from "./utils/pagination"
import { uiIcons } from "../ControlCenter/utils/icons"

type Page = "calendar" | "notifications"

const NOTIFICATIONS_PER_PAGE = 10

export default function NotificationCenter() {
    let contentBox: Gtk.Box | null = null
    const [currentPage, setCurrentPage] = createState<Page>("calendar")
    const [notificationPage, setNotificationPage] = createState<number>(1)

    return (
        <window
            class="notification-center"
            name="notification-center"
            namespace="notification-center"
            visible={false}
            layer={Astal.Layer.TOP}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
            marginTop={config.menu.marginTop}
            marginRight={config.menu.marginRight}
            keymode={Astal.Keymode.EXCLUSIVE}
            application={app}
            $={(self) => {
                // Reset to calendar when opened
                self.connect("notify::visible", () => {
                    if (self.visible) {
                        setCurrentPage("calendar")
                        setNotificationPage(1)
                    }
                })

                // Escape key handler
                const keyController = new Gtk.EventControllerKey()
                keyController.connect("key-pressed", (_controller, keyval) => {
                    if (keyval === Gdk.KEY_Escape) {
                        self.visible = false
                        return true
                    }
                    return false
                })
                self.add_controller(keyController)

                // Click outside handler
                const clickController = new Gtk.GestureClick()
                clickController.set_propagation_phase(Gtk.PropagationPhase.BUBBLE)
                clickController.connect("pressed", (_gesture, _n, x, y) => {
                    if (!contentBox) return

                    try {
                        const allocation = contentBox.get_allocation()
                        const isOutside = x < allocation.x || x > allocation.x + allocation.width ||
                                        y < allocation.y || y > allocation.y + allocation.height

                        if (isOutside) {
                            self.visible = false
                        }
                    } catch (e) {
                        logger.warn("Failed to get notification center allocation:", e)
                    }
                })
                self.add_controller(clickController)

                // Cleanup
                onCleanup(() => {
                    logger.debug("🧹 Cleaning up NotificationCenter")
                })
            }}
        >
            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={15}
                class="notification-center-box"
                $={(self) => {
                    contentBox = self
                    self.set_overflow(Gtk.Overflow.HIDDEN)
                    self.set_size_request(340, -1)
                }}
            >
                {/* Tab Switcher */}
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} class="tab-switcher">
                    <button
                        class={currentPage((page) => page === "calendar" ? "tab-button active" : "tab-button")}
                        onClicked={() => setCurrentPage("calendar")}
                        hexpand={true}
                    >
                        <label label="Calendar" />
                    </button>
                    <button
                        class={currentPage((page) => page === "notifications" ? "tab-button active" : "tab-button")}
                        onClicked={() => setCurrentPage("notifications")}
                        hexpand={true}
                    >
                        <label label="Notifications" />
                    </button>
                </box>

                {/* Calendar Page */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    visible={currentPage((page) => page === "calendar")}
                >
                    <Gtk.Calendar
                        showHeading={true}
                        showDayNames={true}
                        showWeekNumbers={false}
                        halign={Gtk.Align.FILL}
                        valign={Gtk.Align.FILL}
                    />
                </box>

                {/* Notifications Page */}
                <With value={currentPage((page) => page === "notifications")}>
                    {(isNotifications) => isNotifications && (() => {
                        const [history, setHistory] = createState(notificationManager.getHistory())

                        // Watch for history changes
                        const historySignalId = notificationManager.connectHistoryChanged(() => {
                            setHistory(notificationManager.getHistory())
                        })

                        // Cleanup
                        onCleanup(() => {
                            notificationManager.disconnectHistoryChanged(historySignalId)
                        })

                        // Calculate pagination - depends on both history and notificationPage
                        const currentPageNotifications = createComputed([history, notificationPage], (h, p) => {
                            return paginateItems(h, p, NOTIFICATIONS_PER_PAGE).items
                        })

                        return (
                            <box
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={8}
                                vexpand={true}
                            >
                                {/* Empty state */}
                                <box
                                    class="card card-padding"
                                    hexpand={true}
                                    visible={history((h) => h.length === 0)}
                                >
                                    <label
                                        label="No notifications"
                                        cssClasses={["empty-label"]}
                                        halign={Gtk.Align.CENTER}
                                        hexpand={true}
                                    />
                                </box>

                                {/* Scrollable notifications list */}
                                <Gtk.ScrolledWindow
                                    vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                                    hscrollbarPolicy={Gtk.PolicyType.NEVER}
                                    vexpand={true}
                                    visible={history((h) => h.length > 0)}
                                >
                                    <box
                                        orientation={Gtk.Orientation.VERTICAL}
                                        halign={Gtk.Align.FILL}
                                        spacing={0}
                                        vexpand={true}
                                    >
                                        <box
                                            orientation={Gtk.Orientation.VERTICAL}
                                            spacing={8}
                                            vexpand={false}
                                            valign={Gtk.Align.START}
                                        >
                                            <For each={currentPageNotifications}>
                                                {(notif) => (
                                                    <box class="card">
                                                        <NotificationItem notification={notif} />
                                                    </box>
                                                )}
                                            </For>
                                        </box>
                                    </box>
                                </Gtk.ScrolledWindow>

                                {/* Pagination */}
                                <box
                                    orientation={Gtk.Orientation.HORIZONTAL}
                                    halign={Gtk.Align.CENTER}
                                    spacing={4}
                                    visible={history((h) => h.length > NOTIFICATIONS_PER_PAGE)}
                                    cssClasses={["notification-pager"]}
                                >
                                    {/* Previous button */}
                                    <button
                                        cssClasses={["pager-button"]}
                                        onClicked={() => setNotificationPage(Math.max(1, notificationPage.get() - 1))}
                                        sensitive={notificationPage((p) => p > 1)}
                                    >
                                        <label label="◀" />
                                    </button>

                                    {/* First page button */}
                                    <button
                                        cssClasses={notificationPage((p) => p === 1 ? ["pager-button", "active"] : ["pager-button"])}
                                        onClicked={() => setNotificationPage(1)}
                                    >
                                        <label label="1" />
                                    </button>

                                    {/* First ellipsis */}
                                    <label
                                        label="..."
                                        cssClasses={["pager-ellipsis"]}
                                        visible={notificationPage((p) => p > 3)}
                                    />

                                    {/* Previous page button (current - 1) */}
                                    <button
                                        cssClasses={["pager-button"]}
                                        visible={notificationPage((p) => {
                                            const total = Math.ceil(history.get().length / NOTIFICATIONS_PER_PAGE)
                                            return p > 2 && p - 1 >= 2 && p - 1 < total
                                        })}
                                        onClicked={() => setNotificationPage(notificationPage.get() - 1)}
                                    >
                                        <label label={notificationPage((p) => (p - 1).toString())} />
                                    </button>

                                    {/* Current page button */}
                                    <button
                                        cssClasses={["pager-button", "active"]}
                                        visible={notificationPage((p) => {
                                            const total = Math.ceil(history.get().length / NOTIFICATIONS_PER_PAGE)
                                            return p > 1 && p < total
                                        })}
                                        onClicked={() => {}}
                                    >
                                        <label label={notificationPage((p) => p.toString())} />
                                    </button>

                                    {/* Next page button (current + 1) */}
                                    <button
                                        cssClasses={["pager-button"]}
                                        visible={notificationPage((p) => {
                                            const total = Math.ceil(history.get().length / NOTIFICATIONS_PER_PAGE)
                                            return p < total - 1 && p + 1 <= total - 1
                                        })}
                                        onClicked={() => setNotificationPage(notificationPage.get() + 1)}
                                    >
                                        <label label={notificationPage((p) => (p + 1).toString())} />
                                    </button>

                                    {/* Last ellipsis */}
                                    <label
                                        label="..."
                                        cssClasses={["pager-ellipsis"]}
                                        visible={notificationPage((p) => {
                                            const total = Math.ceil(history.get().length / NOTIFICATIONS_PER_PAGE)
                                            return p < total - 2
                                        })}
                                    />

                                    {/* Last page button */}
                                    <button
                                        cssClasses={notificationPage((p) => {
                                            const total = Math.ceil(history.get().length / NOTIFICATIONS_PER_PAGE)
                                            return p === total ? ["pager-button", "active"] : ["pager-button"]
                                        })}
                                        visible={history((h) => Math.ceil(h.length / NOTIFICATIONS_PER_PAGE) > 1)}
                                        onClicked={() => {
                                            const total = Math.ceil(history.get().length / NOTIFICATIONS_PER_PAGE)
                                            setNotificationPage(total)
                                        }}
                                    >
                                        <label label={history((h) => Math.ceil(h.length / NOTIFICATIONS_PER_PAGE).toString())} />
                                    </button>

                                    {/* Next button */}
                                    <button
                                        cssClasses={["pager-button"]}
                                        onClicked={() => {
                                            const total = Math.ceil(history.get().length / NOTIFICATIONS_PER_PAGE)
                                            setNotificationPage(Math.min(total, notificationPage.get() + 1))
                                        }}
                                        sensitive={history((h) => {
                                            const total = Math.ceil(h.length / NOTIFICATIONS_PER_PAGE)
                                            return notificationPage.get() < total
                                        })}
                                    >
                                        <label label="▶" />
                                    </button>
                                </box>

                                {/* Separator before clear all */}
                                <box
                                    visible={history((h) => h.length > 0)}
                                    class="notification-separator"
                                />

                                {/* Clear all button */}
                                <box
                                    visible={history((h) => h.length > 0)}
                                >
                                    <button
                                        cssClasses={["clear-all-button"]}
                                        onClicked={() => notificationManager.clearAllHistory()}
                                        tooltipText="Clear all notifications"
                                        hexpand={true}
                                    >
                                        <box orientation={Gtk.Orientation.HORIZONTAL} spacing={6} halign={Gtk.Align.CENTER}>
                                            <label label={uiIcons.trash} cssClasses={["icon-label"]} />
                                            <label label="Clear all" />
                                        </box>
                                    </button>
                                </box>
                            </box>
                        )
                    })()}
                </With>
            </box>
        </window>
    )
}
