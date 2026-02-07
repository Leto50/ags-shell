import { Gtk } from "ags/gtk4"
import Mpris from "gi://AstalMpris"
import { ScrollingLabel } from "./ScrollingLabel"

export function PlayerInfo({ player }: { player: Mpris.Player }) {
  const formatArtistAlbum = (p: Mpris.Player) => {
    const artist = p.artist || "Unknown Artist"
    const album = p.album || ""
    return album ? `${artist} - ${album}` : artist
  }

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={2} valign={Gtk.Align.CENTER} hexpand={true} class="player-info">
      <ScrollingLabel player={player} property="title" />
      <ScrollingLabel player={player} property="artist" formatter={formatArtistAlbum} />
    </box>
  )
}
