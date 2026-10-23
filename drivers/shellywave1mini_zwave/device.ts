import * as SingleButtonZWaveHandler from '../../lib/zwave/handlers/SingleButtonZWaveHandler.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';
import ShellyZWaveDevice from '../../lib/zwave/ZWaveDevice.js';

export default class ShellyWave1MiniZWaveDevice extends ShellyZWaveDevice {
  public readonly minimumFirmwareVersion = [14, 0] as const;

  protected async configureDevice(): Promise<void> {
    await SingleButtonZWaveHandler.configureDevice(this);
    this.registerCapability('onoff', 'SWITCH_BINARY');
    this.registerCapability('alarm_heat', 'NOTIFICATION');
  }

  public async onSettings(
    event: SettingsEvent<Record<string, boolean | string | number | undefined | null>>,
  ): Promise<string | void> {
    await SingleButtonZWaveHandler.onSettings(this, event);
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return ['single_press', 'double_press', 'long_press', 'hold'];
  }
}
