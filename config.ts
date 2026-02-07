import GLib from "gi://GLib"

// Config structure with TypeScript types (camelCase - idiomatic)
export interface Config {
    bar: {
        osIcon: string
        marginTop: number
        marginHorizontal: number
        widgetSpacing: number
    }
    workspaces: {
        maxDisplayed: number
        buttonSpacing: number
    }
    systemTray: {
        iconSpacing: number
    }
    datetime: {
        locale: string
        timeHour: string
        timeMinute: string
        timeSecond: string
        dateWeekday: string
        dateDay: string
        dateMonth: string
        dateYear: string
        labelSpacing: number
    }
    menu: {
        marginTop: number
        marginRight: number
        marginLeft: number
    }
    mediaPlayer: {
        enableCava: boolean
        cavaStyle: string
        cavaColor: string
        blurRadius: number
        scrollSpeed: number
    }
    notifications: {
        popupTimeout: number
        maxVisiblePopups: number
        popupSpacing: number
        showActions: boolean
    }
}

// Default configuration
const DEFAULT_CONFIG: Config = {
    bar: {
        osIcon: "start-here-symbolic",
        marginTop: 15,
        marginHorizontal: 15,
        widgetSpacing: 4
    },
    workspaces: {
        maxDisplayed: 20,
        buttonSpacing: 4
    },
    systemTray: {
        iconSpacing: 2
    },
    datetime: {
        locale: "fr-FR",
        timeHour: "2-digit",
        timeMinute: "2-digit",
        timeSecond: "",
        dateWeekday: "short",
        dateDay: "numeric",
        dateMonth: "short",
        dateYear: "",
        labelSpacing: 8
    },
    menu: {
        marginTop: 10,
        marginRight: 15,
        marginLeft: 15
    },
    mediaPlayer: {
        enableCava: true,
        cavaStyle: "catmull_rom",
        cavaColor: "auto",
        blurRadius: 22,
        scrollSpeed: 0.4
    },
    notifications: {
        popupTimeout: 5000,
        maxVisiblePopups: 3,
        popupSpacing: 8,
        showActions: true
    }
}

// Convert snake_case to camelCase
function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// Recursively convert all keys from snake_case to camelCase
function convertKeysToCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(item => convertKeysToCamelCase(item))
    }

    if (obj !== null && typeof obj === 'object') {
        const converted: any = {}
        for (const key in obj) {
            const camelKey = snakeToCamel(key)
            converted[camelKey] = convertKeysToCamelCase(obj[key])
        }
        return converted
    }

    return obj
}

// Simple TOML parser for our config structure
function parseSimpleToml(content: string): any {
    const config: any = {}
    let currentSection: string[] = []

    const lines = content.split('\n')

    for (const line of lines) {
        const trimmed = line.trim()

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue

        // Section header [section] or [section.subsection]
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const section = trimmed.slice(1, -1)
            currentSection = section.split('.')
            continue
        }

        // Key = value (keep snake_case from TOML for now)
        const match = trimmed.match(/^(\w+)\s*=\s*(.+)$/)
        if (!match) continue

        const [, key, valueStr] = match
        let value: any

        // Parse value
        if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
            // Array: ["item1", "item2"]
            const items = valueStr.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
            value = items.filter(s => s.length > 0)
        } else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
            // String: "value"
            value = valueStr.slice(1, -1)
        } else if (valueStr === 'true') {
            value = true
        } else if (valueStr === 'false') {
            value = false
        } else if (valueStr === 'null') {
            value = null
        } else if (!isNaN(Number(valueStr))) {
            // Number
            value = Number(valueStr)
        } else {
            // Unquoted string
            value = valueStr
        }

        // Set value in config object
        let target = config
        for (let i = 0; i < currentSection.length; i++) {
            const section = currentSection[i]
            if (i === currentSection.length - 1) {
                if (!target[section]) target[section] = {}
                target[section][key] = value
            } else {
                if (!target[section]) target[section] = {}
                target = target[section]
            }
        }
    }

    return config
}

