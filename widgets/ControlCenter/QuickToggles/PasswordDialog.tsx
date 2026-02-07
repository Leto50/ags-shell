import { Gtk } from "ags/gtk4"
import { createState } from "ags"
import { execAsync } from "ags/process"

interface PasswordDialogProps {
    network: any
    onClose: () => void
    onSuccess?: () => void
}

export function PasswordDialog({ network, onClose, onSuccess }: PasswordDialogProps) {
    const [password, setPassword] = createState("")
    const [isConnecting, setIsConnecting] = createState(false)
    const [errorMessage, setErrorMessage] = createState("")

    const connectToNetwork = async () => {
        if (!network.get() || password().length === 0) return

        setIsConnecting(true)
        setErrorMessage("")

        const ssid = network.get().ssid
        const pwd = password()

        try {
            // Use nmcli to connect with password (arguments properly escaped)
            await execAsync(["nmcli", "device", "wifi", "connect", ssid, "password", pwd])

            // Success - close dialog and reload
            setIsConnecting(false)
            setPassword("")
            onSuccess?.()
            onClose()
        } catch (error) {
            // Connection failed
            console.error("WiFi connection error:", error)
            setIsConnecting(false)
            setErrorMessage("Incorrect password. Please try again.")

            // Clean up failed connection attempt
            try {
                await execAsync(["nmcli", "connection", "delete", ssid])
            } catch {
                // Ignore cleanup errors
            }
        }
    }

    const handleCancel = () => {
        setPassword("")
        setErrorMessage("")
        setIsConnecting(false)
        onClose()
    }

    const handleKeyPress = (self: any) => {
        setPassword(self.text)
        setErrorMessage("") // Clear error when typing
    }

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["password-dialog"]}
            spacing={8}
        >
            {/* Network Name */}
            <label
                label={network((n) => n ? `Connect to "${n.ssid}"` : "")}
                cssClasses={["dialog-title"]}
                xalign={0}
            />

            {/* Password Input */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["password-input-box"]}
                spacing={8}
            >
                <image iconName="network-wireless-encrypted-symbolic" />
                <entry
                    placeholderText="Enter Password..."
                    visibility={false}
                    text={password}
                    sensitive={isConnecting((c) => !c)}
                    onNotifyText={handleKeyPress}
                    onActivate={connectToNetwork}
                    hexpand={true}
                />
            </box>

            {/* Error Message */}
            <box visible={errorMessage((e) => e !== "")}>
                <label
                    label={errorMessage}
                    cssClasses={["error-message"]}
                    xalign={0}
                    hexpand={true}
                />
            </box>

            {/* Buttons */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={8}
                homogeneous={true}
            >
                <button
                    label={isConnecting((c) => c ? "Connecting..." : "Connect")}
                    cssClasses={["connect-button", "button"]}
                    sensitive={isConnecting((c) => !c)}
                    onClicked={connectToNetwork}
                />
                <button
                    label="Cancel"
                    cssClasses={["cancel-button", "button"]}
                    sensitive={isConnecting((c) => !c)}
                    onClicked={handleCancel}
                />
            </box>
        </box>
    )
}
