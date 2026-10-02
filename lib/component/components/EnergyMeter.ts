import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import SetConfig from './EnergyMeter/SetConfig.js';
import GetConfig from './EnergyMeter/GetConfig.js';
import GetStatus from './EnergyMeter/GetStatus.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import PhaseToPhaseCalib, {
  type EnergyMeterPhaseCalibrationParameters,
  type EnergyMeterPhaseCalibrationResponse,
} from './EnergyMeter/PhaseToPhaseCalib.js';
import type { ResponseSuccessFrame } from '../../rpc/Rpc.js';
import PhaseToPhaseCalibReset, {
  type EnergyMeterResetPhaseCalibrationParameters,
  type EnergyMeterResetPhaseCalibrationResponse,
} from './EnergyMeter/PhaseToPhaseCalibReset.js';
import GetCTTypes, { type EnergyMeterGetCTTypesResponse } from './EnergyMeter/GetCTTypes.js';
import { diffArrays, fillTranslationTagsRecursively, type RecursivePartial, translate } from '../../util.js';
import capabilitiesOptions from './EnergyMeter/capabilitiesOptions.json' with { type: 'json' };
import type { JsonObject } from '../../../types/json.js';
import { safeTriggerDeviceCard } from '../../safeFunctions.js';

export type EnergyMeterConfig = {
  /** Identifier of the component instance */
  id: number;
  /** Name of the component instance */
  name: string | null;
  /** Select the electrical quantity that drives the LED */
  blink_mode_selector: 'active_energy' | 'apparent_energy';
  /** Select witch phase controls the LED */
  phase_selector: 'a' | 'b' | 'c' | 'all';
  /**
   * Set this to show `phase_sequence` error in GetStatus if three-phase power system is used
   * and the wires are not connected correctly to the device.
   */
  monitor_phase_sequence: boolean;
  /**
   * Reverse CT measurement direction
   *
   * setting the reverse option requires restart
   */
  reverse: {
    /**
     * When set to true reverse CT measurement direction of active power and energy for phase A.
     *
     * shown if true
     */
    a?: boolean;
    /**
     * When set to true reverse CT measurement direction of active power and energy for phase B.
     *
     * shown if true
     */
    b?: boolean;
    /**
     * When set to true reverse CT measurement direction of active power and energy for phase C.
     *
     * shown if true
     */
    c?: boolean;
  };
  /**
   * Settings for the alarm thresholds
   *
   * setting the alarms option to 'null' disables all alarms
   */
  alarms: null | {
    /** Alarm thresholds for phase A */
    a: null | AlarmThresholds;
    /** Alarm thresholds for phase B */
    b: null | AlarmThresholds;
    /** Alarm thresholds for phase C */
    c: null | AlarmThresholds;
  };
  /**
   * The type of Shelly current transformer attached to the device.
   *
   * If `ct_type` is not set, an error `ct_type_not_set` is present in component status.
   *
   * Supported `ct_type`s can be obtained with `EM.GetCTTypes`.
   */
  ct_type: string;
};

type AlarmThresholds = {
  /** ['under','over'] thresholds */
  voltage: null | [number | null, number | null];
  /** ['under','over'] thresholds */
  current: null | [number | null, number | null];
  /** ['under','over'] thresholds */
  power: null | [number | null, number | null];
};

