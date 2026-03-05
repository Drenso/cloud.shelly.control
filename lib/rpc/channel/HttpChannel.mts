import type { RpcChannel } from './RpcChannel.mjs';
import type { RequestFrame, ResponseErrorFrame, ResponseFrame, ResponseSuccessFrame } from '../Rpc.mjs';
import { RpcError } from '../RpcError.mjs';
import { hexHash, NoPassword } from '../Authentication.mjs';

type AuthenticationInfo = {
  qop: 'auth' | 'auth-int';
  realm: string;
  nonce: string;
  algorithm: string;
};

type AuthenticationResponse = {
  username: string;
  nonce: string;
  cnonce: string;
  realm: string;
  algorithm: string;
  response: string;
};

export default class HttpChannel implements RpcChannel {
  constructor(
    public readonly address: string,
    public password?: string,
  ) {}

  disconnect(): void {}

  async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    // TODO change to HTTPS
    const addressString = this.address;
    const response = await fetch(`http://${addressString}/rpc`, {
      method: 'POST',
      body: JSON.stringify(requestFrame),
    });

    if (response.status === 401 && requestFrame.auth === undefined) {
      // We need to re-send authenticated with the given authentication information
      if (this.password === undefined) {
        throw new NoPassword();
      }

      const authenticationHeader = response.headers.get('WWW-Authenticate');
      const authenticationInfo = this.parseAuthenticationHeader(authenticationHeader);
      const authenticationResponse = this.createAuthenticationHeader(authenticationInfo, this.password);
      return this.sendRequestFrame({
        ...requestFrame,
        auth: authenticationResponse,
      });
    }

    if (response.status !== 200) {
      throw new Error(response.statusText);
    }

    // TODO create a reusable method that handles errors properly
    const json = (await response.json()) as ResponseFrame<Result>;
    const error = json as ResponseErrorFrame;
    const result = json as ResponseSuccessFrame<Result>;
    if (error.error !== undefined) {
      const { code, message } = error.error;
      throw new RpcError(code, message);
    }
    return result;
  }

  parseAuthenticationHeader(header: string | null): AuthenticationInfo {
    if (header === null) {
      throw new Error('Expected WWW-Authenticate header for 401 response');
    }

    const headerWithoutDigest = header.slice(7);
    const headerParameterStrings = headerWithoutDigest.split(', ');
    const info: Partial<AuthenticationInfo> = {};
    for (const parameterString of headerParameterStrings) {
      const [parameterName, parameterValueString] = parameterString.split('=');
      // Only some fields are quoted https://datatracker.ietf.org/doc/html/rfc7616#autoid-9
      const parameterValue =
        parameterValueString.startsWith('"') && parameterValueString.endsWith('"')
          ? parameterValueString.slice(1, -1)
          : parameterValueString;
      info[parameterName as keyof AuthenticationInfo] = parameterValue as never;
    }

    if (info.qop !== 'auth') {
      throw new Error(`Unexpected quality of protection value: ${info.qop}`);
    }

    if (info.algorithm !== 'SHA-256') {
      throw new Error(`Unexpected algorithm value: ${info.algorithm}`);
    }

    if (info.nonce === undefined) {
      throw new Error(`Unexpected nonce value: ${info.nonce}`);
    }

    if (info.realm === undefined) {
      throw new Error(`Unexpected realm value: ${info.realm}`);
    }

    return info as AuthenticationInfo;
  }

  createAuthenticationHeader(info: AuthenticationInfo, password: string): AuthenticationResponse {
    const username = 'admin';
    const cnonce = String(Math.floor(Math.random() * 10e8));

    const ha1 = hexHash(`admin:${info.realm}:${password}`);
    const ha2 = hexHash('dummy_method:dummy_uri');
    const responseRaw = `${ha1}:${info.nonce}:1:${cnonce}:auth:${ha2}`;
    const response = hexHash(responseRaw);

    return {
      username: username,
      nonce: info.nonce,
      cnonce: cnonce,
      realm: info.realm,
      algorithm: info.algorithm,
      response: response,
    };
  }
}
