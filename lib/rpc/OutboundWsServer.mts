import type WebSocket from 'ws';
import { type RawData, WebSocketServer } from 'ws';
import { OUTBOUND_WS_PORT } from '../config.mjs';
import type { NotificationFrame, UnknownFrame } from './Rpc.mjs';
import { createMitt } from '../util.mjs';

export type WsMessageEvent = { json: UnknownFrame; ws: WebSocket };
export type WsClosedEvent = { ws: WebSocket };

export type WsMittEvents = {
  message: WsMessageEvent;
  closed: WsClosedEvent;
  [src: string]: WsMessageEvent | WsClosedEvent;
};

// TODO enable wss and authentication
export default class OutboundWsServer {
  outboundWsMitt = createMitt<WsMittEvents>();

  constructor(
    public readonly log: (...args: unknown[]) => void = console.log,
    public readonly error: (...args: unknown[]) => void = console.error,
  ) {}

  open(ip: string): void {
    const wss = new WebSocketServer({ port: OUTBOUND_WS_PORT });

    wss.on('connection', (ws, request) => {
      this.log('Outbound WS connected:', request.socket.remoteAddress);
      ws.on('message', message => this.handleOutboundWsMessage(ws, message));
      ws.on('error', error => this.error('Outbound WS connection error', error.toString()));
    });

    this.log('Started WS server on:', `ws://${ip}:${OUTBOUND_WS_PORT}`);
  }

  handleOutboundWsMessage(ws: WebSocket, message: RawData): void {
    const string = message.toString();
    const json = JSON.parse(string) as NotificationFrame;
    if (json.src !== undefined) {
      this.outboundWsMitt.emit(json.src, { json: json, ws: ws });
    }
  }
}
