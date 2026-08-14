import type ShellyApp from '../app.js';
import HttpChannel from './rpc/channel/HttpChannel.js';
import Homey from 'homey';
import InboundWebsocketChannel from './rpc/channel/InboundWebsocketChannel.js';
import OutboundWebsocketChannel from './rpc/channel/OutboundWebsocketChannel.js';
import type mitt from 'mitt';
import type { WsMittEvents } from './rpc/OutboundWsServer.js';
import type { Time } from './unitConversion.js';

export function createHttpChannel(
  address: string,
  translate: (key: string, variables?: Record<string, string>) => string,
  useHttps: boolean,
  ha1: string | null = null,
  onHttpsUpgrade?: () => Promise<void>,
): HttpChannel {
  const debug = (...args: unknown[]): void => {
    if (Homey.env['DEBUG'] === '1') {
      console.log(new Date(), '[dbg]', '[ShellyApp]', `[HttpChannel:${address}]`, ...args);
    }
  };
  return new HttpChannel(address, debug, translate, useHttps, ha1, onHttpsUpgrade);
}

export function createInboundWsChannel(
  app: ShellyApp,
  address: string,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void,
  useHttps: boolean,
  ha1: string | null = null,
  keepAliveDuration: Time | undefined,
  onHttpsUpgrade?: () => Promise<void>,
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

  return new InboundWebsocketChannel(
    app,
    address,
    wsLog,
    wsError,
    debug,
    useHttps,
    ha1,
    keepAliveDuration,
    onHttpsUpgrade,
  );
}

export function createOutboundWsChannel(
  app: ShellyApp,
  identifier: string,
  outboundWsMitt: mitt.Emitter<WsMittEvents>,
  log: (...args: unknown[]) => void,
  error: (...args: unknown[]) => void,
  keepAliveDuration: Time | undefined,
): OutboundWebsocketChannel {
  const debug = (...args: unknown[]): void => {
    if (Homey.env['DEBUG'] === '1') {
      console.log(new Date(), '[dbg]', '[ShellyApp]', `[OutboundWS:${identifier}]`, ...args);
    }
  };

  return new OutboundWebsocketChannel(app, identifier, outboundWsMitt, log, error, debug, keepAliveDuration);
}
