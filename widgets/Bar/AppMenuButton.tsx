import { Gtk } from "ags/gtk4"
import { logger } from "../../lib/logger"
import { config } from "../../config"

export default function AppMenuButton() {
    return (
        <button
            class="bar-button app-menu-button bar-icon"
            label={config.bar.osIcon}
            onClicked={() => logger.debug("App menu button clicked - TODO: implement menu")}
        />
    )
}
