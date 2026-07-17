import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import capabilitiesOptions from './Humidity/capabilitiesOptions.json' with { type: 'json' };
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type { RecursivePartial } from '../../util.js';
import SetConfig from './Humidity/SetConfig.js';
import GetConfig from './Humidity/GetConfig.js';
import GetStatus from './Humidity/GetStatus.js';
import { safeAddCapability } from '../../safeFunctions.js';

export type HumidityConfig = {
  /** Identifier of the Humidity component instance */
  id: number;
  /**
   * Name of the Humidity instance.
   *
   * name length should not exceed 64 chars
   */
  name: string | null;
  /**
   * Humidity report threshold in %.
   *
   * Accepted range is device-specific,
   * default `[1.0..20.0]%` unless specified otherwise
   */
  report_thr: number;
  /**
   * Humidity offset in %.
   *
   * Value is applied to measured humidity.
   *
   * Accepted range is device-specific,
   * default `[-50.0..50.0]%` unless specified otherwise
   */
  offset: number;
};

export type HumidityStatus = {
  /** Identifier of the Humidity component instance */
  id: number;
  /**
   * Relative humidity in %
   *
   * (null if a valid value could not be obtained)
   */
  rh: number | null;
  /**
   * Shown only if at least one error is present.
   */
  errors?: ('out_of_range' | 'read')[];
};

export type HumidityHomeySettings = {
  'Humidity:report_thr': number;
  'Humidity:offset': number;
};

const simpleSettingKeys = ['report_thr', 'offset'] as const satisfies (keyof HumidityConfig)[];

/**
 * The Humidity component handles the monitoring of the device's humidity sensors.
 */
export default class Humidity extends ComponentWithId<
  'Humidity',
  HumidityStatus,
  HumidityConfig,
  HumidityHomeySettings
> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Humidity';
  public static readonly uiName = 'Humidity';
  protected static readonly key = 'humidity';

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Humidity'>[],
  ): Promise<void> {
    if (this.status.rh !== undefined) {
      const homeyCapability = 'measure_humidity';
      await this.registerCapability(homeyDevice, homeyCapability, capabilitiesOptions[homeyCapability as never]);
    } else {
      await Humidity.unregisterCapability(homeyDevice, 'measure_humidity', this.id);
    }

    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    await Humidity.unregisterCapability(homeyDevice, 'measure_humidity', id);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<HumidityStatus>): Promise<void> {
    if (status.rh !== undefined) {
      await this.setCapability(homeyDevice, 'measure_humidity', status.rh);
    }

    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: HumidityConfig): Promise<void> {
    const newSettings: RecursivePartial<HumidityHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`Humidity:${settingKey}`] = config[settingKey] as never;
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<HumidityHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<HumidityConfig, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      const homeySettingKey = `Humidity:${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[settingKey] = newSettings[homeySettingKey] as never;
      }
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }
}
