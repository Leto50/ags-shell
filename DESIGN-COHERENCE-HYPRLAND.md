# Cohérence Design: AGS ↔ Hyprland

**Date:** 2026-02-07
**Analysé:** appearance.conf, colors.conf, config.conf, design tokens

---

## Résumé Exécutif

**Note Cohérence:** 7/10

### ✅ Points Cohérents
- Couleurs synchronisées via matugen (GTK colors → Material Design 3)
- Margins horizontaux corrects (15px = gaps_out)
- Blur activé sur toutes les layers AGS
- Transparence/alpha bien configurée

### ❌ Incohérences Critiques
1. **Bar margin_top = 8px** au lieu de 15px (gaps_out)
2. **Border radius désynchronisés** (AGS: 6/8/12px, Hyprland: 10px)
3. **Animations différentes** (Material vs Hyprland custom bezier)

---

## 1. Analyse Couleurs - ✅ COHÉRENT

### Material Design 3 via Matugen

**Source:** `/home/leto/Images/BG/Jolyne_BG.jpg`
**Color Scheme:** Purple/Violet (Material You)

| Hyprland Variable | Valeur | Usage |
|-------------------|--------|-------|
| `$primary` | #dfb8f7 (violet clair) | Active border, accents |
| `$on_primary_container` | #f3daff | Active border (col.active_border) |
| `$background` | #161217 (noir violet) | Inactive border |
| `$surface` | #161217 | Fenêtres |
| `$on_surface` | #e9e0e8 (blanc cassé) | Texte |

### Mapping AGS (GTK Colors)

```scss
// _variables.scss utilise bien les couleurs GTK:
$window_bg_color: #{"@window_bg_color"};  // → $surface_dim (#161217)
$window_fg_color: #{"@window_fg_color"};  // → $on_surface (#e9e0e8)
$accent_bg_color: #{"@accent_bg_color"};  // → $primary_fixed_dim (#dfb8f7)
$card_bg_color: #{"@card_bg_color"};      // → $surface (#161217)
```

**Verdict:** ✅ **Parfaitement synchronisé** via matugen templates

**Comment ça fonctionne:**
1. Matugen analyse l'image wallpaper
2. Génère Material Design 3 palette
3. Crée `/home/leto/.config/hypr/colors.conf` (Hyprland)
4. Crée GTK colors via template → AGS les utilise
5. Thème cohérent partout

---

## 2. Spacing & Gaps - ⚠️ PARTIELLEMENT COHÉRENT

### Hyprland (appearance.conf)

```conf
general {
    gaps_in = 5       # Entre fenêtres
    gaps_out = 15     # Bord écran
    border_size = 2
}
```

### AGS Config (config.conf)

```toml
[bar]
margin_top = 8              # ❌ DEVRAIT ÊTRE 15
margin_horizontal = 15      # ✅ OK

[menu]
margin_top = 10             # 8 (bar) + 2 (border) = 10, OK
margin_right = 15           # ✅ OK
margin_left = 15            # ✅ OK
```

### ❌ PROBLÈME: Bar Margin Top

**Fichier:** `config.conf` ligne 13
**Valeur actuelle:** `margin_top = 8`
**Valeur attendue:** `margin_top = 15` (pour matcher gaps_out)

**Impact visuel:**
```
Hyprland gaps_out = 15px
           ┌─────────────────────────────────┐
           │ ← 15px gap                      │
┌──────────┼─────────────────────────────────┼──────────┐
│  Screen  │         Window                  │          │
└──────────┼─────────────────────────────────┼──────────┘
           │                                 │
           └─────────────────────────────────┘

AGS bar margin_top = 8px
┌───────────────────────────────────────────────────────┐
│ ← 8px gap (trop petit!)                              │
├═══════════════════════════════════════════════════════┤ ← Bar
│                                                        │
│                  Window (gap=15px)                    │
│                                                        │
└───────────────────────────────────────────────────────┘
```

**Résultat:** La bar est trop proche du bord écran, asymétrique avec les fenêtres.

**Commentaire dans config.conf:**
```toml
# Window margins (should match your Hyprland gaps_out)
margin_top = 8  # ← Incohérent avec le commentaire !
```

---

## 3. Border Radius - ❌ INCOHÉRENT

### Hyprland

```conf
decoration {
    rounding = 10  # Toutes les fenêtres
}
```

### AGS Design Tokens

```scss
// styles/_design-tokens.scss
$radius-sm: 0.375rem;  // 6px  - Petits éléments
$radius-md: 0.5rem;    // 8px  - Boutons, cards
$radius-lg: 0.75rem;   // 12px - Panels, windows
$radius-xl: 1rem;      // 16px - (pas utilisé)
```

