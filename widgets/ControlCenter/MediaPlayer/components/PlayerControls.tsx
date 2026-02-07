import { Gtk } from "ags/gtk4"
import Mpris from "gi://AstalMpris"

export function PlayerControls({ player }: { player: Mpris.Player }) {
  return (
    <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} halign={Gtk.Align.END} valign={Gtk.Align.CENTER}>
      <button class="circular button" onClicked={() => player.previous()}>
        <image icon-name="media-skip-backward-symbolic" />
      </button>

      <button class="circular button" onClicked={() => player.play_pause()}>
        <image
          icon-name={player.playback_status === Mpris.PlaybackStatus.PLAYING
            ? "media-playback-pause-symbolic"
            : "media-playback-start-symbolic"}
          $={(self) => {
            const signalId = player.connect("notify::playback-status", () => {
              self.iconName = player.playback_status === Mpris.PlaybackStatus.PLAYING
                ? "media-playback-pause-symbolic"
                : "media-playback-start-symbolic"
            })

            self.connect("destroy", () => {
              player.disconnect(signalId)
            })
          }}
        />
      </button>

      <button class="circular button" onClicked={() => player.next()}>
        <image icon-name="media-skip-forward-symbolic" />
      </button>
    </box>
  )
}
