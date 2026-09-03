# Shared Mac-style Desktop Implementation Plan

## Goal

Upgrade Yuu & Mi into a persistent shared desktop that behaves like one computer used by two people. Item positions, open windows, window bounds, ordering, and appearance are shared state. Changes made by either user are visible to the other user in real time and remain after refresh, logout, reconnect, or server restart.

The visual direction is macOS-inspired rather than pixel-perfect: Neon Green and Royal Blue wallpaper, restrained glass materials, rounded-rectangle icons, a floating Dock, traffic-light window controls, and clear focus/selection states.

## Non-negotiable Behaviors

- The whole non-interactive area of an item card is draggable after pointer-down; hovering alone never moves an item.
- Buttons, links, inputs, textareas, audio/video controls, and resize handles never start item drag.
- Item positions are persisted by the server when drag ends. Pointer movement only sends throttled previews.
- Both users share the same item and window positions regardless of who moved them.
- Image, video, audio, URL, note, folder, and generic file items can be placed freely on the desktop.
- External URLs and local files can be dragged directly onto the desktop at the drop position.
- Multiple folder, note, media, link, and file windows can be open at once.
- Notes autosave after the user pauses typing.
- Folder items expose a complete right-click menu.
- Existing image/video endpoints and stored items remain compatible.

## Visual System

### Tokens

- Neon Green: `#B6FF00`
- Royal Blue: `#2453FF`
- Deep Navy: `#06113E`
- Ice: `#EDF5FF`
- Glass fill: translucent white/blue using alpha values between 10% and 24%
- Glass border: 1px translucent white highlight
- Item radius: 18px
- Window radius: 20px
- Dock radius: 22px

Use `Manrope` for interface text, `DM Mono` for status/utility text, and `lucide-react` for system icons. Emoji remains user-selectable per item and is rendered as text inside the same rounded glass icon frame.

### Interaction States

- Hover: subtle lift, brighter glass border, `grab` cursor.
- Active drag: `grabbing` cursor, stronger shadow, remote ghost position on the other client.
- Selected: visible Royal Blue/Neon Green focus ring without changing item dimensions.
- Remote locked: show the other user's color/name and prevent a second drag until unlock.
- Drop target folder: animate a restrained Neon Green border and folder-open icon.
- Respect `prefers-reduced-motion` and preserve visible keyboard focus.

## Data Model Changes

### Item

Extend `Item.type` to:

```text
folder | image | video | audio | link | note | file
```

Add or retain:

```text
position:
  x: number
  y: number
  revision: number

asset:
  publicId: string
  secureUrl: string
  thumbnailUrl?: string
  originalName: string
  extension?: string
  mimeType: string
  resourceType: image | video | raw
  bytes: number
  width?: number
  height?: number
  duration?: number

appearance:
  iconType: default | emoji | image
  iconValue?: string
  iconColor?: string
```

Increment `position.revision` only after an accepted committed move. Existing items default to revision `0`.

### Shared Window Layout

Persist window state in a dedicated shared layout document rather than user preferences:

```text
windowId: string
itemId: ObjectId
kind: folder | image | video | audio | link | note | file
bounds: { x, y, width, height }
restoreBounds?: { x, y, width, height }
minimized: boolean
maximized: boolean
z: number
revision: number
```

There is one active shared layout for the desktop. Deleting an item removes all associated layout entries.

## HTTP Interfaces

### Generic Upload

Add:

```http
POST /api/media/file
Content-Type: multipart/form-data
```

Fields: `file`, `name`, `parentId`, `x`, `y`.

Routing:

- Images upload as Cloudinary `image` and create an `image` item.
- Video uploads as Cloudinary `video` and creates a `video` item.
- Audio uploads as Cloudinary `video` resource and creates an `audio` item.
- Other files upload as Cloudinary `raw` and create a `file` item.

Limit each file to 50 MB. Validate filename, MIME type, coordinates, and destination folder. If asset upload succeeds but item creation fails, delete the uploaded asset before returning the error.

Keep existing `/api/media/image` and `/api/media/video` routes for compatibility.

### Window Snapshot

Add:

```http
GET /api/desktop/windows
PUT /api/desktop/windows
```

`GET` returns the authoritative shared layout. `PUT` validates and replaces the layout for reconnect/fallback workflows. Normal interactive updates use Socket.IO and persist only at the end of drag/resize.

## Realtime Protocol

Add Socket.IO to the Express server and client. Both authenticated users join one `shared-desktop` room.

### Item Events

```text
desktop:join
desktop:snapshot
item:lock
item:preview
item:commit
item:unlock
item:created
item:updated
item:deleted
operation:rejected
```

Flow:

