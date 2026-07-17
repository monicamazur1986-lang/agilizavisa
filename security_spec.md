# Security Specification - Materials Collection

## 1. Data Invariants
- Each document in `/materials/` must have a non-empty `title` (max 100 chars), a valid `url` (string, max 500 chars), and a `type` that is one of `['pdf', 'drive', 'canva']`.
- Documents in `/materials/` are read-only for standard users and can only be modified by admins.

## 2. The "Dirty Dozen" Payloads (for `/materials/`)
1. `{ "title": "", "url": "...", "type": "pdf" }` (empty title - fail)
2. `{ "title": "A".repeat(101), "url": "...", "type": "pdf" }` (too long title - fail)
3. `{ "title": "...", "url": "", "type": "pdf" }` (empty url - fail)
4. `{ "title": "...", "url": "A".repeat(501), "type": "pdf" }` (too long url - fail)
5. `{ "title": "...", "url": "...", "type": "invalid" }` (invalid type - fail)
6. `{ "title": "...", "url": "...", "type": "pdf", "ghostField": "true" }` (ghost field - fail)
7. `{ "title": "...", "url": "...", "type": "pdf" }` (missing type - fail)
8. `{ "title": "...", "type": "pdf" }` (missing url - fail)
9. `{ "url": "...", "type": "pdf" }` (missing title - fail)
10. `{ "title": 123, "url": "...", "type": "pdf" }` (invalid type title - fail)
11. `{ "title": "...", "url": 123, "type": "pdf" }` (invalid type url - fail)
12. `{ "title": "...", "url": "...", "type": ["pdf"] }` (invalid type enum - fail)

## 3. Test Runner
- All payloads must return PERMISSION_DENIED for non-admin users.
- Updates to existing documents must be blocked for all users (unless admin).
- Deletes must be blocked for all users (unless admin).
