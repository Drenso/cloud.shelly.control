import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RecursivePartial } from '../../util.js';
import { type AllowedPrimitives, ComponentWithoutId } from '../Component.js';
import GetConfig from './HTUI/GetConfig.js';
import GetStatus from './HTUI/GetStatus.js';
import SetConfig from './HTUI/SetConfig.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

export type HTUIStatus = Record<string, never>;

export type HTUIConfig = {
  /** Unit of temperature. */
  temperature_unit: 'C' | 'F';
  /** Clock type of time shown on screen. */
  clock: '12' | '24' | 'disabled';
};

export type HTUIHomeySettings = {
  'HT_UI:temperature_unit': 'C' | 'F';
  'HT_UI:clock': '12' | '24' | 'disabled';
};

export default class HTUI extends ComponentWithoutId<'HT_UI', HTUIStatus, HTUIConfig, HTUIHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'HT_UI';
  public static readonly uiName = 'H&T';
  public static readonly key = 'ht_ui';

  public async registerHomeyDevice(
    _homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'HT_UI'>[],
  ): Promise<void> {}

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: HTUIStatus): Promise<void> {}

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: HTUIConfig): Promise<void> {
    const newSettings: Partial<HTUIHomeySettings> = {
      'HT_UI:temperature_unit': config.temperature_unit,
      'HT_UI:clock': config.clock,
    };

    await homeyDevice.setComponentSettings(this.namespace, undefined, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<HTUIHomeySettings>,
  ): Promise<boolean> {
    const changedConfigs: RecursivePartial<HTUIConfig, AllowedPrimitives> = {};

    if (changedKeys.includes('HT_UI:temperature_unit')) {
      changedConfigs.temperature_unit = newSettings['HT_UI:temperature_unit'];
    }

    if (changedKeys.includes('HT_UI:clock')) {
      changedConfigs.clock = newSettings['HT_UI:clock'];
    }

    if (Object.keys(changedConfigs).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfigs });
    return result.result.restart_required;
  }
}
