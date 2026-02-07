import { Gtk } from "ags/gtk4"
import { onCleanup } from "ags"
import { hyprland } from "../../lib/services"
import { config } from "../../config"

const appIcons: Record<string, string> = {
    "qBittorrent$": "",
    "rofi": "",
    "brave-browser": "󰖟",
    "chromium": "",
    "firefox": "󰈹",
    "floorp": "󰈹",
    "google-chrome": "",
    "microsoft-edge": "󰇩",
    "opera": "",
    "thorium": "󰖟",
    "tor-browser": "",
    "vivaldi": "󰖟",
    "waterfox": "󰖟",
    "zen": "",
    "^st$": "",
    "alacritty": "",
    "com.mitchellh.ghostty": "󰊠",
    "foot": "󰽒",
    "gnome-terminal": "",
    "kitty": "󰄛",
    "konsole": "",
    "tilix": "",
    "urxvt": "",
    "wezterm": "",
    "xterm": "",
    "DBeaver": "",
    "android-studio": "󰀴",
    "atom": "",
    "code": "󰨞",
    "docker": "",
    "eclipse": "",
    "emacs": "",
    "jetbrains-idea": "",
    "jetbrains-phpstorm": "",
    "jetbrains-pycharm": "",
    "jetbrains-webstorm": "",
    "neovide": "",
    "neovim": "",
    "netbeans": "",
    "sublime-text": "",
    "vim": "",
    "vscode": "󰨞",
    "discord": "",
    "legcord": "",
    "webcord": "",
    "org.telegram.desktop": "",
    "skype": "󰒯",
    "slack": "󰒱",
    "teams": "󰊻",
    "teamspeak": "",
    "telegram-desktop": "",
    "thunderbird": "",
    "vesktop": "",
    "whatsapp": "󰖣",
    "doublecmd": "󰝰",
    "krusader": "󰝰",
    "nautilus": "󰝰",
    "nemo": "󰝰",
    "org.kde.dolphin": "",
    "pcmanfm": "󰝰",
    "ranger": "󰝰",
    "thunar": "󰝰",
    "mpv": "",
    "plex": "󰚺",
    "rhythmbox": "󰓃",
    "ristretto": "󰋩",
    "spotify": "󰓇",
    "vlc": "󰕼",
    "blender": "󰂫",
    "gimp": "",
    "inkscape": "",
    "krita": "",
    "kdenlive": "",
    "csgo": "󰺵",
    "dota2": "󰺵",
    "heroic": "󰺵",
    "lutris": "󰺵",
    "minecraft": "󰍳",
    "steam": "",
    "evernote": "",
    "libreoffice-base": "",
    "libreoffice-calc": "",
    "libreoffice-draw": "",
    "libreoffice-impress": "",
    "libreoffice-math": "",
    "libreoffice-writer": "",
    "obsidian": "󱓧",
    "sioyek": "",
    "libreoffice": "",
    "title:LibreOffice": "",
    "soffice": "",
    "dropbox": "󰇣",
    "anki": "",
}

function getAppIcons(workspaceId: number): string {
    if (!hyprland) return ""
    const clients = hyprland.get_clients().filter(c => c.workspace.id === workspaceId)

    if (clients.length === 0) {
        return ""
    }

    const icons = clients.map(client => {
        // Use regex matching like HyprPanel does
        const matchedKey = Object.keys(appIcons).find(key => {
            try {
                // Case-insensitive regex match on class name
                return new RegExp(key, 'i').test(client.class)
            } catch {
                // Fallback to simple includes if regex fails
                return client.class.toLowerCase().includes(key.toLowerCase())
            }
        })
        return matchedKey ? appIcons[matchedKey] : ""
    }).filter(icon => icon !== "")

    // Remove duplicates using Set
    const uniqueIcons = [...new Set(icons)]

    return uniqueIcons.join(" ")
}

export default function WorkspaceButtons({ gdkmonitor }) {
    const monitorName = gdkmonitor.get_connector()

    return (
        <box
            spacing={config.workspaces.buttonSpacing}
            halign={Gtk.Align.START}
            $={(self) => {
                const rebuild = () => {
                    if (!hyprland) return

                    // Get current state
                    const allWorkspaces = hyprland.get_workspaces()
                    const focusedWs = hyprland.get_focused_workspace()
                    const allClients = hyprland.get_clients()

                    // Filter workspaces for this monitor
                    const workspaces = allWorkspaces
                        .filter(ws => ws.id > 0 && ws.id <= config.workspaces.maxDisplayed)
                        .filter(ws => ws.monitor?.name === monitorName)
                        .sort((a, b) => a.id - b.id)

                    // Clear and rebuild
                    while (self.get_first_child()) {
                        self.remove(self.get_first_child())
                    }

                    workspaces.forEach(ws => {
                        const isActive = focusedWs?.id === ws.id
                        const appIconsStr = getAppIcons(ws.id)

                        // Create button imperatively
                        const btn = new Gtk.Button({
                            hexpand: false,
                            vexpand: false
                        })
                        btn.set_css_classes(isActive ? ["bar-button", "workspace", "active"] : ["bar-button", "workspace"])
                        btn.connect("clicked", () => hyprland.dispatch("workspace", String(ws.id)))

                        // Single label like HyprPanel
                        const labelText = appIconsStr ? `${ws.id} ${appIconsStr}` : String(ws.id)

                        const label = new Gtk.Label({
                            label: labelText,
                            halign: Gtk.Align.CENTER,
                            valign: Gtk.Align.CENTER
                        })
                        label.set_css_classes(appIconsStr ? ["workspace-label-with-icons"] : ["workspace-label"])

                        btn.set_child(label)
                        self.append(btn)
                    })
                }

                // Initial build
                rebuild()

                // Listen to changes and save signal IDs
                let workspacesId: number | null = null
                let focusedId: number | null = null
                let clientsId: number | null = null

                if (hyprland) {
                    workspacesId = hyprland.connect("notify::workspaces", rebuild)
                    focusedId = hyprland.connect("notify::focused-workspace", rebuild)
                    clientsId = hyprland.connect("notify::clients", rebuild)
                }

                // Cleanup: disconnect all signals when widget is destroyed
                onCleanup(() => {
                    if (hyprland) {
                        if (workspacesId !== null) hyprland.disconnect(workspacesId)
                        if (focusedId !== null) hyprland.disconnect(focusedId)
                        if (clientsId !== null) hyprland.disconnect(clientsId)
                    }
                })
            }}
        />
    )
}
