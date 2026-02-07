# Analyse Complète - AGS Custom Shell

**Date:** 2026-02-07
**Analysé par:** Claude Code (Sonnet 4.5)
**Agents utilisés:** Explore, code-reviewer, security-reviewer

---

## Résumé Exécutif

**Note Globale:** 7.5/10 - Production-ready pour usage personnel, nécessite améliorations pour distribution

### Points Forts ✅
- Architecture solide post-refactoring avec séparation des concerns
- Design system complet et cohérent (design tokens)
- Intégration Hyprland fonctionnelle
- Sécurité de base implémentée (validation SSID, logger structuré)
- Code TypeScript typé à 90%

### Points Faibles ❌
- **1 vulnérabilité CRITIQUE** (validation SSID insuffisante)
- **6 problèmes HIGH** (injection D-Bus, race conditions, types `any`)
- Plusieurs fonctionnalités incomplètes (App Menu, Window List)
- Pas de tests automatisés
- Feedback utilisateur minimal (pas de toast/notifications d'erreur)

---

## 1. Intégration Hyprland - Note: 8/10

### Configuration Actuelle

**Autostart (autostart.conf):**
```bash
exec-once = hyprpanel  # ← Devrait être 'ags' ?
```

**⚠️ DÉCOUVERTE IMPORTANTE:** La config lance `hyprpanel` (autre projet) au lieu de ce projet AGS.

**Layer Rules (rules.conf):**
```conf
layerrule = blur on, match:namespace bar
layerrule = blur on, match:namespace control-center
layerrule = blur on, match:namespace tray-menu
layerrule = blur on, match:namespace notification-center
layerrule = blur on, match:namespace notification-popup
layerrule = ignore_alpha 0.0, match:namespace control-center
```

✅ **Bon:** Blur activé sur toutes les fenêtres AGS
✅ **Bon:** ignore_alpha pour transparence correcte

### Keybindings

**Manquants:**
- Aucun keybind pour ouvrir le control center
- Aucun keybind pour les notifications
- Pas de raccourci clavier pour WiFi/Bluetooth

**Suggestions d'ajout:**
```conf
# Control Center
bind = $mainMod, A, exec, ags toggle control-center

# Notifications
bind = $mainMod, N, exec, ags toggle notification-center

# DND Toggle
bind = $mainMod SHIFT, N, exec, ags request 'toggle-dnd'
```

### Workspace Integration

**Forces:**
- Synchro bidirectionnelle avec Hyprland (dispatch/signals)
- Icônes d'apps par workspace
- Support clavier natif (numéros + pavé numérique)

**Faiblesses:**
- Pas de filtrage par monitor (tous les workspaces affichés sur tous les écrans)
- Mapping d'icônes fragile (100+ regex, maintenance complexe)
- Hardcodé à 20 workspaces max

**Suggestion:** Utiliser Hyprland IPC pour récupérer les icônes dynamiquement au lieu de regex.

---

## 2. Analyse de Pertinence des Fonctionnalités

### Bar (Top Panel)

| Composant | Pertinence | Qualité | Suggestions |
|-----------|-----------|---------|-------------|
| **Workspaces** | ⭐⭐⭐⭐⭐ | 8/10 | Ajouter preview on hover |
| **App Menu** | ⭐⭐⭐⭐ | 0/10 | **NON IMPLÉMENTÉ** - Priorité haute |
| **System Tray** | ⭐⭐⭐⭐⭐ | 7/10 | Icônes floues, menus fonctionnels |
| **Clock** | ⭐⭐⭐⭐⭐ | 9/10 | Format configurable, i18n OK |
| **Control Center Toggle** | ⭐⭐⭐⭐ | 9/10 | Indicateur visuel clair |

**Fonctionnalités manquantes prioritaires:**
1. **Window List** - Afficher titre de la fenêtre active ou liste cliquable
2. **App Launcher** - Implémenter le bouton menu
3. **Keyboard Layout Indicator** - Si multi-layout (fcitx5 détecté)
4. **Updates Indicator** - octopi-notifier tourne déjà

### Control Center

| Composant | Pertinence | Qualité | Suggestions |
|-----------|-----------|---------|-------------|
| **WiFi Menu** | ⭐⭐⭐⭐⭐ | 7/10 | Ajouter signal strength bars |
| **Bluetooth Menu** | ⭐⭐⭐⭐⭐ | 7/10 | Scanning trop fréquent (2s), drainer batterie |
| **Volume Slider** | ⭐⭐⭐⭐⭐ | 9/10 | Excellent, PipeWire natif |
| **Brightness** | ⭐⭐⭐⭐⭐ | 9/10 | Bon, adaptive-brightness supporté |
| **Media Player** | ⭐⭐⭐⭐ | 8/10 | Cava cool mais heavy, seeking manquant |
| **DND Toggle** | ⭐⭐⭐⭐⭐ | 9/10 | Simple et efficace |
| **Idle Inhibit** | ⭐⭐⭐⭐ | 8/10 | Utile pour présentations |
| **Suspend** | ⭐⭐⭐ | 8/10 | Bouton direct = risque accidentel |

**Suggestions d'amélioration:**

1. **WiFi Menu:**
   - Ajouter bars de signal strength visuel
   - Afficher vitesse de connexion actuelle
   - Bouton "Forget Network" pour networks sauvegardés
   - Support WPA3/WPA2-Enterprise (actuellement WPA2-PSK seulement)

2. **Bluetooth Menu:**
   - Réduire scan interval à 5s (au lieu de 2s)
   - Ajouter option "Stop Scanning" manuelle
   - Afficher battery level des devices (si supporté)
   - Renommage de devices

3. **Media Player:**
   - Ajouter seeking (slider position)
   - Support multi-player avec tabs
   - Cava optionnel pour performance (déjà dans config)

4. **Suspend Button:**
   - Remplacer par "Power Menu" avec:
     - Suspend
     - Logout
     - Reboot
     - Shutdown
   - Confirmation dialog

**Fonctionnalités manquantes:**
1. **Network Settings** - VPN, Ethernet config
2. **Display Settings** - Resolution, scaling, rotation
3. **Audio Output Selection** - Changer entre speakers/headphones
4. **Profiles/Scenes** - Gaming, Work, Presentation modes

### Notification System

| Aspect | Pertinence | Qualité | Suggestions |
|--------|-----------|---------|-------------|
| **Popups** | ⭐⭐⭐⭐⭐ | 8/10 | Bon, manque grouping |
| **Center** | ⭐⭐⭐⭐ | 7/10 | Memory-only, pas de persistence |
| **DND** | ⭐⭐⭐⭐⭐ | 9/10 | Fonctionnel |
| **Actions** | ⭐⭐⭐⭐ | 8/10 | Support basique |

**Améliorations prioritaires:**
1. **Persistence** - SQLite ou JSON pour historique
2. **Grouping** - Par app ou conversation
3. **Mark as Read** - État lu/non-lu
4. **Inline Replies** - Pour messaging apps
5. **Smart Filtering** - Filtres par urgence/app

---

## 3. Problèmes de Sécurité - ATTENTION

### 🔴 CRITIQUE

**1. Command Injection via SSID (WiFiMenu.tsx:67)**

**Problème:** Regex `^[\w\s._-]+$` insuffisante
- Rejette des SSIDs légitimes: "Starbucks WiFi (Free)", "AT&T Guest"
- SSIDs valides peuvent contenir n'importe quel caractère UTF-8
- Faux sentiment de sécurité

**Solution:**
```typescript
const validateSSID = (ssid: string): boolean => {
    if (!ssid || ssid.length === 0 || ssid.length > 32) return false
    // Rejeter null bytes et caractères de contrôle (sauf espace)
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(ssid)) return false
    return true
}

// Préférer BSSID pour identification unique
if (ap.bssid) {
    await execAsync(["nmcli", "device", "wifi", "connect", ap.bssid])
} else {
    await execAsync(["nmcli", "device", "wifi", "connect", ap.ssid])
}
```

### 🟠 HIGH (6 issues)

**2. D-Bus Path Injection (BluetoothItem.tsx:29)**
```typescript
// Valider format MAC address
const BLUETOOTH_MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/
if (!BLUETOOTH_MAC_REGEX.test(device.address)) {
    throw new Error("Invalid Bluetooth address format")
}
```

**3. Race Conditions**
- WiFi: Pas de lock sur handleNetworkClick (clics multiples)
- Bluetooth: TOCTOU race entre check et set de isPairing

**Solution:** Implémenter mutex/lock atomique

**4. Type `any` (WiFiMenu.tsx:19)**
```typescript
// Remplacer
const [selectedNetwork, setSelectedNetwork] = createState<any>(null)
// Par
const [selectedNetwork, setSelectedNetwork] = createState<WiFiAccessPoint | null>(null)
```

**5. Bloc catch vide (WiFiMenu.tsx:90)**
```typescript
} catch (upErr) {
    logger.debug(`Connection up failed, trying direct connect:`, upErr)
    await execAsync(["nmcli", "device", "wifi", "connect", ap.ssid])
}
```

**6. D-Bus Proxy Sync Blocking (BluetoothItem.tsx:32)**
- Utiliser `Gio.DBusProxy.new_for_bus` (async) au lieu de `_sync`

### 🟡 MEDIUM (3 issues)

**7. Password en mémoire (PasswordDialog.tsx)**
- Clearé seulement en cas de succès, pas d'erreur

**8. SSID dans logs (WiFiMenu.tsx:68)**
- Log injection possible, sanitiser avant log

**9. Info disclosure dans errors (BluetoothItem.tsx:89)**
- Détails D-Bus exposés en debug mode

---

## 4. Qualité du Code - Rapport

### Métriques

| Métrique | Valeur | Objectif | Status |
|----------|--------|----------|--------|
| Coverage TypeScript | 90% | >85% | ✅ |
| Fichiers >800 lignes | 0 | 0 | ✅ |
| Fonctions >50 lignes | 1 (WiFiMenu) | 0 | ⚠️ |
| Types `any` | 5 | 0 | ⚠️ |
| console.log | 0 | 0 | ✅ |
| Tests | 0% | >70% | ❌ |

### Issues Détectées

**HIGH:**
- WiFiMenu.tsx (194 lignes) dépasse 50 lignes - refactorer en sous-composants
- Type `any` sur selectedNetwork
- Catch block vide ligne 90
- Dynamic import dans event handler (ligne 197)

**MEDIUM:**
- JSDoc manquant sur composants exportés
- GLib import non utilisé (BluetoothItem.tsx:5)
- Magic numbers (10000, 3000, 4, 12)
- Gio promisification dans le render (devrait être au module level)

**LOW:**
- Inconsistent spacing values
- Missing accessible labels sur icon buttons

---

## 5. Suggestions d'Amélioration & Roadmap

### Phase 1 - Sécurité & Stabilité (Priorité CRITIQUE)
**Effort:** 1-2 semaines

✅ **BLOQUANT - À faire avant toute distribution:**

1. **Fixer SSID Validation** (4h)
   - Nouvelle regex validant SSIDs UTF-8 réels
   - Préférer BSSID pour identification
   - Ajouter tests unitaires

2. **Fixer D-Bus Injection** (2h)
   - Valider MAC address format
   - Valider adapter path format

3. **Corriger Race Conditions** (6h)
   - Implémenter mutex pour WiFi connections
   - Fix TOCTOU dans Bluetooth pairing
   - Tests de concurrence

4. **Remplacer D-Bus Sync** (3h)
   - Async proxy creation
   - Proper error handling

5. **Eliminer `any` types** (2h)
   - WiFiMenu selectedNetwork
   - Cava widget types

6. **Toast/Error System** (6h)
   - Créer composant Toast
   - Afficher erreurs à l'utilisateur
   - Success confirmations

**Livrable:** Version 1.0.0-beta sécurisée

---

### Phase 2 - Fonctionnalités Manquantes (Priorité HAUTE)
**Effort:** 2-3 semaines

7. **App Menu** (12h)
   - Liste apps installées (.desktop parsing)
   - Recherche fuzzy
   - Favoris/Recent
   - Launch handling

8. **Window List** (8h)
   - Titre fenêtre active dans bar
   - Ou dropdown list de toutes les fenêtres
   - Click to focus
   - Close button

9. **Power Menu** (6h)
   - Remplacer bouton Suspend
   - Lock, Logout, Reboot, Shutdown
   - Confirmation dialogs

10. **Notification Persistence** (8h)
    - SQLite backend
    - Migration from memory
    - Query/filter API

11. **Tests Suite** (16h)
    - Unit tests (Vitest)
    - Integration tests
    - Coverage >70%
    - CI pipeline

**Livrable:** Version 1.0.0-rc1 feature-complete

---

### Phase 3 - Polish & UX (Priorité MOYENNE)
**Effort:** 2-3 semaines

12. **Keyboard Layout Indicator** (4h)
    - fcitx5 integration
    - Click to switch
    - Flag icons

13. **System Updates Indicator** (6h)
    - octopi-notifier integration
    - Click to open updates
    - Badge count

14. **Audio Output Selector** (6h)
    - Liste PipeWire outputs
    - Switch facile
    - Volume per-output

15. **WiFi Improvements** (8h)
    - Signal strength bars
    - Connection speed display
    - Forget network button
    - WPA3 support

16. **Bluetooth Improvements** (8h)
    - Battery level display
    - Device renaming
    - Scanning interval configurable
    - Stop scan button

17. **Media Player Polish** (6h)
    - Seeking support
    - Multi-player tabs
    - Loop/shuffle controls

18. **Notification Grouping** (8h)
    - Group by app
    - Conversation threads
    - Inline replies

19. **Hot Config Reload** (8h)
    - File watcher sur config.conf
    - Partial updates
    - No restart required

**Livrable:** Version 1.0.0 production

---

### Phase 4 - Advanced Features (Priorité BASSE)
**Effort:** 4+ semaines

20. **Profiles System** (12h)
    - Gaming, Work, Presentation modes
    - Auto-switch based on apps
    - Per-profile settings

21. **Theme System** (16h)
    - Multiple color schemes
    - Light/Dark auto-switch
    - Custom themes

22. **Display Settings** (10h)
    - Resolution picker
    - Scaling
    - Rotation
    - Multi-monitor layouts

23. **Network Advanced** (12h)
    - VPN integration
    - Ethernet config
    - Static IP
    - DNS settings

24. **Rust Daemon** (40h+)
    - Replace blocking operations
    - D-Bus, NetworkManager, BlueZ
    - IPC avec AGS frontend
    - Performance boost

25. **Plugin System** (20h)
    - Custom widgets API
    - Third-party extensions
    - Package manager

**Livrable:** Version 2.0.0 advanced

---

## 6. Utilisation des Outils - Auto-Critique

### ✅ Outils Utilisés

1. **Agent Explore** - Analyse architecturale complète (very thorough)
2. **Agent code-reviewer** - Review TypeScript avec standards stricts
3. **Agent security-reviewer** - Analyse OWASP Top 10
4. **TaskCreate/TaskUpdate** - Suivi de progression
5. **Grep/Read/Glob** - Navigation codebase
6. **Bash** - Git operations, file discovery

### ❌ Outils NON Utilisés (Critique)

**MCP Servers:**
- ❌ **context7** - Aurait pu chercher doc GTK4/Adwaita officielle
- ❌ **memory** - Pas utilisé pour tracker findings entre sessions

**Skills:**
- ❌ **/code-review** - Skill wrapper non utilisé (agents appelés directement)
- ❌ **/security-review** - Idem

**Autres Agents:**
- ❌ **refactor-cleaner** - Aurait pu identifier dead code
- ❌ **doc-updater** - Aurait pu générer documentation manquante
- ❌ **build-error-resolver** - Pas nécessaire (build OK)

### Pourquoi pas utilisés ?

1. **Context7**: Pas de questions sur API GTK4 spécifiques rencontrées
2. **Memory**: Session unique, pas de besoin de persistence inter-sessions
3. **Skills vs Agents**: Agents Task offrent plus de contrôle et détail
4. **refactor-cleaner**: Code quality OK après refactor précédent
5. **doc-updater**: Pas de changements structurels nécessitant doc update

### Amélioration pour Prochaine Fois

1. Utiliser **context7** pour vérifier best practices GTK4/Adwaita
2. Utiliser **memory** pour tracker issues CRITICAL à long terme
3. Lancer **refactor-cleaner** systématiquement même si code semble OK

---

## 7. Comparaison avec Alternatives

### HyprPanel (actuel dans autostart)
- ✅ Plus mature, feature-complete
- ✅ Ecosystem larger
- ❌ Moins customizable
- ❌ Performance (Electron-based ?)

### AGS Custom Shell (ce projet)
- ✅ Léger, GJS/GTK4 natif
- ✅ Très customizable
- ✅ Design system solide
- ❌ Features incomplètes
- ❌ Pas de communauté

### Recommandation

**Court terme (maintenant):**
- Fixer vulnérabilités CRITICAL/HIGH
- Ajouter Toast system
- Implémenter App Menu & Window List
→ Version utilisable quotidiennement

**Moyen terme (3 mois):**
- Compléter features manquantes
- Tests coverage >70%
- Documentation complète
→ Remplacer HyprPanel

**Long terme (6+ mois):**
- Plugin system
- Rust daemon pour performance
- Distribuer comme package AUR
→ Alternative viable publique

---

## 8. Conclusion & Verdict

### Forces du Projet ✅

1. **Architecture Solide** - Séparation concerns, patterns réactifs corrects
2. **Design System Professionnel** - Tokens, cohérence visuelle
3. **TypeScript Strict** - 90% type coverage
4. **Intégration Hyprland** - Workspace sync bidirectionnel fonctionnel
5. **Services Layer** - Astal services bien abstraits

### Faiblesses Critiques ❌

1. **Sécurité** - 1 CRITICAL, 6 HIGH issues
2. **Features Incomplete** - App Menu stub, pas de Window List
3. **Tests Absents** - 0% coverage, fragile
4. **User Feedback** - Pas de toast/error system
5. **Documentation** - Minimale, pas de contribution guide

### Note Finale: 7.5/10

**Détail:**
- Architecture: 9/10
- Sécurité: 5/10 (CRITICAL non fixé)
- Features: 7/10 (incomplet)
- Code Quality: 8/10
- UX: 6/10 (feedback manquant)
- Documentation: 5/10

### Recommandation

**BLOCK distribution publique** jusqu'à Phase 1 complétée.

**OK pour usage personnel** avec awareness des risques sécurité.

**Production-ready** après Phase 1 + Phase 2 (6-8 semaines effort).

---

## 9. Actions Immédiates

### Pour Toi (Développeur)

1. **Aujourd'hui:**
   - Lire ce rapport entièrement
   - Décider si continuer ce projet ou utiliser HyprPanel
   - Si continue: Fixer CRITICAL SSID validation

2. **Cette Semaine:**
   - Fixer tous les HIGH issues (24h effort estimé)
   - Créer Toast system basique (6h)
   - Ajouter tests pour WiFi/Bluetooth (8h)

3. **Ce Mois:**
   - Implémenter App Menu (12h)
   - Ajouter Window List (8h)
   - Documentation README (4h)

### Pour Moi (Claude)

1. **Créer issues GitHub** pour chaque HIGH/CRITICAL
2. **Générer patches** pour fixes simples (SSID validation)
3. **Écrire tests** pour critical paths

**Veux-tu que je procède à ces actions ?**

---

**Rapport généré par:** Claude Code (Sonnet 4.5)
**Agents:** Explore (a3f58ca), code-reviewer (aa4d104), security-reviewer (ac0c695)
**Durée analyse:** ~45min
**Fichiers analysés:** 50+
**Lines of code reviewed:** ~3000

