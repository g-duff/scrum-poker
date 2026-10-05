import path from 'node:path';
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { ApiError, ApiResponse, Participant } from '@scrum-poker/shared';
import {
  createSessionBodySchema,
  DEFAULT_DECK,
  joinParticipantBodySchema,
} from '@scrum-poker/shared';
import type { ZodError } from 'zod';
import { hashToken } from '#src/core/auth';
import { resolveDisplayName } from '#src/core/names';
import { createNewSession } from '#src/core/session';
import { generateToken } from '#src/shell/auth';
import { findActiveSession } from '#src/shell/session';
import type { SessionStore } from '#src/shell/sessionStore';

function sendError(
  res: Response,
  status: number,
  code: ApiError['code'],
  message: string,
): void {
  const body: ApiResponse<null> = { data: null, error: { code, message } };
  res.status(status).json(body);
}

function getSessionIdParam(req: Request): string {
  const { id } = req.params;
  return typeof id === 'string' ? id : '';
}

function deckIsInvalid(error: ZodError): boolean {
  return error.issues.some((issue) => issue.path[0] === 'deck');
}

function isPayloadTooLargeError(
  err: unknown,
): err is Error & { status?: number; type?: string } {
  return (
    err instanceof Error &&
    ('status' in err || 'type' in err) &&
    ((err as Error & { status?: number }).status === 413 ||
      (err as Error & { type?: string }).type === 'entity.too.large')
  );
}

export function createApp(
  webDistPath: string,
  store: SessionStore,
  sessionIdleSeconds: number,
) {
  const app = express();

  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const body: ApiResponse<{ status: 'ok' }> = {
      data: { status: 'ok' },
      error: null,
    };
    res.status(200).json(body);
  });

  app.post('/api/sessions', async (req: Request, res: Response) => {
    const parsed = createSessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        deckIsInvalid(parsed.error) ? 'invalid_deck' : 'invalid_body',
        'Invalid request body',
      );
      return;
    }

    const deck = parsed.data.deck ?? DEFAULT_DECK;
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + sessionIdleSeconds * 1000);
    const session = createNewSession(id, deck, expiresAt);

    await store.create(session);

    const body: ApiResponse<{ id: string }> = { data: { id }, error: null };
    res.status(201).json(body);
  });

  app.post(
    '/api/sessions/:id/participants',
    async (req: Request, res: Response) => {
      const parsed = joinParticipantBodySchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'invalid_name', 'Invalid display name');
        return;
      }

      const session = await findActiveSession(store, getSessionIdParam(req));
      if (!session) {
        sendError(res, 404, 'not_found', 'Session not found');
        return;
      }

      const displayName = resolveDisplayName(
        parsed.data.displayName,
        session.participants.map((participant) => participant.displayName),
      );
      const token = generateToken();
      const participant: Participant = {
        id: randomUUID(),
        sessionId: session.id,
        displayName,
        tokenHash: hashToken(token),
        lastSeenAt: new Date(),
      };

      await store.update(session.id, (current) => ({
        ...current,
        participants: [...current.participants, participant],
      }));

      const body: ApiResponse<{
        participantId: string;
        token: string;
        displayName: string;
      }> = {
        data: { participantId: participant.id, token, displayName },
        error: null,
      };
      res.status(201).json(body);
    },
  );

  app.use('/api', (_req: Request, res: Response) => {
    const body: ApiResponse<null> = {
      data: null,
      error: { code: 'not_found', message: 'Not found' },
    };
    res.status(404).json(body);
  });

  app.use(express.static(webDistPath));

  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });

  app.use(
    (err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (err instanceof SyntaxError) {
        sendError(res, 400, 'invalid_body', 'Malformed JSON');
        return;
      }
      if (isPayloadTooLargeError(err)) {
        sendError(res, 413, 'payload_too_large', 'Request body too large');
        return;
      }
      next(err);
    },
  );

  return app;
}