export type EnergyMeterStatus = {
  /** Identifier of the component instance */
  id: number;
  /**
   * Phase A current measurement value
   *
   * Unit: A
   */
  a_current: number | null;
  /**
   * Phase A voltage measurement value
   *
   * Unit: V
   */
  a_voltage: number | null;
  /**
   * Phase A active power measurement value
   *
   * Unit: W
   */
  a_act_power: number | null;
  /**
   * Phase A apparent power measurement value
   *
   * Unit: VA
   */
  a_aprt_power: number | null;
  /** Phase A power factor measurement value */
  a_pf: number | null;
  /** Phase A network frequency measurement value */
  a_freq: number | null;
  /**
   * Phase A error conditions occurred.
   *
   * (shown if at least one error is present)
   */
  a_errors?: (
    | 'out_of_range:active_power'
    | 'out_of_range:apparent_power'
    | 'out_of_range:voltage'
    | 'out_of_range:current'
  )[];
  /**
   * Phase A flags.
   *
   * (shown if at least one flag is set)
   */
  a_flags?: ('undervoltage' | 'overvoltage' | 'undercurrent' | 'overcurrent' | 'underpower' | 'overpower')[];
  /**
   * Phase B current measurement value
   *
   * Unit: A
   */
  b_current: number | null;
  /**
   * Phase B voltage measurement value
   *
   * Unit: V
   */
  b_voltage: number | null;
  /**
   * Phase B active power measurement value
   *
   * Unit: W
   */
  b_act_power: number | null;
  /**
   * Phase B apparent power measurement value
   *
   * Unit: VA
   */
  b_aprt_power: number | null;
  /** Phase B power factor measurement value */
  b_pf: number | null;
  /** Phase B network frequency measurement value */
  b_freq: number | null;
  /**
   * Phase B error conditions occurred.
   *
   * (shown if at least one error is present)
   */
  b_errors?: (
    | 'out_of_range:active_power'
    | 'out_of_range:apparent_power'
    | 'out_of_range:voltage'
    | 'out_of_range:current'
  )[];
  /**
   * Phase B flags.
   *
   * (shown if at least one flag is set)
   */
  b_flags?: ('undervoltage' | 'overvoltage' | 'undercurrent' | 'overcurrent' | 'underpower' | 'overpower')[];
  /**
   * Phase C current measurement value
   *
   * Unit: A
   */
  c_current: number | null;
  /**
   * Phase C voltage measurement value
   *
   * Unit: V
   */
  c_voltage: number | null;
  /**
   * Phase C active power measurement value
   *
   * Unit: W
   */
  c_act_power: number | null;
  /**
   * Phase C apparent power measurement value
   *
   * Unit: VA
   */
  c_aprt_power: number | null;
  /** Phase C power factor measurement value */
  c_pf: number | null;
  /** Phase C network frequency measurement value */
  c_freq: number | null;
  /**
   * Phase C error conditions occurred.
   *
   * (shown if at least one error is present)
   */
  c_errors?: (
    | 'out_of_range:active_power'
    | 'out_of_range:apparent_power'
    | 'out_of_range:voltage'
    | 'out_of_range:current'
  )[];
  /**
   * Phase C flags.
   *
   * (shown if at least one flag is set)
   */
  c_flags?: ('undervoltage' | 'overvoltage' | 'undercurrent' | 'overcurrent' | 'underpower' | 'overpower')[];
  /**
   * Neutral current measurement value
   *
   * Unit: A
   *
   * (if supported)
   */
  n_current?: number | null;
  /**
   * Neutral error conditions occurred.
   *
   * (shown if error is present)
   */
  n_errors?: 'out_of_range:current'[];
  /**
   * Sum of the current on all phases
   * (excluding neutral readings if available)
   */
  total_current: number | null;
  /** Sum of the active power on all phases */
  total_act_power: number | null;
  /** Sum of the apparent power on all phases */
  total_aprt_power: number | null;
  /** Indicates which phase was user calibrated */
  user_calibrated_phase: ('a' | 'b' | 'c')[];
  /**
   * EM component error conditions.
   *
   * `phase_sequence` is an error indicating if the sequence of zero-crossing events is Phase A followed by Phase C followed by Phase B.
   * The regular succession of these zero-crossing events is Phase A followed by Phase B followed by Phase C.
   *
   * Present in status only if not empty.
   */
  errors?: ('power_meter_failure' | 'phase_sequence' | 'ct_type_not_set')[];
};

