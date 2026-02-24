import WebSocket, { type RawData, WebSocketServer } from 'ws';
import { OUTBOUND_WS_PORT } from '../config.mjs';
import type { NotificationFrame, UnknownFrame } from './Rpc.mjs';
import { createMitt } from '../util.mjs';
import OutboundWebsocketChannel from './channel/OutboundWebsocketChannel.mjs';
import InboundWebsocketChannel from './channel/InboundWebsocketChannel.mjs';
import type { RpcChannel } from './channel/RpcChannel.mjs';

export type WsMessageEvent = { json: UnknownFrame; ws: WebSocket };
export type WsClosedEvent = { ws: WebSocket };

export type WsMittEvents = {
  message: WsMessageEvent;
  closed: WsClosedEvent;
  [src: string]: WsMessageEvent | WsClosedEvent;
};

interface ChannelRegistration<Channel extends RpcChannel> {
  channel: Channel;
  users: number;
}

export default class ChannelController {
  outboundWsMitt = createMitt<WsMittEvents>();
  outboundChannels = new Map<string, ChannelRegistration<OutboundWebsocketChannel>>();
  inboundChannels = new Map<string, ChannelRegistration<InboundWebsocketChannel>>();

  constructor(
    public readonly log: (...args: unknown[]) => void = console.log,
    public readonly error: (...args: unknown[]) => void = console.error,
  ) {}

  openWebsocketServer(ip: string): void {
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

  registerOutboundWsChannel(identifier: string): OutboundWebsocketChannel {
    const registration = this.outboundChannels.get(identifier);
    if (registration === undefined) {
      const channel = new OutboundWebsocketChannel(
        identifier,
        this.outboundWsMitt,
        (...args) => this.log(`[OutboundWS:${identifier}]`, ...args),
        (...args) => {
          this.error(`[OutboundWS:${identifier}]`, ...args);
        },
      );
      this.outboundChannels.set(identifier, {
        channel: channel,
        users: 1,
      });
      channel.log('Channel created');
      channel.log('Users:', 1);
      return channel;
    } else {
      registration.users += 1;
      registration.channel.log('users:', registration.users);
      return registration.channel;
    }
  }

  registerInboundWsChannel(address: string): InboundWebsocketChannel {
    const registration = this.inboundChannels.get(address);
    if (registration === undefined) {
      const channel = new InboundWebsocketChannel(
        address,
        (...args) => this.log(`[InboundWS:${address}]`, ...args),
        (...args) => {
          this.error(`[InboundWS:${address}]`, ...args);
        },
      );
      this.inboundChannels.set(address, {
        channel: channel,
        users: 1,
      });
      channel.log('Channel created');
      channel.log('Users:', 1);
      return channel;
    } else {
      registration.users += 1;
      registration.channel.log('users:', registration.users);
      return registration.channel;
    }
  }

  unregisterOutboundWsChannel(channel: OutboundWebsocketChannel): void {
    const registration = this.outboundChannels.get(channel.identifier);
    if (registration === undefined) {
      throw new Error(`Attempting to unregister undefined outbound WS channel for ${channel.identifier}`);
    }
    registration.users -= 1;
    channel.log('Users:', registration.users);
    if (registration.users <= 0) {
      this.outboundChannels.delete(channel.identifier);
      channel.disconnect();
      channel.log('Channel closed');
    }
  }

  unregisterInboundWsChannel(channel: InboundWebsocketChannel): void {
    const registration = this.inboundChannels.get(channel.address);
    if (registration === undefined) {
      throw new Error(`Attempting to unregister undefined inbound WS channel for ${channel.address}`);
    }
    registration.users -= 1;
    channel.log('Users:', registration.users);
    if (registration.users <= 0) {
      this.inboundChannels.delete(channel.address);
      channel.disconnect();
      channel.log('Channel closed');
    }
  }
}
