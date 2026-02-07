import GLib from "gi://GLib"
import { logger } from "../../../lib/logger"

export interface MenuItem {
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

// Recursively parse a menu item variant and its children
export function parseMenuItem(itemVariant: any): MenuItem | null {
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
export function formatShortcut(shortcutVariant: any): string {
    if (!shortcutVariant) return ''

    try {
        // Shortcut is an array of arrays: [["Control", "c"], ["Shift", "Control", "c"]]
        // We take the first one
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
