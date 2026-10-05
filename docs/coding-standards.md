# Coding standards

This complements `CLAUDE.md` (workflow) and `docs/scrum-poker-spec.md` (what to
build). It covers how we write the code inside that: a pragmatic functional
style, not strict OOP and not strict pure-FP either.

## Language and module constraints

These follow from the stack decisions in the spec's Tooling section (Node's
native type stripping and the single-container architecture):

- `server/` and `shared/` run as `.ts` directly under Node, so: erasable
  syntax only (no enums, namespaces or parameter properties), `import type`
  for types, and `.ts` extensions on relative imports.
- `web/` and `server/` never import each other.
- `process.env` is read only in `server/src/config.ts`.
- Use the logger, never `console`.

## Functional core, imperative shell

Split code into:

- **Core — pure, no I/O.** Game rules and validation: vote/clear/reveal/reset
  transitions, round-staleness checks, duplicate-name suffixing, grouping
  votes by card, building a `SessionSnapshot` from a `Session` for a given
  viewer. These are plain functions, `Session -> Session` or
  `Session -> SessionSnapshot`, fully unit-testable with no Express, no store,
  no mocks.
- **Shell — everything with a side effect.** Route handlers, the
  `SessionStore`/`SessionNotifier` implementations, SSE wiring, heartbeat and
  expiry timers, and on the client, `SessionConnection`'s `EventSource`
  plumbing and `fetch` calls.

The shell's job is to fetch state, call a core function to decide the next
state, persist it, and notify. `SessionStore.update(id, fn)` is the seam:
`fn` is supplied by the shell but must be a pure core function.

**Why:** core logic becomes fast to test and easy to reason about, and the
spec's three interfaces (`SessionStore`, `SessionNotifier`,
`SessionConnection`) already draw this boundary for us — this just makes it
explicit and keeps us from blurring it under deadline pressure.

### Module structure

The split is physical, not just conceptual. Both `server/` and `web/` get:

```
src/
  core/   pure: no imports of express, SessionStore, fetch, EventSource,
          Date.now(), crypto.randomUUID(), the logger, or React effects
  shell/  everything else: routes, store/notifier implementations, SSE
          wiring, timers; on the client, SessionConnection and fetch calls
```

`core/` may depend on nothing but `shared/` and other `core/` modules.
`shell/` depends on `core/`, never the other way round — a lint rule
(`no-restricted-imports`) will enforce this the same way the `web/`↔`server/`
boundary already is.

On the client, a component's `useReducer` reducer is `core/`; the component
itself, `SessionConnection`, and any `fetch` calls are `shell/`.

### Examples

A pure core function — no I/O, no clock, no randomness, just data in and
data out (in the spirit of Gary Bernhardt's "Functional Core, Imperative
Shell" and Scott Wlaschin's domain-modelling style: make illegal states
hard to construct, and let the type signature say what the function needs):

```ts
// server/src/core/sessionRules.ts
import type { Session } from '@scrum-poker/shared';

export function reveal(session: Session): Session {
  if (session.state === 'revealed') return session;
  return { ...session, state: 'revealed' };
}

export function reset(session: Session, deck = session.deck): Session {
  return {
    ...session,
    deck,
    state: 'voting',
    roundNumber: session.roundNumber + 1,
  };
}
```

Note `reset` doesn't call `Date.now()` to touch `expiresAt`, and nothing
here generates an id — those belong to the shell, which passes whatever
the core needs as plain arguments (see `reveal`/`reset` above: time and
randomness simply never appear).

The shell calls core functions at its edges and does nothing else
"interesting" — no business logic, just orchestration (this is Mark
Seemann's "impureim sandwich": impure read, pure compute, impure write):

```ts
// server/src/shell/routes/reveal.ts
import type { Request, Response } from 'express';
import { reveal } from '#src/core/sessionRules';
import type { SessionStore } from '#src/shell/sessionStore';
import type { SessionNotifier } from '#src/shell/sessionNotifier';

export function revealHandler(store: SessionStore, notifier: SessionNotifier) {
  return async (req: Request, res: Response) => {
    const sessionId = req.params.id; // impure: read
    await store.update(sessionId, reveal); // impure write, pure fn inside
    await notifier.notify(sessionId); // impure: notify
    res.status(200).json({ data: null, error: null });
  };
}
```

`revealHandler` never branches on game state itself — it only wires the
impure boundary around a call to the pure `reveal`. If a future rule needs
"reveal is a no-op when already revealed", that belongs in `reveal`, not in
the handler.

## Prefer factory functions over classes

Implement interfaces like `SessionStore` as a factory function returning a
plain object literal of closures (`createInMemorySessionStore(): SessionStore`),
not a `class`. No `this`, no inheritance; state lives in the closure.

**Why:** the interfaces are just shapes of functions and data — a class buys
us nothing here (no shared prototype behaviour, no subtyping), so the
simpler option is strictly better.

## Push impure inputs to the shell

Core functions never read the clock or generate randomness themselves
(`Date.now()`, `crypto.randomUUID()`). The shell computes those and passes
them in as arguments (`reveal(session, now)`, not `reveal(session)`).

**Why:** this is what keeps the core actually pure and deterministic to
test, at the cost of a little extra parameter-passing.

## Where this doesn't apply

- React state: `useReducer`'s reducer is the core, `SessionConnection` /
  `fetch` calls are the shell. Same split, same discipline — don't let
  effectful code creep into a reducer.
- `shared/` schemas and types are already data/pure by nature; nothing
  changes there.
- This is about structure, not about banning classes outright — if a real
  need for one shows up (none foreseen in this spec), raise it rather than
  forcing a workaround.