### ❌ PROBLÈME: Pas de valeur 10px

**Utilisations actuelles:**

| Composant | Border Radius | Devrait être |
|-----------|---------------|--------------|
| Window layers | N/A (GTK4) | 10px (Hyprland) |
| Bar container | 8px ($radius-md) | 10px |
| Bar buttons | 6px ($radius-sm) | 6-8px OK |
| Control Center box | 12px ($radius-lg) | 10px |
| Cards | 8px ($radius-md) | 10px |
| Menu items | 6px ($radius-sm) | 6-8px OK |
| Notification popup | 8px ($radius-md) | 10px |

**Impact visuel:**

Les fenêtres Hyprland ont des coins à 10px, mais les panneaux AGS (Control Center, Notification Center) ont des coins à 12px ou 8px.

**Exemple visuellement incorrect:**
```
┌──────────────┐  ← Hyprland window (10px radius)
│              │
│  ┌────────┐  │  ← AGS Control Center (12px radius)
│  │        │  │     Plus arrondi que la fenêtre parent !
│  └────────┘  │
└──────────────┘
```

---

## 4. Blur & Transparence - ✅ COHÉRENT

### Hyprland

```conf
blur {
    enabled = true
    size = 4
    passes = 2
    vibrancy = 0.1696
    popups = true
    popups_ignorealpha = 0.2  # Ignore alpha < 0.2
}
```

### AGS Layer Rules (rules.conf)

```conf
layerrule = blur on, match:namespace control-center
layerrule = blur on, match:namespace bar
layerrule = blur on, match:namespace tray-menu
layerrule = blur on, match:namespace notification-center
layerrule = blur on, match:namespace notification-popup
layerrule = ignore_alpha 0.0, match:namespace control-center
layerrule = ignore_alpha 0.2, match:namespace tray-menu
```

**Verdict:** ✅ Blur bien activé, alpha thresholds cohérents

**Sauf:** `ignore_alpha 0.0` pour control-center semble trop agressif (blur même avec alpha=0.01). Devrait probablement être 0.2 comme les autres.

---

## 5. Animations - ⚠️ DIFFÉRENTS (pas forcément problème)

### Hyprland Bezier Curves

```conf
bezier = easeOutQuint,   0.23, 1,    0.32, 1     # Smooth deceleration
bezier = easeInOutCubic, 0.65, 0.05, 0.36, 1     # Balanced
bezier = quick,          0.15, 0,    0.1,  1     # Snappy

animation = layers,      1, 3.81, easeOutQuint
animation = layersIn,    1, 4,    easeOutQuint, fade
animation = layersOut,   1, 1.5,  linear,       fade
```

**Durées:** 3.81, 4, 1.5 (unités Hyprland = 10ms par unité)
- layersIn: 40ms
- layers: 38.1ms
- layersOut: 15ms

### AGS Design Tokens

```scss
$duration-fast: 150ms
$duration-normal: 250ms
$duration-slow: 350ms
$easing-standard: cubic-bezier(0.4, 0.0, 0.2, 1)  // Material Design
```

**Material vs Hyprland:**
```
Material Standard:  cubic-bezier(0.4,  0.0,  0.2,  1)
Hyprland OutQuint:  cubic-bezier(0.23, 1,    0.32, 1)
                                  ^^^^  ^^^   ^^^^
                                  Plus   Y    Plus
                                  lent   max  lent
```

**Différence:** Hyprland easeOutQuint est plus "bouncy" (Y=1), Material est plus linéaire.

**AGS Transitions:**
- Bar buttons: 150ms (Material)
- Layers in: 40ms (Hyprland)
- Mismatch: AGS plus lent

**Suggestion:** Optionnel, mais pourrait utiliser les mêmes curves:

```scss
// Ajouter dans design-tokens pour matching Hyprland
$easing-hyprland-out: cubic-bezier(0.23, 1, 0.32, 1);     // easeOutQuint
$easing-hyprland-inout: cubic-bezier(0.65, 0.05, 0.36, 1); // easeInOutCubic
$easing-hyprland-quick: cubic-bezier(0.15, 0, 0.1, 1);     // quick

$duration-layer-in: 150ms;   // 4 * 10ms Hyprland + marge
$duration-layer-out: 100ms;  // 1.5 * 10ms Hyprland + marge
```

---

## 6. Corrections Recommandées

### Priorité HAUTE - Incohérences Visuelles

#### Fix 1: Bar Margin Top

**Fichier:** `config.conf`
```toml
[bar]
margin_top = 15  # Match Hyprland gaps_out
```

#### Fix 2: Border Radius Design Tokens

