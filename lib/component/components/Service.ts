import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import GetConfig from './Service/GetConfig.js';
import GetStatus from './Service/GetStatus.js';
import SetConfig from './Service/SetConfig.js';
import Set, { type ServiceSetParams } from './Service/Set.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import { diffArrays, type RecursivePartial } from '../../util.js';
import { safeAddCapability, safeSetCapabilityValue, safeTriggerDeviceCard } from '../../safeFunctions.js';
import capabilitiesOptions from './Service/capabilitiesOptions.json' with { type: 'json' };

export type ServiceConfig = {
  /** Identifier of the Service component instance */
  id: number;
} & (ValveServiceConfig | NeoValveServiceConfig | PortableEvChargerConfig);

type ValveServiceConfig = {
  /**
   * Defines the behavior of the valve when the power gets lost:
   */
  on_power_loss: 'close' | 'open' | 'none' | 'set_position';
  /**
   * Defines the behavior of the valve when the power is restored:
   */
  on_power_restore: 'close' | 'open' | 'none' | 'set_position' | 'restore_last';
  /**
   * Applies when `on_power_restore` is set to `set_position`, defining the valve position after power is restored.
   */
  power_restored_pos: number;
  /**
   * Applies when `on_power_loss` is set to `set_position`, defining the valve position when power is lost.
   */
  power_loss_pos: number;
  /** Name of the service instance */
  name: string | null;
} & Record<string, undefined>;

type NeoValveServiceConfig = {
  // documented, but does not appear on the actual device
  // on_power_restore: 'close' | 'open' | 'none';
  /** Temperature unit for display and alarms. */
  temp_unit: 'C' | 'F';
  /** Pressure unit for display and alarms. */
  pressure_unit: 'kPa' | 'PSI' | 'bar';
  /** Volume unit for consumption tracking. */
  volume_unit: 'm3' | 'gal' | 'lit';
  /** Temperature alarm thresholds as [min, max] values in the configured temperature unit. */
  alarm_temp_range: [number, number];
  /** Action to take when the temperature alarm is triggered. */
  alarm_temp_action: 'open' | 'close';
  /** Pressure alarm thresholds as [min, max] values in the configured pressure unit. */
  alarm_pressure_range: [number, number];
  /** Action to take when the pressure alarm is triggered. */
  alarm_pressure_action: 'open' | 'close';
  /** Flow rate alarm thresholds as [min, max] values in litres per minute. */
  alarm_flow_rate_range: [number, number];
  /** Action to take when the flow rate alarm is triggered. */
  alarm_flow_rate_action: 'open' | 'close';
  name: null;
} & Record<string, undefined>;

type PortableEvChargerConfig = {
  /**
   * Configures load balancing with an external Shelly EM/EM1 device.
   *
   * When enabled, the charger adjusts its current limit to keep total site current under the configured threshold.
   */
  auto_balance: {
    /**
     * Enables auto balance.
     *
     * When enabled and `em_ip` is valid, balancing starts automatically with charging.
     */
    enable: boolean;
    /**
     * IP address of the Shelly EM/EM1 used for load balancing.
     *
     * Must be a valid IPv4 when `enable` is true; may be `null` when disabled.
     */
    em_ip: string | null;
    /**
     * Maximum allowed total current (EV + household), in amperes.
     */
    max_current: number;
    /**
     * If true, the EV’s measured current is subtracted from the EM reading to avoid double-counting.
     */
    exclude_self_current: boolean;
  };
  /**
   * When enabled, charging starts automatically as soon as the connector is plugged into the vehicle.
   */
  auto_charge: boolean;
  /**
   * Session energy cap (kWh) (0–1000).
   *
   * When reached, charging stops and a status flag is raised.
   */
  global_charge_limit: number | null;
  /**
   * Session duration cap (minutes) (0–1440).
   *
   * When reached, charging stops and a status flag is raised.
   */
  global_time_limit: number | null;
  name: null;
} & Record<string, undefined>;

export type ServiceStatus = {
  /** Unique MD5 hash of the current service file. */
  etag: string;
  /** Current state of the service. */
  state: 'running' | string;
  /** System resource usage statistics. */
  stats: {
    /** Number of variables currently in use by the service. */
    mem: number;
    /** Maximum number of variables in use by the service since its start. */
    mem_peak: number;
  };
  /**
   * Active service errors.
   *
   * Only present if there are active errors.
   */
  errors?: string[];
  /**
   * Active service flags.
   *
   * Only present if there are active flags.
   */
  flags?: ('charge_time_limit_reached' | 'charge_limit_reached' | string)[];
};

export type ServiceHomeySettings = {
  'Service:on_power_loss': 'close' | 'open' | 'none' | 'set_position';
  'Service:on_power_restore': 'close' | 'open' | 'none' | 'set_position' | 'restore_last';
  'Service:power_restored_pos': number;
  'Service:power_loss_pos': number;
  'Service:auto_balance:enable': boolean;
  'Service:auto_balance:em_ip': string;
  'Service:auto_balance:max_current': number;
  'Service:auto_balance:exclude_self_current': boolean;
  'Service:auto_charge': boolean;
  'Service:global_charge_limit': number;
  'Service:global_charge_limit:enabled': boolean;
  'Service:global_time_limit': number;
  'Service:global_time_limit:enabled': boolean;
};

