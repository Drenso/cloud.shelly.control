import ShellyZwaveDevice from '../../lib/zwave/ZwaveDevice.js';

export default class ShellyWaveMCBZwaveDevice extends ShellyZwaveDevice {
  protected async configureDevice(): Promise<void> {
    this.registerCapability('onoff', 'SWITCH_BINARY', {
      setParserV2: async (value: boolean): Promise<void> => {
        if (value) {
          // Cannot enable remotely
          throw new Error(this.homey.__('error.cannot_enable_breaker_remotely'));
        }

        if (!this.getSetting('allow_remote_off')) {
          throw new Error(this.homey.__('error.breaker_control_disabled'));
        }

        // @ts-expect-error Typings are borked for Z-Wave
        await this.node.CommandClass.COMMAND_CLASS_SWITCH_BINARY.SWITCH_BINARY_SET({
          'Target Value': 'off/disable',
          Duration: 'Default',
        });
        await this.setSettings({ allow_remote_off: false });
      },
    });
    this.registerCapability('measure_power', 'METER');
    this.registerCapability('measure_voltage', 'METER');
    this.registerCapability('measure_current', 'METER');
    this.registerCapability('meter_power', 'METER');
    this.registerCapability('meter_power.import', 'METER');
    this.registerCapability('meter_power.export', 'METER');
  }
}
