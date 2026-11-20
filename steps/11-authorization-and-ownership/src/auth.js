import { HttpError } from './errors.js';

const unauthorized = (detail) =>
  new HttpError(401, 'Unauthorized', detail, { headers: { 'WWW-Authenticate': 'Bearer' } });

// Reads "Authorization: Bearer <token>", looks the session up, sets req.user.
export function requireAuth(sessions) {
  return async (req, res, next) => {
    const header = req.get('Authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized('Send Authorization: Bearer <token>.');
    const user = await sessions.findUser(token);
    if (!user) throw unauthorized('The token is unknown or has expired.');
    req.user = user;
    req.token = token;
    next();
  };
}
