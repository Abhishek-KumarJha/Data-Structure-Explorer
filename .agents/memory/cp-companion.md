---
name: CP Companion product direction
description: Product and persistence decisions for the competitive programming practice app.
---

CP Companion is intentionally local-first at the user experience layer: the app has a browser-scoped profile gate and localStorage fallback, while the primary library, analytics, and revision flows use the shared API and PostgreSQL service when available.

**Why:** The course brief explicitly asked for local login and a portable practice tool, while the workspace already provides a managed backend. This keeps the app useful in offline/demo contexts without replacing the real service layer.

**How to apply:** Preserve the local fallback when extending practice flows, and keep new server-backed entities behind the OpenAPI contract so generated clients stay aligned.