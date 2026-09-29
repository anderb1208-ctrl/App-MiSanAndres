# MiSanAndrés Design System

Design system for **MiSanAndrés**, a mobile tourism-recommendation app for San Andrés Isla, Colombia. Tourists create an account, set their preferences, explore destinations, check how busy each one is (occupancy), get personalised recommendations, see destinations on a map, and manage their profile. Destinations are pre-registered by the system — **tourists never create, edit or delete destinations**, so the UI has no such affordances.

Target implementation: **React Native + Expo** (components here are React-for-web recreations; values are chosen to port 1:1 to RN styles).

## Sources
- Attached codebase `stitch_misanandr_s_smart_tourism_app/` (Google Stitch export) — read-only, may not be accessible to future readers:
  - `caribbean_horizon/DESIGN.md` — the original "Caribbean Horizon" token spec (colors, type scale, radii, spacing, component notes). **Ground truth for tokens.**
  - `home_misanandr_s/`, `explorar_destinos/`, `detalle_de_destino/`, `inicio_de_sesi_n/`, `registro_de_usuario/`, `mapa_de_destinos/`, `perfil_y_preferencias/`, `navegaci_n_principal/` — each has `code.html` (Tailwind) + `screen.png`.
  - `chatgpt_image_…png/screen.png` — Stitch prompt + 10-screen overview mockup (copied to `reference/anexo-chatgpt.png`).
  - `image.png/screen.png` — frontend component diagram: App → AppNavigator → MainTabNavigator (Perfil, Mapa, Explorar, Home) / AuthStack (Register, Login); reusable **DestinoCard → IndicadorOcupacion**, **CustomButton** (copied to `reference/anexo-image.png`).
- Brief from the user: professional, clean, formal, no emoji, current look with strong **glassmorphism / liquid glass** on cards, navbar and overlays.

