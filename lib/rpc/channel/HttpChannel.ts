import type { RpcChannel } from './RpcChannel.js';
import {
  prettyError,
  type RequestFrame,
  type ResponseErrorFrame,
  type ResponseFrame,
  type ResponseSuccessFrame,
} from '../Rpc.js';
import { RpcError } from '../RpcError.js';
import { createAuthenticationResponse, NoPassword } from '../Authentication.js';

type AuthenticationChallenge = {
  qop: 'auth' | 'auth-int';
  realm: string;
  nonce: string;
  algorithm: string;
};

export class HttpError extends Error {
  public readonly code: number;
  public constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export default class HttpChannel implements RpcChannel {
  public constructor(
    public readonly address: string,
    public readonly debug: (...args: unknown[]) => void,
    private readonly translate: (key: string, variables?: Record<string, string>) => string,
    public ha1?: string,
  ) {}

  public disconnect(): void {}

  public async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    try {
      if (requestFrame.auth === undefined) {
        this.debug(`Sending ${requestFrame.id}:`, requestFrame.method);
      } else {
        this.debug(`Resending ${requestFrame.id} with auth:`, requestFrame.method);
      }
      // TODO change to HTTPS
      const addressString = this.address;
      const response = await fetch(`http://${addressString}/rpc`, {
        method: 'POST',
        body: JSON.stringify(requestFrame),
      }).catch(err => {
        if (err instanceof TypeError) {
          this.debug('Unwrapped undici TypeError');
          const wrappedError = (err as unknown as { cause: Error }).cause;
          Error.captureStackTrace(wrappedError);
          throw wrappedError;
        } else {
          throw err;
        }
      });
      // this.debug(`Response ${requestFrame.id}:`, response);

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
        throw new HttpError(response.status, response.statusText);
      }

      const json = (await response.json()) as ResponseFrame<Result>;
      const error = json as ResponseErrorFrame;
      const result = json as ResponseSuccessFrame<Result>;
      if (error.error !== undefined) {
        const { code, message } = error.error;
        throw new RpcError(code, message);
      }
      return result;
    } catch (e) {
      throw prettyError(e, this.translate);
    }
  }

  private parseAuthenticationHeader(header: string | null): AuthenticationChallenge {
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
