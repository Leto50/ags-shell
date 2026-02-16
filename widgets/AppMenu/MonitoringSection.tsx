import { Gtk } from "ags/gtk4"
import { createState } from "ags"
import { interval } from "ags/time"
import { logger } from "../../lib/logger"
import GTop from "gi://GTop?version=2.0"
import GLib from "gi://GLib"

interface MonitorData {
    readonly cpu: number
    readonly ram: number
    readonly temp: number
    readonly tempMax: number
}

function readCpu(prevTotal: number, prevIdle: number): { cpu: number; total: number; idle: number } {
    const cpuData = new GTop.glibtop_cpu()
    GTop.glibtop_get_cpu(cpuData)

    const total = cpuData.total
    const idle = cpuData.idle

    const totalDelta = total - prevTotal
    const idleDelta = idle - prevIdle

    const usage = totalDelta > 0 ? (totalDelta - idleDelta) / totalDelta : 0

    return { cpu: Math.max(0, Math.min(1, usage)), total, idle }
}

function readRam(): number {
    const mem = new GTop.glibtop_mem()
    GTop.glibtop_get_mem(mem)

    const used = mem.used - mem.buffer - mem.cached
    return mem.total > 0 ? Math.max(0, Math.min(1, used / mem.total)) : 0
}

const DEFAULT_TEMP_MAX = 100

function readSysfsInt(path: string): number | null {
    if (!GLib.file_test(path, GLib.FileTest.EXISTS)) return null
    const [ok, contents] = GLib.file_get_contents(path)
    if (!ok) return null
    return parseInt(new TextDecoder().decode(contents).trim(), 10)
}

function readTemperature(): { temp: number; max: number } {
    const hwmonDirs = [
        "/sys/class/hwmon/hwmon0",
        "/sys/class/hwmon/hwmon1",
        "/sys/class/hwmon/hwmon2",
        "/sys/class/hwmon/hwmon3",
        "/sys/class/hwmon/hwmon4",
        "/sys/class/hwmon/hwmon5",
        "/sys/class/hwmon/hwmon6",
    ]

    for (const dir of hwmonDirs) {
        const namePath = `${dir}/name`
        if (!GLib.file_test(namePath, GLib.FileTest.EXISTS)) continue
        const [ok, contents] = GLib.file_get_contents(namePath)
        if (!ok) continue

        const driverName = new TextDecoder().decode(contents).trim()
        if (driverName === "coretemp" || driverName === "k10temp") {
            const temp = readSysfsInt(`${dir}/temp1_input`)
            if (temp === null) continue

            const crit = readSysfsInt(`${dir}/temp1_crit`)
            return {
                temp: temp / 1000,
                max: crit !== null ? crit / 1000 : DEFAULT_TEMP_MAX,
            }
        }
    }

    // Fallback to thermal_zone0
    const temp = readSysfsInt("/sys/class/thermal/thermal_zone0/temp")
    if (temp !== null) {
        return { temp: temp / 1000, max: DEFAULT_TEMP_MAX }
    }

    return { temp: 0, max: DEFAULT_TEMP_MAX }
}

function tempClass(temp: number): string {
    if (temp >= 80) return "temp-hot"
    if (temp >= 60) return "temp-warm"
    return ""
}

export default function MonitoringSection() {
    const [data, setData] = createState<MonitorData>({ cpu: 0, ram: 0, temp: 0, tempMax: DEFAULT_TEMP_MAX })

    let prevTotal = 0
    let prevIdle = 0
    let pollingTimer: { cancel(): void } | null = null

    const startPolling = () => {
        if (pollingTimer) return

        // Initial read to seed CPU delta
        const initial = readCpu(0, 0)
        prevTotal = initial.total
        prevIdle = initial.idle

        pollingTimer = interval(2000, () => {
            try {
                const cpuResult = readCpu(prevTotal, prevIdle)
                prevTotal = cpuResult.total
                prevIdle = cpuResult.idle

                const tempData = readTemperature()
                setData({ cpu: cpuResult.cpu, ram: readRam(), temp: tempData.temp, tempMax: tempData.max })
            } catch (err) {
                logger.error("Monitoring poll error:", err)
            }
        })
    }

    const stopPolling = () => {
        if (pollingTimer) {
            pollingTimer.cancel()
            pollingTimer = null
        }
    }

    return {
        startPolling,
        stopPolling,
        widget: (
            <box orientation={Gtk.Orientation.VERTICAL} class="card card-padding" spacing={4}>
                <MonitorRow
                    icon="󰻠"
                    label="CPU"
                    value={data((d) => `${Math.round(d.cpu * 100)}%`)}
                    fraction={data((d) => d.cpu)}
                    levelClass=""
                />
                <MonitorRow
                    icon="󰍛"
                    label="RAM"
                    value={data((d) => `${Math.round(d.ram * 100)}%`)}
                    fraction={data((d) => d.ram)}
                    levelClass=""
                />
                <MonitorRow
                    icon="󰔏"
                    label="Temp"
                    value={data((d) => `${Math.round(d.temp)}\u00B0C`)}
                    fraction={data((d) => Math.min(1, d.temp / d.tempMax))}
                    levelClass={data((d) => tempClass(d.temp))}
                />
            </box>
        ),
    }
}

interface MonitorRowProps {
    icon: string
    label: string
    value: any
    fraction: any
    levelClass: any
}

function MonitorRow({ icon, label, value, fraction, levelClass }: MonitorRowProps) {
    return (
        <box class="monitor-row" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <box spacing={6}>
                <label class="icon-label" label={icon} />
                <label class="monitor-label" label={label} halign={Gtk.Align.START} hexpand />
                <label class="monitor-value" label={value} halign={Gtk.Align.END} />
            </box>
            <levelbar
                class={levelClass}
                value={fraction}
                mode={Gtk.LevelBarMode.CONTINUOUS}
                minValue={0}
                maxValue={1}
            />
        </box>
    )
}
