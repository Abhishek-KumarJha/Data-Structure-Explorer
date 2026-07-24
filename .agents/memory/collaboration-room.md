---
name: Collaboration room
description: Scope and persistence decision for CP Companion's study-together surface
---

The Collaborator room is intentionally local-first: invites, the pinned problem, room chat, and leaderboard state are persisted in the browser alongside the local profile.

**Why:** CP Companion currently has browser-scoped identity and a local fallback, so presenting collaboration as multi-device realtime functionality without authenticated shared storage would be misleading.

**How to apply:** If true shared rooms are requested, add authenticated collaboration endpoints and a realtime or polling freshness path, then replace the browser persistence while keeping the existing room UI contract.