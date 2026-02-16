/**
 * Shared type definitions for AGS shell components
 */

// Bluetooth Device interface
export interface BluetoothDevice {
    address: string
    adapter: string
    name: string
    paired: boolean
    connected: boolean
    connecting: boolean
    icon: string
    batteryPercentage: number // -1 if device has no battery
}

// WiFi Access Point interface
export interface WiFiAccessPoint {
    ssid: string
    bssid?: string
    flags: number
    wpaFlags: number
    rsnFlags: number
    strength: number
    frequency?: number
    active: boolean
}

// System Tray Item interface
export interface TrayItem {
    item_id: string
    menu_path: string
    tooltipMarkup: string
    menuModel: boolean
    activate: (x: number, y: number) => void
    disconnect: (signalId: number) => void
}

// GVariant wrapper types for D-Bus menu parsing
export type GVariantValue = GLib.Variant

export interface GVariantDict {
    lookup_value(key: string, expectedType: string | null): GLib.Variant | null
}

// Error type for catch blocks
export interface CatchError {
    message: string
    code?: string | number
    domain?: string
    matches?: (domain: any, code: any) => boolean
}

// Type guard for Error objects
export function isError(error: unknown): error is Error {
    return error instanceof Error
}

// Type guard for CatchError (GJS/GLib errors)
export function isCatchError(error: unknown): error is CatchError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error
    )
}

// Safe error message extraction
export function getErrorMessage(error: unknown): string {
    if (isError(error)) return error.message
    if (isCatchError(error)) return error.message
    if (typeof error === 'string') return error
    return 'Unknown error'
}
