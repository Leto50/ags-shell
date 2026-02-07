import { Gtk, Gdk } from "ags/gtk4"
import Gsk from "gi://Gsk"
import Graphene from "gi://Graphene"
import Cava from "gi://AstalCava"
import GObject, { register, setter, getter } from "ags/gobject"
import { Accessor, jsx } from "ags"
import { CavaStyle, getStyleEnum } from "./CavaStyle"

import {
  drawCatmullRom,
  drawSmooth,
  drawBars,
  drawDots,
} from "./visualizers"

const CavaStyleSpec = (name: string, flags: GObject.ParamFlags) =>
  GObject.ParamSpec.int(
    name,
    "Style",
    "Visualization style",
    flags,
    CavaStyle.SMOOTH,
    CavaStyle.MESH,
    CavaStyle.CATMULL_ROM,
  )

@register({ GTypeName: "Cava" })
export class CavaWidget extends Gtk.Widget {
  static {
    Gtk.Widget.set_css_name.call(this, "cava")
  }

  // Private storage for the style value
  #style = CavaStyle.CATMULL_ROM

  private cava = Cava.get_default()!
  private cavaSignalId: number = 0
  private styleSignalId: number = 0

  constructor(params?: any) {
    const { style, ...gtkParams } = params || {}

    super(gtkParams)

    this.cavaSignalId = this.cava.connect("notify::values", () => {
      this.queue_draw()
    })

    this.styleSignalId = this.connect("notify::style", () => {
      this.queue_draw()
    })

    if (style !== undefined) {
      this.style = style
    }
  }

  @getter(CavaStyleSpec)
  get style(): CavaStyle {
    return this.#style
  }

  @setter(CavaStyleSpec)
  set style(value: CavaStyle | string | number) {
    // Convert string/number to enum
    const enumValue =
      typeof value === "string" || typeof value === "number"
        ? getStyleEnum(value)
        : value

    if (this.#style !== enumValue) {
      this.#style = enumValue
      this.notify("style")
    }
  }

  getColor(): Gdk.RGBA {
    const rgba = new Gdk.RGBA()
    rgba.parse("#a6da95")

    const styleContext = this.get_style_context()
    if (styleContext) {
      return styleContext.get_color()
    }

    return rgba
  }

  vfunc_snapshot(snapshot: Gtk.Snapshot): void {
    super.vfunc_snapshot(snapshot)

    const values = this.cava.get_values()
    const bars = this.cava.get_bars()

    const width = this.get_width()
    const height = this.get_height()

    // Push rounded rectangle clip for rounded corners (8px = 0.5rem)
    const bounds = new Graphene.Rect().init(0, 0, width, height)
    const roundedRect = new Gsk.RoundedRect().init_from_rect(bounds, 8)
    snapshot.push_rounded_clip(roundedRect)

    switch (this.#style) {
      case CavaStyle.SMOOTH:
        drawSmooth(this, snapshot, values, bars)
        break
      case CavaStyle.CATMULL_ROM:
        drawCatmullRom(this, snapshot, values, bars)
        break
      case CavaStyle.BARS:
        drawBars(this, snapshot, values, bars)
        break
      case CavaStyle.DOTS:
        drawDots(this, snapshot, values, bars)
        break
      default:
        drawCatmullRom(this, snapshot, values, bars)
    }

    snapshot.pop() // Pop the clip
  }

  vfunc_dispose(): void {
    if (this.cavaSignalId) {
      this.cava.disconnect(this.cavaSignalId)
      this.cavaSignalId = 0
    }
    if (this.styleSignalId) {
      this.disconnect(this.styleSignalId)
      this.styleSignalId = 0
    }
    super.vfunc_dispose()
  }
}

export interface CavaDrawProps {
  style?: CavaStyle | string | Accessor<string>
  hexpand?: boolean
  vexpand?: boolean
}

export function CavaDraw({
  style,
  hexpand,
  vexpand,
}: CavaDrawProps): CavaWidget {
  return jsx(CavaWidget, {
    style,
    hexpand,
    vexpand,
  })
}
