# Shared travel map

The dock’s Travel map creates one shared desktop item. It is a lightweight
interactive globe, not a navigation service: it does not request location,
geocode addresses, or send travel data to a third party.

- Drag the globe to rotate its 3D-style orthographic view. Tap/click the visible
  globe to select coordinates, or use a supplied city shortcut.
- Add a name, optional note, emoji sticker, and either **Plan together** or
  **Visited together**. Pins appear on the globe and in separate shared lists.
- Up to 100 valid pins are retained. Names and notes are bounded, latitude is
  ±90, longitude ±180, and malformed saved content safely falls back to an empty map.
- Each update uses the existing item content revision. If the other person saves
  first, the editor restores the last persisted map and shows the normal error toast;
  the pin can be added again without data being silently overwritten.
- Removing a pin is a normal shared item update. The containing map can be moved to
  Trash and restored with the existing recovery flow.

Manual checks: create the map from the dock; drag and tap the globe; add planned and
visited pins with several stickers; refresh; open from the other profile; remove a
pin; test narrow mobile layout and reduced-motion preferences.
