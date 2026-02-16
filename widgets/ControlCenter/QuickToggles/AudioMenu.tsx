import { Gtk } from "ags/gtk4"
import { createBinding, For } from "ags"
import { logger } from "../../../lib/logger"
import { audio } from "../../../lib/services"
import { AudioItem } from "./AudioItem"
import { uiIcons } from "../utils/icons"

interface AudioMenuProps {
    onBack: () => void
}

export function AudioMenu({ onBack }: AudioMenuProps) {
    if (!audio) {
        return (
            <box orientation={Gtk.Orientation.VERTICAL} class="card card-padding">
                <label label="Audio service unavailable" cssClasses={["empty-label"]} />
            </box>
        )
    }

    const speakers = createBinding(audio.audio, "speakers")

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={0}
            class="card card-padding"
        >
            {/* Header with back button */}
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} cssClasses={["menu-header"]}>
                <button cssClasses={["icon-button"]} onClicked={onBack}>
                    <label label={uiIcons.back} cssClasses={["icon-label"]} />
                </button>
                <label label="Audio Output" cssClasses={["menu-title"]} xalign={0} hexpand={true} />
            </box>

            {/* Speakers List */}
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4} cssClasses={["devices-list"]}>
                {/* Empty state */}
                <box visible={speakers((s) => s.length === 0)}>
                    <label
                        label="No audio outputs found"
                        cssClasses={["empty-label"]}
                        halign={Gtk.Align.CENTER}
                        hexpand={true}
                    />
                </box>

                {/* Speaker endpoints */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={2}
                    visible={speakers((s) => s.length > 0)}
                >
                    <For each={speakers} key={(ep) => ep.id.toString()}>
                        {(endpoint) => <AudioItem endpoint={endpoint} />}
                    </For>
                </box>
            </box>

            {/* Settings Button */}
            <box cssClasses={["menu-footer"]}>
                <button
                    cssClasses={["settings-button"]}
                    hexpand={true}
                    onClicked={() => {
                        import("ags/process").then(({ execAsync }) => {
                            execAsync(["pavucontrol"]).catch((err) =>
                                logger.error("Failed to open pavucontrol:", err)
                            )
                        })
                    }}
                >
                    <box spacing={8}>
                        <label label={uiIcons.settings} cssClasses={["icon-label"]} />
                        <label label="Advanced Settings" />
                    </box>
                </button>
            </box>
        </box>
    )
}
