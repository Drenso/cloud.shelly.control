import { type AllowedPrimitives, ComponentWithId } from '../Component.mjs';
import GetConfig from './Switch/GetConfig.mjs';
import GetStatus from './Switch/GetStatus.mjs';
import SetConfig from './Switch/SetConfig.mjs';
import Set, { type SwitchSetParams, type SwitchSetResponse } from './Switch/Set.mjs';
import Toggle, { type SwitchToggleResponse } from './Switch/Toggle.mjs';
import ResetCounters, {
  type SwitchResetCountersParams,
  type SwitchResetCountersResponse,
} from './Switch/ResetCounters.mjs';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import type { ResponseSuccessFrame } from '../../rpc/Rpc.mjs';
import capabilitiesOptions from './Switch/capabilitiesOptions.json' with { type: 'json' };
import type ShellyLocalDevice from '../../Device.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import type { RecursivePartial } from '../../util.mjs';

export type SwitchConfig = {
  // Identifier of the Switch component instance
  id: number;
  // Name of the switch instance
  name: string | null;
  // Mode of the associated input.
  //
  // momentary and cycle are available only when the corresponding input is stateless (e.g. type: button).
  // follow and flip are available only when the input has a state (e.g. type:switch).
  // cycle mode is available only for ShellyPlus2PM, ShellyPro2PM and ShellyPro2
  //
  // follow: the state of the switch is the same as the state of the input (when the input is off => the switch is off).
  // flip: change of the state of the input causes a change of the state of the switch (when input is toggled the switch is also).
  // detached: the state of the input doesn't affect the state of the switch.
  // activate: available only on devices with physical input.
  //
  // In the web UI:
  // follow: Toggle - Act as a flip input with one state for ON and one state for OFF
  // momentary: Momentary - Every push, toggles the state ON -> OFF or OFF -> ON
  // flip: Edge - Changes state on every change of the switch state
  // detached: Detached - Input is separated/not changing state of the output/relay
  // cycle: ???
  // activation: Activation - Used with motion sensor. Any input turns ON and resets Auto Off timer
  //
  in_mode: 'momentary' | 'follow' | 'flip' | 'detached' | 'cycle' | 'activate';
  // If True, all changes to physical inputs are ignored, regardless of mode.
  in_locked: boolean;
  // Output state to set on power_on.
  initial_state: 'off' | 'on' | 'restore_last' | 'match_input';
  // True if the "Automatic ON" function is enabled, false otherwise
  auto_on: boolean;
  // Seconds to pass until the component is switched back on
  auto_on_delay: number;
  // True if the "Automatic OFF" function is enabled, false otherwise
  auto_off: boolean;
  // Seconds to pass until the component is switched back off
  auto_off_delay: number;
  // True if switch output state should be restored after over/undervoltage error is cleared, false otherwise
  // (shown if applicable)
  autorecover_voltage_errors?: boolean;
  // Identifier of the Input component which controls the Switch.
  // Applicable only to Pro1 and Pro1PM devices.
  input_id?: 0 | 1;
  // Limit (in Watts) over which overpower condition occurs
  // Can be set from 0W to the max rated output power or to null to reset to default value.
  // (shown if applicable)
  power_limit?: number | null;
  // Limit (in Volts) over which overvoltage condition occurs.
  // Can be set from 'undervoltage_limit' to the max-rated output voltage or to null to reset to the default value.
  // (shown if applicable)
  voltage_limit?: number | null;
  // Limit (in Volts) under which undervoltage condition occurs.
  // Can be set from 0V (disabled) to 'voltage_limit' or to null to reset to the default value.
  // (shown if applicable)
  undervoltage_limit?: number;
  // Number, limit (in Amperes) over which overcurrent condition occurs.
  // Can be set from 0A to the max-rated output current or to null to reset to the default value.
  // (shown if applicable)
  current_limit?: number;
  // Reverse measurement direction of active power and energy.
  // Setting the reverse option requires a restart.
  // Available only on devices capable of measuring returned energy, for example ShellyPlus2PM, ShellyPro2PM, ShellyPro4PM etc.
  // (shown if applicable)
  reverse?: boolean;
};

