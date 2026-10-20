# Scrum Poker App - Design Spec

A web app where a team estimates together: everyone picks a card in secret, then
anyone reveals all cards at once. No accounts, no stories, no history.

This document is the handover spec. It states what to build, the contracts
between parts, and a build plan of vertical slices with manual acceptance checks.

## Goals and non-goals

Goals:

- Create a session and share a link in seconds
- Votes stay hidden until reveal
- Anyone can reveal or reset; there is no facilitator role
- Everything is deleted when the session expires

Non-goals (v1):

- Accounts, teams or saved history
- Linking votes to stories or backlog items
- Observers, kicking participants, timers, results export
- Participant caps, deck size or card length limits, rate limiting, abuse handling

## Decisions

| Area                     | Decision                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Joining                  | Anonymous: the session UUID (shared as a link) plus a display name                        |
| Data lifetime            | Ephemeral; a session expires one hour after its last activity                             |
| Activity                 | Any action or heartbeat; a session with an open tab never expires                         |
| Platform                 | Web app                                                                                   |
| Stack                    | TypeScript on Node 26; Express 5 server; React + Vite front end                           |
| Deployment               | One container serving the front end from a single route (see Architecture)                |
| Hosting and scale        | Containerised, vendor agnostic (ECS/Fargate preferred, Kubernetes acceptable); one instance, about 1000 engineers |
| Realtime                 | SSE for server push and ordinary POSTs for actions, behind a strict interface             |
| Permissions              | Flat: anyone can vote, reveal and reset, at any time                                      |
| Voting                   | Everyone may vote; nobody has to                                                          |
| Deck                     | Per session, default Fibonacci; every card is a free-form string                          |
| Reveal                   | Allowed with zero votes; the client confirms if active participants have not voted        |
| Results                  | Votes shown individually, grouped by card; no statistics or suggested score               |
| Duplicate names          | Automatically suffixed                                                                    |
| Renaming                 | Not allowed; a participant leaves (deleting identity and vote) and joins again            |
| Rejoining                | A returning browser reuses its identity where possible; otherwise it is a new participant |
| Inactive participants    | Inactive after 60 seconds without a heartbeat; vote stays visible; dropped at next reset  |
| Late joiners             | May join mid-round; see results if already revealed                                       |
| Multiple tabs            | Not handled specially                                                                     |

## Data model

```
                  +------------------------------------------+
                  | Session                                  |
                  |------------------------------------------|
                  | id             UUID (also the join code) |
                  | deck           list of strings           |
                  | state          voting | revealed         |
                  | round_number   integer                   |
                  | expires_at     timestamp                 |
                  +------------------------------------------+
                        | 1 : many                     | 1 : many
                 +------+                              +-----+
                 |                                           |
                 v                                           v
+----------------------------------+        +----------------------------------+
| Participant                      |        | Vote                             |
|----------------------------------|        |----------------------------------|
| id             UUID              | at most| session_id     -> Session        |
| session_id     -> Session        |------->| participant_id -> Participant    |
| display_name   string            | one    | value          string            |
| token_hash     string            |        | unique on      session_id +      |
| last_seen_at   timestamp         |        |                participant_id    |
+----------------------------------+        +----------------------------------+
```

Notes:

- Ids are random v4 UUIDs. The session id doubles as the join code; there is no
  separate short code.
- `deck` defaults to `0, 1, 2, 3, 5, 8, 13, 21, ?, (coffee cup)`. Cards are any
  text. A vote's `value` must be a card in the session's deck.
- `display_name` is shown to everyone; a suffix is added if the name is taken.
- `token_hash` is a hash of the token the browser holds. The server never stores
  the raw token. The client keeps it in local storage and sends it with every
  request.
- `last_seen_at` is updated by heartbeats and decides who is inactive.
- `expires_at` is one hour after the last activity.
- A vote belongs to the current round only. There is no round table; reset
  deletes all votes and increments `round_number`.

## Session state machine

