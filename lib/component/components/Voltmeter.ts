import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import capabilitiesOptions from './Voltmeter/capabilitiesOptions.json' with { type: 'json' };
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type { RecursivePartial } from '../../util.js';
import SetConfig from './Voltmeter/SetConfig.js';
import GetConfig from './Voltmeter/GetConfig.js';
import GetStatus from './Voltmeter/GetStatus.js';
import CheckExpression from './Voltmeter/CheckExpression.js';
import { safeAddCapability } from '../../safeFunctions.js';

export type VoltmeterConfig = {
  /** Identifier of the Voltmeter component instance */
  id: number;
  /**
   * Name of the Voltmeter instance.
   *
   * name length should not exceed 64 chars
   */
  name: string | null;
  /**
   * Voltmeter report threshold in volts.
   *
   * Accepted range is device-specific
   */
  report_thr: number;
  /** Input range, which is device-specific. */
  range: PlusUniRange | ThePillRange;
  /** Value transformation config for `status.voltage` */
  xvoltage: {
    /**
     * JS expression containing `x`, where `x` is the raw value to be transformed (`status.voltage`)
     *
     * for example, `"x+1"`.
     *
     * Accepted range: `null` or `[0..100]` chars.
     * Both `null` and `""` mean value the transformation is disabled.
     */
    expr: string | null;
    /**
     * Unit of the transformed value (`status.xvoltage`)
     *
     * for example, `"m/s"`.
     *
     * Accepted range: `null` or `[0..20]` chars.
     * Both `null` and `""` mean value transformation is disabled.
     */
    unit: string | null;
  };
};

type PlusUniRange =
  /** 0-15 VDC (default) */
  | 0
  /** 0-30 VDC */
  | 1;

type ThePillRange =
  /** 0-2.5 VDC (default) */
  | 0
  /** 0-30 VDC */
  | 1;

export type VoltmeterStatus = {
  /** Identifier of the Voltmeter component instance */
  id: number;
  /**
   * Voltage in volts
   *
   * (`null` if a valid value could not be obtained)
   */
  voltage: number | null;
  /**
   * voltage transformed with `config.xvoltage.expr`.
   *
   * Present only when both `config.xvoltage.expr` and `config.xvoltage.unit` are set to non-empty values.
   *
   * `null` if `config.xvoltage.expr` cannot be evaluated.
   */
  xvoltage?: number | null;
  /**
   * Shown only if at least one error is present.
   */
  errors?: ('out_of_range' | 'read')[];
};

export type VoltmeterHomeySettings = {
  'Voltmeter:report_thr': number;
  'Voltmeter:range': '0' | '1';
};

const simpleSettingKeys = ['report_thr'] as const satisfies (keyof VoltmeterConfig)[];

/**
 * The Voltmeter component handles the monitoring of the device's voltmeter sensors.
 */
export default class Voltmeter extends ComponentWithId<
  'Voltmeter',
  VoltmeterStatus,
  VoltmeterConfig,
  VoltmeterHomeySettings
> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Voltmeter';
  public static readonly uiName = 'Voltmeter';
  protected static readonly key = 'voltmeter';

  public readonly CheckExpression = CheckExpression;

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Voltmeter'>[],
  ): Promise<void> {
    if (this.status.voltage !== undefined) {
      const homeyCapability = 'measure_voltage';
      await this.registerCapability(homeyDevice, homeyCapability, capabilitiesOptions[homeyCapability as never]);
    } else {
      await Voltmeter.unregisterCapability(homeyDevice, 'measure_voltage', this.id);
    }

    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    await Voltmeter.unregisterCapability(homeyDevice, 'measure_voltage', id);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<VoltmeterStatus>): Promise<void> {
    if (status.voltage !== undefined) {
      await this.setCapability(homeyDevice, 'measure_voltage', status.voltage);
    }

    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: VoltmeterConfig): Promise<void> {
    const newSettings: RecursivePartial<VoltmeterHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`Voltmeter:${settingKey}`] = config[settingKey] as never;
      }
    }

    if (config['range'] !== undefined) {
      newSettings['Voltmeter:range'] = config['range'].toFixed() as '0' | '1';
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<VoltmeterHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<VoltmeterConfig, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      const homeySettingKey = `Voltmeter:${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[settingKey] = newSettings[homeySettingKey] as never;
      }
    }

    if (changedKeys.includes('Voltmeter:range')) {
      changedConfig['range'] = parseInt(newSettings['Voltmeter:range']) as 0 | 1;
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }
}