export type SwitchStatus = {
  // Identifier of the Switch component instance
  id: number;
  // Source of the last command, for example: init, WS_in, http, ...
  source: string;
  // true if the output channel is currently on, false otherwise
  output: boolean;
  // Unix timestamp, start time of the timer (in UTC)
  // (shown if the timer is triggered)
  timer_started_at?: number;
  // Duration of the timer in seconds
  // (shown if the timer is triggered)
  timer_duration?: number;
  // Last measured instantaneous active power (in Watts) delivered to the attached load
  // (shown if applicable)
  apower?: number;
  // Last measured voltage in Volts
  // (shown if applicable)
  voltage?: number;
  // Last measured current in Amperes
  // (shown if applicable)
  current?: number;
  // Last measured power factor
  // (shown if applicable)
  pf?: number;
  // Last measured network frequency in Hz
  // (shown if applicable)
  freq?: number;
  // Information about the active energy counter
  // (shown if applicable)
  aenergy?: {
    // Total energy consumed in Watt-hours
    total: number;
    // Total energy flow in Milliwatt-hours for the last three complete minutes.
    // The 0-th element indicates the counts accumulated during the minute preceding minute_ts.
    // Present only if the device clock is synced.
    by_minute?: number[];
    // Unix timestamp marking the start of the current minute (in UTC).
    minute_ts?: number;
  };
  // Information about the returned active energy counter.
  // The active energy added to this container is also added to the 'aenergy' container.
  // All the consumed energy is collected in 'aenergy' regardless of the direction (consumed or returned) of the active energy.
  // (shown if applicable)
  ret_aenergy?: {
    // Total returned energy consumed in Watt-hours
    total: number;
    // Returned energy in Milliwatt-hours for the last three complete minutes.
    // The 0-th element indicates the counts accumulated during the minute preceding minute_ts.
    // Present only if the device clock is synced.
    by_minute?: number[];
    // Unix timestamp marking the start of the current minute (in UTC).
    minute_ts?: number;
  };
  // Information about the temperature
  // (shown if applicable)
  temperature?: {
    // Temperature in Celsius
    // (null if the temperature is out of the measurement range)
    tC: number | null;
    // Temperature in Fahrenheit
    // (null if the temperature is out of the measurement range)
    tF: number | null;
  };
  // Error conditions occurred.
  // (shown if at least one error is present)
  errors?: ('overtemp' | 'overpower' | 'overvoltage' | 'undervoltage')[];
};

export type SwitchHomeySettings = {
  'Switch:in_mode': 'momentary' | 'follow' | 'flip' | 'detached' | 'cycle' | 'activate';
  'Switch:in_locked': boolean;
  'Switch:initial_state': 'off' | 'on' | 'restore_last' | 'match_input';
  'Switch:auto_on': boolean;
  'Switch:auto_on_delay': number;
  'Switch:auto_off': boolean;
  'Switch:auto_off_delay': number;
  'Switch:autorecover_voltage_errors': boolean;
  'Switch:input_id': '0' | '1';
  'Switch:power_limit': number;
  'Switch:voltage_limit': number;
  'Switch:undervoltage_limit': number;
  'Switch:current_limit': number;
  'Switch:reverse': boolean;
};

const settingKeys = [
  'in_mode',
  'in_locked',
  'initial_state',
  'auto_on',
  'auto_on_delay',
  'auto_off',
  'auto_off_delay',
  'autorecover_voltage_errors',
  'power_limit',
  'voltage_limit',
  'undervoltage_limit',
  'current_limit',
  'reverse',
] as const satisfies (keyof SwitchConfig)[];

/**
 * The Switch component handles a switch (relay) output terminal with optional power metering capabilities.
 */
