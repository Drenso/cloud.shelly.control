import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RecursivePartial } from '../../util.js';
import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import capabilitiesOptions from './EM1/capabilitiesOptions.json' with { type: 'json' };
import GetConfig from './EM1/GetConfig.js';
import GetStatus from './EM1/GetStatus.js';
import SetConfig from './EM1/SetConfig.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import { safeAddCapability } from '../../safeFunctions.js';

export type EM1Config = {
  /** Id of the EM1 component instance */
  id: number;
  /** Name of the EM1 instance */
  name: string | null;
  /** Reverse CT measurement direction of active power and energy for the EM1 component. setting the reverse option requires restart */
  reverse: boolean;
  /**
   * Select the type of Shelly current transformer attached to the device.
   * If ct_type is not set, an error ct_type_not_set is present in component status.
   * Supported ct_types can be obtained with EM1.GetCTTypes.
   */
  ct_type?: string;
  /**
   * Settings for the alarm thresholds.
   * 'null' disables a threshold, setting the alarms option to 'null' disables all alarms.
   */
  alarms: {
    voltage: [number, number] | null;
    current: [number, number] | null;
    power: [number, number] | null;
  } | null;
};

export type EM1Status = {
  /** Id of the EM1 component instance */
  id: number;
  /** Current measurement value, [A] */
  current: number | null;
  /** Voltage measurement value, [V] */
  voltage: number | null;
  /** Active power measurement value, [W] */
  act_power: number | null;
  /** Apparent power measurement value, [VA] (if applicable) */
  aprt_power?: number | null;
  /** Power factor measurement value (if applicable) */
  pf?: number | null;
  /** Network frequency measurement value (if applicable) */
  freq?: number | null;
  /** Indicates factory calibration or which EM1:id is the source for calibration */
  calibration: string;
  /** EM1 component error conditions. May contain power_meter_failure, out_of_range:act_power, out_of_range:aprt_power, out_of_range:voltage, out_of_range:current or ct_type_not_set. Present in status only if not empty. */
  errors?: string[];
  /** Communicates present conditions, shown if at least one flag is set. Depending on component capabilites may contain: count_disabled */
  flags?: string[];
};

export type EM1HomeySettings = {
  'EM1:reverse': boolean;
  'EM1:ct_type': string;
};

const simpleSettingKeys = ['reverse', 'ct_type'] as const satisfies (keyof EM1Config)[];

/**
 * EM1 component handles the data collection and processing from energy meter devices like the ShellyProEM.
 */
export default class EM1 extends ComponentWithId<'EM1', EM1Status, EM1Config, EM1HomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'EM1';
  public static readonly uiName = 'Electrical Measurement';
  public static readonly key = 'em1';

  public async registerHomeyDevice(homeyDevice: ShellyLocalDevice, _methods: ComponentMethod<'EM1'>[]): Promise<void> {
    for (const [statusKey, homeyCapability] of [
      ['current', 'measure_current'],
      ['voltage', 'measure_voltage'],
      ['act_power', 'measure_power'],
      ['freq', 'measure_frequency'],
      ['pf', 'shelly_power_factor'],
    ] as const) {
      if (this.status[statusKey] !== undefined) {
        await this.registerCapability(homeyDevice, homeyCapability, capabilitiesOptions[homeyCapability as never]);
      }
    }

    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: EM1Status): Promise<void> {
    for (const [statusKey, homeyCapability] of [
      ['current', 'measure_current'],
      ['voltage', 'measure_voltage'],
      ['act_power', 'measure_power'],
      ['freq', 'measure_frequency'],
      ['pf', 'shelly_power_factor'],
    ] as const) {
      if (status[statusKey] !== undefined) {
        await this.setCapability(homeyDevice, homeyCapability, status[statusKey]);
      }

      await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
    }
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: EM1Config): Promise<void> {
    const newSettings: RecursivePartial<EM1HomeySettings, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`EM1:${settingKey}`] = config[settingKey] as never;
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<EM1HomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<EM1Config, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      const homeySettingKey = `EM1:${settingKey}` as const;
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
