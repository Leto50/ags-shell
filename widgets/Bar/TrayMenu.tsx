import { Astal, Gtk, Gdk } from "ags/gtk4"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import app from "ags/gtk4/app"
import { config } from "../../config"
import { logger } from "../../lib/logger"

let contentBox: Gtk.Box | null = null
let menuWindow: Astal.Window | null = null

interface MenuItem {
    id: number
    label: string
    enabled: boolean
    toggleType?: string      // "checkmark" or "radio"
    toggleState?: number     // 0 = off, 1 = on
    type?: string            // "separator"
    iconName?: string
    iconData?: any           // Custom icon data
    shortcut?: any           // Keyboard shortcut
    disposition?: string     // "normal", "alert", "warning", "informative"
    childrenDisplay?: string // "submenu" for nested menus
    accessibleDesc?: string  // Accessibility description
    children?: MenuItem[]    // Child menu items for submenus
}

// Current menu navigation state
let currentMenuStack: { items: MenuItem[], title: string }[] = []

// Recursively parse a menu item variant and its children
function parseMenuItem(itemVariant: any): MenuItem | null {
    try {
        // Unwrap variant if needed
        let unwrapped = itemVariant
        if (itemVariant.get_type_string() === 'v') {
            unwrapped = itemVariant.get_variant()
        }

        // Each item is: (id INT32, properties DICT{sv}, children ARRAY)
        const itemId = unwrapped.get_child_value(0).get_int32()
        const propsDict = unwrapped.get_child_value(1)
        const childrenVariant = unwrapped.get_child_value(2)

        // Extract properties
        let label = ''
        let enabled = true
        let visible = true
        let toggleType: string | undefined
        let toggleState: number | undefined
        let type: string | undefined
        let iconName: string | undefined
        let iconData: any
        let shortcut: any
        let disposition: string | undefined
        let childrenDisplay: string | undefined
        let accessibleDesc: string | undefined

        const labelVariant = propsDict.lookup_value('label', null)
        if (labelVariant) label = labelVariant.get_string()[0]

        const enabledVariant = propsDict.lookup_value('enabled', null)
        if (enabledVariant) enabled = enabledVariant.get_boolean()

        const visibleVariant = propsDict.lookup_value('visible', null)
        if (visibleVariant) visible = visibleVariant.get_boolean()

        const toggleTypeVariant = propsDict.lookup_value('toggle-type', null)
        if (toggleTypeVariant) toggleType = toggleTypeVariant.get_string()[0]

        const toggleStateVariant = propsDict.lookup_value('toggle-state', null)
        if (toggleStateVariant) toggleState = toggleStateVariant.get_int32()

        const typeVariant = propsDict.lookup_value('type', null)
        if (typeVariant) type = typeVariant.get_string()[0]

        const iconNameVariant = propsDict.lookup_value('icon-name', null)
        if (iconNameVariant) iconName = iconNameVariant.get_string()[0]

        const iconDataVariant = propsDict.lookup_value('icon-data', null)
        if (iconDataVariant) iconData = iconDataVariant

        const shortcutVariant = propsDict.lookup_value('shortcut', null)
        if (shortcutVariant) shortcut = shortcutVariant

        const dispositionVariant = propsDict.lookup_value('disposition', null)
        if (dispositionVariant) disposition = dispositionVariant.get_string()[0]

        const childrenDisplayVariant = propsDict.lookup_value('children-display', null)
        if (childrenDisplayVariant) childrenDisplay = childrenDisplayVariant.get_string()[0]

        const accessibleDescVariant = propsDict.lookup_value('accessible-desc', null)
        if (accessibleDescVariant) accessibleDesc = accessibleDescVariant.get_string()[0]

        if (!visible) return null

        // Recursively parse children
        const childCount = childrenVariant.n_children()
        const children: MenuItem[] = Array.from(
            { length: childCount },
            (_, i) => parseMenuItem(childrenVariant.get_child_value(i))
        ).filter((item): item is MenuItem => item !== null)

        return {
            id: itemId,
            label,
            enabled,
            toggleType,
            toggleState,
            type,
            iconName,
            iconData,
            shortcut,
            disposition,
            childrenDisplay,
            accessibleDesc,
            children: children.length > 0 ? children : undefined
        }
    } catch (e) {
        logger.error("Error parsing menu item:", e)
        return null
    }
}

