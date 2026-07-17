import ShellyLocalDriver from '../../lib/local/LocalDriver.js';
import type ShellyLocalDevice from '../../lib/local/LocalDevice.js';

export default class WaterValveLocalDriver extends ShellyLocalDriver {
  public async onInit(): Promise<void> {
    await super.onInit();

    this.homey.flow
      .getConditionCard('watervalve_alarm_shelly_power_lost')
      .registerRunListener((cardArgs: { device: ShellyLocalDevice }) => {
        return cardArgs.device.getCapabilityValue('alarm_shelly_power_lost');
      });
  }
}
