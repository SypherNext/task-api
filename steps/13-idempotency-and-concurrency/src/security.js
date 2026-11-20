import helmet from 'helmet';
import cors from 'cors';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { HttpError } from './errors.js';

// Security headers. The defaults suit a JSON API.
export const securityHeaders = helmet();

// Only the browser apps you list may call the API from JavaScript.
export function corsPolicy(origins) {
  return cors({
    origin: origins, // an array of exact origins, never '*' for an API that takes tokens
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'If-Match'],
    exposedHeaders: ['ETag', 'Location', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
    maxAge: 600, // browsers may cache the preflight answer for 10 minutes
  });
}

// Problem details for 429, with Retry-After in seconds.
function tooMany(req, res, next, options) {
  const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
  next(
    new HttpError(429, 'Too Many Requests', `Limit of ${options.limit} requests reached. Try again in ${retryAfter} seconds.`, {
      headers: { 'Retry-After': String(retryAfter) },
    }),
  );
}

// Every client: 300 requests per 15 minutes per IP address.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8', // RateLimit-Policy and RateLimit headers
  legacyHeaders: false, // no X-RateLimit-* headers
  handler: tooMany,
});

// Login: 5 failed attempts per 15 minutes per IP address and email.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // a correct password does not use up an attempt
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email).toLowerCase()}`,
  handler: tooMany,
});
