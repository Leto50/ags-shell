/**
 * Input validation functions for security
 */

/**
 * Validate SSID format
 * SSIDs are 0-32 bytes, can contain any UTF-8 characters except control chars
 *
 * @param ssid - The SSID to validate
 * @returns true if valid, false otherwise
 */
export function validateSSID(ssid: string): boolean {
    if (!ssid || ssid.length === 0 || ssid.length > 32) {
        return false
    }

    // Reject null bytes and all control characters (space is allowed as \x20)
    if (/[\x00-\x1F\x7F]/.test(ssid)) {
        return false
    }

    return true
}

/**
 * Validate Bluetooth MAC address format (XX:XX:XX:XX:XX:XX)
 *
 * @param address - The MAC address to validate
 * @returns true if valid, false otherwise
 */
export function validateBluetoothMAC(address: string): boolean {
    const BLUETOOTH_MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/
    return BLUETOOTH_MAC_REGEX.test(address)
}

/**
 * Validate BlueZ adapter D-Bus path format (/org/bluez/hciX)
 *
 * @param path - The adapter path to validate
 * @returns true if valid, false otherwise
 */
export function validateAdapterPath(path: string): boolean {
    return /^\/org\/bluez\/hci\d+$/.test(path)
}