// Format shortcut from DBusMenu format to display string
function formatShortcut(shortcutVariant: any): string {
    if (!shortcutVariant) return ''

    try {
        // Shortcut is an array of arrays: [["Control", "c"], ["Shift", "Control", "c"]]
        // We take the first one
        const shortcuts = []
        const nShortcuts = shortcutVariant.n_children()

        if (nShortcuts === 0) return ''

        // Get first shortcut combination
        const firstShortcut = shortcutVariant.get_child_value(0)
        const nKeys = firstShortcut.n_children()

        const keys = []
        for (let i = 0; i < nKeys; i++) {
            const keyVariant = firstShortcut.get_child_value(i)
            const key = keyVariant.get_string()[0]

            // Map modifier names to symbols
            if (key === 'Control') keys.push('Ctrl')
            else if (key === 'Shift') keys.push('Shift')
            else if (key === 'Alt') keys.push('Alt')
            else if (key === 'Super') keys.push('Super')
            else keys.push(key.toUpperCase())
        }

        return keys.join('+')
    } catch (e) {
        logger.error('Error formatting shortcut:', e)
        return ''
    }
}

// Get ENTIRE menu structure via ONE DBus GetLayout() call!
async function getMenuLayoutViaDBus(itemId: string, menuPath: string): Promise<MenuItem[]> {
    try {
        // Parse bus name from item_id (e.g., ":1.50/org/ayatana/NotificationItem/proton_vpn_app")
        const busName = itemId.split('/')[0]

        logger.debug("Calling GetLayout on DBus:", { busName, menuPath })

        const connection = Gio.DBus.session

        // Call GetLayout(parentId=0, recursionDepth=-1, propertyNames=[...])
        // Wrap in Promise since GJS DBus.call requires a callback
        const result = await new Promise((resolve, reject) => {
            connection.call(
                busName,                          // bus_name
                menuPath,                         // object_path
                'com.canonical.dbusmenu',        // interface_name
                'GetLayout',                      // method_name
                new GLib.Variant('(iias)', [
                    0,                            // parentId: 0 = root
                    -1,                           // recursionDepth: -1 = infinite (get everything)
                    [
                        'label',
                        'enabled',
                        'visible',
                        'toggle-type',
                        'toggle-state',
                        'type',
                        'icon-name',
                        'icon-data',
                        'shortcut',
                        'disposition',
                        'children-display',
                        'accessible-desc'
                    ]  // All DBusMenu properties
                ]),
                null,                            // reply_type
                Gio.DBusCallFlags.NONE,
                -1,                              // timeout
                null,                            // cancellable
                (connection, result) => {        // callback
                    try {
                        const res = connection.call_finish(result)
                        resolve(res)
                    } catch (e) {
                        reject(e)
                    }
                }
            )
        })

        logger.debug("GetLayout returned successfully")

        // Parse the result: GetLayout returns (uint revision, (ia{sv}) layout)
        // Don't use deepUnpack - manually unpack the GVariant structure
        const revision = result.get_child_value(0).get_uint32()
        const layoutVariant = result.get_child_value(1)

        logger.debug("Menu revision:", revision)

        // Layout structure: (id INT32, properties DICT{sv}, children ARRAY of (ia{sv}as))
        const rootId = layoutVariant.get_child_value(0).get_int32()
        const rootProps = layoutVariant.get_child_value(1)
        const childrenVariant = layoutVariant.get_child_value(2)

        const childrenCount = childrenVariant.n_children()
        logger.debug("Parsing menu layout:", { rootId, childrenCount })

        // Process each child recursively
        const items = Array.from(
            { length: childrenCount },
            (_, i) => {
                const childItem = parseMenuItem(childrenVariant.get_child_value(i))
                if (childItem) {
                    logger.debug(`Menu item parsed: ${childItem.id} "${childItem.label}"`, {
                        childrenCount: childItem.children?.length || 0
                    })
                }
                return childItem
            }
        ).filter((item): item is MenuItem => item !== null)

        logger.debug(`Extracted ${items.length} menu items via GetLayout`)
        return items

    } catch (e) {
        logger.error("GetLayout call failed:", e)
        return []
    }
}

