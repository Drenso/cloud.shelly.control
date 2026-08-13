import type ShellyApp from '../../../app.js';
import type { RpcChannel } from './RpcChannel.js';
import type mitt from 'mitt';
import WebSocket from 'ws';
import {
  createRequestFrame,
  type NotificationFrame,
  prettyError,
  type RequestFrame,
  type ResponseErrorFrame,
  type ResponseSuccessFrame,
} from '../Rpc.js';
import { createMitt, type UnionToIntersection } from '../../util.js';
import { RpcError } from '../RpcError.js';
import type { WsClosedEvent, WsMessageEvent, WsMittEvents } from '../OutboundWsServer.js';
import { Time } from '../../unitConversion.js';

type OutboundWsChannelMittEvents = {
  notification: NotificationFrame;
  opened: undefined;
  closed: undefined;
};

const PING_REQUEST_TIMEOUT = Time.s(5);

export default class OutboundWebsocketChannel implements RpcChannel {
  private wsPromise: Promise<WebSocket>;
  private resolveWsPromise: ((ws: WebSocket) => void) | undefined;
  private ws?: WebSocket;

  public get wsState(): 0 | 1 | 2 | 3 {
    return this.ws?.readyState ?? WebSocket.CONNECTING;
  }

  private readonly awaitingResponse = new Map<
    number,
    { resolve: (res: never) => void; reject: (err: never) => void }
  >();
  public readonly eventEmitter = createMitt<OutboundWsChannelMittEvents>();
  private readonly boundHandler: OmitThisParameter<(event: WsMessageEvent | WsClosedEvent) => void>;

  private keepAliveTimeout?: NodeJS.Timeout;

  public constructor(
    private readonly app: ShellyApp,
    public readonly identifier: string,
    private readonly outboundWsMitt: mitt.Emitter<WsMittEvents>,
    public readonly log: (...args: unknown[]) => void,
    public readonly error: (...args: unknown[]) => void,
    public readonly debug: (...args: unknown[]) => void,
    private keepAliveDuration: Time,
  ) {
    this.outboundWsMitt = outboundWsMitt;
    this.wsPromise = new Promise(resolve => {
      this.resolveWsPromise = resolve;
    });

    this.boundHandler = this.handleMessage.bind(this);
    this.outboundWsMitt.on(this.identifier, this.boundHandler);

    this.handleClosed = this.handleClosed.bind(this);
  }

  private updateWs(ws: WebSocket): void {
    if (this.resolveWsPromise) {
      this.resolveWsPromise(ws);
      this.resolveWsPromise = undefined;
    } else {
      this.wsPromise = Promise.resolve(ws);
    }

    this.ws?.off('close', this.handleClosed);
    ws.on('close', this.handleClosed);
    this.ws = ws;
    this.eventEmitter.emit('opened');
  }

  private handleClosed(): void {
    this.log('WS closed');
    this.app.homey.clearTimeout(this.keepAliveTimeout);
    this.eventEmitter.emit('closed');
  }

  public disconnect(): void {
    this.eventEmitter.all.clear();
    this.outboundWsMitt.off(this.identifier, this.boundHandler);
    this.app.homey.clearTimeout(this.keepAliveTimeout);
  }

  private handleMessage(event: WsMessageEvent | WsClosedEvent): void {
    this.updateKeepAlive();

    if ((event as UnionToIntersection<WsMessageEvent | WsClosedEvent>).json === undefined) {
      // Closed event
      return;
    }

    // Message event
    const { ws, json } = event as WsMessageEvent;

    if (json.src !== this.identifier) {
      return;
    }

    this.updateWs(ws);

    if (json.id === undefined) {
      if (json.method === undefined) {
        this.error('Unexpected WS message format:', JSON.stringify(json));
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
      this.error('Received response without a request:', JSON.stringify(json));
      return;
    }

    const error = json as ResponseErrorFrame;
    const result = json as ResponseSuccessFrame<object | null>;
    if (error.error !== undefined) {
      const { code, message } = error.error;
      awaitingResponse.reject(new RpcError(code, message) as never);
    } else {
      awaitingResponse.resolve(result as never);
    }
  }

  private async getWs(): Promise<WebSocket> {
    const socket = await this.wsPromise;
    if (socket.readyState === WebSocket.OPEN) {
      return socket;
    }
    this.wsPromise = new Promise(resolve => {
      this.resolveWsPromise = resolve;
    });
    return this.getWs();
  }

  public async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    try {
      const ws = await this.getWs();
      this.debug('Sending', requestFrame.method);
      return new Promise((resolve, reject) => {
        this.awaitingResponse.set(requestFrame.id as number, { resolve, reject });
        ws.send(JSON.stringify(requestFrame));
      });
    } catch (e) {
      throw prettyError(e, this.app.homey.__);
    }
  }

  private async ping(): Promise<void> {
    const ws = this.ws;
    if (ws === undefined) {
      throw new Error('Outbound websocket has not connected yet');
    }
    const pingFrame = createRequestFrame('Shelly.GetDeviceInfo');
    return new Promise((resolve, reject) => {
      this.awaitingResponse.set(pingFrame.id as number, { resolve, reject });
      ws.send(JSON.stringify(pingFrame));
    });
  }

  private updateKeepAlive(): void {
    this.app.homey.clearTimeout(this.keepAliveTimeout);
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
}
