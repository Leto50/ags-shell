# Comparaison: Système de Notifications AGS vs HyprPanel

## Vue d'ensemble architecturale

### AGS (Système actuel)
- **Architecture**: Fenêtres multiples dynamiques (une par popup + center persistent)
- **État**: NotificationManager singleton avec `Map<id, ActivePopup>` + history array
- **Popups**: Fenêtres indépendantes créées/détruites dynamiquement
- **Positionnement**: Calcul manuel Y-offset avec estimation de hauteur

### HyprPanel
- **Architecture**: Fenêtre unique pour tous les popups + menu dropdown
- **État**: Variable reactive `popupNotifications: Variable<Notification[]>`
- **Popups**: Composants dans une seule fenêtre, filtrés par slice
- **Positionnement**: GTK layout automatique (vertical box)

---

## Différences Clés

### 1. Gestion des Popups

#### AGS (actuel)
```typescript
// Création dynamique de fenêtres
showNotificationPopup(notif) {
    const window = (
        <window name={`notification-popup-${id}`}
                anchor={TOP | RIGHT}
                marginTop={calculateYOffset()}>
            <NotificationPopup notification={notif} />
        </window>
    )
}

// Tracking manuel
activePopups: Map<id, { height, windowName, timeout }>
```

**Problèmes identifiés**:
- Estimation de hauteur imprécise
- Calcul Y-offset peut avoir des bugs de stacking
- Overhead de création/destruction de fenêtres

#### HyprPanel
```typescript
// Fenêtre unique avec liste réactive
<window name="notifications-window" anchor={position}>
    <box vertical>
        {popupNotifications.slice(0, maxDisplayed).map(notif =>
            <NotificationCard notification={notif} />
        )}
    </box>
</window>

// État simple
popupNotifications: Variable<Notification[]> = Variable([])
```

**Avantages**:
- GTK gère automatiquement le layout vertical
- Pas d'estimation de hauteur nécessaire
- Meilleure performance (une seule fenêtre)
- Stacking naturel sans calculs

---

### 2. Auto-Dismiss et Timeouts

#### AGS (actuel)
```typescript
// Timeout par popup avec pause/resume
setupAutoDismiss() {
    dismissTimeout = setTimeout(() => onClose(), timeout)
}

pauseAutoDismiss() {
    clearTimeout(dismissTimeout)
    isPaused = true
}

resumeAutoDismiss() {
    if (isPaused) setupAutoDismiss()
}
```

**Complexité**: Gestion manuelle pause/resume avec state flags

#### HyprPanel
```typescript
// Timeout global au moment de l'ajout
notifdService.connect('notified', (_, id) => {
    popupNotifications.set([...popups, notification])

    timeout(popupTimeout.get(), () => {
        dropNotificationPopup(notification, popupNotifications)
    })
})
```

**Simplicité**:
- Pas de pause/resume (timeout fixe)
- Auto-dismiss géré par le service: `notifdService.set_ignore_timeout(!shouldAutoDismiss)`
- Moins de state à tracker

---

### 3. Do Not Disturb

#### AGS (actuel)
- Non implémenté (à ajouter)

#### HyprPanel
```typescript
const doNotDisturb = notifdService.dontDisturb

if (doNotDisturb) {
    return  // Skip popup creation
}

// UI: DndSwitch dans Controls
<switch active={bind(notifdService, 'dontDisturb')} />
```

**Fonctionnalité manquante dans AGS**!

---

### 4. Notification Center vs Menu

#### AGS (actuel)
```typescript
// Fenêtre dédiée top-right
<window name="notification-center"
        layer={TOP}
        anchor={TOP | RIGHT}>
    <TabSwitcher>  // Calendar | Notifications
        <NotificationsList>
            <Pagination />  // Custom pagination component
        </NotificationsList>
    </TabSwitcher>
</window>
```

**Features**:
- Deux tabs (Calendar + Notifications)
- Pagination custom (10 par page)
- Fenêtre dédiée persistante

