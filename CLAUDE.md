# Scrum Poker

A real-time scrum poker web app: TypeScript on Node 26, an Express 5 server, and a
React + Vite front end, in one repository with three npm workspaces (`server/`,
`web/`, `shared/`).

The spec is the source of truth: `docs/spec.md`. It covers the data model, API,
UI wireframes, validation, tooling and the build plan. Read the sections a task
touches before you start it.

## Commands

The root scripts are defined in the spec (Tooling). The one you need most:

- `npm run check` runs typecheck, lint and tests. It must pass before you stage
  anything.

## Conventions

Follow the spec's Tooling section and `docs/coding-standards.md` (code style
and architecture: functional core/imperative shell, factory functions over
classes, and the language/module constraints). The process rules that are
easiest to miss:

- ESLint is strict and runs with zero warnings allowed. Do not disable rules to
  get past them; ask me instead.
- Do not add features, dependencies or configuration that the spec does not
  mention. Ask first.

## Workflow

Work in slices, which the spec's build plan lists (a slice is a story). Do one
slice at a time, in order. Never start the next slice until I have accepted the
current one.

### Starting a slice

1. Create a branch named `slice-<n>-<name>`, for example
   `slice-2-create-and-join`.
2. Read the slice and the spec sections it touches.
3. Break the slice into subtasks and show me the list, with a title and one line of
   scope for each.
4. Agree the list with me. Adjust it until I am happy, and wait for my explicit
   approval before writing any code.
5. Record the agreed list in `docs/progress.md` (see Tracking progress). Include
   that file in the staged changes of the first subtask.

A good subtask:

- is one coherent change that I can review in a few minutes, usually under about
  300 changed lines
- has one concern and includes its own tests
- leaves `npm run check` passing and the app runnable
- builds on the subtasks before it

### Tracking progress

`docs/progress.md` is the shared record of where we are. Keep it in this form:

```
# Progress

Completed: slice 1

Current: slice 2, create and join (branch `slice-2-create-and-join`)

- [x] 1. Shared types and Zod schemas for create and join
- [>] 2. SessionStore interface and in-memory implementation
- [ ] 3. Create and join endpoints
```

- `[ ]` is not started, `[>]` is in progress and `[x]` is done.
- Mark a subtask `[>]` when you start it. When you stage it, mark it `[x]` and stage
  the progress file with it, so the commit records it as done. If the subtask is
  abandoned, change it back.
- If the plan needs to change (split, add, reorder or drop a subtask), tell me and
  agree the change with me before updating the file. Never change the plan
  silently.
- When you start a new slice, replace the previous plan in the file and add the old
  slice to the Completed line.
- At the start of every session, read `docs/progress.md` and resume from the first
  subtask that is not `[x]`. Do not re-plan a slice that already has an agreed
  plan.

### For each subtask

1. Mark it `[>]` and implement only that subtask. No unrelated refactors or
   reformatting.
2. Run `npm run check` and fix everything until it passes.
3. Mark it `[x]` in `docs/progress.md`. Stage all of the subtask's changes with
   `git add`, new files and the progress file included, and leave nothing
   unstaged. Do not commit.
4. Stop and tell me:
   - where we are, such as "Subtask 3 of 7 staged; next is 4: <title>"
   - what the subtask does, in two or three sentences
   - the staged files, grouped by purpose
   - anything surprising, and any departure from the spec
   - how to see it working, if it can be seen
5. Wait for me. I review with `git diff --staged`. If I ask for changes, make
   them, run `npm run check`, stage again and tell me what changed.
6. When I say it is good, commit with the message `slice <n>: <imperative
   summary>`, at most 72 characters, with a short body only if the why is not
   obvious. Then start the next subtask.

### Finishing a slice

Give me the slice's manual acceptance checks as a numbered list with the exact
steps for each (URLs, commands, which windows to use). Wait for my confirmation.
Do not merge or push; I will do that.

### Rules

- Never commit without my go-ahead for that subtask. Never push. Never amend or
  rewrite commits unless I ask.
- If the spec is ambiguous or contradicts itself, stop and ask. Do not guess. If
  the spec should change, propose the exact edit and make it as its own subtask.
- Lock-file changes belong in the same subtask as the dependency change. Mention
  them so I know to skim past them.