export default class Switch extends ComponentWithId<'Switch', SwitchStatus, SwitchConfig, SwitchHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'Switch';
  public static readonly uiName = 'Switch';

  public async Set(channel: RpcChannel, params: SwitchSetParams): Promise<ResponseSuccessFrame<SwitchSetResponse>> {
    return Set(channel, this.id, params);
  }

  public async Toggle(channel: RpcChannel): Promise<ResponseSuccessFrame<SwitchToggleResponse>> {
    return Toggle(channel, this.id);
  }

  public async ResetCounters(
    channel: RpcChannel,
    params?: SwitchResetCountersParams,
  ): Promise<ResponseSuccessFrame<SwitchResetCountersResponse>> {
    return ResetCounters(channel, this.id, params);
  }

  public async register(): Promise<void> {
    return;
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    methods: ComponentMethod<'Switch'>[],
  ): Promise<void> {
    {
      // output
      await this.registerCapability(homeyDevice, 'output', 'onoff').catch(homeyDevice.error);
      const capabilityId = 'onoff' as const;
      const capabilityListener = async (value: boolean): Promise<void> => {
        await this.Set(this.device.getChannel(), { on: value });
      };
      homeyDevice.registerCapabilityListener(capabilityId, capabilityListener);
    }

    await this.registerCapability(homeyDevice, 'apower', 'measure_power').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'voltage', 'measure_voltage').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'current', 'measure_current').catch(homeyDevice.error);
    // TODO power factor
    await this.registerCapability(homeyDevice, 'freq', 'measure_frequency').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'aenergy', 'meter_power.consumed').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'ret_aenergy', 'meter_power.returned').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'aenergy', 'meter_power.total').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'temperature', 'measure_temperature').catch(homeyDevice.error);
    // TODO errors

    if (this.status['aenergy'] !== undefined || this.status['ret_aenergy'] !== undefined) {
      let energy = homeyDevice.getEnergy();
      energy = {
        ...energy,
        cumulative: false,
        meterPowerImportedCapability: 'meter_power.consumed',
        meterPowerExportedCapability: 'meter_power.returned',
      };
      await homeyDevice.setEnergy(energy).catch(homeyDevice.error);
    }

    if (methods.includes('ResetCounters')) {
      const maintenanceActionId = 'button.reset_energy_counters';
      await homeyDevice.safeAddCapability(maintenanceActionId);
      homeyDevice.registerCapabilityListener(maintenanceActionId, async () => {
        await this.ResetCounters(this.device.getChannel());
      });
      await homeyDevice
        .setCapabilityOptions(maintenanceActionId, capabilitiesOptions['button.reset_energy_counters'])
        .catch(homeyDevice.error);
    }

    // Set correct capability values
    await this.onStatusUpdate(homeyDevice, this.status);
    // Set correct setting values
    await this.onConfigUpdate(homeyDevice, this.config);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<SwitchStatus>): Promise<void> {
    await this.updateMeasured(homeyDevice, status, 'output', 'onoff');
    await this.updateMeasured(homeyDevice, status, 'apower', 'measure_power');
    await this.updateMeasured(homeyDevice, status, 'voltage', 'measure_voltage');
    await this.updateMeasured(homeyDevice, status, 'current', 'measure_current');
    // TODO power factor
    await this.updateMeasured(homeyDevice, status, 'freq', 'measure_frequency');
    if (status.aenergy !== undefined || status.ret_aenergy !== undefined) {
      const absoluteEnergy = this.status.aenergy?.total ?? 0;
      const returnedEnergy = this.status.ret_aenergy?.total ?? 0;
      const consumedEnergy = absoluteEnergy - returnedEnergy;
      await homeyDevice.safeSetCapability('meter_power.consumed', consumedEnergy / 1000);
      await homeyDevice.safeSetCapability('meter_power.returned', returnedEnergy / 1000);
      await homeyDevice.safeSetCapability('meter_power.total', absoluteEnergy / 1000);
    }
    if (status.temperature !== undefined) {
      await homeyDevice.safeSetCapability('measure_temperature', status.temperature.tC);
    }
    // TODO errors
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: SwitchConfig): Promise<void> {
    const newSettings: RecursivePartial<SwitchHomeySettings, AllowedPrimitives> = {};
    for (const settingKey of settingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`Switch:${settingKey}`] = config[settingKey] as never;
      }
    }
    if (config['input_id'] !== undefined) {
      newSettings['Switch:input_id'] = `${config['input_id']}`;
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<SwitchHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<SwitchConfig, AllowedPrimitives> = {};

    for (const settingKey of settingKeys) {
      const homeySettingKey = `Switch:${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[settingKey] = newSettings[homeySettingKey] as never;
      }
    }

    if (changedKeys.includes('Switch:input_id')) {
      const newSetting = newSettings['Switch:input_id'];
      changedConfig['input_id'] = parseInt(newSetting, 10) as 0 | 1;
    }

    if (Object.keys(changedConfig).length > 0) {
      const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
      return result.result.restart_required;
    } else {
      return false;
    }
  }

  private async registerCapability(
    homeyDevice: ShellyLocalDevice,
    statusProperty: keyof SwitchStatus,
    homeyCapability: string,
  ): Promise<void> {
    if (this.status[statusProperty] !== undefined) {
      await homeyDevice.safeAddCapability(homeyCapability);
      const capabilityOptions = capabilitiesOptions[homeyCapability as keyof typeof capabilitiesOptions];
      if (capabilityOptions !== undefined) {
        await homeyDevice.setCapabilityOptions(homeyCapability, capabilityOptions);
      }
    }
  }

  private async updateMeasured(
    homeyDevice: ShellyLocalDevice,
    status: Partial<SwitchStatus>,
    statusProperty: keyof SwitchStatus,
    homeyCapability: string,
  ): Promise<void> {
    if (status[statusProperty] !== undefined) {
      await homeyDevice.safeSetCapability(homeyCapability, status[statusProperty]).catch(homeyDevice.error);
    }
  }
}