// Validate configuration values
function validateConfig(config: any): string[] {
    const errors: string[] = []

    // Validate bar
    if (config.bar?.osIcon !== undefined) {
        if (typeof config.bar.osIcon !== 'string' || config.bar.osIcon.trim() === '') {
            errors.push('bar.osIcon must be a non-empty string')
        }
    }
    if (config.bar?.marginTop !== undefined) {
        if (typeof config.bar.marginTop !== 'number') {
            errors.push('bar.marginTop must be a number')
        } else if (config.bar.marginTop < 0) {
            errors.push('bar.marginTop must be >= 0')
        }
    }
    if (config.bar?.marginHorizontal !== undefined) {
        if (typeof config.bar.marginHorizontal !== 'number') {
            errors.push('bar.marginHorizontal must be a number')
        } else if (config.bar.marginHorizontal < 0) {
            errors.push('bar.marginHorizontal must be >= 0')
        }
    }
    if (config.bar?.widgetSpacing !== undefined) {
        if (typeof config.bar.widgetSpacing !== 'number') {
            errors.push('bar.widgetSpacing must be a number')
        } else if (config.bar.widgetSpacing < 0) {
            errors.push('bar.widgetSpacing must be >= 0')
        }
    }

    // Validate workspaces
    if (config.workspaces?.maxDisplayed !== undefined) {
        if (typeof config.workspaces.maxDisplayed !== 'number') {
            errors.push('workspaces.maxDisplayed must be a number')
        } else if (config.workspaces.maxDisplayed <= 0) {
            errors.push('workspaces.maxDisplayed must be > 0')
        }
    }
    if (config.workspaces?.buttonSpacing !== undefined) {
        if (typeof config.workspaces.buttonSpacing !== 'number') {
            errors.push('workspaces.buttonSpacing must be a number')
        } else if (config.workspaces.buttonSpacing < 0) {
            errors.push('workspaces.buttonSpacing must be >= 0')
        }
    }

    // Validate systemTray
    if (config.systemTray?.iconSpacing !== undefined) {
        if (typeof config.systemTray.iconSpacing !== 'number') {
            errors.push('systemTray.iconSpacing must be a number')
        } else if (config.systemTray.iconSpacing < 0) {
            errors.push('systemTray.iconSpacing must be >= 0')
        }
    }

    // Validate datetime - use try/catch to let Intl.DateTimeFormat validate
    if (config.datetime) {
        // Type checks first
        if (config.datetime.locale !== undefined && typeof config.datetime.locale !== 'string') {
            errors.push('datetime.locale must be a string')
        }
        if (config.datetime.labelSpacing !== undefined) {
            if (typeof config.datetime.labelSpacing !== 'number') {
                errors.push('datetime.labelSpacing must be a number')
            } else if (config.datetime.labelSpacing < 0) {
                errors.push('datetime.labelSpacing must be >= 0')
            }
        }

        // Validate datetime format options by trying to create Intl.DateTimeFormat
        try {
            new Intl.DateTimeFormat(config.datetime.locale || 'en-US', {
                hour: config.datetime.timeHour || undefined,
                minute: config.datetime.timeMinute || undefined,
                second: config.datetime.timeSecond || undefined,
                weekday: config.datetime.dateWeekday || undefined,
                day: config.datetime.dateDay || undefined,
                month: config.datetime.dateMonth || undefined,
                year: config.datetime.dateYear || undefined
            })
        } catch (e) {
            errors.push(`datetime format options invalid: ${e.message}`)
        }
    }

    // Validate menu
    if (config.menu?.marginTop !== undefined) {
        if (typeof config.menu.marginTop !== 'number') {
            errors.push('menu.marginTop must be a number')
        } else if (config.menu.marginTop < 0) {
            errors.push('menu.marginTop must be >= 0')
        }
    }
    if (config.menu?.marginRight !== undefined) {
        if (typeof config.menu.marginRight !== 'number') {
            errors.push('menu.marginRight must be a number')
        } else if (config.menu.marginRight < 0) {
            errors.push('menu.marginRight must be >= 0')
        }
    }
    if (config.menu?.marginLeft !== undefined) {
        if (typeof config.menu.marginLeft !== 'number') {
            errors.push('menu.marginLeft must be a number')
        } else if (config.menu.marginLeft < 0) {
            errors.push('menu.marginLeft must be >= 0')
        }
    }

    // Validate mediaPlayer
    if (config.mediaPlayer?.enableCava !== undefined && typeof config.mediaPlayer.enableCava !== 'boolean') {
        errors.push('mediaPlayer.enableCava must be a boolean')
    }
    if (config.mediaPlayer?.cavaStyle !== undefined) {
        if (typeof config.mediaPlayer.cavaStyle !== 'string') {
            errors.push('mediaPlayer.cavaStyle must be a string')
        } else {
            const validStyles = ['catmull_rom', 'smooth', 'bars', 'dots']
            if (!validStyles.includes(config.mediaPlayer.cavaStyle)) {
                errors.push(`mediaPlayer.cavaStyle must be one of: ${validStyles.join(', ')}`)
            }
        }
    }
    if (config.mediaPlayer?.cavaColor !== undefined && typeof config.mediaPlayer.cavaColor !== 'string') {
        errors.push('mediaPlayer.cavaColor must be a string')
    }
    if (config.mediaPlayer?.blurRadius !== undefined) {
        if (typeof config.mediaPlayer.blurRadius !== 'number') {
            errors.push('mediaPlayer.blurRadius must be a number')
        } else if (config.mediaPlayer.blurRadius < 0) {
            errors.push('mediaPlayer.blurRadius must be >= 0')
        }
    }
    if (config.mediaPlayer?.scrollSpeed !== undefined) {
        if (typeof config.mediaPlayer.scrollSpeed !== 'number') {
            errors.push('mediaPlayer.scrollSpeed must be a number')
        } else if (config.mediaPlayer.scrollSpeed <= 0) {
            errors.push('mediaPlayer.scrollSpeed must be > 0')
        }
    }

    // Validate notifications
    if (config.notifications?.popupTimeout !== undefined) {
        if (typeof config.notifications.popupTimeout !== 'number') {
            errors.push('notifications.popupTimeout must be a number')
        } else if (config.notifications.popupTimeout < 0) {
            errors.push('notifications.popupTimeout must be >= 0')
        }
    }
    if (config.notifications?.maxVisiblePopups !== undefined) {
        if (typeof config.notifications.maxVisiblePopups !== 'number') {
            errors.push('notifications.maxVisiblePopups must be a number')
        } else if (config.notifications.maxVisiblePopups <= 0) {
            errors.push('notifications.maxVisiblePopups must be > 0')
        }
    }
    if (config.notifications?.popupSpacing !== undefined) {
        if (typeof config.notifications.popupSpacing !== 'number') {
            errors.push('notifications.popupSpacing must be a number')
        } else if (config.notifications.popupSpacing < 0) {
            errors.push('notifications.popupSpacing must be >= 0')
        }
    }
    if (config.notifications?.showActions !== undefined && typeof config.notifications.showActions !== 'boolean') {
        errors.push('notifications.showActions must be a boolean')
    }

    return errors
}

