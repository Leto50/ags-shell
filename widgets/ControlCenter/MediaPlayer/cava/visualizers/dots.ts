import { Gtk } from "ags/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import { shouldVisualize, getVisualizerDimensions, fillPath } from "../utils";

export function drawDots(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  const barWidth = width / bars;
  const dotRadius = Math.max(2, barWidth / 3);

  const pathBuilder = new Gsk.PathBuilder();

  values.forEach((value, i) => {
    const x = i * barWidth + barWidth / 2;
    const y = height - value * height;

    pathBuilder.add_circle(new Graphene.Point().init(x, y), dotRadius);
  });

  fillPath(snapshot, pathBuilder, color);
}
