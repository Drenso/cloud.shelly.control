import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { ComponentWithId } from '../Component.js';
import capabilitiesOptions from './EM/capabilitiesOptions.json' with { type: 'json' };
import GetConfig from './EM/GetConfig.js';
import GetStatus from './EM/GetStatus.js';
import SetConfig from './EM/SetConfig.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import { safeAddCapability } from '../../safeFunctions.js';

export type EMConfig = {
  /** Id of the EM component instance */
  id: number;
  /** Name of the EM instance */
  name: string | null;
  /** Reverse CT measurement direction of active power and energy, per phase. setting the reverse option requires restart */
  reverse: {
    a?: boolean;
    b?: boolean;
    c?: boolean;
  };
  /**
   * Select the type of Shelly current transformer attached to the device.
   * If ct_type is not set, an error ct_type_not_set is present in component status.
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

export type EMStatus = {
  /** Id of the EM component instance */
  id: number;
  /** Phase A current measurement value, [A] */
  a_current: number | null;
  /** Phase A voltage measurement value, [V] */
  a_voltage: number | null;
  /** Phase A active power measurement value, [W] */
  a_act_power: number | null;
  /** Phase A apparent power measurement value, [VA] (if applicable) */
  a_aprt_power?: number | null;
  /** Phase A power factor measurement value (if applicable) */
  a_pf?: number | null;
  /** Phase A network frequency measurement value (if applicable) */
  a_freq?: number | null;
  /** Phase B current measurement value, [A] */
  b_current: number | null;
  /** Phase B voltage measurement value, [V] */
  b_voltage: number | null;
  /** Phase B active power measurement value, [W] */
  b_act_power: number | null;
  /** Phase B apparent power measurement value, [VA] (if applicable) */
  b_aprt_power?: number | null;
  /** Phase B power factor measurement value (if applicable) */
  b_pf?: number | null;
  /** Phase B network frequency measurement value (if applicable) */
  b_freq?: number | null;
  /** Phase C current measurement value, [A] */
  c_current: number | null;
  /** Phase C voltage measurement value, [V] */
  c_voltage: number | null;
  /** Phase C active power measurement value, [W] */
  c_act_power: number | null;
  /** Phase C apparent power measurement value, [VA] (if applicable) */
  c_aprt_power?: number | null;
  /** Phase C power factor measurement value (if applicable) */
  c_pf?: number | null;
  /** Phase C network frequency measurement value (if applicable) */
  c_freq?: number | null;
  /** Neutral current measurement value, [A] (if applicable) */
  n_current?: number | null;
  /** Total current measurement value, [A] */
  total_current: number | null;
  /** Total active power measurement value, [W] */
  total_act_power: number | null;
  /** Total apparent power measurement value, [VA] */
  total_aprt_power: number | null;
  /** List of phases which are calibrated by the user */
  user_calibrated_phase?: string[];
  /** EM component error conditions. Present in status only if not empty. */
  errors?: string[];
  /** Communicates present conditions, shown if at least one flag is set. */
  flags?: string[];
};

export type EMHomeySettings = Record<never, never>;

/**
 * EM component handles the data collection and processing from triphase energy meter devices like the Shelly Pro 3EM.
 */
export default class EM extends ComponentWithId<'EM', EMStatus, EMConfig, EMHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'EM';
  public static readonly uiName = 'Electrical Measurement';
  public static readonly key = 'em';

  private static readonly totalFields = [
    ['total_current', 'measure_current'],
    ['total_act_power', 'measure_power'],
    ['total_aprt_power', 'shelly_power_apparent'],
  ] as const;

  private static readonly phaseFields = [
    ['a', 'a_current', 'a_voltage', 'a_act_power', 'a_aprt_power', 'a_pf', 'a_freq'],
    ['b', 'b_current', 'b_voltage', 'b_act_power', 'b_aprt_power', 'b_pf', 'b_freq'],
    ['c', 'c_current', 'c_voltage', 'c_act_power', 'c_aprt_power', 'c_pf', 'c_freq'],
  ] as const;

  public async registerHomeyDevice(homeyDevice: ShellyLocalDevice, _methods: ComponentMethod<'EM'>[]): Promise<void> {
    for (const [statusKey, homeyCapability] of EM.totalFields) {
      if (this.status[statusKey] !== undefined) {
        await this.registerCapability(homeyDevice, homeyCapability, capabilitiesOptions[homeyCapability as never]);
      }
    }

    for (const [phase, currentKey, voltageKey, powerKey, aprtPowerKey, pfKey, freqKey] of EM.phaseFields) {
      for (const [statusKey, homeyCapability] of [
        [currentKey, `measure_current.${phase}`],
        [voltageKey, `measure_voltage.${phase}`],
        [powerKey, `measure_power.${phase}`],
        [aprtPowerKey, `shelly_power_apparent.${phase}`],
        [pfKey, `shelly_power_factor.${phase}`],
        [freqKey, `measure_frequency.${phase}`],
      ] as const) {
        if (this.status[statusKey] !== undefined) {
          await this.registerCapability(homeyDevice, homeyCapability, capabilitiesOptions[homeyCapability as never]);
        }
      }
    }

    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: EMStatus): Promise<void> {
    for (const [statusKey, homeyCapability] of EM.totalFields) {
      if (status[statusKey] !== undefined) {
        await this.setCapability(homeyDevice, homeyCapability, status[statusKey]);
      }
    }

    for (const [phase, currentKey, voltageKey, powerKey, aprtPowerKey, pfKey, freqKey] of EM.phaseFields) {
      for (const [statusKey, homeyCapability] of [
        [currentKey, `measure_current.${phase}`],
        [voltageKey, `measure_voltage.${phase}`],
        [powerKey, `measure_power.${phase}`],
        [aprtPowerKey, `shelly_power_apparent.${phase}`],
        [pfKey, `shelly_power_factor.${phase}`],
        [freqKey, `measure_frequency.${phase}`],
      ] as const) {
        if (status[statusKey] !== undefined) {
          await this.setCapability(homeyDevice, homeyCapability, status[statusKey]);
        }
      }
    }

    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: EMConfig): Promise<void> {
    return;
  }
}
