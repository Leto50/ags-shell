/**
 * Logger utility for AGS shell
 * Provides conditional logging based on debug mode
 */
import GLib from "gi://GLib"

const DEBUG_MODE = GLib.getenv("AGS_DEBUG") === "1" || GLib.getenv("AGS_DEBUG") === "true"

export const logger = {
  /**
   * Debug logs - only shown when AGS_DEBUG is set
   * Use for development/troubleshooting information
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (DEBUG_MODE) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  },

  /**
   * Info logs - general informational messages
   * Shown in production for important state changes
   */
  info: (message: string, ...args: unknown[]): void => {
    if (DEBUG_MODE) {
      console.log(`[INFO] ${message}`, ...args)
    }
  },

  /**
   * Warning logs - potential issues that aren't errors
   * Always shown
   */
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARN] ${message}`, ...args)
  },

  /**
   * Error logs - critical failures
   * Always shown
   */
  error: (message: string, ...args: unknown[]): void => {
    console.error(`[ERROR] ${message}`, ...args)
  },
}
