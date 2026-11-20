import { Router } from 'express';
import { validate } from '../validate.js';
import { HttpError } from '../errors.js';
import { Register, Login } from '../schemas.js';
import { hashPassword, verifyPassword } from '../passwords.js';

export function authRouter({ users, sessions, requireAuth }) {
  const router = Router();

  router.post('/register', validate({ body: Register }), async (req, res) => {
    const { email, password } = req.valid.body;
    const user = await users.create(email, await hashPassword(password));
    if (!user) throw new HttpError(409, 'Conflict', 'An account with this email already exists.');
    res.status(201).json(user);
  });

  router.post('/login', validate({ body: Login }), async (req, res) => {
    const { email, password } = req.valid.body;
    const user = await users.findByEmail(email);
    const ok = await verifyPassword(user?.passwordHash, password);
    // One message for both cases: do not tell an attacker which emails exist.
    if (!user || !ok) throw new HttpError(401, 'Unauthorized', 'Email or password is wrong.');
    const { token, expiresAt } = await sessions.create(user.id);
    res.json({ tokenType: 'Bearer', token, expiresAt });
  });

  router.post('/logout', requireAuth, async (req, res) => {
    await sessions.remove(req.token);
    res.sendStatus(204);
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json(req.user);
  });

  return router;
}
