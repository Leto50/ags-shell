# AGS Custom Shell Project

## Communication Style

Use professional, technical language. Avoid casual slang or informal expressions. Communicate clearly and precisely.

## Blocking Operations Tracking

Track all synchronous operations that block the UI thread (>100ms) in this AGS shell.

### Process

When a blocking operation is discovered:
1. Document the operation with measured duration
2. Add to the list below with status
3. Suggest `setTimeout(0)` workaround for immediate fix
4. When list reaches ≥5 slow operations, propose Rust daemon architecture

### Known Blocking Operations

- [x] **AstalBluetooth.Device.pair()** (~8-25 seconds) - Fixed with BlueZ D-Bus async calls
  - **Problem**: `device.pair()` is synchronous and blocks GTK event loop
  - **Solution**: Bypass AstalBluetooth and use `Gio.DBusProxy` to call `org.bluez.Device1.Pair()` asynchronously
  - **Implementation**: BluetoothItem.tsx:19-44 (pairDevice function)
  - **Result**: UI remains responsive, "Pairing..." status displays correctly during pairing process

### Decision Threshold

**≥5 slow operations (>100ms)** → Evaluate Rust daemon for system operations

### Architecture Notes

- Current stack: AGS (TypeScript/GJS) with GTK4
- Compositor: Hyprland
- Target: Complete desktop shell with control center

## Project Structure

```
/home/leto/.config/ags/
├── widgets/
│   └── ControlCenter/
│       └── QuickToggles/
│           ├── AudioItem.tsx
│           ├── AudioMenu.tsx
│           ├── BluetoothItem.tsx
│           ├── BluetoothMenu.tsx
│           ├── WiFiMenu.tsx
│           └── QuickToggles.tsx
└── ...
```
