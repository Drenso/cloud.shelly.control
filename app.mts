import { Log } from '@drenso/homey-log';
import Homey from 'homey';
import sourceMapSupport from 'source-map-support';
import { getIp } from './lib/LocalIp.mjs';
import ChannelController from './lib/rpc/ChannelController.mjs';

sourceMapSupport.install();

// noinspection JSUnusedGlobalSymbols
export default class ShellyApp extends Homey.App {
  homeyLog = new Log({ homey: this.homey });
  channelController = new ChannelController(this.log, this.error);

  async onInit(): Promise<void> {
    this.log('Initializing App...');
    this.channelController.openWebsocketServer(await getIp(this.homey));
    this.log('Finished initializing App');
  }
}