function buildMenuFromData(menuData: MenuItem[], box: Gtk.Box, busName: string, menuPath: string, parentTitle?: string) {
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
                buildMenuFromData(previous.items, box, busName, menuPath,
                    currentMenuStack.length > 0 ? currentMenuStack[currentMenuStack.length - 1].title : undefined)
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
                buildMenuFromData(menuItem.children, box, busName, menuPath, menuItem.label)
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

export async function showTrayMenu(item: any, buttonX: number) {
    logger.debug("showTrayMenu called", {
        itemId: item.item_id,
        menuPath: item.menu_path
    })

    if (!contentBox || !menuWindow) {
        logger.error("Missing contentBox or menuWindow!")
        return
    }

    // Clear old menu items and reset navigation
    while (contentBox.get_first_child()) {
        contentBox.remove(contentBox.get_first_child())
    }
    currentMenuStack = []

    try {
        // Get ENTIRE menu structure via ONE DBus GetLayout() call!
        const menuData = await getMenuLayoutViaDBus(item.item_id, item.menu_path)
        logger.debug(`Retrieved ${menuData.length} menu items from GetLayout`)

        // Extract busName and menuPath for Event calls
        const busName = item.item_id.split('/')[0]
        const menuPath = item.menu_path
        logger.debug("Extracted DBus info:", { busName, menuPath })

        // Position the menu
        if (buttonX && menuWindow) {
            const display = Gdk.Display.get_default()
            if (display) {
                const monitor = display.get_monitors().get_item(0)
                if (monitor) {
                    const geometry = monitor.get_geometry()
                    const distanceFromRight = geometry.width - buttonX
                    const finalMargin = Math.max(config.bar.marginHorizontal, distanceFromRight - 100)
                    logger.debug("Setting margin right:", finalMargin)
                    menuWindow.set_margin_right(finalMargin)
                }
            }
        }

        logger.debug("Building menu UI...")
        // Build menu from extracted data
        // Pass busName and menuPath for DBus Event calls
        buildMenuFromData(menuData, contentBox, busName, menuPath)
        logger.debug("Menu UI built")

        // Show window directly instead of toggle
        menuWindow.visible = true
        logger.debug("showTrayMenu completed successfully")
    } catch (e) {
        logger.error("Error showing tray menu:", e)
    }
}

export default function TrayMenu() {
    return (
        <window
            class="tray-menu-window"
            name="tray-menu"
            namespace="tray-menu"
            visible={false}
            layer={Astal.Layer.TOP}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
            marginTop={config.menu.marginTop}
            marginRight={config.menu.marginRight}
            keymode={Astal.Keymode.EXCLUSIVE}
            application={app}
            $={(self) => {
                menuWindow = self

                const keyController = new Gtk.EventControllerKey()
                keyController.connect("key-pressed", (_controller, keyval) => {
                    if (keyval === Gdk.KEY_Escape) {
                        logger.debug("Escape pressed, hiding menu")
                        self.visible = false
                        return true
                    }
                    return false
                })
                self.add_controller(keyController)

                const clickController = new Gtk.GestureClick()
                clickController.set_propagation_phase(Gtk.PropagationPhase.BUBBLE)
                clickController.connect("pressed", (_gesture, _n, x, y) => {
                    if (!contentBox) return
                    try {
                        const allocation = contentBox.get_allocation()
                        const isOutside = x < allocation.x || x > allocation.x + allocation.width ||
                                        y < allocation.y || y > allocation.y + allocation.height
                        if (isOutside) {
                            logger.debug("Click outside, hiding menu")
                            self.visible = false
                        }
                    } catch (e) {
                        logger.warn("Failed to get tray menu allocation:", e)
                    }
                })
                self.add_controller(clickController)
            }}
        >
            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={2}
                class="tray-menu-box"
                $={(self) => {
                    contentBox = self
                    self.set_overflow(Gtk.Overflow.HIDDEN)
                    self.set_size_request(200, -1)
                }}
            />
        </window>
    )
}