const simpleSettings = [
  'on_power_loss',
  'on_power_restore',
  'power_restored_pos',
  'power_loss_pos',
  'auto_charge',
] as const satisfies (keyof Required<ServiceConfig>)[];

const autoBalanceSettings = [
  'enable',
  'max_current',
  'exclude_self_current',
] as const satisfies (keyof PortableEvChargerConfig['auto_balance'])[];

/**
 * The Service component represents a virtual service.
 */
export default class Service extends ComponentWithId<'Service', ServiceStatus, ServiceConfig, ServiceHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'Service';
  public static readonly uiName = 'Service';
  protected static readonly key = 'service';
  private oldFlags: string[] = [];

  public async Set(channel: RpcChannel, params: ServiceSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Service'>[],
  ): Promise<void> {
    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');
    await safeAddCapability(homeyDevice, 'alarm_generic.flags');
    await homeyDevice
      .setCapabilityOptions('alarm_generic.flags', capabilitiesOptions['alarm_generic.flags'])
      .catch(err => homeyDevice.error('Error while setting alarm_generic.flags capability options:', err));
    await safeAddCapability(homeyDevice, 'shelly_flags');
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    _homeyDevice: ShellyLocalDevice,
    _id: number,
  ): Promise<void> {}

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<ServiceStatus>): Promise<void> {
    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);

    const newFlags = status.flags ?? [];
    const { added, removed } = diffArrays(this.oldFlags, newFlags);

    for (const addedFlag of added) {
      const tokens = {
        component: this.getComponentKey(),
        flag: addedFlag,
      };
      await safeTriggerDeviceCard(homeyDevice, 'flag_added', tokens);
    }

    for (const removedFlag of removed) {
      const tokens = {
        component: this.getComponentKey(),
        flag: removedFlag,
      };
      await safeTriggerDeviceCard(homeyDevice, 'flag_removed', tokens);
    }

    this.oldFlags = newFlags;
    await safeSetCapabilityValue(homeyDevice, 'alarm_generic.flags', newFlags.length > 0);
    await safeSetCapabilityValue(homeyDevice, 'shelly_flags', newFlags.join(', '));
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: ServiceConfig): Promise<void> {
    const newSettings: RecursivePartial<ServiceHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of simpleSettings) {
      if (config[settingKey] !== undefined) {
        newSettings[`Service:${settingKey}`] = config[settingKey] as never;
      }
    }

    if (config.auto_balance !== undefined) {
      for (const settingKey of autoBalanceSettings) {
        newSettings[`Service:auto_balance:${settingKey}`] = config.auto_balance[settingKey] as never;
      }
    }

    if (config.auto_balance?.em_ip !== undefined) {
      newSettings['Service:auto_balance:em_ip'] = config.auto_balance.em_ip ?? '';
    }

    if (config.global_charge_limit !== undefined) {
      if (config.global_charge_limit === null) {
        newSettings['Service:global_charge_limit:enabled'] = false;
      } else {
        newSettings['Service:global_charge_limit:enabled'] = true;
        newSettings['Service:global_charge_limit'] = config.global_charge_limit;
      }
    }

    if (config.global_time_limit !== undefined) {
      if (config.global_time_limit === null) {
        newSettings['Service:global_time_limit:enabled'] = false;
      } else {
        newSettings['Service:global_time_limit:enabled'] = true;
        newSettings['Service:global_time_limit'] = config.global_time_limit;
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<ServiceHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<ServiceConfig, AllowedPrimitives> = {};

    for (const settingKey of simpleSettings) {
      if (changedKeys.includes(`Service:${settingKey}`)) {
        changedConfig[settingKey] = newSettings[
          `Service:${settingKey}`
        ] as unknown as ServiceConfig[keyof ServiceConfig];
      }
    }

    for (const settingKey of autoBalanceSettings) {
      if (changedKeys.includes(`Service:auto_balance:${settingKey}`)) {
        changedConfig.auto_balance = changedConfig.auto_balance ?? {};
        changedConfig.auto_balance[settingKey] = newSettings[`Service:auto_balance:${settingKey}`] as never;
      }
    }

    if (changedKeys.includes('Service:auto_balance:em_ip')) {
      const emIp = newSettings['Service:auto_balance:em_ip'];
      changedConfig.auto_balance = changedConfig.auto_balance ?? {};
      changedConfig.auto_balance.em_ip = emIp === '' ? null : emIp;
    }

    if (
      changedKeys.includes('Service:global_charge_limit') ||
      changedKeys.includes('Service:global_charge_limit:enabled')
    ) {
      const enabled = newSettings['Service:global_charge_limit:enabled'];
      const limit = newSettings['Service:global_charge_limit'];
      changedConfig.global_charge_limit = enabled ? limit : null;
    }

    if (
      changedKeys.includes('Service:global_time_limit') ||
      changedKeys.includes('Service:global_time_limit:enabled')
    ) {
      const enabled = newSettings['Service:global_time_limit:enabled'];
      const limit = newSettings['Service:global_time_limit'];
      changedConfig.global_time_limit = enabled ? limit : null;
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }
}
