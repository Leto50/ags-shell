/**
 * Icon mapping utilities - Maps GTK semantic icon names to Nerdfonts glyphs
 * Inspired by HyprPanel architecture for theme-independent icon rendering
 */

// WiFi signal strength icons
export const wifiIconMap = new Map<string, string>([
    ['network-wireless-acquiring', '󰤩'],
    ['network-wireless-connected', '󰤨'],
    ['network-wireless-encrypted', '󰤪'],
    ['network-wireless-hotspot', '󰤨'],
    ['network-wireless-no-route', '󰤩'],
    ['network-wireless-offline', '󰤮'],
    ['network-wireless-signal-excellent', '󰤨'],
    ['network-wireless-signal-good', '󰤥'],
    ['network-wireless-signal-ok', '󰤢'],
    ['network-wireless-signal-weak', '󰤟'],
    ['network-wireless-signal-none', '󰤯'],
    ['network-wireless-disabled', '󰤭'],
])

/**
 * Get WiFi icon from signal strength or state
 * @param iconName GTK icon name (e.g., 'network-wireless-signal-good')
 * @param enabled Whether WiFi is enabled
 * @returns Nerdfonts glyph
 */
export const getWifiIcon = (iconName?: string, enabled: boolean = true): string => {
    if (!enabled) {
        return '󰤭' // Disabled
    }

    if (!iconName) {
        return '󰤨' // Default connected
    }

    return wifiIconMap.get(iconName) ?? '󰤨'
}

/**
 * Get WiFi icon from signal strength percentage
 * @param strength Signal strength (0-100)
 * @returns Nerdfonts glyph
 */
export const getWifiIconFromStrength = (strength: number): string => {
    if (strength >= 80) return '󰤨' // Excellent
    if (strength >= 60) return '󰤥' // Good
    if (strength >= 40) return '󰤢' // OK
    if (strength >= 1) return '󰤟'  // Weak
    return '󰤯' // None
}

// Bluetooth device type icons with regex patterns
const bluetoothDeviceIconMap: [RegExp, string][] = [
    [/^audio-card/i, '󰎄'],
    [/^audio-headphones/i, '󰋋'],
    [/^audio-headset/i, '󰋎'],
    [/^audio-input/i, '󰍬'],
    [/^audio-speakers/i, '󰓃'],
    [/^bluetooth/i, '󰂯'],
    [/^camera/i, '󰄀'],
    [/^computer/i, '󰟀'],
    [/^input-gaming/i, '󰖺'],
    [/^input-keyboard/i, '󰌌'],
    [/^input-mouse/i, '󰍽'],
    [/^input-tablet/i, '󰓶'],
    [/^video-display/i, '󰔂'],
    [/^tv/i, '󰔂'],
    [/^multimedia/i, '󰔂'],
    [/^media/i, '󱛟'],
    [/^modem/i, '󱂇'],
    [/^network/i, '󱂇'],
    [/^phone/i, '󰄞'],
    [/^printer/i, '󰐪'],
    [/^scanner/i, '󰚫'],
    [/^video-camera/i, '󰕧'],
]

/**
 * Get Bluetooth device icon from GTK icon name
 * @param iconName GTK icon name (e.g., 'audio-headphones-symbolic')
 * @returns Nerdfonts glyph
 */
export const getBluetoothDeviceIcon = (iconName: string): string => {
    const cleanName = iconName.replace(/-symbolic$/, '')

    for (const [pattern, icon] of bluetoothDeviceIconMap) {
        if (pattern.test(cleanName)) {
            return icon
        }
    }

    return '󰂯' // Fallback to generic Bluetooth
}

/**
 * Get Bluetooth state icon
 * @param enabled Whether Bluetooth is enabled
 * @param connected Whether a device is connected
 * @returns Nerdfonts glyph
 */
export const getBluetoothIcon = (enabled: boolean, connected: boolean = false): string => {
    if (!enabled) {
        return '󰂲' // Disabled
    }

    if (connected) {
        return '󰂱' // Connected
    }

    return '󰂯' // Enabled
}

// Audio/Volume icons
export const audioIconMap = new Map<string, string>([
    ['audio-volume-high', '󰕾'],
    ['audio-volume-medium', '󰖀'],
    ['audio-volume-low', '󰕿'],
    ['audio-volume-muted', '󰖁'],
    ['microphone-sensitivity-high', '󰍬'],
    ['microphone-sensitivity-medium', '󰍬'],
    ['microphone-sensitivity-low', '󰍬'],
    ['microphone-sensitivity-muted', '󰍭'],
])

/**
 * Get audio volume icon from level
 * @param level Volume level (0-100)
 * @param muted Whether audio is muted
 * @returns Nerdfonts glyph
 */
export const getVolumeIcon = (level: number, muted: boolean = false): string => {
    if (muted || level === 0) {
        return '󰖁' // Muted
    }

    if (level >= 70) return '󰕾' // High
    if (level >= 30) return '󰖀' // Medium
    return '󰕿' // Low
}

/**
 * Get microphone icon
 * @param muted Whether microphone is muted
 * @returns Nerdfonts glyph
 */
export const getMicrophoneIcon = (muted: boolean = false): string => {
    return muted ? '󰍭' : '󰍬'
}

// Battery level icons
const batteryIcons: Record<number, string> = {
    0: '󰂎',
    10: '󰁺',
    20: '󰁻',
    30: '󰁼',
    40: '󰁽',
    50: '󰁾',
    60: '󰁿',
    70: '󰂀',
    80: '󰂁',
    90: '󰂂',
    100: '󰁹',
}

const batteryIconsCharging: Record<number, string> = {
    0: '󰢟',
    10: '󰢜',
    20: '󰂆',
    30: '󰂇',
    40: '󰂈',
    50: '󰢝',
    60: '󰂉',
    70: '󰢞',
    80: '󰂊',
    90: '󰂋',
    100: '󰂅',
}

/**
 * Get battery icon from percentage and charging state
 * @param percentage Battery level (0-100)
 * @param charging Whether battery is charging
 * @param charged Whether battery is fully charged
 * @returns Nerdfonts glyph
 */
export const getBatteryIcon = (
    percentage: number,
    charging: boolean = false,
    charged: boolean = false
): string => {
    if (charged) {
        return '󱟢' // Fully charged
    }

    const percentages = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0]
    const threshold = percentages.find((p) => p <= percentage) ?? 100

    return charging ? batteryIconsCharging[threshold] : batteryIcons[threshold]
}

// Common UI icons
export const uiIcons = {
    back: '󰁍',
    forward: '󰁔',
    refresh: '󰑐',
    settings: '󰒓',
    close: '󰅖',
    check: '󰄬',
    chevronRight: '󰅂',
    chevronDown: '󰅀',
    trash: '󰩺',
    edit: '󰏫',
    add: '󰐕',
    remove: '󰍴',
    search: '󰍉',
    menu: '󰍜',
    dots: '󰇘',
} as const

/**
 * Get UI icon by name
 * @param name Icon name from uiIcons
 * @returns Nerdfonts glyph
 */
export const getUIIcon = (name: keyof typeof uiIcons): string => {
    return uiIcons[name]
}
