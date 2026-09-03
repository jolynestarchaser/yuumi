# Website / Link Preview

## Goal

ให้ผู้ใช้ paste URL แล้วได้ rich preview

## Flow

```text
paste URL
→ POST /api/link-preview
→ backend fetch HTML
→ parse Open Graph / metadata
→ return preview
→ create item
```

## Metadata Priority

Title:
1. `og:title`
2. `<title>`

Image:
1. `og:image`
2. fallback favicon / no image

Description:
1. `og:description`
2. meta description

Site:
- `og:site_name`
- hostname

## Endpoint

```http
POST /api/link-preview
```

Body:

```json
{
  "url": "https://example.com"
}
```

Response:

```json
{
  "title": "Example",
  "description": "...",
  "previewImage": "...",
  "favicon": "...",
  "siteName": "Example",
  "url": "https://example.com"
}
```

## Security

สำคัญมาก:
- allow only http/https
- block localhost
- block private network IP ranges
- timeout request
- max response size
- do not execute remote JS

เพื่อป้องกัน SSRF

## UI

```text
┌─────────────────────────┐
│    preview image        │
├─────────────────────────┤
│ favicon example.com     │
│ Page title              │
│ short description       │
└─────────────────────────┘
```

## Acceptance Criteria

- paste valid URL แล้ว preview ได้
- fallback เมื่อไม่มี OG tags
- invalid URL แสดง error
- server ไม่ fetch localhost/private IP
