import ShellyLocalDriver from '../../lib/local/LocalDriver.js';
import type Eve01LocalDevice from './device.js';

export default class Eve01LocalDriver extends ShellyLocalDriver {
  public async onInit(): Promise<void> {
    await super.onInit();

    this.homey.flow
      .getActionCard('eve01_set_current_limit')
      .registerRunListener(async (cardArgs: { value: number; device: Eve01LocalDevice }) => {
        const currentLimitComponent = cardArgs.device.currentLimitComponent;
        if (currentLimitComponent === undefined) {
          throw new Error(this.homey.__('error.component_not_found', { component: 'number:200' }));
        }
        const channel = cardArgs.device.virtualDevice?.getChannel();
        if (channel === undefined) {
          throw new Error(this.homey.__('error.host_unreachable'));
        }
        await currentLimitComponent.Set(channel, { value: cardArgs.value });
      });
  }
}
