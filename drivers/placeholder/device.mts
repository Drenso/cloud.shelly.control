import Homey from 'homey';
import type { RequestFrame } from '../../lib/rpc/Rpc.mjs';
import { randomInt } from 'node:crypto';
import { sendRequestFrame } from '../../lib/rpc/channel/RpcHttp.mjs';

export default class PlaceholderDevice extends Homey.Device {
  async onInit(): Promise<void> {
    this.log('PlaceholderDevice has been initialized');

    const requestFrame: RequestFrame = {
      id: randomInt(2 ** 48 - 1),
      src: 'Homey',
      method: 'Sys.GetStatus',
    };

    const { address } = this.getTypedStore();

    sendRequestFrame(address, requestFrame)
      .then(res => {
        this.log('RES:', res);
      })
      .catch(err => {
        this.error('ERR:', err);
      });
  }

  getTypedStore(): {
    address: string;
    port: number;
    host: string;
    name: string;
    txt: { ver: `${number}.${number}.${number}`; app: string; gen: `${number}` };
  } {
    return this.getStore();
  }
}
