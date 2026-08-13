import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import type { ResponseSuccessFrame } from '../../rpc/Rpc.js';
import { safeAddCapability } from '../../safeFunctions.js';
import type { RecursivePartial } from '../../util.js';
import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import capabilitiesOptions from './PM1/capabilitiesOptions.json' with { type: 'json' };
import GetConfig from './PM1/GetConfig.js';
import GetStatus from './PM1/GetStatus.js';
import ResetCounters, { type PM1ResetCountersParams, type PM1ResetCountersResponse } from './PM1/ResetCounters.js';
import SetConfig from './PM1/SetConfig.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

export type PM1Config = {
  /** Id of the PM1 component instance */
  id: number;
  /** Name of the PM1 instance */
  name: string | null;
  /** Reverse measurement direction of active power and energy for the PM1 component. setting the reverse option requires restart */
  reverse: boolean;
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

export type PM1Status = {
  /** Id of the PM1 component instance */
  id: number;
  /** Last measured voltage in Volts */
  voltage: number;
  /** Last measured current in Amperes */
  current: number;
  /** Last measured instantaneous active power (in Watts) delivered to the attached load */
  apower: number;
  /** Last measured instantaneous apparent power (in Volt-Amperes) delivered to the attached load (shown if applicable) */
  aprtpower?: number;
  /** Last measured power factor (shown if applicable) */
  pf?: number;
  /** Last measured network frequency (shown if applicable) */
  freq?: number;
  /** Information about the active energy counter */
  aenergy: {
    /** Total energy consumed in Watt-hours */
    total: number;
    /**
     * Energy consumption in Milliwatt-hours for the last three complete minutes.
     * The 0-th element indicates the counts accumulated during the minute preceding minute_ts.
     * Present only if the device clock is synced.
     */
    by_minute?: number[];
    /** Unix timestamp marking the start of the current minute (in UTC). */
    minute_ts?: number;
  };
  /** Information about the returned active energy counter */
  ret_aenergy: {
    /** Total returned energy consumed in Watt-hours */
    total: number;
    /**
     * Returned energy consumption by minute (in Milliwatt-hours) for the last three minutes
     * (the lower the index of the element in the array, the closer to the current moment the minute)
     */
    by_minute?: number[];
    /** Unix timestamp marking the start of the current minute (in UTC). */
    minute_ts?: number;
  };
  /** Error conditions occurred. May contain power_meter_failure, out_of_range:voltage, out_of_range:current, out_of_range:aprtpower, out_of_range:apower(shown if at least one error is present) */
  errors?: string[];
  /** Communicates present conditions, shown if at least one flag is set. May contain: undervoltage, overvoltage, undercurrent, overcurrent, underpower, overpower */
  flags?: string[];
};

export type PM1HomeySettings = {
  'PM1:reverse': boolean;
};

/**
 * The PM1 component stores data from an energy meter.
 */
export default class PM1 extends ComponentWithId<'PM1', PM1Status, PM1Config, PM1HomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'PM1';
  public static readonly uiName = 'Electrical Measurement';
  protected static readonly key = 'pm1';

  public async ResetCounters(
    channel: RpcChannel,
    params?: PM1ResetCountersParams,
  ): Promise<ResponseSuccessFrame<PM1ResetCountersResponse>> {
    return ResetCounters(channel, this.id, params);
  }

  public async registerHomeyDevice(homeyDevice: ShellyLocalDevice, methods: ComponentMethod<'PM1'>[]): Promise<void> {
    // Simple capabilities
    for (const [statusKey, homeyCapability] of [
      ['apower', 'measure_power'],
      ['voltage', 'measure_voltage'],
      ['current', 'measure_current'],
      ['freq', 'measure_frequency'],
      ['pf', 'shelly_power_factor'],
      ['aenergy', 'meter_power.total'],
      ['aenergy', 'meter_power.imported'],
      ['ret_aenergy', 'meter_power.exported'],
    ] as const) {
      if (this.status[statusKey] !== undefined) {
        const capabilityOptions = capabilitiesOptions[homeyCapability as never];
        await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions);
      } else {
        await PM1.unregisterCapability(homeyDevice, homeyCapability, this.id);
      }
    }

    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');

    if (this.status['aenergy'] !== undefined || this.status['ret_aenergy'] !== undefined) {
      let energy = homeyDevice.getEnergy();
      energy = {
        ...energy,
        cumulative: false,
        meterPowerImportedCapability: 'meter_power.imported',
        meterPowerExportedCapability: 'meter_power.exported',
      };
      await homeyDevice.setEnergy(energy).catch(homeyDevice.error);
    }

    if (methods.includes('ResetCounters')) {
      const maintenanceActionId = 'button.reset_energy_counters';
      await this.registerCapability(
        homeyDevice,
        maintenanceActionId,
        capabilitiesOptions[maintenanceActionId as never],
        async () => {
          await this.ResetCounters(this.device.getChannel());
        },
      );
    } else {
      await PM1.unregisterCapability(homeyDevice, 'button.reset_energy_counters', this.id);
    }
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    for (const capability of [
      'measure_power',
      'measure_voltage',
      'measure_current',
      'measure_frequency',
      'shelly_power_factor',
      'meter_power.total',
      'meter_power.imported',
      'meter_power.exported',
      'button.reset_energy_counters',
    ]) {
      await PM1.unregisterCapability(homeyDevice, capability, id);
    }
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<PM1Status>): Promise<void> {
    // Simple capabilities
    for (const [statusKey, homeyCapability] of [
      ['apower', 'measure_power'],
      ['voltage', 'measure_voltage'],
      ['current', 'measure_current'],
      ['pf', 'shelly_power_factor'],
      ['freq', 'measure_frequency'],
    ] as const) {
      if (status[statusKey] !== undefined) {
        await this.setCapability(homeyDevice, homeyCapability, status[statusKey]);
      }
    }

    if (status.aenergy !== undefined || status.ret_aenergy !== undefined) {
      const absoluteEnergy = status.aenergy?.total ?? this.status.aenergy?.total ?? 0;
      const exportedEnergy = status.ret_aenergy?.total ?? this.status.ret_aenergy?.total ?? 0;
      const importedEnergy = absoluteEnergy - exportedEnergy;
      await this.setCapability(homeyDevice, 'meter_power.imported', importedEnergy / 1000);
      await this.setCapability(homeyDevice, 'meter_power.exported', exportedEnergy / 1000);
      await this.setCapability(homeyDevice, 'meter_power.total', absoluteEnergy / 1000);
    }

    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: PM1Config): Promise<void> {
    const newSettings: Partial<PM1HomeySettings> = {
      'PM1:reverse': config.reverse,
    };

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<PM1HomeySettings>,
  ): Promise<boolean> {
    const changedConfigs: RecursivePartial<PM1Config, AllowedPrimitives> = {};

    if (changedKeys.includes('PM1:reverse')) {
      changedConfigs.reverse = newSettings['PM1:reverse'];
    }

    if (Object.keys(changedConfigs).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfigs });
    return result.result.restart_required;
  }
}
