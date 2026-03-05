import crypto from 'crypto';

type AuthenticationResponse = {
  username: string;
  nonce: string;
  cnonce: string;
  realm: string;
  algorithm: string;
  response: string;
};

export function createAuthenticationResponse(realm: string, nonce: string, password: string): AuthenticationResponse {
  const username = 'admin';
  const cnonce = String(Math.floor(Math.random() * 10e8));

  const ha1 = hexHash(`admin:${realm}:${password}`);
  const ha2 = hexHash('dummy_method:dummy_uri');
  const responseRaw = `${ha1}:${nonce}:1:${cnonce}:auth:${ha2}`;
  const response = hexHash(responseRaw);

  return {
    username: username,
    nonce: nonce,
    cnonce: cnonce,
    realm: realm,
    algorithm: 'SHA-256',
    response: response,
  };
}

export function hexHash(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export class NoPassword extends Error {
  constructor() {
    super('No password known');
  }
}