```
          create session (round 1)
                 |
                 v
          +--------------+   reveal (round must match)    +--------------+
          |    VOTING    | -----------------------------> |   REVEALED   |
          +--------------+                                +--------------+
                 ^                                               |
                 +-----------------------------------------------+
                   reset (any state): delete all votes,
                   drop inactive participants, round_number + 1
```

Casting, changing and clearing votes happen inside VOTING. Reset is also allowed
while VOTING, to discard votes.

## Actions and rules

Every action that carries a `round_number` — vote, clear vote, reveal and
reset — is checked against the session's current round. A stale round is
rejected with `409 stale_round`, so two people pressing reset at once cannot
wipe a fresh round, and a vote cast just as a reset happens cannot land in the
new round.

| Action         | Allowed when                                   | Effect                                                                                  |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Create session | Always                                         | New session: UUID id, deck (default Fibonacci), `state = voting`, `round_number = 1`    |
| Join           | Session exists and has not expired; any time   | New participant with a display name (suffixed if taken) and a random token              |
| Leave          | Always                                         | Deletes your participant and your vote                                                  |
| Vote           | `state = voting`, round matches                | Sets or replaces your vote with a card from the deck                                    |
| Clear vote     | `state = voting`, round matches                | Removes your vote                                                                       |
| Reveal         | `state = voting`, round matches                | `state = revealed`; allowed with zero votes; no-op if already revealed                  |
| Reset          | Round matches, any state                       | Deletes all votes, drops inactive participants, `state = voting`, `round_number + 1`; deck may be edited here |

- **Hidden votes.** While `state = voting`, the server tells clients only which
  participants have voted, never the values. Values are sent only after reveal.
- **Reveal confirmation.** The client counts active participants without a vote.
  If there are any, it asks "3 of 5 have voted. Reveal anyway?". The server
  accepts any reveal; the prompt is a client-side courtesy.
- **What reveal shows.** Every participant's vote, individually and exactly as
  cast, grouped by card in deck order. No statistics, consensus check or
  suggested score. Participants who did not vote are shown last as not voted.
- **Presence.** A participant with no heartbeat for 60 seconds is inactive. Their
  vote stays on screen until the next reset, which drops them.
- **Late joiners.** They can join at any time and see the results if the round is
  already revealed.

## UI

A single-page React app. `/` is the home screen and `/s/:id` is the session
screen, which shows the join form, the session or the not-found page depending on
the server's response. Wireframes are 60 columns wide.

Home:

```
+----------------------------------------------------------+
| Scrum Poker                                              |
|                                                          |
| Cards (comma separated)                                  |
| [ 0, 1, 2, 3, 5, 8, 13, 21, ?, (coffee)               ]  |
|                                                          |
| [ Create session ]                                       |
+----------------------------------------------------------+
```

Join form (shown on `401`; the creator joins the same way as everyone else):

```
+----------------------------------------------------------+
| Scrum Poker                                              |
|                                                          |
| Join this session                                        |
|                                                          |
| Your name  [ Ana____________________ ]                   |
|                                                          |
| [ Join ]                                                 |
+----------------------------------------------------------+
```

Session, voting:

```
+----------------------------------------------------------+
| Voting                         [ Copy link ]  [ Leave ]   |
|----------------------------------------------------------|
| Participants                                             |
|   Ana (you)   voted                                      |
|   Raj         not voted                                  |
|   Mei         voted                                      |
|   Tom         not voted   (inactive)                     |
|----------------------------------------------------------|
| Pick a card                                              |
|   +---+ +---+ +---+ +---+ +===+                          |
|   | 0 | | 1 | | 2 | | 3 | |*5*|                          |
|   +---+ +---+ +---+ +---+ +===+                          |
|   +---+ +---+ +---+ +---+ +---+                          |
|   | 8 | | 13| | 21| | ? | |(c)|                          |
|   +---+ +---+ +---+ +---+ +---+                          |
|   * = your pick                     [ Clear my vote ]    |
|----------------------------------------------------------|
| [ Reveal ]   [ Reset ]   [ Change deck and reset ]       |
+----------------------------------------------------------+
```