1. `item:lock` grants a soft lock when the item is not held by another connection.
2. The dragging client sends `item:preview` at no more than about 30 updates per second.
3. The server validates bounds and broadcasts the preview without writing MongoDB.
4. `item:commit` includes the last known revision and final position.
5. The server rejects stale revisions or persists the new position, increments revision, broadcasts the committed item, and releases the lock.
6. Disconnect, cancel, or lock timeout releases the lock and restores the last committed position.

### Window Events

```text
window:open
window:lock
window:preview
window:commit
window:minimize
window:maximize
window:focus
window:close
```

Window movement and resizing use the same lock, preview, commit, revision, and reconnect rules as items. Open/close/minimize/maximize/focus mutations persist immediately.

The server validates every event. Clients never relay unvalidated payloads directly to peers. The authoritative server state wins during reconnect or revision conflict.

## Frontend Architecture

### Desktop Canvas

- Accept shared appearance settings and external-drop callbacks explicitly.
- Attach DnD activation to the item card while excluding descendants marked `data-no-drag`.
- Clamp final positions to the usable desktop while preserving free positioning.
- Apply Snap to Grid only when the shared setting is enabled.
- Drop multiple files in a cascade starting at the pointer coordinate.
- Prefer `text/uri-list` for browser link drops, then fall back to validated `text/plain`.
- Show an upload queue with progress, retry, failure, and success states.

### Desktop Items

- Use a shared rounded glass frame for every icon type.
- Render Lucide defaults for folders, notes, links, audio, video, images, and generic files.
- Render thumbnail/favicon when present.
- Render per-item emoji or custom icon image when configured.
- Audio items include `data-no-drag` play/pause and progress controls.

### Window Manager

- Replace single modal/folder state with an `openWindows` collection.
- Opening an already-open item focuses its existing window.
- Pointer-down focuses a window and updates shared z-order.
- Title bars drag; edges/corners resize; both commit only on interaction end.
- Red closes, yellow minimizes, and green toggles maximize/restore.
- Minimized windows appear in the Dock and restore on click.
- Clamp rendering locally for smaller screens without overwriting shared bounds until the user performs a real move/resize.

### Responsive Coordinate System

Use one canonical logical desktop measuring `1440 x 900` logical pixels. Persist all item coordinates and window bounds in this coordinate space so users on different screen sizes always share the same arrangement.

- `>= 1024px`: render the logical desktop as the normal free-position canvas. Center it when the viewport is wider and allow local pan when the usable area is smaller than the logical desktop.
- `600px-1023px`: use compact-desktop mode with a locally pannable canvas, condensed menu bar, smaller Dock spacing, and windows clamped to the visible area.
- `< 600px`: use mobile workspace mode. The canvas remains pannable, an Overview action zooms out to reveal all items, and opened windows render fullscreen while preserving their shared desktop bounds for larger screens.
- Store local canvas pan and zoom per browser only; never broadcast or persist them as shared desktop state.
- Keep zoom between `0.75` and `1.25`. Item hit targets and controls must remain at least `44 x 44` CSS pixels at every supported zoom.
- Persist logical coordinates, not viewport pixels or CSS-transformed coordinates. Convert pointer coordinates through the current pan/zoom transform before preview or commit events.
- Do not rewrite item/window positions after resize, orientation change, browser zoom, or breakpoint change.
- Use `100dvh`, `env(safe-area-inset-*)`, and bounded overflow so mobile browser chrome and device notches do not cover controls.

### Responsive Navigation and Touch

- Collapse secondary menu-bar actions into a glass Control Center below `768px`; keep connection status and the active user visible.
- Make the Dock horizontally scrollable with scroll snapping. Keep Folder, Note, Add URL, and Upload reachable without precision tapping.
- Render context menus as anchored menus on pointer devices and bottom sheets on touch screens.
- Long press opens a context menu on touch. Touch dragging activates after a short hold plus movement threshold so scrolling and tapping remain usable.
- Apply hover animation only inside `@media (hover: hover)` to avoid sticky states on touch devices.
- Fullscreen mobile windows retain touch-friendly traffic-light actions; minimize returns them to the Dock and maximize means fullscreen.
- Note, Get Info, appearance, upload, and link forms become single-column layouts without horizontal scrolling.
- Media uses `object-fit: contain`; player controls wrap or collapse without overlapping the drag region.
- Support portrait and landscape without losing the active item, note draft, playback position, or window focus.

### Window Contents

- Folder: grid/list of children, nested-folder navigation, drop target, contextual actions.
- Note: title and body editor with 600 ms debounced autosave and Saving/Saved/Error status.
- Image: Quick Look style responsive preview.
- Video: native controls that remain isolated from window drag.
- Audio: Music-style player with play/pause, seek, duration, volume, and metadata.
- Link: rich preview and explicit Open Website action.
- Generic file: filename, MIME, size, timestamps, and Download/Open action.

