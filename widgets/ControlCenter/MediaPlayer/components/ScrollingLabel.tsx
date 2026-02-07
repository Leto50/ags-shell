import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib"
import Mpris from "gi://AstalMpris"
import { config } from "../../../../config"

export function ScrollingLabel({ player, property, formatter }: {
  player: Mpris.Player
  property: string
  formatter?: (p: Mpris.Player) => string
}) {
  return (
    <Gtk.ScrolledWindow
      $={(self) => {
        self.set_policy(Gtk.PolicyType.EXTERNAL, Gtk.PolicyType.NEVER)
        self.set_propagate_natural_width(false)
        self.set_propagate_natural_height(true)
        self.set_overflow(Gtk.Overflow.HIDDEN)

        const SPACING = 30

        const box = new Gtk.Box({
          orientation: Gtk.Orientation.HORIZONTAL,
          spacing: SPACING,
        })

        const getText = () => formatter ? formatter(player) : (player[property] || "Unknown")

        const label1 = new Gtk.Label({
          label: getText(),
          halign: Gtk.Align.START,
          ellipsize: 0,
          css_classes: property === "title" ? ["heading"] : ["caption"],
        })

        const label2 = new Gtk.Label({
          label: getText(),
          halign: Gtk.Align.START,
          ellipsize: 0,
          visible: false,
          css_classes: property === "title" ? ["heading"] : ["caption"],
        })

        box.append(label1)
        box.append(label2)
        self.set_child(box)

        let tickId = 0
        let mapTimeoutId = 0
        let updateTimeoutId = 0
        let startTimeoutId = 0
        let scrollPos = 0
        let currentText = ""
        const adjustment = self.get_hadjustment()

        const startScrolling = () => {
          if (tickId) {
            self.remove_tick_callback(tickId)
            tickId = 0
          }
          if (startTimeoutId) {
            GLib.source_remove(startTimeoutId)
            startTimeoutId = 0
          }

          scrollPos = 0
          adjustment.set_value(0)

          startTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
            startTimeoutId = 0
            const labelWidth = label1.get_allocated_width()
            const containerWidth = self.get_allocated_width()

            if (labelWidth <= containerWidth || labelWidth === 0) {
              label2.visible = false
              return false
            }

            label2.visible = true

            const loopPoint = labelWidth + SPACING
            adjustment.set_upper(labelWidth * 2 + SPACING)
            adjustment.set_page_size(containerWidth)

            tickId = self.add_tick_callback(() => {
              const scrollSpeed = config.mediaPlayer?.scrollSpeed || 0.3
              scrollPos += scrollSpeed

              if (scrollPos >= loopPoint) {
                scrollPos -= loopPoint
              }

              adjustment.set_value(scrollPos)
              return true
            })

            return false
          })
        }

        const updateLabel = () => {
          const text = getText()

          if (text === currentText) {
            return
          }

          currentText = text
          label1.label = ""
          label2.label = ""
          label2.visible = false

          // Cancel any pending update timeout
          if (updateTimeoutId) {
            GLib.source_remove(updateTimeoutId)
            updateTimeoutId = 0
          }

          updateTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
            updateTimeoutId = 0
            label1.label = text
            label2.label = text
            startScrolling()
            return false
          })
        }

        updateLabel()

        let titleSignalId: number | null = null
        let artistSignalId: number | null = null
        let albumSignalId: number | null = null

        if (property === "title") {
          titleSignalId = player.connect("notify::title", updateLabel)
        } else {
          artistSignalId = player.connect("notify::artist", updateLabel)
          albumSignalId = player.connect("notify::album", updateLabel)
        }

        // Restart scrolling when widget is mapped (shown and allocated)
        const mapId = self.connect("map", () => {
          // Cancel any pending timeout
          if (mapTimeoutId) {
            GLib.source_remove(mapTimeoutId)
            mapTimeoutId = 0
          }
          // Give a small delay for proper allocation
          mapTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
            mapTimeoutId = 0
            if (currentText && currentText !== "") {
              startScrolling()
            }
            return false
          })
        })

        self.connect("destroy", () => {
          if (tickId) {
            self.remove_tick_callback(tickId)
            tickId = 0
          }
          if (startTimeoutId) {
            GLib.source_remove(startTimeoutId)
            startTimeoutId = 0
          }
          if (mapTimeoutId) {
            GLib.source_remove(mapTimeoutId)
            mapTimeoutId = 0
          }
          if (updateTimeoutId) {
            GLib.source_remove(updateTimeoutId)
            updateTimeoutId = 0
          }
          if (titleSignalId) player.disconnect(titleSignalId)
          if (artistSignalId) player.disconnect(artistSignalId)
          if (albumSignalId) player.disconnect(albumSignalId)
          if (mapId) self.disconnect(mapId)
        })
      }}
    />
  )
}
