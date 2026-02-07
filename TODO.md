# AGS TODO

## System Tray - Remplacer les icônes par Nerd Font

**Problème :** Les icônes du system tray (Gtk.Image) sont floues en GTK4 sur écrans <200 PPI (toi = 102 PPI externe, 143 PPI laptop) à cause du scaling.

**Solution :** Implémenter un système de custom icons comme HyprPanel :
- Détecter l'app par son `item.id` (ex: "steam", "discord", etc.)
- Remplacer l'icône `Gtk.Image` par un `<label>` avec Nerd Font character
- Les Nerd Font restent nets (confirmé : ControlCenterToggle est net)

**Exemple implémentation :**
Voir HyprPanel : `~/Téléchargements/HyprPanel-master/src/components/bar/modules/systray/index.tsx` lignes 94-110

**Config à créer :**
Fichier de config genre `~/.config/ags/systray-icons.json` :
```json
{
  "steam": "",
  "discord": "󰙯",
  "spotify": "",
  ...
}
```

**Fichier à modifier :**
`~/.config/ags/widgets/Bar/SystemTray.tsx`

---

**Note :** GTK3 (HyprPanel) n'a pas ce problème, mais AGS utilise GTK4 donc on doit contourner.

---

## Notifications - Service lent qui bloque les apps

**Problème découvert :** Cider freeze au changement de musique (sauf si souris sur fenêtre).

**Cause :** AGS (PID 900, HyprPanel) fournit `org.freedesktop.Notifications` via D-Bus, mais répond **trop lentement** aux requêtes `.Notify()`. Les apps qui envoient des notifications (comme Cider) bloquent sur le main thread en attendant la réponse D-Bus → freeze.

**Symptôme caractéristique :**
- App freeze au changement de track (quand notification envoyée)
- Souris sur fenêtre = pas de freeze (events souris gardent event loop actif)
- Log Cider : `libnotify-WARNING: Failed to connect to proxy`

**Solution temporaire :** Désactiver les notifications dans Cider.

**Solution finale :** Implémenter un service de notifications **asynchrone/non-bloquant** dans la nouvelle barre AGS pour remplacer celui de HyprPanel.