Session, revealed:

```
+----------------------------------------------------------+
| Revealed                       [ Copy link ]  [ Leave ]   |
|----------------------------------------------------------|
| Votes                                                    |
|   5           Ana (you), Mei                             |
|   8           Raj                                        |
|   not voted   Tom (inactive)                             |
|----------------------------------------------------------|
| [ Reset ]   [ Change deck and reset ]                    |
+----------------------------------------------------------+
```

Reveal confirmation (only when active participants have not voted) and the deck
dialog:

```
+----------------------------------------+
| 3 of 5 have voted. Reveal anyway?      |
|                                        |
|                 [ Cancel ]  [ Reveal ] |
+----------------------------------------+

+------------------------------------------------+
| Change deck and reset                          |
| Cards (comma separated)                        |
| [ S, M, L, XL, ?                             ] |
| This clears all votes and starts a new round.  |
|                         [ Cancel ]  [ Reset ]  |
+------------------------------------------------+
```

Session not found (shown on `404`) and the reconnect banner (shown at the top of
the session screen while the stream is down):

```
+----------------------------------------------------------+
| Scrum Poker                                              |
|                                                          |
| Session not found                                        |
| It may have expired or the link may be wrong.            |
|                                                          |
| [ Create a new session ]                                 |
+----------------------------------------------------------+

+----------------------------------------------------------+
| ! Connection lost. Reconnecting...                       |
+----------------------------------------------------------+
```

Behaviour:

- **Home.** One comma-separated text field, pre-filled with the default deck.
  Creating a session opens the join form at `/s/:id`.
- **Participants.** Listed in join order, with a "(you)" marker, "voted" or "not
  voted", and an "(inactive)" tag.
- **Cards.** Clicking a card sets or replaces your vote and marks it as selected.
  "Clear my vote" removes it. Cards wrap onto several rows.
- **Reveal.** Shows the confirmation dialog only when active participants have not
  voted. After a reveal the card area is hidden and voting is disabled.
- **Revealed votes are grouped by card.** Groups follow the deck's card order, and
  names within a group follow join order. Participants who did not vote come last.
  No counts or statistics are shown.
- **Reset.** Acts immediately with no confirmation, in either state. "Change deck
  and reset" opens the deck dialog and does both in one step.
- **Layout.** A single column. On narrow screens the cards wrap and the buttons
  stack.

## Architecture

- **Stack.** TypeScript throughout on Node 26: an Express server and a React +
  Vite front end. See Tooling.
- **Single container, strict separation.** v1 ships as one container whose
  Express server also serves the built front end from a single route. The front
  end may only talk to the server through its public API, with no shared server
  code and no in-process calls. The server reaches storage only through
  `SessionStore`. This keeps the later moves open: the front end to a CDN, and
  storage to Redis/ElastiCache.
- **Storage.** v1 keeps each session as one in-memory object behind
  `SessionStore`. Restarting the server ends all sessions.
- **Realtime.** SSE for push, ordinary POSTs for actions, behind
  `SessionNotifier` (server) and `SessionConnection` (client). The transport can
  change without touching the game rules.
- **Identity.** A random token per participant, stored in browser local storage,
  so refreshing or reconnecting restores the same participant.
- **Join link.** Joining means opening a URL containing the session UUID and
  entering a display name. A UUID cannot be guessed in practice.
- **Project layout.** One repository, three npm workspaces: `server/` (Express),
  `web/` (React + Vite) and `shared/` (types, constants and Zod validation
  schemas; no server logic). `web/` and `server/` never import each other. The container build copies
  the Vite output into the server image, which serves it.

## API

Plain JSON over HTTP under `/api`, with one response envelope for successes and
errors alike (see Response envelope). The front end is served from `/`, falling
back to the app for `/s/:id` links.

