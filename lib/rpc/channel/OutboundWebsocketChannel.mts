import type { RpcChannel } from './RpcChannel.mjs';
import mitt from 'mitt';
import WebSocket from 'ws';
import type { OutboundWsMittEvents } from '../../../app.mjs';
import type { NotificationFrame, RequestFrame, ResponseSuccessFrame } from '../Rpc.mjs';
import { createMitt } from '../../util.mjs';

type OutboundWsChannelMittEvents = {
  update: NotificationFrame;
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

    this.outboundWsMitt.on('*', this.handleMessage.bind(this));
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
    this.outboundWsMitt.off('*', this.handleMessage.bind(this));
  }

  private handleMessage(type: string | number, event: OutboundWsMittEvents[string]): void {
    if (type === this.address) {
      this.updateWs(event.ws);
      this.log('Outbound WS message:', event.json);
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

  async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    const ws = await this.getWs();
    ws.send(JSON.stringify(requestFrame));
    return new Promise((resolve, reject) => {
      this.awaitingResponse.set(requestFrame.id as number, { resolve, reject });
    });
  }

  registerUpdateHandler(handler: (update: NotificationFrame) => void): void {
    this.eventEmitter.on('update', handler);
  }

  unregisterUpdateHandler(handler: (update: NotificationFrame) => void): void {
    this.eventEmitter.off('update', handler);
  }
}
