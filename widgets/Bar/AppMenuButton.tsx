import { Gtk } from "ags/gtk4"
import { config } from "../../config"

export default function AppMenuButton() {
    return (
        <button
            class="bar-button app-menu-button bar-icon"
            label={config.bar.osIcon}
            onClicked={() => console.log("App menu button clicked - TODO: implement menu")}
        />
    )
}
