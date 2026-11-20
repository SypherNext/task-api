import argon2 from 'argon2';

// argon2id with the library defaults (64 MiB memory, 3 passes, 4 lanes),
// which is above the OWASP minimum of 19 MiB and 2 passes.
export function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
}

// Verifying against a real hash when the email is unknown makes "no such user"
// take as long as "wrong password", so response times do not reveal accounts.
const dummyHash = await hashPassword('not-a-real-password-just-for-timing');

export async function verifyPassword(hash, password) {
  return argon2.verify(hash ?? dummyHash, password);
}
