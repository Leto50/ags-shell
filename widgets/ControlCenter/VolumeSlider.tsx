import { Gtk } from "ags/gtk4"
import { onCleanup } from "ags"
import { audio } from "../../lib/services"
import { uiIcons } from "./utils/icons"

type Page = "main" | "wifi" | "bluetooth" | "audio"

interface VolumeSliderProps {
    onNavigate?: (page: Page) => void
}

export default function VolumeSlider({ onNavigate }: VolumeSliderProps) {
    if (!audio) {
        return (
            <box
                orientation={Gtk.Orientation.VERTICAL}
                class="control-section card card-padding"
            >
                <label label="Volume" halign={Gtk.Align.START} class="caption-heading" />
                <label label="Audio service unavailable" halign={Gtk.Align.CENTER} class="error-message" />
            </box>
        )
    }

    const audioObj = audio.audio

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            class="control-section card card-padding"
        >
            {/* Header: label + device name button */}
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                <label label="Volume" halign={Gtk.Align.START} class="caption-heading" hexpand={true} />
                {onNavigate && (
                    <button
                        cssClasses={["audio-device-label"]}
                        onClicked={() => onNavigate("audio")}
                    >
                        <box spacing={4}>
                            <label
                                cssClasses={["caption"]}
                                ellipsize={3}
                                maxWidthChars={20}
                                $={(self) => {
                                    let currentSpeaker = audioObj.default_speaker
                                    let descSignalId: number | null = null

                                    const update = () => {
                                        self.label = currentSpeaker?.description ?? "No Output"
                                    }

                                    const connectDesc = () => {
                                        update()
                                        if (currentSpeaker) {
                                            descSignalId = currentSpeaker.connect("notify::description", update)
                                        }
                                    }

                                    const disconnectDesc = () => {
                                        if (descSignalId !== null && currentSpeaker) {
                                            currentSpeaker.disconnect(descSignalId)
                                            descSignalId = null
                                        }
                                    }

                                    connectDesc()

                                    const speakerSignalId = audioObj.connect("notify::default-speaker", () => {
                                        disconnectDesc()
                                        currentSpeaker = audioObj.default_speaker
                                        connectDesc()
                                    })

                                    onCleanup(() => {
                                        disconnectDesc()
                                        audioObj.disconnect(speakerSignalId)
                                    })
                                }}
                            />
                            <label label={uiIcons.chevronRight} cssClasses={["icon-label"]} />
                        </box>
                    </button>
                )}
            </box>
            <overlay>
                <slider
                    min={0}
                    max={1}
                    $={(self) => {
                        let currentSpeaker = audioObj.default_speaker
                        let volumeSignalId: number | null = null

                        const connectVolume = () => {
                            if (currentSpeaker) {
                                self.value = currentSpeaker.volume
                                volumeSignalId = currentSpeaker.connect("notify::volume", () => {
                                    self.value = currentSpeaker!.volume
                                })
                            }
                        }

                        const disconnectVolume = () => {
                            if (volumeSignalId !== null && currentSpeaker) {
                                currentSpeaker.disconnect(volumeSignalId)
                                volumeSignalId = null
                            }
                        }

                        connectVolume()

                        const speakerSignalId = audioObj.connect("notify::default-speaker", () => {
                            disconnectVolume()
                            currentSpeaker = audioObj.default_speaker
                            connectVolume()
                        })

                        const changeSignalId = self.connect("value-changed", () => {
                            if (currentSpeaker) {
                                currentSpeaker.volume = self.value
                            }
                        })

                        onCleanup(() => {
                            disconnectVolume()
                            audioObj.disconnect(speakerSignalId)
                            self.disconnect(changeSignalId)
                        })
                    }}
                    class="volume-slider"
                />
                <box
                    $type="overlay"
                    valign={Gtk.Align.CENTER}
                    class="icon-container"
                    $={(self) => {
                        self.set_can_target(false)
                    }}
                >
                    <image icon-name="audio-volume-high-symbolic" class="volume-icon"/>
                </box>
            </overlay>
        </box>
    )
}
