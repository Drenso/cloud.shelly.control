import type ShellyApp from '../../../app.js';
import {
  type NotificationFrame,
  prettyError,
  type RequestFrame,
  type ResponseErrorFrame,
  type ResponseSuccessFrame,
  type UnknownFrame,
} from '../Rpc.js';
import type { RpcChannel } from './RpcChannel.js';
import WebSocket, { type RawData } from 'ws';
import { RpcError } from '../RpcError.js';
import { RPC_SRC } from '../../config.js';
import { createMitt } from '../../util.js';
import RPC from '../../component/components/RPC.js';
import {
  type AuthenticationResponse,
  createAuthenticationResponse,
  NoPassword,
  parseWsChallenge,
  UnauthenticatedWS,
} from '../Authentication.js';

const BASE_RECONNECT_TIMEOUT = 1000;
const GREETING_DELAY = 500;

type InboundWsChannelMittEvents = {
  notification: NotificationFrame;
  opened: undefined;
};

export default class InboundWebsocketChannel implements RpcChannel {
  public ws!: WebSocket;
  private auth?: AuthenticationResponse;
  private nonce_count = 0;
  private reconnect_timeout_time = BASE_RECONNECT_TIMEOUT;
  private reconnect_timeout?: NodeJS.Timeout;
  private closed = false;

  private readonly awaitingResponse = new Map<
    number,
    { resolve: (res: never) => void; reject: (err: never) => void }
  >();
  public readonly eventEmitter = createMitt<InboundWsChannelMittEvents>();

  public constructor(
    private readonly app: ShellyApp,
    public readonly address: string,
    public readonly log: (...args: unknown[]) => void,
    public readonly error: (...args: unknown[]) => void,
    public readonly debug: (...args: unknown[]) => void,
    public useHttps: boolean,
    public ha1: string | null,
    private onHttpsUpgrade?: () => Promise<void>,
  ) {
    this.connect();
  }

  private connect(): void {
    this.ws = new WebSocket(this.useHttps ? `wss://${this.address}/rpc` : `ws://${this.address}/rpc`, {
      followRedirects: true,
      rejectUnauthorized: false,
    });

    this.ws.on('redirect', async url => {
      if (url.startsWith('wss://') && url.slice('wss://'.length, -'/rpc'.length) === this.address) {
        this.debug('Redirected to HTTPS');
        await this.onHttpsUpgrade?.();
      } else {
        throw new Error(`Unexpected ws redirect to ${url}`);
      }
    });
    this.ws.on('open', async () => {
      this.resetReconnectTimeout();
      // Delay greeting to allow some time for the device to be responsive
      await new Promise(resolve => this.app.homey.setTimeout(resolve, GREETING_DELAY));
      // Send a message to enable receiving
      RPC.Ping(this)
        .then(() => {
          this.log('Inbound WS greeting completed');
        })
        .catch(err => this.error('Error during WS greeting:', err));
      this.log('WS opened');
      this.eventEmitter.emit('opened');
    });
    this.ws.on('message', message => {
      this.handleMessage(message);
    });
    this.ws.on('error', err => {
      this.error('WS error:', err.toString());
    });
    this.ws.on('close', () => {
      this.log('WS closed');
      if (!this.closed) {
        this.reconnect();
      }
    });
  }

  private reconnect(): void {
    if (this.ws.readyState === WebSocket.CONNECTING) {
      this.log('Waiting for connection...');
      return;
    }

    this.log(`Reconnecting in ${this.reconnect_timeout_time} ms`);

    try {
      const oldWs = this.ws;
      oldWs.removeAllListeners();
      oldWs.close();
    } catch (error) {
      this.error('Error while closing old WS:', error);
    }

    this.app.homey.clearTimeout(this.reconnect_timeout);
    this.reconnect_timeout = this.app.homey.setTimeout(() => {
      this.log('Reconnecting...');
      this.connect();
    }, this.reconnect_timeout_time);

    this.reconnect_timeout_time *= 2;
  }

  public disconnect(): void {
    this.closed = true;
    this.eventEmitter.all.clear();
    const oldWs = this.ws;
    // Prevent automatic reconnecting
    oldWs.removeAllListeners('close');
    oldWs.close();
    // The ws library throws errors next tick, so we cannot try-catch
    // The 'error' event listener does handle the error,
    // so it cannot be removed until the next tick
    process.nextTick(oldWs.removeAllListeners);
    this.log('WS closed');
  }

  public resetReconnectTimeout(): void {
    this.reconnect_timeout_time = BASE_RECONNECT_TIMEOUT;
    this.app.homey.clearTimeout(this.reconnect_timeout);
  }

  public safeConnect(): void {
    if (this.ws.readyState === this.ws.CLOSED) {
      this.connect();
    }
  }

  private handleMessage(message: RawData): void {
    const string = message.toString();
    const json = JSON.parse(string) as UnknownFrame;
    if (json.dst === RPC_SRC) {
      if (json.id !== undefined) {
        // Response to a request with the same id
        const awaitingResponse = this.awaitingResponse.get(json.id as number);
        this.awaitingResponse.delete(json.id as number);
        if (awaitingResponse) {
          const error = json as ResponseErrorFrame;
          const result = json as ResponseSuccessFrame<object | null>;
          if (error.error !== undefined) {
            const { code, message } = error.error;
            if (code === 401) {
              const authenticationError = new UnauthenticatedWS(message);
              authenticationError.stack = undefined;
              awaitingResponse.reject(authenticationError as never);
              return;
            }
            const rpcError = new RpcError(code, message);
            rpcError.stack = undefined;
            awaitingResponse.reject(rpcError as never);
          } else {
            awaitingResponse.resolve(result as never);
          }
        } else {
          this.error('Received response without a request:', string);
        }
      } else if (json.method !== undefined) {
        // Notification
        this.eventEmitter.emit('notification', json as NotificationFrame);
      } else {
        this.error('Unexpected WS message format:', string);
      }
    }
  }

  public async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    try {
      if (this.auth !== undefined && this.ha1 !== null) {
        this.debug('Sending', requestFrame.method, 'with auth');
        this.auth = createAuthenticationResponse(this.auth.realm, this.auth.nonce, this.ha1, ++this.nonce_count);
        this.ws.send(JSON.stringify({ ...requestFrame, auth: this.auth }));
      } else {
        this.debug('Sending', requestFrame.method);
        this.ws.send(JSON.stringify(requestFrame));
      }
      return new Promise<ResponseSuccessFrame<Result>>((resolve, reject) => {
        this.awaitingResponse.set(requestFrame.id as number, { resolve, reject });
      }).catch(error => {
        if (error instanceof UnauthenticatedWS && requestFrame.auth === undefined) {
          if (this.ha1 === null) {
            throw new NoPassword();
          }
          const challenge = parseWsChallenge(error.challenge);
          this.auth = createAuthenticationResponse(challenge.realm, challenge.nonce, this.ha1);
          this.nonce_count = 0;
          this.log('Authenticating...');
          const response = this.sendRequestFrame<Result>({ ...requestFrame, auth: this.auth });
          this.log('Authenticated');
          return response;
        } else {
          throw error;
        }
      });
    } catch (e) {
      throw prettyError(e, this.app.homey.__);
    }
  }
}
