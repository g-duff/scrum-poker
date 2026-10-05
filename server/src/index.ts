import { createApp } from '#src/app';
import { config } from '#src/config';
import { logger } from '#src/logger';
import { defaultWebDistPath } from '#src/webDistPath';

const app = createApp(defaultWebDistPath);

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Server listening');
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down');
  server.close(() => {
    process.exit(0);
  });
});