#### HyprPanel
```typescript
// Dropdown menu (probablement layer OVERLAY)
<DropdownMenu name="notificationsmenu">
    <Controls />  // DND switch + Clear all + Label
    <NotificationsContainer>  // Scrollable list
        <scrollable>
            {notifications.slice(pageStart, pageEnd).map(...)}
        </scrollable>
    </NotificationsContainer>
    <NotificationPager />  // Page buttons
</DropdownMenu>
```

**Différences**:
- Menu dropdown au lieu de fenêtre dédiée
- Pas de calendar intégré
- Scrollable au lieu de pagination stricte
- Controls en haut (DND + Clear all)

---

### 5. Structure des Composants

#### AGS (actuel)
```
NotificationPopup.tsx (monolitique)
├── Header (inline)
├── Summary (inline)
├── Body (inline)
└── Actions (inline)
```

**Organisation**: Tout dans un seul fichier

#### HyprPanel
```
Notification/
├── index.tsx (NotificationCard orchestrator)
├── Header/index.tsx
├── Body/index.tsx
├── Image/index.tsx
├── Actions/index.tsx
├── CloseButton/index.tsx
└── helpers.ts
```

**Organisation**: Composants séparés et réutilisables

---

### 6. Actions sur Hover

#### AGS (actuel)
```typescript
// Actions toujours visibles (configurable)
{config.notifications?.showActions && (
    <box className="notification-actions">
        {notification.actions.map(...)}
    </box>
)}
```

**Comportement**: Affichage on/off simple

#### HyprPanel
```typescript
// Revealer avec animation sur hover
<eventbox
    onHover={() => actionBox.revealChild = true}
    onHoverLost={() => actionBox.revealChild = false}>
    <Actions notification={notif} showActions={showActionsOnHover} />
</eventbox>
```

**Comportement**: Animation revealer avec transition smooth

---

### 7. Urgency Handling

#### AGS (actuel)
```typescript
// CSS classes basées sur urgency
switch (notification.urgency) {
    case Notifd.Urgency.LOW: return "urgency-low"
    case Notifd.Urgency.CRITICAL: return "urgency-critical"
    default: return "urgency-normal"
}
```

**Styling**: CSS classes simples

#### HyprPanel
- Même approche (CSS classes)
- Pas de différence majeure

---

### 8. Filtrage et Ignore List

#### AGS (actuel)
- Non implémenté (pas de filtrage par app)

#### HyprPanel
```typescript
const { ignore } = options.notifications

// Helper function
const filterNotifications = (notifs, ignoredApps) => {
    return notifs.filter(n => !ignoredApps.includes(n.appName))
}

// Usage
const filtered = filterNotifications(notifications, ignore.get())
```

**Fonctionnalité manquante dans AGS**!

---

### 9. Monitor Handling

#### AGS (actuel)
```typescript
// Pas de gestion multi-monitor
// Popups apparaissent sur le monitor par défaut
```

**Limitation**: Pas de suivi du monitor actif

#### HyprPanel
```typescript
const windowMonitor = Variable.derive(
    [bind(hyprlandService, 'focusedMonitor'), bind(monitor), bind(active_monitor)],
    (focused, configMonitor, useActive) => {
        if (useActive && focused) {
            return gdkMonitorMapper.mapHyprlandToGdk(focused.id)
        }
        return gdkMonitorMapper.mapHyprlandToGdk(configMonitor)
    }
)
```

**Features**:
- Suit le monitor focusé (optionnel)
- Mapping Hyprland ↔ GDK monitors
- Configuration par monitor

---

### 10. Configuration

#### AGS (actuel)
```typescript
notifications: {
    popupTimeout: 5000,
    maxVisiblePopups: 3,
    popupSpacing: 8,
    showActions: true
}
```

**Options**: 4 paramètres de base

#### HyprPanel
```typescript
notifications: {
    position: 'top right',  // Configurable position
    monitor: 0,
    active_monitor: true,
    timeout: 5000,
    displayedTotal: 5,
    showActionsOnHover: true,
    autoDismiss: true,
    ignore: ['Spotify', ...]  // App blacklist
}
```

**Options**: Plus configurables (position, monitor, ignore list)

