import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import capabilitiesOptions from './Temperature/capabilitiesOptions.json' with { type: 'json' };
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import { type RecursivePartial, translate } from '../../util.js';
import SetConfig from './Temperature/SetConfig.js';
import GetConfig from './Temperature/GetConfig.js';
import GetStatus from './Temperature/GetStatus.js';
import { safeAddCapability, safeTriggerDeviceCard } from '../../safeFunctions.js';

export type TemperatureConfig = {
  // Identifier of the Temperature component instance
  id: number;
  // Name of the Temperature instance. name length should not exceed 64 chars
  name: string | null;
  // Temperature report threshold in Celsius.
  // Accepted range is device-specific, default [0.5 - 5.0]C unless specified otherwise
  report_thr_C: number;
  // Offset in Celsius to be applied to the measured temperature.
  // Accepted range is device-specific, default [-50.0 - 50.0] unless specified otherwise
  offset_C: number;
};

export type TemperatureStatus = {
  // Identifier of the Temperature component instance
  id: number;
  // Temperature in Celsius (null if valid value could not be obtained)
  tC: number | null;
  // Temperature in Fahrenheit (null if valid value could not be obtained)
  tf: number | null;
  // Error conditions occurred.
  // (shown if at least one error is present)
  errors?: ('out_of_range' | 'read')[];
};

export type TemperatureHomeySettings = {
  'Temperature:report_thr_C': number;
  'Temperature:offset_C': number;
};

const settingKeys = ['report_thr_C', 'offset_C'] as const satisfies (keyof TemperatureConfig)[];

/**
 * The Temperature component handles the monitoring of the device's temperature sensors.
 */
export default class Temperature extends ComponentWithId<
  'Temperature',
  TemperatureStatus,
  TemperatureConfig,
  TemperatureHomeySettings
> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Temperature';
  public static readonly uiName = 'Temperature';
  public static readonly key = 'temperature';

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Temperature'>[],
  ): Promise<void> {
    if (this.status.tC !== undefined) {
      const homeyCapability = 'measure_temperature';
      await this.registerCapability(homeyDevice, homeyCapability, capabilitiesOptions[homeyCapability]);
      await safeAddCapability(homeyDevice, 'hidden.has_temperature_measurement');
    }

    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<TemperatureStatus>): Promise<void> {
    const temperature = status.tC;
    if (temperature !== undefined) {
      await this.setCapability(homeyDevice, 'measure_temperature', temperature);
      if (temperature !== null) {
        await safeTriggerDeviceCard(
          homeyDevice,
          'measure_temperature_changed',
          { measure_temperature: temperature },
          { component: this.getComponentKey() },
        );
      }
    }

    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: TemperatureConfig): Promise<void> {
    const newSettings: RecursivePartial<TemperatureHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of settingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`Temperature:${settingKey}`] = config[settingKey] as never;
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<TemperatureHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<TemperatureConfig, AllowedPrimitives> = {};

    for (const settingKey of settingKeys) {
      const homeySettingKey = `Temperature:${settingKey}` as const;
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

  public getAutocompleteTitle(device: ShellyLocalDevice, capability: string): string {
    const name = this.config.name !== null ? this.config.name : `${this.id}`;
    if (capability === 'measure_temperature') {
      return translate(device.homey.__('locale'), capabilitiesOptions['measure_temperature'].title, {
        name: name,
      });
    }

    return super.getAutocompleteTitle(device, capability);
  }
}
