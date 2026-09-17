# App language

Settings → Language selects English or Thai for the entire app. The preference is
stored on this browser/device, independently of shared character designs and desktop
appearance. Thai is the initial default; changing language updates the page immediately.

- `client/src/locales/en.json` and `th.json` hold all UI translations.
- Components subscribe with `useI18n()` and render labels with `t(key, values)`.
- Keep keys and `{placeholder}` names identical in both files. Unknown keys fall back
  to English, then the original key. Empty translations are respected.
- Date formatting uses the chosen locale. Never translate stored filenames, event
  titles, user messages, or character descriptions as part of a language switch.
- Companion-generated text has an explicit translation action using the existing
  backend translation endpoint. It does not change stored memories.
- Browser-native file/media controls and device voice names follow the browser/OS.

`npm test --prefix client` checks dictionary parity, placeholders, interpolation,
switching, and safe fallback for unknown text. No provider is required to switch UI
languages. To add a label, add the English and Thai values before using its key.
