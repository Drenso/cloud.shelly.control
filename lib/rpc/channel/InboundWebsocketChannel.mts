import {
  type NotificationFrame,
  type RequestFrame,
  type ResponseErrorFrame,
  type ResponseSuccessFrame,
  type UnknownFrame,
} from '../Rpc.mjs';
import type { RpcChannel } from './RpcChannel.mjs';
import WebSocket, { type RawData } from 'ws';
import { RpcError } from '../RpcError.mjs';
import { RPC_SRC } from '../../config.mjs';
import { createMitt } from '../../util.mjs';
import Shelly from '../../component/components/Shelly.mjs';

const GREETING_DELAY = 100;

type InboundWsChannelMittEvents = {
  notification: NotificationFrame;
};

// TODO authentication
// See documentation: https://shelly-api-docs.shelly.cloud/gen2/General/Authentication/#authentication
// See example: https://github.com/home-assistant-libs/aioshelly/blob/main/aioshelly/rpc_device/wsrpc.py
// TODO wss://
export default class InboundWebsocketChannel implements RpcChannel {
  public ws!: WebSocket;

  private readonly awaitingResponse = new Map<
    number,
    { resolve: (res: never) => void; reject: (err: never) => void }
  >();
  public readonly eventEmitter = createMitt<InboundWsChannelMittEvents>();

  constructor(
    public readonly address: string,
    public readonly log: (...args: unknown[]) => void = console.log,
    public readonly error: (...args: unknown[]) => void = console.error,
  ) {
    this.connect();
  }

  connect(): void {
    this.ws = new WebSocket(`ws://${this.address}/rpc`);

    this.ws.on('open', async () => {
      // Delay greeting to allow some time for the device to be responsive
      await new Promise(resolve => setTimeout(resolve, GREETING_DELAY));
      // Send a message to enable receiving
      Shelly.GetDeviceInfo(this)
        .then(() => {
          this.log('Inbound WS greeting completed');
        })
        .catch(err => this.error('Error during WS greeting:', err));
      this.log('WS opened');
    });
    this.ws.on('message', message => {
      this.handleMessage(message);
    });
    this.ws.on('error', err => {
      this.error('WS error:', err.toString());
    });
    this.ws.on('close', () => {
      this.log('WS closed');
      this.reconnect();
    });
  }

  reconnect(): void {
    if (this.ws.readyState === WebSocket.CONNECTING) {
      this.log('Waiting for connection...');
      return;
    }
    this.log('Reconnecting...');
    try {
      const oldWs = this.ws;
      oldWs.removeAllListeners();
      oldWs.close();
    } catch (error) {
      this.error('Error while closing old WS:', error);
    }
    this.connect();
  }

  disconnect(): void {
    this.eventEmitter.all.clear();
    this.ws.close();
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

  async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    this.ws.send(JSON.stringify(requestFrame));
    return new Promise((resolve, reject) => {
      this.awaitingResponse.set(requestFrame.id as number, { resolve, reject });
    });
  }
}
