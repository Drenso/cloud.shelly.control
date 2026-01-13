import crypto from 'crypto';

/**
 * @param realm takes the form shelly<model>-<identifier>
 * @param password user provided password
 */
export function hashDigest(realm: string, password: string): string {
  const username = 'admin'; // always
  const auth_parts = [username, realm, password];
  const ha1 = crypto.createHash('sha256').update(auth_parts.join(':')).digest('hex');
  return ha1;
}
