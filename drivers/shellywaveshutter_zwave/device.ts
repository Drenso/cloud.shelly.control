import ShellyZWaveDevice from '../../lib/zwave/ZWaveDevice.js';
import { safeAddCapability, safeRemoveCapability } from '../../lib/safeFunctions.js';
import type { ButtonIndicesDeviceInterface, ButtonEventTypesDeviceInterface } from '../../lib/capabilityInterfaces.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';
import * as MultiButtonZWaveHandler from '../../lib/zwave/handlers/MultiButtonZWaveHandler.js';

export default class ShellyWaveShutterZWaveDevice
  extends ShellyZWaveDevice
  implements ButtonIndicesDeviceInterface, ButtonEventTypesDeviceInterface
{
  public readonly minimumFirmwareVersion = [14, 2] as const;

  protected async configureDevice(): Promise<void> {
    await MultiButtonZWaveHandler.configureDevice(this, 2);
    this.registerCapability('measure_power', 'METER', { multiChannelNodeId: 1 });
    this.registerCapability('meter_power', 'METER', { multiChannelNodeId: 1 });
    this.registerCapability('windowcoverings_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 1 });
    this.registerCapability('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', {
      multiChannelNodeId: 2,
      getOpts: {
        getOnStart: false,
      },
    });
    if (this.hasCapability('windowcoverings_tilt_set')) {
      await this._getCapabilityValue('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL').catch(err =>
        this.error('Error while getting initial windowcoverings_tilt_set value:', err),
      );
    }
    this.registerCapabilityListener('button.calibration', async () => this.startCalibration());
  }

  public async onSettings(event: {
    oldSettings: { [p: string]: boolean | string | number | undefined | null };
    newSettings: { [p: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    const { newSettings, changedKeys } = event;

    if (changedKeys.includes('zwaveShutterOperatingMode')) {
      // Check for venetian mode
      if (newSettings['zwaveShutterOperatingMode'] === '1') {
        await safeAddCapability(this, 'windowcoverings_tilt_set');
      } else {
        await safeRemoveCapability(this, 'windowcoverings_tilt_set');
      }
    }

    await MultiButtonZWaveHandler.onSettings(this, event, 2);
    await super.onSettings(event);
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return ['single_press', 'long_press', 'hold'];
  }

  public getButtonIndices(): number[] {
    const buttons = [];
    const settings = this.getSettings();
    if (settings['zwaveSwitchDetachedModeSW1'] === '1') {
      buttons.push(0);
    }
    if (settings['zwaveSwitchDetachedModeSW2'] === '1') {
      buttons.push(1);
    }
    return buttons;
  }
}
