import GdkPixbuf from "gi://GdkPixbuf"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"

const MEDIA_CACHE_PATH = GLib.get_user_cache_dir() + "/media"
const BLURRED_PATH = MEDIA_CACHE_PATH + "/blurred"

export function cropAndScaleImage(path: string, size: number): GdkPixbuf.Pixbuf {
  const pixbuf = GdkPixbuf.Pixbuf.new_from_file(path)
  const width = pixbuf.get_width()
  const height = pixbuf.get_height()

  const minSize = Math.min(width, height)
  const x = Math.floor((width - minSize) / 2)
  const y = Math.floor((height - minSize) / 2)

  const cropped = pixbuf.new_subpixbuf(x, y, minSize, minSize)
  return cropped.scale_simple(size, size, GdkPixbuf.InterpType.BILINEAR)
}

export async function generateBlurredBackground(coverPath: string | null): Promise<string> {
  if (!coverPath) return ""

  // Generate a unique filename based on the original path
  const hash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5, coverPath, -1)
  const blurred = GLib.build_filenamev([BLURRED_PATH, `${hash}.png`])

  // Return cached version if exists
  if (GLib.file_test(blurred, GLib.FileTest.EXISTS)) {
    return blurred
  }

  // Create cache directory
  if (!GLib.file_test(BLURRED_PATH, GLib.FileTest.EXISTS)) {
    GLib.mkdir_with_parents(BLURRED_PATH, 0o755)
  }

  // Generate blurred image
  try {
    // First convert to PNG using GdkPixbuf (handles most formats)
    const pixbuf = GdkPixbuf.Pixbuf.new_from_file(coverPath)
    const tempPng = GLib.build_filenamev([BLURRED_PATH, `${hash}_temp.png`])
    pixbuf.savev(tempPng, "png", [], [])

    // Then blur with ImageMagick (arguments properly escaped)
    await execAsync(["magick", tempPng, "-blur", "0x22", blurred])

    // Clean up temp file
    GLib.unlink(tempPng)

    return blurred
  } catch (e) {
    // Silently fallback to original if format not supported or blur fails
    // (widget will still display with original cover)
    return coverPath
  }
}
