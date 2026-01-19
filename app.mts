import { Log } from '@drenso/homey-log';
import Homey from 'homey';
import sourceMapSupport from 'source-map-support';

sourceMapSupport.install();

// noinspection JSUnusedGlobalSymbols
export default class ShellyApp extends Homey.App {
  homeyLog = new Log({ homey: this.homey });

  async onInit(): Promise<void> {
    this.log('Initializing App...');
    this.log('Finished initializing App');
  }
}
