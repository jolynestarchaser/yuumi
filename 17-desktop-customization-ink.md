# Desktop Customization, Folder Drop, and Shared Ink

## Goal

Extend the shared Mac-inspired desktop with a searchable icon library, reliable folder drops, a flexible wallpaper studio, and a persistent collaborative pen layer. All controls use the same Neon Green and Royal Blue glass design; native browser/Windows prompts are not used.

## Required Behavior

- Item icons support defaults, Lucide icons, emoji, and uploaded images.
- A custom image overrides the automatic image or link thumbnail; choosing the default restores the original thumbnail.
- The icon picker is searchable, grouped, keyboard accessible, and includes recent choices.
- Dropping an item on a folder changes its `parentId`, persists once on drag end, rejects circular folder moves, and updates every connected client.
- Every open folder contains a free-position mini desktop. Children can be dragged, dropped into nested folders, and arranged by name or type while preserving shared positions.
- Wallpaper supports presets, uploaded images, solid colors, and gradients, with fit, focal position, dim, blur, brightness, and saturation controls.
- Wallpaper edits preview locally and become shared only after Apply.
- Pen and eraser work with mouse, touch, and stylus on the desktop canvas. Strokes are stored as vectors, synchronized in real time, and restored after refresh.
- Rename, icon selection, destructive confirmation, link entry, appearance, and drawing confirmation use shared glass dialog primitives.
- Responsive layouts use anchored popovers on pointer devices and bottom-sheet dialogs on narrow touch screens.

## Data and Realtime

`Item.appearance.iconType` accepts `default`, `lucide`, `emoji`, or `image`, with optional `iconValue`, `iconColor`, and `iconBackground`.

The shared wallpaper document supports `preset`, `image`, `solid`, and `gradient`, plus colors, angle, fit, position, background color, and visual filter values.

Each `DesktopStroke` stores logical `1440 x 900` points, color, width, opacity, and creation metadata. Pointer previews are broadcast without database writes; completed strokes are persisted once and then broadcast. Erase and clear operations delete persisted strokes and notify the room.

`item:commit` includes `parentId` as well as position and revision. The server validates the destination and circular-folder rules before changing both position and parent atomically.

## Implementation Sequence

1. Extend schemas, settings validation, stroke routes, and Socket.IO events.
2. Update the client store for shared settings, strokes, drawing previews, and parent-aware item moves.
3. Add the reusable glass dialog, confirmation, toast, icon picker, and icon catalog.
4. Rebuild Appearance as a preview/apply wallpaper studio.
5. Add the SVG ink layer and responsive pen toolbar.
6. Finish folder drop feedback, responsive styling, accessibility, and recovery states.
7. Run server tests and the client production build, then complete the interaction checklist in `13-testing.md`.

## Acceptance

- Two browser sessions see the same completed folder move, icon, wallpaper, and ink state.
- Shared state survives refresh and server restart.
- Invalid/circular moves roll back with a glass toast.
- Pen mode never accidentally drags desktop items; Select mode restores normal drag behavior.
- No `window.prompt`, `window.confirm`, or `window.alert` calls remain under `client/src`.
- Controls remain reachable at 360x800, 768x1024, 1440x900, and 1920x1080.
