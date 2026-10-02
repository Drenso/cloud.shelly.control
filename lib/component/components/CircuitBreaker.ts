import { ComponentWithId } from '../Component.js';
import SetConfig from './CircuitBreaker/SetConfig.js';
import GetConfig from './CircuitBreaker/GetConfig.js';
import GetStatus from './CircuitBreaker/GetStatus.js';
import Set from './CircuitBreaker/Set.js';
import GetLog, { type CircuitBreakerGetLogParams, type CircuitBreakerGetLogResponse } from './CircuitBreaker/GetLog.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import type { CircuitBreakerSetParams, CircuitBreakerSetResponse } from './CircuitBreaker/Set.js';
import type { ResponseSuccessFrame } from '../../rpc/Rpc.js';
import capabilitiesOptions from './CircuitBreaker/capabilitiesOptions.json' with { type: 'json' };
import { safeSetCapabilityValue, safeTriggerDeviceCard } from '../../safeFunctions.js';
import type { RpcError } from '../../rpc/RpcError.js';
import { translate } from '../../util.js';
import type ShellyApp from '../../../app.js';

export type CircuitBreakerConfig = {
  /** Identifier of the component instance. */
  id: number;
  /** Name of the component instance. */
  name: string | null;
  /** Limit under which undervoltage condition occurs in Volts. */
  undervoltage_limit: number;
  /** Limit over which overvoltage condition occurs in Volts. */
  voltage_limit: number;
  /** Voltage monitor filter time before protection is triggered in seconds. */
  reaction_delay: number;
  /** Enable autorecovery on undervoltage and overvoltage. */
  autorecovery_enable: boolean;
  /**
   * Voltage deviation from nominal.
   * Used for undervoltage, overvoltage and autorecovery conditions.
   */
  voltage_thr: number;
  /** Voltage monitor filter time before autorecovery is triggered in seconds. */
  autorecovery_delay: number;
};

export type CircuitBreakerStatus = {
  /** Identifier of the component instance. */
  id: number;
  /** True if the breaker is engaged, false otherwise. */
  output: boolean;
  /** Source of the last command, for example: init, WS_in, http, ... */
  source: string;
  /** Counter how many times breaker was disengaged. */
  total_cycles: number;
  /**
   * True if the safety switch is in the locked position.
   * When locked, remote switching on and off is disabled.
   */
  safety: boolean;
  /**
   * Information about the temperature
   *
   * (shown if applicable)
   */
  temperature?: {
    /**
     * Temperature in Celsius
     *
     * (null if the temperature is out of the measurement range)
     */
    tC: number | null;
    /**
     * Temperature in Fahrenheit
     *
     * (null if the temperature is out of the measurement range)
     */
    tF: number | null;
  };
  /**
   * Error conditions occurred.
   *
   * (shown if at least one error is present)
   */
  errors?: ('overtemp' | `overvoltage:${number}` | `undervoltage:${number}` | 'lever')[];
};

export type CircuitBreakerHomeySettings = {
  'CB:undervoltage_limit': number;
  'CB:voltage_limit': number;
  'CB:reaction_delay': number;
  'CB:autorecovery_enable': boolean;
  'CB:voltage_thr': number;
  'CB:autorecovery_delay': number;
};

const simpleSettingKeys = [
  'undervoltage_limit',
  'voltage_limit',
  'reaction_delay',
  'autorecovery_enable',
  'voltage_thr',
  'autorecovery_delay',
] as const satisfies (keyof CircuitBreakerConfig)[];

/**
 * The CB component monitors voltage and handles a circuit breaker lever.
 */
export default class CircuitBreaker extends ComponentWithId<
  'CB',
  CircuitBreakerStatus,
  CircuitBreakerConfig,
  CircuitBreakerHomeySettings
> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'CB';
  public static readonly uiName = 'Circuit Breaker';
  public static readonly key = 'cb';

  public async Set(
    channel: RpcChannel,
    params: CircuitBreakerSetParams,
  ): Promise<ResponseSuccessFrame<CircuitBreakerSetResponse>> {
    return Set(channel, this.id, params).catch((err: RpcError) => {
      switch (err.code) {
        case -109:
          throw new Error(this.device.app.homey.__('component.CircuitBreaker.safety_locked'));
        case -110:
          throw new Error(this.device.app.homey.__('component.CircuitBreaker.remote_disabled'));
        default:
          throw err;
      }
    });
  }

  public async GetLog(
    channel: RpcChannel,
    params?: CircuitBreakerGetLogParams,
  ): Promise<ResponseSuccessFrame<CircuitBreakerGetLogResponse>> {
    return GetLog(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'CB'>[],
  ): Promise<string[]> {
    const componentCapabilities: string[] = [];

    const onOffCapabilityListener = async (value: boolean): Promise<void> => {
      await this.Set(this.device.getChannel(), { output: value });
    };

    // Simple capabilities
    for (const [statusKey, homeyCapability, capabilityListener] of [
      ['output', 'onoff', onOffCapabilityListener],
      ['safety', 'shelly_remote_lock'],
      ['temperature', 'measure_temperature.circuit_breaker'],
      ['total_cycles', 'shelly_total_cycles'],
    ] as const) {
      if (this.status[statusKey] !== undefined) {
        const capabilityOptions = capabilitiesOptions[homeyCapability as never];
        componentCapabilities.push(
          await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions, capabilityListener),
        );
      }
    }

    if (this.status.temperature !== undefined) {
      componentCapabilities.push('hidden.has_temperature_measurement');
    }

    componentCapabilities.push('alarm_generic', 'shelly_errors');

    return componentCapabilities;
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: CircuitBreakerStatus): Promise<void> {
    for (const [statusKey, capabilityId] of [
      ['output', 'onoff'],
      ['total_cycles', 'shelly_total_cycles'],
    ] as const) {
      const value = status[statusKey];
      if (value !== undefined) {
        await this.setCapability(homeyDevice, capabilityId, value);
      }
    }

    const safety = status['safety'];
    if (safety !== undefined) {
      await this.setCapability(homeyDevice, 'shelly_remote_lock', safety);
      await safeTriggerDeviceCard(homeyDevice, 'shelly_remote_lock_changed', { value: safety }, { value: safety });
    }

    const temperature = status.temperature?.tC;
    if (temperature !== undefined) {
      await safeSetCapabilityValue(homeyDevice, 'measure_temperature.circuit_breaker', temperature);
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

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: CircuitBreakerConfig): Promise<void> {
    const newSettings: Partial<CircuitBreakerHomeySettings> = {};

    for (const settingKey of simpleSettingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`CB:${settingKey}`] = config[settingKey] as never;
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<CircuitBreakerHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: Partial<CircuitBreakerConfig> = {};

    for (const settingKey of simpleSettingKeys) {
      const homeySettingKey = `CB:${settingKey}` as const;
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
    const displayId = this.id < 100 ? this.id + 1 : this.id;
    const name = this.config.name !== null ? this.config.name : `${displayId}`;
    if (capability === 'measure_temperature') {
      return translate(device.homey.__('locale'), capabilitiesOptions['measure_temperature'].title, {
        name: name,
      });
    }

    return super.getAutocompleteTitle(device, capability);
  }

  public static registerFlowCards(app: ShellyApp): void {
    app.homey.flow
      .getDeviceTriggerCard('shelly_remote_lock_changed')
      .registerRunListener(
        (cardArgs: { value: boolean; device: ShellyLocalDevice }, triggerArgs: { value: boolean }) => {
          return cardArgs.value === triggerArgs.value;
        },
      );
  }
}
