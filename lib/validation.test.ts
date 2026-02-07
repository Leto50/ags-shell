/**
 * Tests for input validation functions
 */

import { describe, it, expect } from "vitest"
import { validateSSID, validateBluetoothMAC, validateAdapterPath } from "./validation"

describe("validateSSID", () => {
    it("should accept valid ASCII SSIDs", () => {
        expect(validateSSID("MyNetwork")).toBe(true)
        expect(validateSSID("WiFi-2.4GHz")).toBe(true)
        expect(validateSSID("Guest_Network")).toBe(true)
    })

    it("should accept SSIDs with spaces", () => {
        expect(validateSSID("My Network")).toBe(true)
        expect(validateSSID("Coffee Shop WiFi")).toBe(true)
    })

    it("should accept SSIDs with special characters", () => {
        expect(validateSSID("Starbucks WiFi (Free)")).toBe(true)
        expect(validateSSID("AT&T Guest")).toBe(true)
        expect(validateSSID("John's Network")).toBe(true)
        expect(validateSSID("WiFi@Home")).toBe(true)
        expect(validateSSID("Network#123")).toBe(true)
    })

    it("should accept UTF-8 SSIDs", () => {
        expect(validateSSID("Café WiFi")).toBe(true)
        expect(validateSSID("网络")).toBe(true)
        expect(validateSSID("日本語")).toBe(true)
    })

    it("should reject empty SSIDs", () => {
        expect(validateSSID("")).toBe(false)
    })

    it("should reject SSIDs longer than 32 bytes", () => {
        expect(validateSSID("a".repeat(33))).toBe(false)
        expect(validateSSID("VeryLongNetworkNameThatExceeds32Bytes")).toBe(false)
    })

    it("should reject SSIDs with null bytes", () => {
        expect(validateSSID("Network\x00")).toBe(false)
    })

    it("should reject SSIDs with control characters", () => {
        expect(validateSSID("Network\x01")).toBe(false)
        expect(validateSSID("Network\n")).toBe(false)
        expect(validateSSID("Network\t")).toBe(false)
        expect(validateSSID("Network\x1B")).toBe(false) // ESC
        expect(validateSSID("Network\x7F")).toBe(false) // DEL
    })

    it("should accept SSIDs at boundary (32 bytes)", () => {
        expect(validateSSID("a".repeat(32))).toBe(true)
        expect(validateSSID("12345678901234567890123456789012")).toBe(true)
    })
})

describe("validateBluetoothMAC", () => {
    it("should accept valid MAC addresses", () => {
        expect(validateBluetoothMAC("00:11:22:33:44:55")).toBe(true)
        expect(validateBluetoothMAC("AA:BB:CC:DD:EE:FF")).toBe(true)
        expect(validateBluetoothMAC("12:34:56:78:9A:BC")).toBe(true)
    })

    it("should accept lowercase MAC addresses", () => {
        expect(validateBluetoothMAC("aa:bb:cc:dd:ee:ff")).toBe(true)
    })

    it("should reject invalid formats", () => {
        expect(validateBluetoothMAC("00-11-22-33-44-55")).toBe(false) // Wrong separator
        expect(validateBluetoothMAC("00:11:22:33:44")).toBe(false) // Too short
        expect(validateBluetoothMAC("00:11:22:33:44:55:66")).toBe(false) // Too long
        expect(validateBluetoothMAC("GG:11:22:33:44:55")).toBe(false) // Invalid hex
        expect(validateBluetoothMAC("001122334455")).toBe(false) // No separator
    })

    it("should reject path traversal attempts", () => {
        expect(validateBluetoothMAC("../../../etc/passwd")).toBe(false)
        expect(validateBluetoothMAC("00:11/../passwd")).toBe(false)
    })
})

describe("validateAdapterPath", () => {
    it("should accept valid adapter paths", () => {
        expect(validateAdapterPath("/org/bluez/hci0")).toBe(true)
        expect(validateAdapterPath("/org/bluez/hci1")).toBe(true)
        expect(validateAdapterPath("/org/bluez/hci99")).toBe(true)
    })

    it("should reject invalid adapter paths", () => {
        expect(validateAdapterPath("/org/bluez/")).toBe(false)
        expect(validateAdapterPath("/org/bluez/hci")).toBe(false) // No number
        expect(validateAdapterPath("/org/bluez/hciX")).toBe(false) // Not a number
        expect(validateAdapterPath("/org/bluez/hci0/../../passwd")).toBe(false)
        expect(validateAdapterPath("/etc/passwd")).toBe(false)
        expect(validateAdapterPath("hci0")).toBe(false) // Relative path
    })
})
