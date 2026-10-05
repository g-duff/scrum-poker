# Progress

Completed: slice 1

Current: slice 2, create and join (branch `slice-2-create-and-join`)

- [x] 1. Shared domain types (Session, Participant, Vote, SessionSnapshot)
- [ ] 2. Shared Zod schemas for create-session and join-participant bodies
- [ ] 3. `SessionStore` interface and its reusable contract test suite
- [ ] 4. In-memory `SessionStore` implementation against the contract suite
- [ ] 5. `SessionNotifier` interface and in-process implementation
- [ ] 6. Token auth: generation, hashing, and Bearer-token middleware
- [ ] 7. Create-session endpoint (`POST /api/sessions`)
- [ ] 8. Join endpoint (`POST /api/sessions/:id/participants`), name validation and suffixing
- [ ] 9. Snapshot endpoint (`GET /api/sessions/:id`)
- [ ] 10. SSE events endpoint (`GET /api/sessions/:id/events`)
- [ ] 11. Client `SessionConnection` (EventSource wrapper)
- [ ] 12. Home page: create-session form wired to the API
- [ ] 13. Session page: localStorage identity util (token + participant id)
- [ ] 14. Session page: join form (shown on 401) wired to the API
- [ ] 15. Session page: live participant list rendered from the snapshot stream
