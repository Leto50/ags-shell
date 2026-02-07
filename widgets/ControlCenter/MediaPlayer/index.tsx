import { Gtk } from "ags/gtk4"
import Gio from "gi://Gio"
import Mpris from "gi://AstalMpris"
import { bind, createBinding, createState, With } from "ags"
import { AlbumCover } from "./components/AlbumCover"
import { PlayerInfo } from "./components/PlayerInfo"
import { PlayerControls } from "./components/PlayerControls"
import { CavaDraw } from "./cava/CavaWidget"
import { activePlayers, filterActivePlayers, findPlayer } from "./utils/mpris"
import { generateBlurredBackground } from "./utils/image"
import { config } from "../../../config"

function PlayerWidget({ player }: { player: Mpris.Player }) {
  const [blurredCover, setBlurredCover] = createState(player.cover_art || "")
  let measureBox: Gtk.Box | null = null

  const coverBinding = createBinding(player, "cover_art")
  coverBinding.subscribe(() => {
    const coverArt = player.cover_art
    if (coverArt) {
      generateBlurredBackground(coverArt).then(setBlurredCover)
    }
  })

  if (player.cover_art) {
    generateBlurredBackground(player.cover_art).then(setBlurredCover)
  }

  return (
    <overlay
      cssClasses={["control-section", "card"]}
      hexpand={true}
      $={(self) => {
        if (measureBox) {
          self.set_measure_overlay(measureBox, true)
        }
      }}
    >
      <Gtk.Picture
        $type="overlay"
        cssClasses={["blurred-cover"]}
        file={blurredCover((path) => Gio.file_new_for_path(path))}
        contentFit={Gtk.ContentFit.COVER}
        hexpand
        vexpand
        halign={Gtk.Align.FILL}
        valign={Gtk.Align.FILL}
      />

      <box
        cssClasses={["cava-container"]}
        $type="overlay"
        canTarget={false}
        visible={config.mediaPlayer?.enableCava !== false}
        hexpand
        vexpand
        halign={Gtk.Align.FILL}
        valign={Gtk.Align.FILL}
      >
        <CavaDraw
          hexpand
          vexpand
          style={config.mediaPlayer?.cavaStyle || "catmull_rom"}
        />
      </box>

      <box
        cssClasses={["card-padding"]}
        $type="overlay"
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={12}
        hexpand={true}
        $={(self) => {
          measureBox = self
        }}
      >
        <AlbumCover player={player} />
        <PlayerInfo player={player} />
        <PlayerControls player={player} />
      </box>
    </overlay>
  )
}

export default function MediaPlayer() {
  const mpris = Mpris.get_default()
  const [currentPlayer, setCurrentPlayer] = createState<Mpris.Player | null>(null)

  // Track player listeners: bus_name -> { player, listenerId }
  const playerListeners = new Map<string, { player: Mpris.Player, listenerId: number }>()

  const updateCurrentPlayer = () => {
    const players = mpris.get_players()
    const active = filterActivePlayers(players)

    if (active.length === 0) {
      setCurrentPlayer(null)
      return
    }

    const selectedPlayer = findPlayer(active) || active[0]
    const current = currentPlayer()

    // Only update if player changed (avoid re-renders)
    if (!current || selectedPlayer.bus_name !== current.bus_name) {
      setCurrentPlayer(selectedPlayer)
    }
  }

  const setupPlayerListeners = () => {
    const players = mpris.get_players()
    const currentBusNames = new Set(players.map(p => p.bus_name))

    // Remove listeners for players that no longer exist
    for (const [busName, { player, listenerId }] of playerListeners) {
      if (!currentBusNames.has(busName)) {
        player.disconnect(listenerId)
        playerListeners.delete(busName)
      }
    }

    // Add listeners for new players
    for (const player of players) {
      if (!playerListeners.has(player.bus_name)) {
        const listenerId = player.connect("notify::playback-status", updateCurrentPlayer)
        playerListeners.set(player.bus_name, { player, listenerId })
      }
    }

    updateCurrentPlayer()
  }

  return (
    <box
      $={(self) => {
        // Initial setup
        setupPlayerListeners()

        // Listen to players list changes (add/remove players)
        const playersUpdateId = mpris.connect("notify::players", setupPlayerListeners)

        // Cleanup on destroy
        self.connect("destroy", () => {
          mpris.disconnect(playersUpdateId)

          // Disconnect all player listeners
          for (const { player, listenerId } of playerListeners.values()) {
            player.disconnect(listenerId)
          }
          playerListeners.clear()
        })
      }}
    >
      <With value={currentPlayer}>
        {(player) => player ? <PlayerWidget player={player} /> : null}
      </With>
    </box>
  )
}
