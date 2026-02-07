import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { logger } from "../../../lib/logger"
import { parseMenuItem, MenuItem } from "./MenuParser"

// Get ENTIRE menu structure via ONE DBus GetLayout() call!
export async function getMenuLayoutViaDBus(itemId: string, menuPath: string): Promise<MenuItem[]> {
    try {
        // Parse bus name from item_id (e.g., ":1.50/org/ayatana/NotificationItem/proton_vpn_app")
        const busName = itemId.split('/')[0]

        logger.debug("Calling GetLayout on DBus:", { busName, menuPath })

        const connection = Gio.DBus.session

        // Call GetLayout(parentId=0, recursionDepth=-1, propertyNames=[...])
        // Wrap in Promise since GJS DBus.call requires a callback
        const result = await new Promise((resolve, reject) => {
            connection.call(
                busName,                          // bus_name
                menuPath,                         // object_path
                'com.canonical.dbusmenu',        // interface_name
                'GetLayout',                      // method_name
                new GLib.Variant('(iias)', [
                    0,                            // parentId: 0 = root
                    -1,                           // recursionDepth: -1 = infinite (get everything)
                    [
                        'label',
                        'enabled',
                        'visible',
                        'toggle-type',
                        'toggle-state',
                        'type',
                        'icon-name',
                        'icon-data',
                        'shortcut',
                        'disposition',
                        'children-display',
                        'accessible-desc'
                    ]  // All DBusMenu properties
                ]),
                null,                            // reply_type
                Gio.DBusCallFlags.NONE,
                -1,                              // timeout
                null,                            // cancellable
                (connection, result) => {        // callback
                    try {
                        const res = connection.call_finish(result)
                        resolve(res)
                    } catch (e) {
                        reject(e)
                    }
                }
            )
        })

        logger.debug("GetLayout returned successfully")

        // Parse the result: GetLayout returns (uint revision, (ia{sv}) layout)
        // Don't use deepUnpack - manually unpack the GVariant structure
        const revision = result.get_child_value(0).get_uint32()
        const layoutVariant = result.get_child_value(1)

        logger.debug("Menu revision:", revision)

        // Layout structure: (id INT32, properties DICT{sv}, children ARRAY of (ia{sv}as))
        const rootId = layoutVariant.get_child_value(0).get_int32()
        const rootProps = layoutVariant.get_child_value(1)
        const childrenVariant = layoutVariant.get_child_value(2)

        const childrenCount = childrenVariant.n_children()
        logger.debug("Parsing menu layout:", { rootId, childrenCount })

        // Process each child recursively
        const items = Array.from(
            { length: childrenCount },
            (_, i) => {
                const childItem = parseMenuItem(childrenVariant.get_child_value(i))
                if (childItem) {
                    logger.debug(`Menu item parsed: ${childItem.id} "${childItem.label}"`, {
                        childrenCount: childItem.children?.length || 0
                    })
                }
                return childItem
            }
        ).filter((item): item is MenuItem => item !== null)

        logger.debug(`Extracted ${items.length} menu items via GetLayout`)
        return items

    } catch (e) {
        logger.error("GetLayout call failed:", e)
        return []
    }
}
