
## 2026-09-04 — credentials removed
Live credentials were committed to this public repository and have been removed from HEAD and
rotated. They remain reachable in git history; removal from HEAD does not un-leak them.
Configuration secrets belong in the host platform environment variables, never in a committed file.
