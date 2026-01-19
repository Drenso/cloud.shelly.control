import { createRequestFrame, type NotificationFrame, type RequestFrame, type ResponseSuccessFrame } from '../Rpc.mjs';
import type { RpcChannel } from './RpcChannel.mjs';
import WebSocket from 'ws';
import EventEmitter from 'events';

// TODO authentication
// See documentation: https://shelly-api-docs.shelly.cloud/gen2/General/Authentication/#authentication
// See example: https://github.com/home-assistant-libs/aioshelly/blob/main/aioshelly/rpc_device/wsrpc.py
export default class InboundWebsocket implements RpcChannel {
  readonly address: string;
  readonly ws: WebSocket;

  private awaitingResponse: Map<number, { resolve: (res: never) => void; reject: (err: never) => void }> = new Map();
  private eventEmitter = new EventEmitter();

  constructor(address: string) {
    this.address = address;
    this.ws = new WebSocket(`ws://${address}/rpc`);
    this.ws.on('open', () => {
      // Send a message to enable receiving
      const handshakeMessage = JSON.stringify(createRequestFrame('Shelly.GetConfig'));
      console.log('WS handshake:', handshakeMessage);
      this.ws.send(handshakeMessage);
      console.log('WS opened');
    });
    this.ws.on('message', message => {
      const parsedMessage = JSON.parse(message.toString());
      console.log('WS message:', message.toString());
      if (parsedMessage.dst === 'Homey') {
        if (parsedMessage.id !== undefined) {
          const awaitingResponse = this.awaitingResponse.get(parsedMessage.id);
          if (awaitingResponse) {
            awaitingResponse.resolve(parsedMessage as never);
            this.awaitingResponse.delete(parsedMessage.id);
          }
        } else if (parsedMessage.method !== undefined) {
          this.eventEmitter.emit('update', parsedMessage);
        }
      }
    });
    this.ws.on('error', err => {
      console.error('WS error:', err.toString());
    });
    this.ws.on('close', () => {
      console.log('WS closed');
    });
  }

  async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    this.ws.send(JSON.stringify(requestFrame));
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
