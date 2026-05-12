import type WebSocket from 'ws';
import { type RawData, WebSocketServer } from 'ws';
import { OUTBOUND_WS_PORT } from '../config.js';
import type { NotificationFrame, UnknownFrame } from './Rpc.js';
import { createMitt } from '../util.js';
import { createServer } from 'node:https';
import { readFileSync } from 'fs';
import path from 'node:path';

export type WsMessageEvent = { json: UnknownFrame; ws: WebSocket };
export type WsClosedEvent = { ws: WebSocket };

export type WsMittEvents = {
  message: WsMessageEvent;
  closed: WsClosedEvent;
  [src: string]: WsMessageEvent | WsClosedEvent;
};

export default class OutboundWsServer {
  public readonly outboundWsMitt = createMitt<WsMittEvents>();

  public constructor(
    public readonly log: (...args: unknown[]) => void = console.log,
    public readonly error: (...args: unknown[]) => void = console.error,
  ) {}

  public open(ip: string): void {
    const server = createServer({
      cert: readFileSync(path.join(import.meta.dirname, 'server.crt')),
      key: readFileSync(path.join(import.meta.dirname, 'server.key')),
    });
    const wss = new WebSocketServer({ server: server });

    wss.on('connection', (ws, request) => {
      this.log('Outbound WS connected:', request.socket.remoteAddress);
      ws.on('message', message => this.handleOutboundWsMessage(ws, message));
      ws.on('error', error => this.error('Outbound WS connection error', error.toString()));
    });

    server.listen(OUTBOUND_WS_PORT);
    this.log('Started WS server on:', `wss://${ip}:${OUTBOUND_WS_PORT}`);
  }

  private handleOutboundWsMessage(ws: WebSocket, message: RawData): void {
    const string = message.toString();
    const json = JSON.parse(string) as NotificationFrame;
    if (json.src !== undefined) {
      this.outboundWsMitt.emit(json.src, { json: json, ws: ws });
    }
  }
}
