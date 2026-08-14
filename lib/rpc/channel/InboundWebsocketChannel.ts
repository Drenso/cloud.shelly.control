import type ShellyApp from '../../../app.js';
import {
  createRequestFrame,
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
import {
  type AuthenticationResponse,
  createAuthenticationResponse,
  NoPassword,
  parseWsChallenge,
  UnauthenticatedWS,
} from '../Authentication.js';
import { Time } from '../../unitConversion.js';

const BASE_RECONNECT_TIMEOUT = Time.s(5);
const MAX_RECONNECT_TIMEOUT = Time.m(2);
const GREETING_DELAY = Time.ms(500);

type InboundWsChannelMittEvents = {
  notification: NotificationFrame;
  opened: undefined;
  closed: undefined;
};

const PING_REQUEST_TIMEOUT = Time.s(5);

export default class InboundWebsocketChannel implements RpcChannel {
  private ws!: WebSocket;
  private auth?: AuthenticationResponse;
  private nonceCount = 0;
  private reconnectTimeoutDuration = BASE_RECONNECT_TIMEOUT;
  private reconnectTimeout?: NodeJS.Timeout;
  private closed = false;
  private keepAliveTimeout?: NodeJS.Timeout;

  public get wsState(): 0 | 1 | 2 | 3 {
    return this.ws.readyState;
  }

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
    private keepAliveDuration: Time | undefined,
    private onHttpsUpgrade?: () => Promise<void>,
  ) {
    this.connect();

    this.handleClosed = this.handleClosed.bind(this);
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
      this.updateKeepAlive();
      // Delay greeting to allow some time for the device to be responsive
      await new Promise(resolve => this.app.homey.setTimeout(resolve, GREETING_DELAY.toMs()));
      // Send a message to enable receiving
      this.ping()
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
      this.handleClosed();
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

    this.log(`Reconnecting in ${this.reconnectTimeoutDuration.toS()} s`);
    this.close();
    this.app.homey.clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = this.app.homey.setTimeout(() => {
      this.log('Reconnecting...');
      this.connect();
    }, this.reconnectTimeoutDuration.toMs());

    this.reconnectTimeoutDuration = Time.ms(
      Math.min(this.reconnectTimeoutDuration.toMs() * 2, MAX_RECONNECT_TIMEOUT.toMs()),
    );
  }

  public disconnect(): void {
    this.closed = true;
    this.eventEmitter.all.clear();
    this.close();
    this.log('WS closed');
  }

  private close(): void {
    this.handleClosed();
    const oldWs = this.ws;
    // Prevent automatic reconnecting
    oldWs.removeAllListeners('close');
    oldWs.close();
    // The ws library throws errors next tick, so we cannot try-catch
    // The 'error' event listener does handle the error,
    // so it cannot be removed until the next tick
    process.nextTick(oldWs.removeAllListeners.bind(oldWs));
  }

  private handleClosed(): void {
    this.log('WS closed');
    this.app.homey.clearTimeout(this.keepAliveTimeout);
    this.eventEmitter.emit('closed');
  }

  public resetReconnectTimeout(): void {
    this.reconnectTimeoutDuration = BASE_RECONNECT_TIMEOUT;
    this.app.homey.clearTimeout(this.reconnectTimeout);
  }

  public safeConnect(): void {
    if (this.ws.readyState === this.ws.CLOSED) {
      this.connect();
    }
  }

  private async ping(): Promise<void> {
    const pingFrame = createRequestFrame('Shelly.GetDeviceInfo');
    await this.sendRequestFrame(pingFrame);
  }

  private updateKeepAlive(): void {
    this.app.homey.clearTimeout(this.keepAliveTimeout);
    if (this.keepAliveDuration === undefined) {
      return;
    }
    this.keepAliveTimeout = this.app.homey.setTimeout(() => {
      const pingTimeout = this.app.homey.setTimeout(() => {
        this.log('Failed ping, closing socket');
        this.ws?.terminate();
      }, PING_REQUEST_TIMEOUT.toMs());
      this.ping()
        .then(() => {
          this.app.homey.clearTimeout(pingTimeout);
          this.debug('Ping successfull');
        })
        .catch(err => this.error('Error while sending keep-alive ping:', err));
    }, this.keepAliveDuration.toMs());
  }

  private handleMessage(message: RawData): void {
    this.updateKeepAlive();

    const string = message.toString();
    const json = JSON.parse(string) as UnknownFrame;

    if (json.dst !== RPC_SRC) {
      return;
    }

    if (json.id === undefined) {
      if (json.method === undefined) {
        this.error('Unexpected WS message format:', string);
        return;
      }
      // Notification
      this.eventEmitter.emit('notification', json as NotificationFrame);
      return;
    }

    // Response to a request with the same id
    const awaitingResponse = this.awaitingResponse.get(json.id as number);
    this.awaitingResponse.delete(json.id as number);

    if (!awaitingResponse) {
      this.error('Received response without a request:', string);
      return;
    }

    const error = json as ResponseErrorFrame;
    const result = json as ResponseSuccessFrame<object | null>;

    if (error.error === undefined) {
      awaitingResponse.resolve(result as never);
      return;
    }

    const { code, message: errorMessage } = error.error;

    if (code === 401) {
      const authenticationError = new UnauthenticatedWS(errorMessage);
      authenticationError.stack = undefined;
      awaitingResponse.reject(authenticationError as never);
      return;
    }

    const rpcError = new RpcError(code, errorMessage);
    rpcError.stack = undefined;
    awaitingResponse.reject(rpcError as never);
  }

  public async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    try {
      let requestFrameMessage: string;
      if (this.auth !== undefined && this.ha1 !== null) {
        this.debug('Sending', requestFrame.method, 'with auth');
        this.auth = createAuthenticationResponse(this.auth.realm, this.auth.nonce, this.ha1, ++this.nonceCount);
        requestFrameMessage = JSON.stringify({ ...requestFrame, auth: this.auth });
      } else {
        this.debug('Sending', requestFrame.method);
        requestFrameMessage = JSON.stringify(requestFrame);
      }

      return new Promise<ResponseSuccessFrame<Result>>((resolve, reject) => {
        this.awaitingResponse.set(requestFrame.id as number, { resolve, reject });
        this.ws.send(requestFrameMessage);
      }).catch(error => {
        if (!(error instanceof UnauthenticatedWS && requestFrame.auth === undefined)) {
          throw error;
        }

        if (this.ha1 === null) {
          throw new NoPassword();
        }

        const challenge = parseWsChallenge(error.challenge);
        this.auth = createAuthenticationResponse(challenge.realm, challenge.nonce, this.ha1);
        this.nonceCount = 0;
        this.log('Authenticating...');
        const response = this.sendRequestFrame<Result>({ ...requestFrame, auth: this.auth });
        this.log('Authenticated');
        return response;
      });
    } catch (e) {
      throw prettyError(e, this.app.homey.__);
    }
  }
}
