import path from 'node:path';
import express from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse } from '@scrum-poker/shared';

export function createApp(webDistPath: string) {
  const app = express();

  app.get('/api/health', (_req: Request, res: Response) => {
    const body: ApiResponse<{ status: 'ok' }> = {
      data: { status: 'ok' },
      error: null,
    };
    res.status(200).json(body);
  });

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

  return app;
}
