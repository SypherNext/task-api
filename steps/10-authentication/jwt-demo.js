// What a JWT is, built by hand with node:crypto (HS256), so nothing is hidden.
import crypto from 'node:crypto';

const secret = crypto.randomBytes(32);
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

function issue(claims) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(claims);
  return `${head}.${body}.${sign(`${head}.${body}`)}`;
}

function verify(token) {
  const [head, body, sig] = token.split('.');
  const header = JSON.parse(Buffer.from(head, 'base64url'));
  if (header.alg !== 'HS256') return 'rejected: unexpected alg ' + header.alg; // never trust alg from the token
  const expected = Buffer.from(sign(`${head}.${body}`));
  if (!sig || expected.length !== Buffer.byteLength(sig) || !crypto.timingSafeEqual(expected, Buffer.from(sig))) {
    return 'rejected: bad signature';
  }
  const claims = JSON.parse(Buffer.from(body, 'base64url'));
  if (claims.exp * 1000 < Date.now()) return 'rejected: expired';
  return claims;
}

const now = Math.floor(Date.now() / 1000);
const token = issue({ sub: '1', email: 'asha@example.com', iat: now, exp: now + 900 });
console.log('token:', token);
console.log('payload, readable by anyone:', Buffer.from(token.split('.')[1], 'base64url').toString());
console.log('verify original:', verify(token));

const [h, , s] = token.split('.');
const forged = `${h}.${b64({ sub: '2', email: 'asha@example.com', iat: now, exp: now + 900 })}.${s}`;
console.log('verify with sub changed to 2:', verify(forged));

const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: '2', exp: now + 900 })}.`;
console.log('verify alg=none token:', verify(none));

const old = issue({ sub: '1', iat: now - 3600, exp: now - 2700 });
console.log('verify expired token:', verify(old));
