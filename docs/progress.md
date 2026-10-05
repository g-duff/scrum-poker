# Progress

Completed: slice 1

Current: slice 2, create and join (branch `slice-2-create-and-join`)

- [x] 1. Shared domain types (Session, Participant, Vote, SessionSnapshot)
- [x] 2. Shared Zod schemas for create-session and join-participant bodies
- [x] 3. `SessionStore` interface and its reusable contract test suite
- [x] 4. Move existing server/src files into src/core and src/shell per
       coding standards (mechanical move, no behaviour change)
- [x] 5. In-memory `SessionStore` implementation against the contract suite
- [x] 6. `SessionNotifier` interface and in-process implementation
- [ ] 7. Token auth: generation, hashing, and Bearer-token middleware
- [ ] 8. Create-session endpoint (`POST /api/sessions`)
- [ ] 9. Join endpoint (`POST /api/sessions/:id/participants`), name validation and suffixing
- [ ] 10. Snapshot endpoint (`GET /api/sessions/:id`)
- [ ] 11. SSE events endpoint (`GET /api/sessions/:id/events`)
- [ ] 12. Client `SessionConnection` (EventSource wrapper)
- [ ] 13. Home page: create-session form wired to the API
- [ ] 14. Session page: localStorage identity util (token + participant id)
- [ ] 15. Session page: join form (shown on 401) wired to the API
- [ ] 16. Session page: live participant list rendered from the snapshot stream
