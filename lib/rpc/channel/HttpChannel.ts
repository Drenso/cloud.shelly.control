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
import { Agent, type Dispatcher } from 'undici';

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
  private dispatcher: Dispatcher;

  public constructor(
    public readonly address: string,
    public readonly debug: (...args: unknown[]) => void,
    private readonly translate: (key: string, variables?: Record<string, string>) => string,
    public useHttps: boolean,
    public ha1: string | null,
    private onHttpsUpgrade?: () => Promise<void>,
  ) {
    this.dispatcher = new Agent({
      connect: {
        rejectUnauthorized: false,
      },
    });
  }

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
      const withHttps = this.useHttps;
      const response = await this.dispatcher.request<Result>({
        origin: withHttps ? `https://${this.address}` : `http://${this.address}`,
        path: '/rpc',
        method: 'POST',
        body: JSON.stringify(requestFrame),
      });
      // this.debug(`Response ${requestFrame.id}:`, response);

      if (response.statusCode === 307) {
        // We already upgraded to HTTPS and do not expect another redirect
        if (withHttps) {
          throw new HttpError(response.statusCode, response.statusText);
        }
        const redirect = response.headers['location'] as string;
        if (redirect.startsWith('https://') && redirect.slice('https://'.length, -'/rpc'.length) === this.address) {
          this.debug('Redirected to HTTPS');
          this.useHttps = true;
          await this.onHttpsUpgrade?.();
          return this.sendRequestFrame(requestFrame);
        } else {
          throw new HttpError(response.statusCode, response.statusText);
        }
      }

      if (response.statusCode === 401 && requestFrame.auth === undefined) {
        // We need to re-send authenticated with the given authentication information
        if (this.ha1 === null) {
          throw new NoPassword();
        }

        const authenticationHeader = response.headers['www-authenticate'] as string | undefined;
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

      if (response.statusCode !== 200) {
        throw new HttpError(response.statusCode, response.statusText);
      }

      const json = (await response.body.json()) as ResponseFrame<Result>;
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

  private parseAuthenticationHeader(header: string | Array<string> | undefined): AuthenticationChallenge {
    if (header === undefined || Array.isArray(header)) {
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
