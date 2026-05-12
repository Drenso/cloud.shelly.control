import type ShellyApp from '../app.js';
import HttpChannel from './rpc/channel/HttpChannel.js';
import Homey from 'homey';
import InboundWebsocketChannel from './rpc/channel/InboundWebsocketChannel.js';
import OutboundWebsocketChannel from './rpc/channel/OutboundWebsocketChannel.js';
import type mitt from 'mitt';
import type { WsMittEvents } from './rpc/OutboundWsServer.js';

export function createHttpChannel(
  address: string,
  translate: (key: string, variables?: Record<string, string>) => string,
  useHttps: boolean,
  ha1?: string,
  onHttpsUpgrade?: () => Promise<void>,
): HttpChannel {
  const debug = (...args: unknown[]): void => {
    if (Homey.env['DEBUG'] === '1') {
      console.log(new Date(), '[dbg]', '[ShellyApp]', `[HttpChannel:${address}]`, ...args);
    }
  };
  return new HttpChannel(address, debug, translate, useHttps, onHttpsUpgrade, ha1);
}

export function createInboundWsChannel(
  app: ShellyApp,
  address: string,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void,
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

  return new InboundWebsocketChannel(app, address, wsLog, wsError, debug, ha1);
}

export function createOutboundWsChannel(
  app: ShellyApp,
  identifier: string,
  outboundWsMitt: mitt.Emitter<WsMittEvents>,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void,
): OutboundWebsocketChannel {
  const debug = (...args: unknown[]): void => {
    if (Homey.env['DEBUG'] === '1') {
      console.log(new Date(), '[dbg]', '[ShellyApp]', `[OutboundWS:${identifier}]`, ...args);
    }
  };

  return new OutboundWebsocketChannel(app, identifier, outboundWsMitt, log, error, debug);
}
