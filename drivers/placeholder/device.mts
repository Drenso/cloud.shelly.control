import Homey from 'homey';
import HttpChannel from '../../lib/rpc/channel/HttpChannel.mjs';
import Shelly from '../../lib/component/components/Shelly.mjs';

export default class PlaceholderDevice extends Homey.Device {
  private httpChannel!: HttpChannel;

  async onInit(): Promise<void> {
    this.log('PlaceholderDevice has been initialized');

    const { address } = this.getTypedStore();

    this.httpChannel = new HttpChannel(address);

    await Shelly.GetComponents(this.httpChannel)
      .then(res => {
        this.log('RES:', JSON.stringify(res));
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
