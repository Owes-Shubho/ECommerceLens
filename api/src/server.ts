import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { DEMO_USER } from "./models/seed.js";
import { logger } from "./utils/logger.js";

const app = createApp();
app.listen(env.API_PORT, () => {
  logger.info(`ECommerceLens API on http://localhost:${env.API_PORT}/api  ·  analytics: ${env.ANALYTICS_SERVICE_URL}  ·  storage: in-memory`);
  if (!env.AUTH_REQUIRED) logger.info(`AUTH_REQUIRED=false: requests without a token act as ${DEMO_USER.email}`);
});