| Endpoint                                      | Auth          | Purpose                                                                                   |
| --------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `POST /api/sessions`                          | None          | Create a session. Optional body `{ deck }`. Returns `data: { id }`.                       |
| `POST /api/sessions/:id/participants`         | None          | Join. Body `{ displayName }`. Returns `data: { participantId, token, displayName }`; the name may have a suffix. |
| `DELETE /api/sessions/:id/participants/me`    | Token         | Leave: deletes your participant and vote.                                                 |
| `GET /api/sessions/:id`                       | Token         | Returns the current snapshot as `data`, for tests and non-streaming clients.             |
| `GET /api/sessions/:id/events`                | Token (query) | SSE stream of snapshots.                                                                  |
| `PUT /api/sessions/:id/votes/me`              | Token         | Cast or change your vote. Body `{ round, value }`.                                        |
| `DELETE /api/sessions/:id/votes/me?round=N`   | Token         | Clear your vote.                                                                          |
| `POST /api/sessions/:id/reveal`               | Token         | Reveal. Body `{ round }`.                                                                 |
| `POST /api/sessions/:id/reset`                | Token         | Reset. Body `{ round, deck? }`.                                                           |
| `POST /api/sessions/:id/heartbeat`            | Token         | Mark yourself active. Clients send it every 20 seconds.                                   |

The token goes in an `Authorization: Bearer` header. The stream takes `?token=`
instead, because `EventSource` cannot set headers; the server must not log query
strings.

### Response envelope

Every HTTP response from `/api`, success or failure, is JSON with the same shape:

```ts
type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

type ApiError = {
  code: ErrorCode;   // stable and machine-readable
  message: string;   // human-readable and safe to show
  details?: unknown; // only for stale_round: { snapshot: SessionSnapshot }
};
```

- The HTTP status still carries the outcome. Create and join respond `201`, other
  successes `200`, and failures use the statuses below.
- Actions with nothing to return respond `200` with `data: null`.
- The SSE stream is the one exception: it is not enveloped. Each event is named
  `snapshot` and its data is a `SessionSnapshot`.
- The envelope and error types live in `shared/`.

Errors:

| Status | Code                | When                                                                          |
| ------ | ------------------- | ----------------------------------------------------------------------------- |
| 400    | `invalid_body`      | Malformed JSON, or a field with the wrong shape or type                       |
| 400    | `invalid_name`      | The display name fails validation                                             |
| 400    | `invalid_deck`      | The deck fails validation                                                     |
| 400    | `invalid_card`      | A vote value is not a card in the deck                                        |
| 401    | `unauthorized`      | Missing or unknown token. The session exists, so the client shows the join form |
| 404    | `not_found`         | Session unknown, id malformed or expired; also any unknown `/api` route        |
| 409    | `stale_round`       | `round` is stale; `details.snapshot` is the current snapshot so the client can resync |
| 413    | `payload_too_large` | Request body over 16 KB                                                       |

Revealing an already revealed round is a no-op that returns `200`.

### Snapshot

```ts
type SessionSnapshot = {
  id: string;
  round: number;
  state: 'voting' | 'revealed';
  deck: string[];
  participants: {
    id: string;
    name: string;
    active: boolean;
    hasVoted: boolean;
    vote?: string; // only present when state is 'revealed'
  }[];
  yourVote?: string; // this client's own vote, in any state
};
```

### Realtime behaviour

- **One event type.** `snapshot` carries the full state. It is sent immediately
  on connect and after every change, so a missed event cannot leave a client out
  of sync and reconnecting needs no replay.
- **Built per connection.** The server builds each payload for the connected
  participant, so hidden votes stay hidden and `yourVote` is included.
- **Actions return `200` with `data: null`.** The result arrives as a snapshot on
  the stream.
- **Keepalive.** A comment line every 25 seconds keeps proxies and load balancers
  from closing an idle stream (the ALB default is 60 seconds).
- **Heartbeat.** A separate POST every 20 seconds. A participant is inactive after
  60 seconds without one. A server timer checks every 15 seconds and pushes a
  snapshot when anyone's `active` flag changed.
- **Expiry.** A sweep every minute deletes sessions past `expires_at` and closes
  their streams.
