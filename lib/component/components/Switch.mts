import { ComponentWithId } from '../Component.mjs';
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

/**
 * The Switch component handles a switch (relay) output terminal with optional power metering capabilities.
 */
export default class Switch extends ComponentWithId<SwitchStatus, SwitchConfig> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;

  async Set(channel: RpcChannel, params: SwitchSetParams): Promise<ResponseSuccessFrame<SwitchSetResponse>> {
    return Set(channel, this.id, params);
  }

  async Toggle(channel: RpcChannel): Promise<ResponseSuccessFrame<SwitchToggleResponse>> {
    return Toggle(channel, this.id);
  }

  async ResetCounters(
    channel: RpcChannel,
    params?: SwitchResetCountersParams,
  ): Promise<ResponseSuccessFrame<SwitchResetCountersResponse>> {
    return ResetCounters(channel, this.id, params);
  }

  async register(): Promise<void> {
    {
      // onoff
      const capabilityId = `onoff.${this.id}` as const;
      await this.device.safeAddCapability(capabilityId);
      const capabilityListener = async (value: boolean): Promise<void> => {
        await this.Set(this.device.getChannel(), { on: value });
      };
      this.device.registerCapabilityListener(capabilityId, capabilityListener);
      const capabilityOptions = {
        // TODO translations
        title: {
          en: `Switch ${this.id}`,
        },
      };
      await this.device.setCapabilityOptions(capabilityId, capabilityOptions);
    }
    {
      // measure_temperature
      if (this.status.temperature !== undefined) {
        const capabilityId = `measure_temperature.switch_${this.id}`;
        await this.device.safeAddCapability(capabilityId);
        const capabilityOptions = {
          // TODO translations
          title: {
            en: `Switch ${this.id} Temperature`,
          },
        };
        await this.device.setCapabilityOptions(capabilityId, capabilityOptions);
      }
    }
  }
}
