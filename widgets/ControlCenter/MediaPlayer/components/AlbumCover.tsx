import { Gtk } from "ags/gtk4"
import Mpris from "gi://AstalMpris"
import { cropAndScaleImage } from "../utils/image"

export function AlbumCover({ player }: { player: Mpris.Player }) {
  return (
    <Gtk.Frame class="album-cover-box">
      <image
        pixelSize={52}
        $={(self) => {
          const update = () => {
            if (player.coverArt) {
              try {
                const scaled = cropAndScaleImage(player.coverArt, 52)
                self.set_from_pixbuf(scaled)
              } catch (e) {
                self.set_from_icon_name("folder-music-symbolic")
              }
            } else {
              self.set_from_icon_name("folder-music-symbolic")
            }
          }

          update()
          const signalId = player.connect("notify::cover-art", update)

          self.connect("destroy", () => {
            player.disconnect(signalId)
          })
        }}
      />
    </Gtk.Frame>
  )
}