// Deep merge two objects
function deepMerge(target: any, source: any): any {
    const result = { ...target }

    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key])
        } else {
            result[key] = source[key]
        }
    }

    return result
}

// Remove invalid fields from config object by field path
function removeInvalidFields(obj: any, fieldPaths: string[]): any {
    const result = JSON.parse(JSON.stringify(obj)) // Deep copy

    fieldPaths.forEach(path => {
        const parts = path.split('.')
        let current = result

        // Navigate to parent object
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) return
            current = current[parts[i]]
        }

        // Delete the invalid field
        delete current[parts[parts.length - 1]]
    })

    return result
}

// Load configuration
function loadConfig(): Config {
    const configPath = `${GLib.get_home_dir()}/.config/ags/config.conf`

    try {
        // Check if config file exists
        if (!GLib.file_test(configPath, GLib.FileTest.EXISTS)) {
            console.log("📄 No config.conf found, using defaults")
            return DEFAULT_CONFIG
        }

        // Read config file
        const [success, contents] = GLib.file_get_contents(configPath)
        if (!success) {
            console.error("❌ Failed to read config.conf")
            return DEFAULT_CONFIG
        }

        const configText = new TextDecoder().decode(contents)
        console.log("📄 Loading config from:", configPath)

        // Parse TOML (snake_case from file)
        const parsedConfig = parseSimpleToml(configText)

        // Convert snake_case keys to camelCase
        const userConfig = convertKeysToCamelCase(parsedConfig)

        // Merge with defaults
        const config = deepMerge(DEFAULT_CONFIG, userConfig) as Config

        // Validate merged configuration
        const validationErrors = validateConfig(config)
        if (validationErrors.length > 0) {
            console.error("❌ Configuration validation errors:")
            validationErrors.forEach(err => console.error(`   - ${err}`))
            console.log("⚠️  Removing invalid fields, using defaults for those fields")

            // Extract field paths from error messages (e.g., "bar.osIcon must be..." → "bar.osIcon")
            const invalidFields = validationErrors.map(err => err.split(' ')[0])

            // Remove invalid fields from config
            const cleanedConfig = removeInvalidFields(config, invalidFields)

            // Merge cleaned config with defaults (defaults fill the removed fields)
            return deepMerge(DEFAULT_CONFIG, cleanedConfig) as Config
        }

        console.log("✅ Config loaded successfully")
        return config

    } catch (e) {
        console.error("❌ Error loading config:", e)
        return DEFAULT_CONFIG
    }
}

// Export singleton config instance
export const config = loadConfig()
