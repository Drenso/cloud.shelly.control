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

/**
 * @param realm takes the form shelly<model>-<identifier>
 * @param password user provided password
 */
export function ha1Digest(realm: string, password: string): string {
  const username = 'admin'; // always
  const auth_parts = [username, realm, password];
  return hexHash(auth_parts.join(':'));
}

export function createAuthenticationResponse(
  realm: string,
  nonce: string,
  ha1: string,
  nonce_count = 1,
): AuthenticationResponse {
  const username = 'admin';
  const cnonce = String(Math.floor(Math.random() * 10e8));

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
  public constructor() {
    super('No password known');
  }
}

export class UnauthenticatedWS extends Error {
  public constructor(public readonly challenge: string) {
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
