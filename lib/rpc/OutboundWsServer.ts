import type WebSocket from 'ws';
import { type RawData, WebSocketServer } from 'ws';
import { OUTBOUND_WS_PORT } from '../config.js';
import { createRequestFrame, type NotificationFrame, type UnknownFrame } from './Rpc.js';
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
  private registeredDevices = new Set<string>();

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

    let json: NotificationFrame;
    try {
      json = JSON.parse(string);
    } catch {
      this.error('Outbound WS message JSON error', string);
      return;
    }

    if (json.src === undefined) {
      return;
    }

    if (this.registeredDevices.has(json.src)) {
      this.outboundWsMitt.emit(json.src, { json: json, ws: ws });
    } else {
      this.log(`Outbound WS from unknown device ${json.src}, disabling`);
      ws.removeAllListeners('message');
      const requestFrame = createRequestFrame('Ws.SetConfig', { config: { enable: false, server: '' } });
      ws.send(JSON.stringify(requestFrame));
    }
  }

  public registerDevice(id: string): void {
    this.registeredDevices.add(id);
  }

  public unregisterDevice(id: string): void {
    this.registeredDevices.delete(id);
  }
}
