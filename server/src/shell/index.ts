import { createApp } from '#src/shell/app';
import { config } from '#src/shell/config';
import { createInMemorySessionStore } from '#src/shell/inMemorySessionStore';
import { createInProcessSessionNotifier } from '#src/shell/inProcessSessionNotifier';
import { logger } from '#src/shell/logger';
import { defaultWebDistPath } from '#src/shell/webDistPath';

const store = createInMemorySessionStore();
const notifier = createInProcessSessionNotifier();
const app = createApp(
  defaultWebDistPath,
  store,
  notifier,
  config.SESSION_IDLE_SECONDS,
);

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Server listening');
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down');
  server.close(() => {
    process.exit(0);
  });
});
