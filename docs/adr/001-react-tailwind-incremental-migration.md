# ADR 001: Incremental React, Tailwind and shared UI migration

- Status: Accepted
- Date: 2026-09-14

## Decision

Migrate the existing desktop UI in vertical slices. New shared primitives live in `client/src/components/ui`, local motion sources live in `client/src/components/animate-ui`, and feature components keep their existing callback contracts while styles move to Tailwind utilities.

React 19, Vite, Zustand and dnd-kit remain the application runtime. HTTP routes, Socket.IO events, persistence schemas, revision history and user-authored desktop coordinates are unchanged.

## Consequences

- Existing CSS can coexist during migration; new utilities are introduced without forcing a risky rewrite of canvas and wallpaper math.
- Radix primitives own focus trapping, Escape handling and focus restoration for dialogs and menus.
- Runtime colors, wallpaper values and persisted coordinates stay in CSS variables or inline styles instead of generated Tailwind class names.
- Each phase is independently revertible and is committed separately.
