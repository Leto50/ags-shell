# AGS Custom Shell

Custom shell configuration built with [AGS](https://github.com/Aylur/ags) (Aylur's GTK Shell) using GTK4 for Hyprland compositor.

## Features

- **Top Bar**: Workspace buttons, system tray, date/time, control center toggle
- **Control Center**: Quick toggles (WiFi, Bluetooth, Audio, Brightness), media player with visualizer
- **Notification System**: Popup notifications with history management
- **System Tray**: D-Bus menu support with navigation

## Tech Stack

- TypeScript/GJS
- GTK4 via AGS framework
- Astal libraries (Network, Bluetooth, Audio, Tray)
- D-Bus integration for system operations

## Requirements

- AGS (latest version)
- Hyprland compositor
- AstalTray, AstalNetwork, AstalBluetooth, AstalWp (audio)
- nmcli (NetworkManager CLI)

## Installation

```bash
# Clone repository
git clone https://github.com/Leto50/ags-shell.git ~/.config/ags

# Install dependencies (if any)
cd ~/.config/ags
npm install  # If package.json exists

# Run AGS
ags
```

## Configuration

Main configuration file: `config.conf`

Edit values for colors, sizes, margins, and behavior.

## Structure

```
.
├── app.tsx                    # Main app entry
├── config.ts                  # Configuration parser
├── widgets/
│   ├── Bar/                   # Top bar components
│   ├── ControlCenter/         # Control center panel
│   └── Notifications/         # Notification system
└── lib/
    └── services.ts            # Service initialization
```

## License

MIT