**Fichier:** `styles/_design-tokens.scss`
```scss
// Ajouter valeur 10px pour match Hyprland
$radius-sm: 0.375rem;   // 6px - Petits éléments (boutons, items)
$radius-md: 0.625rem;   // 10px - MATCH HYPRLAND (was 8px)
$radius-lg: 0.75rem;    // 12px - Grandes surfaces (optionnel)
$radius-xl: 1rem;       // 16px
```

**OU** simplifier à 2 valeurs:
```scss
$radius-sm: 0.375rem;   // 6px - Petits éléments
$radius-md: 0.625rem;   // 10px - TOUT LE RESTE (match Hyprland)
```

#### Fix 3: Appliquer 10px Partout

**Fichiers à modifier:**

1. `styles/_bar.scss`
```scss
.bar-container {
    border-radius: $radius-md;  // 10px maintenant
}
```

2. `styles/_control-center.scss`
```scss
window.control-center {
    border-radius: $radius-md;  // 10px
}

.control-center-box {
    border-radius: $radius-md;  // 10px
}

.card {
    border-radius: $radius-md;  // 10px
}
```

3. `styles/_notifications-popup.scss`
```scss
window.notification-popup {
    border-radius: $radius-md;  // 10px
}
```

4. `styles/_notifications-center.scss`
```scss
window.notification-center {
    border-radius: $radius-md;  // 10px
}
```

5. `styles/_tray-menu.scss`
```scss
window.tray-menu-window {
    border-radius: $radius-md;  // 10px
}
```

### Priorité MOYENNE

#### Fix 4: Control Center Alpha Threshold

**Fichier:** `/home/leto/.config/hypr/rules.conf`
```conf
# Avant:
layerrule = ignore_alpha 0.0, match:namespace control-center

# Après (cohérent avec autres):
layerrule = ignore_alpha 0.2, match:namespace control-center
```

### Priorité BASSE (Optionnel)

#### Fix 5: Animations Matching Hyprland

**Fichier:** `styles/_design-tokens.scss`
```scss
// Ajouter courbes Hyprland
$easing-hyprland-out: cubic-bezier(0.23, 1, 0.32, 1);
$easing-hyprland-quick: cubic-bezier(0.15, 0, 0.1, 1);

// Utiliser dans transitions
$transition-fast: all $duration-fast $easing-hyprland-quick;
$transition-normal: all $duration-normal $easing-hyprland-out;
```

---

## 7. Vérification Visuelle Post-Fix

Après corrections, vérifier:

### Test 1: Spacing Uniforme
```bash
# Mesurer distances visuellement
# Bar top → screen edge = 15px
# Window top → screen edge = 15px
# Window left → screen edge = 15px
```

### Test 2: Radius Cohérents
```bash
# Toutes les fenêtres/panels: 10px corners
# Sauf petits boutons: 6px OK
```

### Test 3: Couleurs Synchronisées
```bash
# Changer wallpaper
matugen image -m dark /path/to/new/wallpaper.jpg
# Hyprland reload
hyprctl reload
# AGS reload (si hot-reload implémenté, sinon restart)
ags quit && ags
# → Couleurs doivent matcher instantanément
```

---

## 8. Incohérences Non-Problématiques

### Acceptables

1. **Petits éléments (boutons, menu items) à 6px** - OK, plus petits éléments peuvent avoir radius inférieur
2. **Animations différentes (Material vs Hyprland)** - Préférence personnelle, pas choquant visuellement
3. **Spacing internes différents** - gaps_in (5px) vs AGS spacing (4px) → petite différence acceptable

---

## 9. Checklist Cohérence Design

- [x] **Couleurs** - Matugen synchronise tout ✅
- [ ] **Bar Margin Top** - 8px au lieu de 15px ❌
- [ ] **Border Radius** - 8/12px au lieu de 10px ❌
- [x] **Blur** - Activé partout ✅
- [ ] **Alpha Threshold** - 0.0 vs 0.2 ⚠️
- [x] **Margins Horizontaux** - 15px partout ✅
- [ ] **Animations** - Différentes (optionnel) ⚠️

**Score:** 4/7 cohérent = 57% → Avec fixes: 6/7 = **86%**

---

## 10. Conclusion

### Cohérence Actuelle: 7/10

**Bien fait:**
- Système de couleurs Material Design 3 via matugen parfaitement intégré
- Blur et transparence correctement configurés
- Spacing horizontal cohérent

**À corriger (30 min effort):**
1. `config.conf` margin_top: 8→15px
2. `_design-tokens.scss` radius-md: 8→10px
3. Appliquer radius-md partout (5 fichiers SCSS)

**Après fixes: 9/10** - Shell visuellement harmonieux avec Hyprland.