## Index
- `styles.css` — entry point (imports only) → `tokens/` (`colors.css`, `typography.css`, `spacing.css`, `effects.css`, `fonts.css`, `icons.css`, `base.css`)
- `assets/fonts/` — Hanken Grotesk woff2 (400–700, latin + latin-ext)
- `assets/images/` — photography from the Stitch mockups (hero-aerial, login-beach, johnny-cay, johnny-cay-hero, acuario, piscinita, hoyo-soplador, west-view, map-island, avatar-ana)
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/` — React primitives (see below), one `@dsCard` per folder
- `ui_kits/app/` — interactive mobile-app recreation (`index.html`)
- `reference/` — original Stitch screenshots for comparison
- `SKILL.md` — Agent-Skill entry point

## Components
- **core/** — `Button` (the diagram's CustomButton), `IconButton`, `GlassPanel`, `Tag`, `Icon`
- **forms/** — `TextField`, `SearchField`, `FilterChip`, `SelectRow`
- **destinos/** — `DestinoCard` (featured / horizontal / list / map), `IndicadorOcupacion` (badge / bar / gauge; thresholds <40 Baja, <70 Media, ≥70 Alta), `OcupacionChart`, `MapMarker`, `UserLocation`
- **navigation/** — `BottomNav`, `TopBar`

### Intentional additions
The source diagram only names DestinoCard, IndicadorOcupacion and CustomButton; the rest are extracted from repeated patterns in the Stitch screens:
- `Icon` — wrapper for Material Symbols so glyph settings stay consistent.
- `GlassPanel` — the user asked for liquid glass as the dominant surface; this centralises the recipe.
- `OcupacionChart` — "Histórico de ocupación" from the overview mockup (screen 8).
- `MapMarker` / `UserLocation` — the `.map-marker` CSS in `mapa_de_destinos`.
- `SelectRow` — the preference checkbox/radio rows and profile menu rows.
- "Para ti" (Recomendaciones) tab in `BottomNav` — the brief makes Recomendaciones a core screen; Stitch had only 4 tabs.

## UI kits
- `ui_kits/app/` — Splash, Login, Registro, Inicio, Explorar, Detalle, Recomendaciones, Mapa, Perfil, Editar preferencias.

---

## CONTENT FUNDAMENTALS
- **Language:** Spanish (Colombia). Neutral Latin American Spanish, **tú** form ("Inicia sesión para continuar", "Cuéntanos qué te gusta"). Never *vos*/*usted*.
- **Voice:** calm, helpful, confident — a knowledgeable local guide, not a hype marketer. Short, factual sentences.
- **Casing:** Sentence case everywhere — titles, buttons, labels ("Explorar destinos", "Ver en el mapa", "Guardar cambios"). The only uppercase is the small overline section label ("CATEGORÍAS DE INTERÉS", 12px bold, 0.08em tracking).
- **Buttons:** verb-first infinitive or imperative: "Iniciar sesión", "Registrarme", "Ver ubicación", "Agregar a favoritos", "Cerrar sesión".
- **Greeting:** "Hola, Ana" + "Estas son tus recomendaciones personalizadas".
- **Occupancy copy:** always the semantic word + optional %: "Baja", "Media · 64%", "64% de ocupación", "Aforo estimado: 180 de 280 personas". Context lines: "Ocupación ideal para relajarse", "Buen momento para snorkel", "Concurrido en este momento".
- **Place names** stay local: Johnny Cay, Acuario, La Piscinita, Hoyo Soplador, West View, San Luis.
- **Metadata separator:** bullet "•" ("Playa • San Andrés").
- **No emoji. No exclamation marks** except rare confirmations. No childish tone (the Stitch prompt: "Sin emojis ni elementos infantiles. Estilo elegante y confiable.").
- Questions for secondary links: "¿Olvidaste tu contraseña?", "¿No tienes cuenta? Regístrate".

## VISUAL FOUNDATIONS
- **Palette** ("Sea of Seven Colors"): Deep Navy `#001430` for brand, primary CTAs and headings; Caribbean Turquoise `#00677d` (and container `#50d9fe`) for interactive states, active tab, links, icons; Island Sand `#e6e3d0` as the warm complement for soft surfaces; cool neutrals for text. Color is used sparingly — most of the UI is white/near-white glass over photography.
- **Occupancy spectrum** is reserved: green `#1e8e3e` Baja (<40%), amber `#f9ab00` Media (40–69%), red `#d93025` Alta (≥70%). Badges use tinted bg + dark fg + tinted border. Never used for other meanings, never shown without the word.
- **Type:** Hanken Grotesk only. Display 32/40 bold −0.02em (hero/splash/detail title), headline 24/32 and 20/28 semibold, body 16/24 and 14/20, labels 12/16 medium or bold. Wordmark = "MiSanAndrés" in 700.
- **Spacing:** 4px base; 20px screen margin; 12px gutter; 8px inside cards; 24–32px between sections.
- **Radii:** 8px inputs, 12px buttons, 16px cards, 20–28px glass panels & sheets, 32px auth sheet, full pills for chips/badges/nav.
- **Backgrounds:** full-bleed bright, sunny aerial/beach photography (turquoise water, white sand, palms). App canvas is `#f3f6f8` with very soft, large radial tints of turquoise (top-left) and sand (right) — a subtle ambient wash so glass has something to refract. No patterns, no textures, no illustrations.
- **Protection:** navy scrims (`--scrim-bottom`, `--scrim-top`) under text on photos; bottom-heavy on heroes, top gradient behind floating back/favorite buttons.
- **Liquid glass (dominant surface):** `rgba(255,255,255,.62)` (or `.82` for text-heavy) + `backdrop-filter: blur(20px) saturate(180%)` + 1px white 55% border + `inset 0 1px 0 rgba(255,255,255,.75)` top highlight + soft navy shadow. Dark variant `rgba(0,20,48,.38)` for captions on bright photos. Used on: bottom nav (floating pill), top bars, search, chips over map, card surfaces, map card, bottom action bars, back/fav buttons over photos, splash CTA panel, auth sheet.
- **Cards:** frosted surface, 16px radius, 1px white hairline, `0 8px 32px rgba(0,20,48,.12)`. No colored left borders. Featured cards are full-photo with a dark-glass caption.
- **Shadows:** navy-tinted and diffuse (4–14% opacity). `--shadow-1` rest, `--shadow-2` hover/overlay, `--shadow-3` modal.
- **Animation:** quiet and quick. `cubic-bezier(.22,1,.36,1)` ease-out, 150–220ms for state, 500ms for gauges/charts filling. Fades and slight scale; no bounces, no parallax gimmicks.
- **Hover (web) / press (native):** press scales to 0.98 (buttons), 0.95 (chips), 0.92 (icon buttons); primary buttons gain an inner shadow when pressed. Hover lifts card shadow from 1→2 and darkens primary to `#002855`.
- **Focus:** turquoise border + 3px `rgba(0,103,125,.25)` ring.
- **Layout:** fixed floating BottomNav (12px inset, 16px from bottom), sticky frosted headers; primary CTAs in the bottom thumb zone (Detalle uses a floating glass action bar). Content scrolls beneath glass.
- **Imagery vibe:** bright, warm-sunny, high saturation turquoise; no grain, no B&W.

## ICONOGRAPHY
- **System:** Google **Material Symbols Outlined** (variable font, loaded from Google Fonts CDN in `tokens/icons.css`) — exactly what the Stitch source uses. `FILL 0`, weight 400, 24px by default; 20px inside inputs/buttons; `FILL 1` only for the active tab or toggled favorite.
- Use via `<Icon name="…"/>` or `<span class="ms">name</span>`.
- Common glyphs: home, search, map, person, auto_awesome (recommendations), notifications, favorite, tune (filters), arrow_back, location_on, schedule, beach_access (Playas), eco (Naturaleza), restaurant (Gastronomía), family_restroom (Familia), museum (Cultura), kayaking (Aventura), scuba_diving, signal_cellular_alt_1/2_bar (occupancy levels).
- Icons sit in turquoise; inside a 40px circle with a 30% turquoise tint for list rows.
- **No emoji, no unicode symbol icons.** No custom SVG icon set exists.
- **Logo:** none was supplied. The brand is represented by the wordmark "MiSanAndrés" set in Hanken Grotesk Bold. Do not invent a symbol.

## Fonts
Hanken Grotesk is shipped locally from Google Fonts (`assets/fonts/`), the same family the source specifies — no substitution.