Only one audio source may play per browser client. Starting another audio item pauses the current one.

## Context Menus

Desktop menu:

- New Folder
- New Note
- Add URL
- Upload Files
- Clean Up
- Arrange by Name
- Arrange by Type
- Toggle Snap to Grid
- Customize Desktop

Folder menu:

- Open
- New Folder Inside
- New Note Inside
- Rename
- Change Icon
- Move to Desktop
- Get Info
- Delete

Other item menus use relevant subsets plus Open, Rename, Change Icon, Get Info, Download when applicable, and Delete.

## Note Autosave

- Create the note item before opening the editor window.
- Maintain local draft state per note window.
- Debounce updates for 600 ms after the last edit.
- Flush pending changes before an intentional window close when possible.
- Preserve the local draft and expose Retry if saving fails.
- Remote edits update an idle editor immediately; if both users edit the same note, use revision checking and show a conflict state rather than silently overwriting text.

## Failure and Recovery

- Reconnect with exponential backoff and request a full desktop snapshot after reconnect.
- Reconcile optimistic item/window previews against committed revisions.
- Expire locks after inactivity and always release them on disconnect.
- Ignore and clean window records whose item no longer exists.
- Reject invalid/private-network URLs through the existing protected link-preview flow.
- Generic files unsupported by the browser remain downloadable; do not attempt unsafe inline execution.

## Implementation Order

1. Update this specification and the master architecture exception for shared-desktop realtime.
2. Extend schemas and migrations/defaults for audio, generic files, revisions, and shared windows.
3. Implement generic file upload and cleanup behavior.
4. Add Socket.IO server, validation, locks, revisions, persistence, and reconnect snapshot.
5. Refactor Zustand into item, window, player, upload, and shared-settings responsibilities.
6. Rebuild DesktopCanvas external drop and full-card DnD behavior.
7. Replace glyph icons with Lucide components and add emoji/custom icon editor.
8. Implement multi-window manager and persistent shared window layout.
9. Add note editor/autosave, audio mini-player/full player, and generic file window.
10. Complete folder/root context menus, Dock restore indicators, responsive layout, and accessibility.
11. Add tests, run the manual checklist, build production assets, and fix all failures.

## Test Plan

### Backend

- Validate every new item and asset type.
- Verify generic upload resource routing and 50 MB rejection.
- Verify uploaded-asset cleanup on item creation failure.
- Test item/window revisions, stale commit rejection, and persistent shared coordinates.
- Test socket join, locks, preview, commit, cancel, timeout, disconnect, and reconnect.
- Test deleting an item cleans layout records and broadcasts deletion.

### Frontend

- Drag from every non-interactive card region.
- Confirm player/input/link controls never start drag.
- Drop one/multiple files and browser URLs at pointer coordinates.
- Test audio play, pause, seek, volume, window sync, and single-source behavior.
- Test note creation, autosave, retry, remote update, and edit conflict.
- Test multiple windows, focus, z-index, move, resize, minimize, maximize, close, and restore.
- Test folder right-click actions and nested folder drops.
- Test emoji, custom image icons, global themes, and fallback icons.
- Test canonical-coordinate conversion at every breakpoint and with non-default canvas zoom.
- Test the responsive menu bar, scrolling Dock, touch long press/drag, mobile bottom sheets, and fullscreen mobile windows.
- Test orientation and viewport changes without persistent coordinate mutations.

### Shared Desktop Acceptance

- Open two authenticated browser sessions.
- Move an item in session A; session B must show the preview and committed position immediately.
- Refresh both sessions; the item must remain at the latest committed position.
- Move/resize/minimize a window in session B; session A must update immediately.
- Restart the server and reconnect; all committed item and window positions must restore from MongoDB.
- Attempt to drag the same object simultaneously; only the client holding the lock may commit.
- Arrange items at `1440 x 900`, open the same desktop at `390 x 844`, and confirm the logical arrangement is unchanged.
- Move an item from the mobile pannable canvas, reopen at desktop width, and confirm its logical position matches on both clients.
- Verify `360 x 800`, `768 x 1024`, `1440 x 900`, and `1920 x 1080` with no inaccessible actions or unintended document overflow.

Run:

```bash
npm test
npm run build
```

Also complete the interaction checklist in `13-testing.md`.

## Compatibility and Constraints

- Socket.IO is the only approved realtime exception; do not add chat or notification realtime features.
- MongoDB remains the persistent source of truth.
- Cloudinary stores file binaries; MongoDB stores metadata only.
- Existing items without revisions or appearance data must render with safe defaults.
- Existing image/video APIs and documents remain supported.
- Position writes occur on drag/resize end, never on every pointer movement.
- Responsive rendering never creates device-specific shared layouts; only pan, zoom, and temporary viewport clamping are local.
