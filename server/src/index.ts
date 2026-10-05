import { app } from '#src/app';
import { config } from '#src/config';
import { logger } from '#src/logger';

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Server listening');
});
