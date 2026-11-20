// What redact does when someone logs a request body by mistake.
import { logger } from './src/logger.js';

logger.info({ body: { email: 'asha@example.com', password: 'correct horse battery staple' } }, 'login attempt');
logger.info({ session: { token: 'OfsDYynDoAuDOeur9XGcsAX-GN3GkZ9V82CbU0rcFEI', userId: 1 } }, 'session created');
