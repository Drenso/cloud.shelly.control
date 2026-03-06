import type { RpcChannel } from './RpcChannel.mjs';
import type { RequestFrame, ResponseErrorFrame, ResponseFrame, ResponseSuccessFrame } from '../Rpc.mjs';
import { RpcError } from '../RpcError.mjs';
import { createAuthenticationResponse, NoPassword } from '../Authentication.mjs';

type AuthenticationChallenge = {
  qop: 'auth' | 'auth-int';
  realm: string;
  nonce: string;
  algorithm: string;
};

export default class HttpChannel implements RpcChannel {
  constructor(
    public readonly address: string,
    public ha1?: string,
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
      if (this.ha1 === undefined) {
        throw new NoPassword();
      }

      const authenticationHeader = response.headers.get('WWW-Authenticate');
      const authenticationChallenge = this.parseAuthenticationHeader(authenticationHeader);
      const authenticationResponse = createAuthenticationResponse(
        authenticationChallenge.realm,
        authenticationChallenge.nonce,
        this.ha1,
      );
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

  parseAuthenticationHeader(header: string | null): AuthenticationChallenge {
    if (header === null) {
      throw new Error('Expected WWW-Authenticate header for 401 response');
    }

    const headerWithoutDigest = header.slice(7);
    const headerParameterStrings = headerWithoutDigest.split(', ');
    const challenge: Partial<AuthenticationChallenge> = {};
    for (const parameterString of headerParameterStrings) {
      const [parameterName, parameterValueString] = parameterString.split('=');
      // Only some fields are quoted https://datatracker.ietf.org/doc/html/rfc7616#autoid-9
      const parameterValue =
        parameterValueString.startsWith('"') && parameterValueString.endsWith('"')
          ? parameterValueString.slice(1, -1)
          : parameterValueString;
      challenge[parameterName as keyof AuthenticationChallenge] = parameterValue as never;
    }

    if (challenge.qop !== 'auth') {
      throw new Error(`Unexpected WWW-Authenticate header quality of protection value: ${challenge.qop}`);
    }

    if (challenge.algorithm !== 'SHA-256') {
      throw new Error(`Unexpected WWW-Authenticate header algorithm value: ${challenge.algorithm}`);
    }

    if (challenge.nonce === undefined) {
      throw new Error(`Unexpected WWW-Authenticate header nonce value: ${challenge.nonce}`);
    }

    if (challenge.realm === undefined) {
      throw new Error(`Unexpected WWW-Authenticate header realm value: ${challenge.realm}`);
    }

    return challenge as AuthenticationChallenge;
  }
}