- **Reconnecting.** `EventSource` reconnects on its own, and the first event after
  reconnecting is a fresh snapshot.

### Interfaces

These are the strict seams that let transport and storage change without touching
the game rules.

```ts
// server
interface SessionStore {
  create(session: Session): Promise<void>;
  get(id: string): Promise<Session | null>;
  update(id: string, fn: (s: Session) => Session): Promise<Session>; // atomic
  deleteExpired(now: Date): Promise<string[]>;
}

interface SessionNotifier {
  notify(sessionId: string): Promise<void>;
  subscribe(sessionId: string, onChange: () => void): () => void;
}

// client
interface SessionConnection {
  connect(sessionId: string, token: string): void;
  onSnapshot(handler: (s: SessionSnapshot) => void): () => void;
  close(): void;
}
```

v1 ships an in-memory `SessionStore`, an in-process `SessionNotifier` and an SSE
`SessionConnection`. For several instances, Redis supplies another store and
pub/sub for the notifier. The notifier only says that session X changed; each
instance then builds snapshots from the store for its own connections. React
components use only `SessionConnection`; `EventSource` stays inside its SSE
implementation.

## Validation

The server enforces every rule below. The client pre-processes input so users are
not tripped up. Limits and the default deck are constants in `shared/`.

**Display name**

- Trim the ends and collapse runs of inner whitespace to one space.
- 1 to 30 characters after trimming. Empty names are rejected (`invalid_name`).
- Any characters are allowed, emoji included, except control characters. Names are
  always rendered as text.
- The duplicate check is case-insensitive against current participants only, so a
  name frees up when its owner leaves. A duplicate gets the lowest unused suffix:
  `Ana (2)`, `Ana (3)`.

**Deck**

- A list of strings with at least one card (`invalid_deck`). Cards are trimmed;
  blank cards and duplicates are rejected. Matching is exact and case-sensitive.
- There are no limits on card count or length; the request body limit is the only
  bound.
- The client splits the text field on commas, trims, and drops blanks and
  duplicates (keeping the first) before sending. A card containing a comma cannot
  be typed in the UI, though the API accepts one.

**Votes and rounds**

- A vote's `value` must exactly equal a card in the session's deck
  (`invalid_card`).
- `round` must be an integer of 1 or more (`invalid_body`).

**Requests**

- JSON only, 16 KB body limit (`payload_too_large`). Unknown fields are ignored.
- A session id that is not a valid UUID returns `not_found`, not `invalid_body`,
  so a malformed link shows the same page as an expired one.
- The participant token is 32 random bytes, base64url encoded. The server stores
  its SHA-256 hash and compares in constant time. A missing or unknown token
  returns `unauthorized`.

## Tooling

**Runtime and language**

- Node 26, pinned in `.nvmrc`, `engines` and the container base image.
- Native type stripping: the server runs its `.ts` files directly with `node`, with
  no build step. `tsc` only type-checks (`noEmit`), and `web/` builds with Vite.
- Node only erases types, so `server/` and `shared/` follow three rules:
  - erasable syntax only: no enums, namespaces or parameter properties
    (`erasableSyntaxOnly`)
  - types are imported with `import type` (`verbatimModuleSyntax`)
  - no relative imports within a package; each package maps its own `src/`
    via a Node subpath import in its `package.json`
    (`"imports": { "#src/*": "./src/*.ts" }`), so code imports as
    `#src/app`, not `./app.ts`
- `shared/` is read by both Node and Vite, so it follows the same rules, and its
  package exports point at the `.ts` source.
- npm workspaces, ESM everywhere, TypeScript `strict` plus
  `noUncheckedIndexedAccess`, and one shared base tsconfig.
- Root scripts: `dev`, `build`, `typecheck`, `lint`, `test`, and `check`, which
  runs `typecheck`, `lint` and `test`. A CI system only needs to call `check`.

**Lint and format**

- Prettier with `singleQuote: true` and otherwise defaults. `eslint-config-prettier`
  keeps ESLint out of style.
