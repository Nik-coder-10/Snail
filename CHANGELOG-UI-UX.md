# UI/UX & Movement Redesign Changelog

## Overview
Complete redesign of the Snail desktop companion's visual identity, movement system, animation engine, and UI components. The application now feels like a premium desktop companion comparable to modern macOS/Windows desktop applications.

---

## 1. Snail Visual Redesign (`SnailEngine.ts`)

### Before
- The snail was a simple collection of circles and ellipses
- Shell had no spiral pattern - just circles
- Body was a single ellipse (described as "looking like a UFO")
- Minimal visual depth

### After
- **Realistic Snail Anatomy**: Elongated soft body with visible muscular foot, subtle body highlights, and translucency effects
- **Shell with Spiral Pattern**: True spiral drawn with parametric curves across 3.5 turns, depth shading, and specular highlights
- **Eye Stalks**: Independent left/right stalks with individual height control, natural sway animation, and pupil tracking
- **Blush System**: Dynamic pink blush that appears during happy/grateful/excited emotional states
- **Antennae**: Two upper tentacles with natural sway
- **Feelers**: Two lower sensing tentacles
- **Body Highlights**: Multiple layers of highlights creating a soft, organic, slightly translucent appearance
- **Shadow**: Proper ground shadow that responds to body compression

---

## 2. Movement System Overhaul (`SnailContainer.tsx` + `SnailEngine.ts`)

### Before
- Snail was trapped in a 400x300px invisible rectangle
- Movement restricted to hardcoded margins
- Simple linear interpolation between points
- Robotic sliding motion

### After
- **Full Desktop Freedom**: The Electron window now fills the entire work area. The snail can roam anywhere on screen
- **Smooth Acceleration/Deceleration**: Velocity-based movement with lerp smoothing for natural starts and stops
- **Directional Awareness**: Snail turns to face the direction of travel
- **Random Pauses**: 30% chance of natural pauses during crawling (500-2000ms)
- **Natural Crawl Cycling**: Movement is segmented into crawl cycles with natural rest periods
- **Clamping**: Movement is clamped only to screen edges (20px margin)
- **Dragging**: The snail can be dragged anywhere and stays exactly where released
- **No Invisible Boundaries**: The `moveToEdge` method and margin-based constraints have been removed

---

## 3. Realistic Crawling Animation

### New body wave mechanics:
- **Body Compression Wave**: Sine-wave based compression/expansion cycles during movement
- **Head Tilt**: Gentle head leading during crawling
- **Shell Inertia**: Shell physically lags behind body during movement (both X and Y axes with strength factor)
- **Shell Bob**: Small vertical oscillation synchronized with body compression
- **Shell Rotation**: Subtle rotational sway during movement
- **Eye Stalk Sway**: Natural pendulum sway during crawling
- **Antenna Sway**: Tentacle oscillation during movement
- **Slime Trail**: Trails of slime with variable width, alpha, and subtle wobble

---

## 4. Animation System Redesign

### Feeding Animation (new - completely unique from petting)
1. Food (a leaf) appears and scales in
2. Snail notices, eyes widen excitedly
3. Chewing cycle with sinusoidal mouth movement
4. Sparkle particles during enjoyment
5. Food fades and disappears
6. Snail ends with grateful expression and blush

### Petting Animation (new - completely unique from feeding)
1. A hand approaches from above
2. Snail eyes look up, stalks compress slightly
3. Body compresses (squish reaction)
4. Multiple reaction phases with sparkle/heart particles
5. Blush intensifies
6. Gradual return to happy idle

### Idle Behavior Variety (greatly expanded)
- **Blinking**: Random blink intervals, faster when mouse is near
- **Looking**: Eyes scan surroundings with random targets
- **Stretching**: Body elongates upward
- **Yawning**: Mouth opens, eyes soften
- **Waving**: Small wave gesture
- **Cleaning**: Tentacle cleaning behavior
- Breathing animation always active (rate varies by state)

### Sleep Animation
- Eyes slowly close
- "ZZZ" text floats up in purple
- Breathing slows to 0.012 rate
- Amplitude increases for deeper sleep appearance

### Celebration/Dance
- Multi-phase particle bursts (confetti, sparkle, burst)
- Continuous particle spawning during celebration
- Body compression bouncing

---

## 5. UI Component Redesign

### Context Menu (`ContextMenu.tsx`)
- **Before**: Empty string icon placeholders, plain text
- **After**: Full lucide-react icons (MessageSquare, CheckSquare, StickyNote, Bell, Timer, Target, Calendar, Cookie, Heart, Settings, Eye)
- Smooth scale+fade transition with cubic-bezier easing
- Better gap/spacing, hover states with icon opacity transitions
- Feed/Pet events now dispatch `snail:feed` and `snail:pet` custom events

### Dialogue Panel (`DialoguePanel.tsx`)
- **Before**: Simple glass panel with basic input
- **After**: Premium chat UI with Bot/User icons, "Online" status indicator, shimmering send button
- Better message bubble styling with icon avatars
- Streamlined input with icon button
- Spring animation for open/close