export type EnergyMeterHomeySettings = {
  'EM:ct_type': string;
  'EM:blink_mode_selector': 'active_energy' | 'apparent_energy';
  'EM:phase_selector': 'a' | 'b' | 'c' | 'all';
  'EM:monitor_phase_sequence': boolean;
  'EM:reverse.a': boolean;
  'EM:reverse.b': boolean;
  'EM:reverse.c': boolean;
  'EM:alarms.a.voltage.under.enabled': boolean;
  'EM:alarms.a.voltage.under': number;
  'EM:alarms.a.voltage.over.enabled': boolean;
  'EM:alarms.a.voltage.over': number;
  'EM:alarms.b.voltage.under.enabled': boolean;
  'EM:alarms.b.voltage.under': number;
  'EM:alarms.b.voltage.over.enabled': boolean;
  'EM:alarms.b.voltage.over': number;
  'EM:alarms.c.voltage.under.enabled': boolean;
  'EM:alarms.c.voltage.under': number;
  'EM:alarms.c.voltage.over.enabled': boolean;
  'EM:alarms.c.voltage.over': number;
  'EM:alarms.a.current.under.enabled': boolean;
  'EM:alarms.a.current.under': number;
  'EM:alarms.a.current.over.enabled': boolean;
  'EM:alarms.a.current.over': number;
  'EM:alarms.b.current.under.enabled': boolean;
  'EM:alarms.b.current.under': number;
  'EM:alarms.b.current.over.enabled': boolean;
  'EM:alarms.b.current.over': number;
  'EM:alarms.c.current.under.enabled': boolean;
  'EM:alarms.c.current.under': number;
  'EM:alarms.c.current.over.enabled': boolean;
  'EM:alarms.c.current.over': number;
  'EM:alarms.a.power.under.enabled': boolean;
  'EM:alarms.a.power.under': number;
  'EM:alarms.a.power.over.enabled': boolean;
  'EM:alarms.a.power.over': number;
  'EM:alarms.b.power.under.enabled': boolean;
  'EM:alarms.b.power.under': number;
  'EM:alarms.b.power.over.enabled': boolean;
  'EM:alarms.b.power.over': number;
  'EM:alarms.c.power.under.enabled': boolean;
  'EM:alarms.c.power.under': number;
  'EM:alarms.c.power.over.enabled': boolean;
  'EM:alarms.c.power.over': number;
};

/**
 * Mapping from status postfix (a_current -> current) to base Homey capability (measure_current -> measure_current.phase_a)
 */
const SIMPLE_CAPABILITY_MAPPING = {
  current: 'measure_current',
  voltage: 'measure_voltage',
  act_power: 'measure_power',
  aprt_power: 'measure_power.apparent',
  pf: 'shelly_power_factor',
  freq: 'measure_frequency',
} as const;

export default class EnergyMeter extends ComponentWithId<
  'EM',
  EnergyMeterStatus,
  EnergyMeterConfig,
  EnergyMeterHomeySettings
> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'EM';
  public static readonly uiName = 'Energy Meter';
  public static readonly key = 'em';

  private oldFlags: string[] = [];

  public async PhaseToPhaseCalib(
    channel: RpcChannel,
    params: EnergyMeterPhaseCalibrationParameters,
  ): Promise<ResponseSuccessFrame<EnergyMeterPhaseCalibrationResponse>> {
    return PhaseToPhaseCalib(channel, this.id, params);
  }

  public async PhaseToPhaseCalibReset(
    channel: RpcChannel,
    params: EnergyMeterResetPhaseCalibrationParameters,
  ): Promise<ResponseSuccessFrame<EnergyMeterResetPhaseCalibrationResponse>> {
    return PhaseToPhaseCalibReset(channel, this.id, params);
  }

  public async GetCTTypes(channel: RpcChannel): Promise<ResponseSuccessFrame<EnergyMeterGetCTTypesResponse>> {
    return GetCTTypes(channel, this.id);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'EM'>[],
  ): Promise<string[]> {
    const componentCapabilities: string[] = [];

    const status = this.status as EnergyMeterStatus & Record<string, undefined>;

    const totalTranslation = translate(homeyDevice.homey.__('locale'), capabilitiesOptions['total']);

    for (const statusPostfix in SIMPLE_CAPABILITY_MAPPING) {
      const homeyCapability = SIMPLE_CAPABILITY_MAPPING[statusPostfix as keyof typeof SIMPLE_CAPABILITY_MAPPING];
      const statusKey = `total_${statusPostfix}`;

      if (status[statusKey] !== undefined) {
        componentCapabilities.push(
          await this.registerPhaseCapability(
            homeyDevice,
            homeyCapability,
            capabilitiesOptions[homeyCapability],
            totalTranslation,
          ),
        );
      }
    }

    for (const phase of ['a', 'b', 'c', 'n'] as const) {
      const phaseTranslation = translate(homeyDevice.homey.__('locale'), capabilitiesOptions[`phase_${phase}`]);

      for (const statusPostfix in SIMPLE_CAPABILITY_MAPPING) {
        const baseHomeyCapability = SIMPLE_CAPABILITY_MAPPING[statusPostfix as keyof typeof SIMPLE_CAPABILITY_MAPPING];
        const statusKey = `${phase}_${statusPostfix}`;
        const homeyCapability = `${baseHomeyCapability}.phase_${phase}`;

        if (status[statusKey] !== undefined) {
          componentCapabilities.push(
            await this.registerPhaseCapability(
              homeyDevice,
              homeyCapability,
              capabilitiesOptions[baseHomeyCapability],
              phaseTranslation,
            ),
          );
        }
      }
    }

    componentCapabilities.push('alarm_generic', 'shelly_errors', 'alarm_generic.flags', 'shelly_flags');
    await homeyDevice
      .setCapabilityOptions('alarm_generic.flags', capabilitiesOptions['alarm_generic.flags'])
      .catch(err => homeyDevice.error('Error while setting alarm_generic.flags capability options:', err));

    const energyConfiguration = homeyDevice.getEnergy() ?? {};
    energyConfiguration.cumulative = true;
    await homeyDevice
      .setEnergy(energyConfiguration)
      .catch(err => homeyDevice.error('Error while setting energy configuration:', err));

    return componentCapabilities;
  }

  private async registerPhaseCapability(
    homeyDevice: ShellyLocalDevice,
    homeyCapability: string,
    rawCapabilityOptions: JsonObject,
    phaseTranslation: string,
  ): Promise<string> {
    const singleComponent = homeyDevice.componentCounts.get(this.namespace) === 1;
    const capabilityId = singleComponent ? homeyCapability : `${homeyCapability}.${this.id}`;

    const capabilityOptions = fillTranslationTagsRecursively(rawCapabilityOptions, {
      phase: phaseTranslation,
    }) as JsonObject;
    await homeyDevice.setCapabilityOptions(capabilityId, capabilityOptions);
    return capabilityId;
  }

  public async onStatusUpdate(
    homeyDevice: ShellyLocalDevice,
    status: Partial<EnergyMeterStatus> & Record<string, undefined>,
  ): Promise<void> {
    for (const statusPostfix in SIMPLE_CAPABILITY_MAPPING) {
      const homeyCapability = SIMPLE_CAPABILITY_MAPPING[statusPostfix as keyof typeof SIMPLE_CAPABILITY_MAPPING];
      const statusKey = `total_${statusPostfix}`;
      if (status[statusKey] !== undefined) {
        await this.setCapability(homeyDevice, homeyCapability, status[statusKey]);
      }
    }

    for (const phase of ['a', 'b', 'c', 'n'] as const) {
      for (const statusPostfix in SIMPLE_CAPABILITY_MAPPING) {
        const baseHomeyCapability = SIMPLE_CAPABILITY_MAPPING[statusPostfix as keyof typeof SIMPLE_CAPABILITY_MAPPING];
        const statusKey = `${phase}_${statusPostfix}`;
        const homeyCapability = `${baseHomeyCapability}.phase_${phase}`;
        if (status[statusKey] !== undefined) {
          await this.setCapability(homeyDevice, homeyCapability, status[statusKey]);
        }
      }
    }

    // Use this.status because partial status updates also have errors set to undefined
    const combinedErrors = [
      ...(this.status.errors ?? []),
      ...(this.status.a_errors?.map(error => `${error}:phase_a`) ?? []),
      ...(this.status.b_errors?.map(error => `${error}:phase_b`) ?? []),
      ...(this.status.c_errors?.map(error => `${error}:phase_c`) ?? []),
      ...(this.status.n_errors?.map(error => `${error}:neutral`) ?? []),
    ];

    await homeyDevice.updateErrors(this.getComponentKey(), combinedErrors);

    // Use this.status because partial status updates also have flags set to undefined
    const combinedFlags = [
      ...(this.status.a_flags?.map(flag => `${flag}:phase_a`) ?? []),
      ...(this.status.b_flags?.map(flag => `${flag}:phase_b`) ?? []),
      ...(this.status.c_flags?.map(flag => `${flag}:phase_c`) ?? []),
    ];

    const { added: addedFlags, removed: removedFlags } = diffArrays(this.oldFlags, combinedFlags);

    for (const addedFlag of addedFlags) {
      const tokens = {
        component: this.getComponentKey(),
        flag: addedFlag,
      };
      await safeTriggerDeviceCard(homeyDevice, 'flag_added', tokens);
    }

    for (const removedFlag of removedFlags) {
      const tokens = {
        component: this.getComponentKey(),
        flag: removedFlag,
      };
      await safeTriggerDeviceCard(homeyDevice, 'flag_removed', tokens);
    }

    this.oldFlags = combinedFlags;
    await this.setCapability(homeyDevice, 'alarm_generic.flags', combinedFlags.length > 0);
    await this.setCapability(homeyDevice, 'shelly_flags', combinedFlags.join(', '));
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: EnergyMeterConfig): Promise<void> {
    const newSettings: Partial<EnergyMeterHomeySettings> = {};

    newSettings['EM:ct_type'] = config.ct_type;
    newSettings['EM:blink_mode_selector'] = config.blink_mode_selector;
    newSettings['EM:phase_selector'] = config.phase_selector;
    newSettings['EM:monitor_phase_sequence'] = config.monitor_phase_sequence;

    for (const phase of ['a', 'b', 'c'] as const) {
      newSettings[`EM:reverse.${phase}`] = config.reverse[phase];

      const alarmConfig = config.alarms?.[phase] ?? null;
      for (const alarmKey of ['voltage', 'current', 'power'] as const) {
        const alarmValue = alarmConfig?.[alarmKey] ?? null;
        const min = alarmValue?.[0] ?? null;
        if (min === null) {
          newSettings[`EM:alarms.${phase}.${alarmKey}.under.enabled`] = false;
        } else {
          newSettings[`EM:alarms.${phase}.${alarmKey}.under.enabled`] = true;
          newSettings[`EM:alarms.${phase}.${alarmKey}.under`] = min;
        }

        const max = alarmValue?.[1] ?? null;
        if (max === null) {
          newSettings[`EM:alarms.${phase}.${alarmKey}.over.enabled`] = false;
        } else {
          newSettings[`EM:alarms.${phase}.${alarmKey}.over.enabled`] = true;
          newSettings[`EM:alarms.${phase}.${alarmKey}.over`] = max;
        }
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<EnergyMeterHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<EnergyMeterConfig, AllowedPrimitives> = {};

    for (const key of ['ct_type', 'blink_mode_selector', 'phase_selector', 'monitor_phase_sequence'] as const) {
      if (changedKeys.includes(`EM:${key}`)) {
        changedConfig[key] = newSettings[`EM:${key}`] as never;
      }
    }

    for (const phase of ['a', 'b', 'c'] as const) {
      if (changedKeys.includes(`EM:reverse.${phase}`)) {
        changedConfig.reverse ??= {};
        changedConfig.reverse[phase] = newSettings[`EM:reverse.${phase}`];
      }

      for (const alarmKey of ['voltage', 'current', 'power'] as const) {
        if (
          changedKeys.includes(`EM:alarms.${phase}.${alarmKey}.under.enabled`) ||
          changedKeys.includes(`EM:alarms.${phase}.${alarmKey}.under`) ||
          changedKeys.includes(`EM:alarms.${phase}.${alarmKey}.over.enabled`) ||
          changedKeys.includes(`EM:alarms.${phase}.${alarmKey}.over`)
        ) {
          const underEnabled = newSettings[`EM:alarms.${phase}.${alarmKey}.under.enabled`];
          const underLimit = newSettings[`EM:alarms.${phase}.${alarmKey}.under`];
          const overEnabled = newSettings[`EM:alarms.${phase}.${alarmKey}.over.enabled`];
          const overLimit = newSettings[`EM:alarms.${phase}.${alarmKey}.over`];

          changedConfig.alarms ??= {};
          changedConfig.alarms[phase] ??= {};
          changedConfig.alarms[phase][alarmKey] = [underEnabled ? underLimit : null, overEnabled ? overLimit : null];
        }
      }
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }
}
