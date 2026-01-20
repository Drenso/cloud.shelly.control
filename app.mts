import { Log } from '@drenso/homey-log';
import Homey from 'homey';
import sourceMapSupport from 'source-map-support';
import { WebSocketServer } from 'ws';
import { OUTBOUND_WS_PORT } from './lib/config.mjs';
import { getIp } from './lib/LocalIp.mjs';

sourceMapSupport.install();

// noinspection JSUnusedGlobalSymbols
export default class ShellyApp extends Homey.App {
  homeyLog = new Log({ homey: this.homey });

  async onInit(): Promise<void> {
    this.log('Initializing App...');

    const wss = new WebSocketServer({ port: OUTBOUND_WS_PORT });

    wss.on('connection', ws => {
      this.log('Outbound WS connected');
      ws.on('message', message => this.log('Outbound WS message', message.toString()));
      ws.on('error', error => this.log('Outbound WS connection error', error.toString()));
    });

    this.log('Started WS server on:', `ws://${await getIp(this.homey)}:${OUTBOUND_WS_PORT}`);

    this.log('Finished initializing App');
  }
}