### Settings Panel (`SettingsPanel.tsx`)
- **Before**: Flat sections with basic labels
- **After**: Section grouping with icon headers (Key, Palette, MessageCircle, Bell)
- Personality options with emoji indicators
- Grid-based skin picker with ring styling
- Toggle switch component with smooth transitions
- Glass-select dropdown styling

### Todo Panel (`TodoPanel.tsx`)
- **Before**: Simple todo list with text "x" delete
- **After**: Lucide icons (ListTodo, Plus, Check, Trash2)
- Badge showing pending task count
- Empty state with icon and helpful text
- Smooth row animations with height transitions
- Delete icon with Trash2, hover reveal

### Notes Panel (`NotesPanel.tsx`)
- **Before**: Random color assignment, no color picker
- **After**: User-selectable color picker with 6 color options, ring selection indicator
- Lucide icons (StickyNote, Plus, Trash2)
- Color-coded note borders with matching backgrounds
- Empty state with icon

### Reminder Panel (`ReminderPanel.tsx`)
- **Before**: Basic reminder list with emoji icon
- **After**: Lucide icons (Bell, Clock, Plus, Trash2)
- Smart relative time formatting ("Now", "5m", "2h 30m", "Today")
- Empty state with icon

### Pomodoro Timer (`PomodoroPanel.tsx`)
- **Before**: Basic timer with text buttons
- **After**: Lucide icons (Timer, Play, Square)
- Enhanced SVG ring with subtle glow effect
- Better typeface with tracking-wider
- Duration buttons with active states

### Habit Tracker (`HabitPanel.tsx`)
- **Before**: Simple habit list, plain emoji for completion
- **After**: Lucide icons (Target, Plus, Check, Flame)
- Flame icon with streak count, orange color when active
- Frequency selector with styled dropdown
- Empty state with icon

### Calendar Panel (`CalendarPanel.tsx`)
- **Before**: Basic event list with calendar emoji
- **After**: Lucide icons (Calendar, Clock, Plus, Trash2)
- Smart date formatting ("Today", "Tomorrow", "May 15")
- Time range display with dot separators
- Empty state with icon

### Notification Overlay (`NotificationOverlay.tsx`)
- **Before**: Basic toast with emoji
- **After**: Lucide Bell icon, spring animation, better glass styling

---

## 6. CSS Design System (`globals.css`)

### Before
- 104 lines of basic CSS
- Simple glass/glass-light classes
- Basic input styling

### After
- Comprehensive design token system with CSS variables
- Premium glass effect with saturate(1.4) and deeper blur
- Glass-button variants: default, primary (with gradient), danger
- Glass-select dropdown with custom arrow SVG
- Toggle switch component with smooth animations
- Empty state component with SVG support
- Badge system with color variants (green, amber, red, blue)
- Panel-container, panel-header, panel-title, panel-body utility classes
- Close button component style
- Scrollbar refinements
- Shimmer animation keyframe

---

## 7. Dependencies Added

- `lucide-react` ^1.28.0 - Premium open-source icon library

---

## 8. Modified Files

| File | Change |
|------|--------|
| `src/renderer/components/shell/SnailEngine.ts` | Complete rewrite (1056 -> 1050 lines) |
| `src/renderer/components/shell/SnailContainer.tsx` | Full-window, free movement, feed/pet support |
| `src/renderer/styles/globals.css` | Premium design system overhaul |
| `src/renderer/components/ui/ContextMenu.tsx` | Lucide icons, premium styling |
| `src/renderer/components/dialogue/DialoguePanel.tsx` | Premium chat UI |
| `src/renderer/components/panels/SettingsPanel.tsx` | Premium settings with sections |
| `src/renderer/components/panels/TodoPanel.tsx` | Premium todo with icons |
| `src/renderer/components/panels/NotesPanel.tsx` | Color picker, premium styling |
| `src/renderer/components/panels/ReminderPanel.tsx` | Premium styling, relative times |
| `src/renderer/components/panels/PomodoroPanel.tsx` | Premium timer UI |
| `src/renderer/components/panels/HabitPanel.tsx` | Premium habit tracker |
| `src/renderer/components/panels/CalendarPanel.tsx` | Premium calendar UI |
| `src/renderer/components/overlays/NotificationOverlay.tsx` | Premium toast styling |
| `src/renderer/App.tsx` | Fixed positioning for panels |
| `src/main/index.ts` | Full work area window |  
| `package.json` | Added lucide-react dependency |

---

## 9. Performance Considerations

- PixiJS renders at native requestAnimationFrame
- Particle count is bounded and self-cleaning
- Trail segments capped at MAX_TRAIL_LENGTH (40)
- Render resolution capped at 2x devicePixelRatio
- Body drawing uses simple primitives (circles, ellipses, lines)
- All animations use lerp-based interpolation (no expensive calculations)
