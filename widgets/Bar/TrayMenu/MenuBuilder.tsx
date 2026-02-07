import { Gtk, Astal } from "ags/gtk4"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { logger } from "../../../lib/logger"
import { MenuItem, formatShortcut } from "./MenuParser"

// Current menu navigation state
let currentMenuStack: { items: MenuItem[], title: string }[] = []

export function resetMenuStack(): void {
    currentMenuStack = []
}

export function buildMenuFromData(
    menuData: MenuItem[],
    box: Gtk.Box,
    busName: string,
    menuPath: string,
    menuWindow: Astal.Window | null,
    parentTitle?: string
): void {
    // Add back button if we're in a submenu
    if (parentTitle && currentMenuStack.length > 0) {
        const backBtn = new Gtk.Button({
            halign: Gtk.Align.FILL
        })
        backBtn.set_css_classes(["tray-menu-item", "back-button"])

        const backBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8
        })

        const backArrow = new Gtk.Label({
            label: '←',
            halign: Gtk.Align.START
        })
        backBox.append(backArrow)

        const backLabel = new Gtk.Label({
            label: parentTitle,
            halign: Gtk.Align.START,
            hexpand: true,
            xalign: 0
        })
        backBox.append(backLabel)

        backBtn.set_child(backBox)

        backBtn.connect("clicked", () => {
            if (currentMenuStack.length > 0) {
                const previous = currentMenuStack.pop()!
                // Clear and rebuild with previous menu
                while (box.get_first_child()) {
                    box.remove(box.get_first_child())
                }
                buildMenuFromData(
                    previous.items,
                    box,
                    busName,
                    menuPath,
                    menuWindow,
                    currentMenuStack.length > 0 ? currentMenuStack[currentMenuStack.length - 1].title : undefined
                )
            }
        })

        box.append(backBtn)

        // Add separator after back button
        const separator = new Gtk.Separator({
            orientation: Gtk.Orientation.HORIZONTAL
        })
        separator.set_css_classes(["tray-menu-separator"])
        box.append(separator)
    }

    for (const menuItem of menuData) {
        // Handle separators
        if (menuItem.type === 'separator') {
            const separator = new Gtk.Separator({
                orientation: Gtk.Orientation.HORIZONTAL
            })
            separator.set_css_classes(["tray-menu-separator"])
            box.append(separator)
            continue
        }

        // Strip mnemonics (underscores) from label
        let displayLabel = menuItem.label.replace(/_/g, '')

        // Add toggle indicator if present
        if (menuItem.toggleType) {
            if (menuItem.toggleType === 'checkmark') {
                displayLabel = (menuItem.toggleState === 1 ? '✓ ' : '  ') + displayLabel
            } else if (menuItem.toggleType === 'radio') {
                displayLabel = (menuItem.toggleState === 1 ? '● ' : '○ ') + displayLabel
            }
        }

        const btn = new Gtk.Button({
            halign: Gtk.Align.FILL,
            sensitive: menuItem.enabled
        })

        // Apply disposition styling
        const cssClasses = ["tray-menu-item"]
        if (menuItem.disposition) {
            cssClasses.push(`disposition-${menuItem.disposition}`)
        }
        btn.set_css_classes(cssClasses)

        // Set accessible description
        if (menuItem.accessibleDesc) {
            btn.set_tooltip_text(menuItem.accessibleDesc)
        }

        // Create button content with icon + label + shortcut/submenu indicator
        const btnBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8
        })

        // Add icon if present
        if (menuItem.iconName) {
            const icon = new Gtk.Image({
                iconName: menuItem.iconName,
                pixelSize: 16
            })
            btnBox.append(icon)
        } else if (menuItem.iconData) {
            // TODO: Handle custom icon data
            // This would require converting the byte array to a GdkPixbuf
            logger.debug('Icon data present but not yet implemented')
        }

        // Add label with max-width constraint
        const label = new Gtk.Label({
            label: displayLabel,
            halign: Gtk.Align.START,
            hexpand: true,
            xalign: 0,
            maxWidthChars: 40
        })
        btnBox.append(label)

        // Add shortcut or submenu indicator on the right
        if (menuItem.shortcut) {
            const shortcutText = formatShortcut(menuItem.shortcut)
            if (shortcutText) {
                const shortcutLabel = new Gtk.Label({
                    label: shortcutText,
                    halign: Gtk.Align.END
                })
                shortcutLabel.set_css_classes(["shortcut-label"])
                btnBox.append(shortcutLabel)
            }
        } else if (menuItem.childrenDisplay === 'submenu') {
            const arrow = new Gtk.Label({
                label: '→',
                halign: Gtk.Align.END
            })
            arrow.set_css_classes(["submenu-arrow"])
            btnBox.append(arrow)
        }

        btn.set_child(btnBox)

        // Handle click based on whether item has children
        const itemId = menuItem.id
        btn.connect("clicked", () => {
            // If item has children, navigate into submenu
            if (menuItem.children && menuItem.children.length > 0) {
                logger.debug(`Opening submenu: ${menuItem.label}`, {
                    itemCount: menuItem.children.length
                })

                // Save current menu to stack
                currentMenuStack = [
                    ...currentMenuStack,
                    {
                        items: menuData,
                        title: parentTitle || 'Menu'
                    }
                ]

                // Clear and rebuild with submenu items
                while (box.get_first_child()) {
                    box.remove(box.get_first_child())
                }
                buildMenuFromData(menuItem.children, box, busName, menuPath, menuWindow, menuItem.label)
            } else {
                // Regular item - send Event
                try {
                    logger.debug(`Activating menu item: ${itemId} "${menuItem.label}"`)

                    const connection = Gio.DBus.session

                    // Call Event(id, eventId, data, timestamp) method per DBusMenu protocol
                    connection.call(
                        busName,
                        menuPath,
                        'com.canonical.dbusmenu',
                        'Event',
                        new GLib.Variant('(isvu)', [
                            itemId,                          // id: INT32
                            'clicked',                       // eventId: STRING
                            new GLib.Variant('i', 0),       // data: VARIANT (empty)
                            0                                // timestamp: UINT32
                        ]),
                        null,
                        Gio.DBusCallFlags.NONE,
                        -1,
                        null,
                        (connection, result) => {
                            try {
                                connection.call_finish(result)
                                logger.debug(`Event sent for item ${itemId}`)
                            } catch (e) {
                                logger.error(`Event call failed for item ${itemId}:`, e)
                            }
                        }
                    )
                } catch (e) {
                    logger.error("Error sending Event:", e)
                }
                if (menuWindow) menuWindow.visible = false
            }
        })

        box.append(btn)
    }
}