---

## Recommandations d'Amélioration pour AGS

### Priorité HAUTE

1. **Adopter l'architecture fenêtre unique**
   - Supprimer création/destruction dynamique de fenêtres
   - Une seule fenêtre avec box vertical
   - GTK gère le layout automatiquement

2. **Implémenter Do Not Disturb**
   ```typescript
   const dnd = bind(notifdService, 'dontDisturb')
   // UI: Switch dans NotificationCenter controls
   ```

3. **Ajouter ignore list**
   ```typescript
   const filterNotifications = (notifs: Notification[], ignored: string[]) => {
       return notifs.filter(n => !ignored.includes(n.appName))
   }
   ```

### Priorité MOYENNE

4. **Simplifier auto-dismiss**
   - Supprimer pause/resume complexe
   - Utiliser `notifdService.set_ignore_timeout()`
   - Timeout global au moment de l'ajout

5. **Modulariser NotificationPopup**
   - Séparer Header, Body, Actions, CloseButton
   - Meilleure réutilisabilité
   - Code plus maintenable

6. **Multi-monitor support**
   - Tracker focused monitor
   - Option "suivre monitor actif"
   - Mapping Hyprland ↔ GDK

### Priorité BASSE

7. **Actions on hover avec revealer**
   - Animation smooth
   - Meilleure UX

8. **Position configurable**
   - Top-left, top-right, bottom-left, bottom-right
   - Actuellement hardcodé top-right

---

## Métriques de Complexité

### Lignes de Code (estimation)

| Composant | AGS | HyprPanel |
|-----------|-----|-----------|
| Popup system | ~200 LOC | ~150 LOC |
| Center/Menu | ~400 LOC | ~200 LOC |
| Manager | ~150 LOC | ~100 LOC (helpers) |
| **Total** | **~750 LOC** | **~450 LOC** |

**HyprPanel est 40% plus concis grâce à**:
- Fenêtre unique vs multiples
- Pas d'estimation de hauteur
- GTK layout automatique
- Composants modulaires

---

## Bugs Potentiels Identifiés dans AGS

### 1. Y-offset calculation race condition
```typescript
// NotificationManager.ts:58-68
private calculateYOffset(): number {
    let totalOffset = 0
    for (const popup of this.activePopups.values()) {
        totalOffset += popup.height + spacing
    }
    return totalOffset
}
```
**Problème**: Si estimation de hauteur est incorrecte, stacking peut se chevaucher

### 2. History limit enforcement
```typescript
// NotificationManager.ts:116-120
if (this.notificationHistory.length > 50) {
    this.notificationHistory = this.notificationHistory.slice(0, 50)
}
```
**Problème**: Slice garde les 50 PREMIERS (les plus vieux), devrait garder les 50 DERNIERS

**Fix**:
```typescript
if (this.notificationHistory.length > 50) {
    this.notificationHistory = this.notificationHistory.slice(-50)  // Garde les 50 derniers
}
```

### 3. Cleanup dans NotificationPopup
```typescript
// onCleanup only clears timeout, not GObject signals
onCleanup(() => {
    if (dismissTimeout !== null) {
        clearTimeout(dismissTimeout)
    }
    // Missing: disconnect resolvedSignalId
})
```

---

## Conclusion

### Ce que HyprPanel fait mieux:
✅ Architecture plus simple (fenêtre unique)
✅ Moins de code, plus maintenable
✅ Do Not Disturb intégré
✅ Ignore list configurable
✅ Multi-monitor support
✅ Composants modulaires
✅ Auto-dismiss simplifié

### Ce qu'AGS fait mieux:
✅ Calendar intégré dans NotificationCenter
✅ Toast system séparé (feedback app)
✅ Pause/resume sur hover (UX)

### Action Items
1. **Migration vers architecture fenêtre unique** (breaking change, améliore tout)
2. **Ajouter DND + ignore list** (features manquantes)
3. **Fix history slice bug** (bug critique)
4. **Modulariser composants** (maintenabilité)
5. **Multi-monitor support** (nice to have)
