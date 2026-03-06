import crypto from 'crypto';

export type AuthenticationResponse = {
  username: string;
  nonce: string;
  cnonce: string;
  realm: string;
  algorithm: string;
  response: string;
  nc: string;
};

export function createAuthenticationResponse(
  realm: string,
  nonce: string,
  password: string,
  nonce_count = 1,
): AuthenticationResponse {
  const username = 'admin';
  const cnonce = String(Math.floor(Math.random() * 10e8));

  const ha1 = hexHash(`admin:${realm}:${password}`);
  const ha2 = hexHash('dummy_method:dummy_uri');
  const nc = nonce_count.toString(16).padStart(8, '0');
  const responseRaw = `${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`;
  const response = hexHash(responseRaw);

  return {
    username: username,
    nonce: nonce,
    cnonce: cnonce,
    realm: realm,
    algorithm: 'SHA-256',
    response: response,
    nc: nc,
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

export class UnauthenticatedWS extends Error {
  constructor(public readonly challenge: string) {
    super('WS is unauthenticated');
  }
}

export type WsAuthenticationChallenge = {
  auth_type: 'digest';
  nonce: string;
  nc: number;
  realm: string;
  algorithm: 'SHA-256';
};

export function parseWsChallenge(message: string): WsAuthenticationChallenge {
  return JSON.parse(message) as WsAuthenticationChallenge;
}
