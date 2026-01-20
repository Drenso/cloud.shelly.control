import type { RpcChannel } from './RpcChannel.mjs';
import mitt from 'mitt';
import WebSocket from 'ws';
import type { OutboundWsMessageEvent, OutboundWsMittEvents } from '../../../app.mjs';
import type { NotificationFrame, RequestFrame, ResponseErrorFrame, ResponseSuccessFrame } from '../Rpc.mjs';
import { createMitt } from '../../util.mjs';
import { RpcError } from '../RpcError.mjs';

type OutboundWsChannelMittEvents = {
  notification: NotificationFrame;
};

// TODO authentication
// See documentation: https://shelly-api-docs.shelly.cloud/gen2/General/Authentication/#authentication
// See example: https://github.com/home-assistant-libs/aioshelly/blob/main/aioshelly/rpc_device/wsrpc.py
// TODO secure ws
export default class OutboundWebsocketChannel implements RpcChannel {
  private readonly address: string;
  private readonly outboundWsMitt: mitt.Emitter<OutboundWsMittEvents>;

  wsPromise: Promise<WebSocket>;
  private resolveWsPromise: ((ws: WebSocket) => void) | undefined;

  private readonly awaitingResponse = new Map<
    number,
    { resolve: (res: never) => void; reject: (err: never) => void }
  >();
  private readonly eventEmitter = createMitt<OutboundWsChannelMittEvents>();

  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;

  constructor(
    address: string,
    outboundWsMitt: mitt.Emitter<OutboundWsMittEvents>,
    log: (...args: unknown[]) => void = console.log,
    error: (...args: unknown[]) => void = console.error,
  ) {
    this.log = log;
    this.error = error;

    this.address = address;
    this.outboundWsMitt = outboundWsMitt;
    this.wsPromise = new Promise(resolve => {
      this.resolveWsPromise = resolve;
    });

    this.outboundWsMitt.on('message', this.handleMessage.bind(this));
  }

  updateWs(ws: WebSocket): void {
    if (this.resolveWsPromise) {
      this.resolveWsPromise(ws);
      this.resolveWsPromise = undefined;
    } else {
      this.wsPromise = Promise.resolve(ws);
    }
  }

  disconnect(): void {
    this.eventEmitter.all.clear();
    this.outboundWsMitt.off('message', this.handleMessage.bind(this));
  }

  private handleMessage({ ws, json }: OutboundWsMessageEvent): void {
    if (json.src === this.address) {
      this.updateWs(ws);
      if (json.id !== undefined) {
        // Response to a request with the same id
        const awaitingResponse = this.awaitingResponse.get(json.id as number);
        this.awaitingResponse.delete(json.id as number);
        if (awaitingResponse) {
          const error = json as ResponseErrorFrame;
          const result = json as ResponseSuccessFrame<object | null>;
          if (error.error !== undefined) {
            const { code, message } = error.error;
            awaitingResponse.reject(new RpcError(code, message) as never);
          } else {
            awaitingResponse.resolve(result as never);
          }
        } else {
          this.error('Received response without a request:', JSON.stringify(json));
        }
      } else if (json.method !== undefined) {
        // Notification
        this.eventEmitter.emit('notification', json as NotificationFrame);
      } else {
        this.error('Unexpected WS message format:', JSON.stringify(json));
      }
    }
  }

  // TODO use closed event to make this cleaner
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

  async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    const ws = await this.getWs();
    ws.send(JSON.stringify(requestFrame));
    return new Promise((resolve, reject) => {
      this.awaitingResponse.set(requestFrame.id as number, { resolve, reject });
    });
  }

  registerNotificationHandler(handler: (notification: NotificationFrame) => void): void {
    this.eventEmitter.on('notification', handler);
  }

  unregisterNotificationHandler(handler: (notification: NotificationFrame) => void): void {
    this.eventEmitter.off('notification', handler);
  }
}
