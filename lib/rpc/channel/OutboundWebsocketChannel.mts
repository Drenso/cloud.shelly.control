import type { RpcChannel } from './RpcChannel.mjs';
import type mitt from 'mitt';
import WebSocket from 'ws';
import type { NotificationFrame, RequestFrame, ResponseErrorFrame, ResponseSuccessFrame } from '../Rpc.mjs';
import { createMitt, type UnionToIntersection } from '../../util.mjs';
import { RpcError } from '../RpcError.mjs';
import type { WsClosedEvent, WsMessageEvent, WsMittEvents } from '../OutboundWsServer.mjs';

type OutboundWsChannelMittEvents = {
  notification: NotificationFrame;
  opened: undefined;
};

// TODO authentication
// See documentation: https://shelly-api-docs.shelly.cloud/gen2/General/Authentication/#authentication
// See example: https://github.com/home-assistant-libs/aioshelly/blob/main/aioshelly/rpc_device/wsrpc.py
// TODO secure ws
export default class OutboundWebsocketChannel implements RpcChannel {
  public wsPromise: Promise<WebSocket>;
  private resolveWsPromise: ((ws: WebSocket) => void) | undefined;

  private readonly awaitingResponse = new Map<
    number,
    { resolve: (res: never) => void; reject: (err: never) => void }
  >();
  public readonly eventEmitter = createMitt<OutboundWsChannelMittEvents>();
  private readonly boundHandler: OmitThisParameter<(event: WsMessageEvent | WsClosedEvent) => void>;

  public constructor(
    public readonly identifier: string,
    private readonly outboundWsMitt: mitt.Emitter<WsMittEvents>,
    public readonly log: (...args: unknown[]) => void,
    public readonly error: (...args: unknown[]) => void,
    public readonly debug: (...args: unknown[]) => void,
  ) {
    this.outboundWsMitt = outboundWsMitt;
    this.wsPromise = new Promise(resolve => {
      this.resolveWsPromise = resolve;
    });

    this.boundHandler = this.handleMessage.bind(this);
    this.outboundWsMitt.on(this.identifier, this.boundHandler);
  }

  private updateWs(ws: WebSocket): void {
    if (this.resolveWsPromise) {
      this.resolveWsPromise(ws);
      this.resolveWsPromise = undefined;
    } else {
      this.wsPromise = Promise.resolve(ws);
    }
    this.eventEmitter.emit('opened');
  }

  public disconnect(): void {
    this.eventEmitter.all.clear();
    this.outboundWsMitt.off(this.identifier, this.boundHandler);
  }

  private handleMessage(event: WsMessageEvent | WsClosedEvent): void {
    if ((event as UnionToIntersection<WsMessageEvent | WsClosedEvent>).json === undefined) {
      // Closed event
      // TODO
      return;
    }
    // Message event
    const { ws, json } = event as WsMessageEvent;
    if (json.src === this.identifier) {
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

  public async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    const ws = await this.getWs();
    this.debug('Sending', requestFrame.method);
    ws.send(JSON.stringify(requestFrame));
    return new Promise((resolve, reject) => {
      this.awaitingResponse.set(requestFrame.id as number, { resolve, reject });
    });
  }
}
