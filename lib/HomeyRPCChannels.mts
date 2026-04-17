import HttpChannel from './rpc/channel/HttpChannel.mjs';
import Homey from 'homey';
import InboundWebsocketChannel from './rpc/channel/InboundWebsocketChannel.mjs';
import OutboundWebsocketChannel from './rpc/channel/OutboundWebsocketChannel.mjs';
import type mitt from 'mitt';
import type { WsMittEvents } from './rpc/OutboundWsServer.mjs';

export function createHttpChannel(
  address: string,
  translate: (key: string, variables?: Record<string, string>) => string,
  ha1?: string,
): HttpChannel {
  const debug = (...args: unknown[]): void => {
    if (Homey.env['DEBUG'] === '1') {
      console.log(new Date(), '[dbg]', '[ShellyApp]', `[HttpChannel:${address}]`, ...args);
    }
  };
  return new HttpChannel(address, debug, translate, ha1);
}

export function createInboundWsChannel(
  address: string,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void,
  translate: (key: string, variables?: Record<string, string>) => string,
  ha1?: string,
): InboundWebsocketChannel {
  const debug = (...args: unknown[]): void => {
    if (Homey.env['DEBUG'] === '1') {
      console.log(new Date(), '[dbg]', '[ShellyApp]', `[InboundWS:${address}]`, ...args);
    }
  };

  const wsLog = (...args: unknown[]): void => {
    log(`[InboundWS:${address}]`, ...args);
  };
  const wsError = (...args: unknown[]): void => {
    error(`[InboundWS:${address}]`, ...args);
  };

  return new InboundWebsocketChannel(address, wsLog, wsError, debug, translate, ha1);
}

export function createOutboundWsChannel(
  identifier: string,
  outboundWsMitt: mitt.Emitter<WsMittEvents>,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void,
  translate: (key: string, variables?: Record<string, string>) => string,
): OutboundWebsocketChannel {
  const debug = (...args: unknown[]): void => {
    if (Homey.env['DEBUG'] === '1') {
      console.log(new Date(), '[dbg]', '[ShellyApp]', `[OutboundWS:${identifier}]`, ...args);
    }
  };

  return new OutboundWebsocketChannel(identifier, outboundWsMitt, log, error, debug, translate);
}
