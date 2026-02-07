import AstalWp from "gi://AstalWp"
import AstalNetwork from "gi://AstalNetwork"
import Notifd from "gi://AstalNotifd"
import Bluetooth from "gi://AstalBluetooth"
import Mpris from "gi://AstalMpris"
import Hyprland from "gi://AstalHyprland"

// Audio service (WirePlumber/PipeWire)
export let audio: AstalWp.Wp | null = null
export let speaker: AstalWp.Endpoint | null = null
try {
    audio = AstalWp.get_default()
    speaker = audio.get_default_speaker()
} catch (err) {
    console.error("Audio service unavailable:", err)
}

// Network service (NetworkManager)
export let network: AstalNetwork.Network | null = null
try {
    network = AstalNetwork.get_default()
} catch (err) {
    console.error("Network service unavailable:", err)
}

// Bluetooth service (optional - may not have hardware)
export let bluetooth: Bluetooth.Bluetooth | null = null
try {
    bluetooth = Bluetooth.get_default()
} catch (err) {
    console.warn("Bluetooth not available:", err)
}

// Notification service
export let notification: Notifd.Notifd | null = null
try {
    notification = Notifd.get_default()
} catch (err) {
    console.error("Notification service unavailable:", err)
}

// MPRIS (media players)
export let mpris: Mpris.Mpris | null = null
try {
    mpris = Mpris.get_default()
} catch (err) {
    console.warn("MPRIS service unavailable:", err)
}

// Hyprland compositor
export let hyprland: Hyprland.Hyprland | null = null
try {
    hyprland = Hyprland.get_default()
} catch (err) {
    console.error("Hyprland service unavailable:", err)
}