- ESLint flat config, run with `--max-warnings 0`:
  - `@eslint/js` recommended, plus `typescript-eslint` `strictTypeChecked` and
    `stylisticTypeChecked` using the project service
  - `@typescript-eslint/consistent-type-imports`, preferring separate `import type`
  - `@typescript-eslint/switch-exhaustiveness-check`, for the state and event
    handling
  - `@typescript-eslint/no-floating-promises` and `no-misused-promises`, for the
    async Express handlers and SSE writes
  - `eqeqeq`, and `no-console` outside tests (use the logger)
  - `no-restricted-imports` for the separation rule: `web/` may not import
    `server/`, `server/` may not import `web/`, and `shared/` may not import either
    or `express`
  - `no-restricted-properties` on `process.env` everywhere except
    `server/src/config.ts`
  - in `web/`: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` and
    `eslint-plugin-jsx-a11y`
  - in tests: `eslint-plugin-vitest` recommended

**Tests**

- Vitest in all three packages.
- Server: API tests with supertest against the Express app, covering the hidden
  votes rule and the `409` race, plus SSE tests.
- Web: React Testing Library.
- One reusable contract suite that every `SessionStore` implementation must pass,
  so a Redis store later has to satisfy the same tests.
- No end-to-end tests in v1; the manual acceptance checks cover that.

**Server**

- Express 5. Zod schemas validate request bodies and define the envelope and error
  types.
- pino for structured JSON logs; query strings are never logged.
- Configuration comes from environment variables, parsed by a Zod schema at
  startup that fails fast on bad values: `PORT` (3000), `INACTIVE_AFTER_SECONDS`,
  `SESSION_IDLE_SECONDS`, `SWEEP_INTERVAL_SECONDS`, `LOG_LEVEL` and
  `CORS_ALLOWED_ORIGINS` (empty by default, meaning same-origin only).
- The heartbeat (20 seconds) and keepalive (25 seconds) intervals are constants in
  `shared/`, not configuration.
- On `SIGTERM` the server stops accepting connections, closes the SSE streams, then
  exits.

**Front end**

- React Router for the two routes.
- State is plain React (`useReducer` and context) fed by `SessionConnection`, with
  no state library.
- Styling is CSS Modules with CSS variables and no UI framework, with light and dark
  themes from `prefers-color-scheme`.
- Vite's dev server proxies `/api` to Express, so development and production both
  use relative URLs.
- `VITE_API_BASE_URL` is read at build time and empty by default (same origin). The
  later CDN move sets it together with `CORS_ALLOWED_ORIGINS`.

**Container**

- Multi-stage build on a slim Node 26 image, with production dependencies only.
- Runs as a non-root user, with a `HEALTHCHECK` on `/api/health`.

## Build plan

The build is cut into vertical slices: each is a thin end-to-end piece you can see
and try in the browser. A slice is done when every manual check under it passes.

**Testing by hand.** Identity is stored per browser profile, so use a normal
window plus a private window (or a second browser) as two participants.

**Configurable timeouts.** The slow behaviours are set by environment variables
with these defaults, so they can be checked in seconds:

- `INACTIVE_AFTER_SECONDS=60`
- `SESSION_IDLE_SECONDS=3600`
- `SWEEP_INTERVAL_SECONDS=15`

### Slice 1: Walking skeleton

The monorepo with `server/`, `web/` and `shared/`, Express serving the built React
page from `/`, `GET /api/health`, and a Containerfile.

- [x] The container image builds and runs with a single command each (for
      example `podman build .` / `podman run`, which auto-detect the
      `Containerfile`; Docker needs `docker build -f Containerfile .`)
- [x] Opening the container's URL shows the React page
- [x] The page shows the server's health status, fetched from `/api/health`
- [x] Opening a deep link such as `/s/anything` still loads the app
- [x] `npm run check` passes, and the lint step fails if `web/` imports from `server/`
      or the reverse (try it once)
- [x] The container runs the server straight from its TypeScript sources with `node`,
      with no build step, including the code it imports from `shared/`
- [x] `GET /api/health` and an unknown `/api` route both respond in the envelope
      (`data` for health, a `404` `not_found` error for the unknown route)

### Slice 2: Create and join

Create a session, share the link, join with a name and see the participant list
update live over SSE. The `SessionStore`, `SessionNotifier` and
`SessionConnection` interfaces appear here, with their first implementations.

- [x] Creating a session in the UI gives a shareable link containing a UUID
- [x] Opening the link in a second window asks for a display name, and after
      joining both windows list both names within about a second, without a refresh
- [x] Joining with a name that is already taken, in any letter case, shows it with a
      suffix such as `Ana (2)`
- [x] A name is trimmed, and an empty name or one over 30 characters is rejected with
      a clear message
- [x] Refreshing a tab keeps the same identity and does not join a second time
- [x] An unknown or malformed session id shows a clear "session not found" page
- [x] Each tab has exactly one open event-stream request in the network tab

### Slice 3: Vote with hidden values

The default deck, card selection, who has voted, and your own vote after a refresh.

- [x] The default deck shows the Fibonacci cards plus ? and the coffee-cup card
- [x] Picking a card marks it as selected, and the other window shows you as voted
      without showing the value
- [x] Changing and clearing a vote both update the other window
- [x] Refreshing keeps your selected card
- [x] In the other window's network tab, neither the stream nor the snapshot ever
      contains your value before reveal
- [x] A hand-made request with a card that is not in the deck is rejected with `400 invalid_card`

### Slice 4: Reveal and reset

Reveal with the confirmation prompt, the results view, and reset with the round
check.

- [ ] Revealing when everyone has voted shows every vote in both windows, with no
      prompt
- [ ] Revealing with votes missing asks "N of M have voted. Reveal anyway?", and
      cancelling keeps the round in voting
- [ ] Revealing with zero votes works and shows everyone as not voted
- [ ] After a reveal, votes are grouped by card in deck order, names within a group
      follow join order, and participants who did not vote come last
- [ ] After a reveal, voting is disabled
- [ ] Reset from either window clears all votes and puts both back in voting,
      including when pressed during voting
- [ ] Two resets sent at the same time start only one new round, and the stale one
      gets `409` carrying the current snapshot
- [ ] A participant who joins after the reveal sees the results straight away

### Slice 5: Presence and leave

The heartbeat, the inactive flag, dropping inactive participants at reset, and
leave.

- [ ] With inactivity set to about 10 seconds, closing a tab marks that participant
      inactive in the other window within the configured time plus one sweep
- [ ] After a reveal, an inactive participant's vote is still shown
- [ ] Reopening the link in the same browser before a reset restores the same
      participant and marks them active again
- [ ] A reset removes participants who are still inactive
- [ ] Leaving removes your participant and vote from the other window immediately,
      and joining again gives a fresh participant

### Slice 6: Deck and expiry

Custom decks at creation and at reset, and idle expiry.

- [ ] Creating a session with a custom deck such as S, M, L shows exactly those cards
- [ ] Resetting lets you change the deck and clears the old votes
- [ ] A hand-made request with a blank or duplicate card is rejected with `400
      invalid_deck`, while the UI quietly drops blanks and duplicates
- [ ] Cards with emoji or very long text are accepted and render without breaking
      the layout
- [ ] With idle expiry set to about one minute, a session with all tabs closed
      disappears and its link shows "session not found"
- [ ] A session with a tab still open does not expire

### Slice 7: Resilience

Keepalives and reconnection.

- [ ] Setting the browser offline for about 10 seconds and back online makes the
      page catch up with changes made meanwhile, without a refresh
- [ ] Leaving the stream idle for more than two minutes behind a 60-second idle
      timeout (such as a load balancer) keeps it connected, and a vote afterwards
      still arrives
- [ ] Restarting the server shows a clear message that the session no longer exists
      and offers to create a new one, since in-memory sessions do not survive a
      restart
