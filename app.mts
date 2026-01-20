import { Log } from '@drenso/homey-log';
import Homey from 'homey';
import sourceMapSupport from 'source-map-support';
import WebSocket, { type RawData, WebSocketServer } from 'ws';
import { OUTBOUND_WS_PORT } from './lib/config.mjs';
import { getIp } from './lib/LocalIp.mjs';
import type { NotificationFrame, UnknownFrame } from './lib/rpc/Rpc.mjs';
import { createMitt } from './lib/util.mjs';

sourceMapSupport.install();

export type OutboundWsMessageEvent = { json: UnknownFrame; ws: WebSocket };
export type OutboundWsClosedEvent = { ws: WebSocket };

export type OutboundWsMittEvents = {
  message: OutboundWsMessageEvent;
  closed: OutboundWsClosedEvent;
};

// noinspection JSUnusedGlobalSymbols
export default class ShellyApp extends Homey.App {
  homeyLog = new Log({ homey: this.homey });
  outboundWsMitt = createMitt<OutboundWsMittEvents>();

  async onInit(): Promise<void> {
    this.log('Initializing App...');

    const wss = new WebSocketServer({ port: OUTBOUND_WS_PORT });

    wss.on('connection', (ws, request) => {
      this.log('Outbound WS connected:', request.socket.remoteAddress);
      ws.on('message', message => this.handleOutboundWsMessage(ws, message));
      ws.on('error', error => this.error('Outbound WS connection error', error.toString()));
    });

    this.log('Started WS server on:', `ws://${await getIp(this.homey)}:${OUTBOUND_WS_PORT}`);

    this.log('Finished initializing App');
  }

  handleOutboundWsMessage(ws: WebSocket, message: RawData): void {
    const string = message.toString();
    const json = JSON.parse(string) as NotificationFrame;
    if (json.src !== undefined) {
      this.outboundWsMitt.emit('message', { json: json, ws: ws });
    }
  }
}
