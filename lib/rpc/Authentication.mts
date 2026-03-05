import crypto from 'crypto';

/**
 * @param realm takes the form shelly<model>-<identifier>
 * @param password user provided password
 */
export function hashDigest(realm: string, password: string): string {
  const username = 'admin'; // always
  const auth_parts = [username, realm, password];
  const ha1 = hexHash(auth_parts.join(':'));
  return ha1;
}

export function hexHash(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export class NoPassword extends Error {
  constructor() {
    super('No password known');
  }
}
