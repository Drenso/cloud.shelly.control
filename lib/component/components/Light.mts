import { type AllowedPrimitives, ComponentWithId } from '../Component.mjs';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import capabilitiesOptions from './Light/capabilitiesOptions.json' with { type: 'json' };
import SetConfig from './Light/SetConfig.mjs';
import GetConfig from './Light/GetConfig.mjs';
import GetStatus from './Light/GetStatus.mjs';
import type { LightResetCountersParams } from './Light/ResetCounters.mjs';
import ResetCounters from './Light/ResetCounters.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import type ShellyLocalDevice from '../../Device.mjs';
import type { RecursivePartial } from '../../util.mjs';
import Set, { type LightSetParams } from './Light/Set.mjs';
import Toggle from './Light/Toggle.mjs';
import DimUp, { type LightDimUpParams } from './Light/DimUp.mjs';
import DimDown, { type LightDimDownParams } from './Light/DimDown.mjs';
import DimStop from './Light/DimStop.mjs';
import SetAll, { type LightSetAllParams } from './Light/SetAll.mjs';
import Calibrate from './Light/Calibrate.mjs';

export type LightConfig = {
  /** Identifier of the Light component instance */
  id: number;
  /** Name of the light instance */
  name: string | null;
  /**
   * Mode of the associated input
   *
   * - `follow`: The state of the output is the same as the state of the input.
   *   For type:analog sets to output current % of input.
   *
   * - `flip`:  Change of the state of the input causes change of the state of the output
   *
   * - `activate`: When input state is on sets output to on (and activates auto_off if enabled), input state off does nothing.
   *
   * - `detached`: The state of the input doesn't affect the state of the output.
   *
   * - `dim`: Short press toggles output, long press starts dimming with alternating directions.
   *   If output is currently off, holding the button will turn on and start dimming from 0%.
   *   Stops when reached 100% or 1%.
   *
   * - `dual_dim`: Short press toggles output, long press starts dimming up/down depending on which button is pressed.
   *   Stops when reached 100% or 1%.
   *
   * `follow` and `flip` are available for type:switch.
   * `activate` available for type:switch and type:button
   * `dim` available for type:button
   * `dual_dim` available for type:button
   */
  in_mode: 'follow' | 'flip' | 'activate' | 'detached' | 'dim' | 'dual_dim';
  /**
   * Operational mode
   *
   * Device-specific values
   * - Dimmer0/1-10V PM Gen3:
   *   + `0`: 0-10VDC (default)
   *   + `1`: 1-10VDC
   *
   * (shown if applicable)
   */
  op_mode?: 0 | 1;
  initial_state: 'off' | 'on' | 'restore_last';
  auto_on: boolean;
  /** Seconds to pass until the component is switched back on */
  auto_on_delay: number;
  auto_off: number;
  /** Seconds to pass until the component is switched back off */
  auto_off_delay: number;
  /**
   * Time to change from 0% to 100% of brightness, in seconds.
   *
   * (shown if applicable)
   */
  transition_duration?: number;
  /**
   * Brightness level (in percent) applied when there is a toggle
   * and current brightness is lower than `min_brightness_on_toggle`
   */
  min_brightness_on_toggle: number;
  night_mode: {
    enable: boolean;
    /**
     * Brightness level limit when night mode is active.
     *
     * Default value 50.
     */
    brightness: number;
    /**
     * Start and end time of night_mode in format HH:MM.
     *
     * Range 00:00 - 23:59
     */
    active_between: [`${number}:${number}`, `${number}:${number}`] | [];
  };
  /**
   * Controls how quickly the output level changes while a button is held down for dimming.
   *
   * Default value 3.
   * Range 1-5 where 5 is fastest, 1 is slowest.
   *
   * (shown if applicable)
   */
  button_fade_rate?: 1 | 2 | 3 | 4 | 5;
  button_presets: {
    /** null disables `button_doublepush` preset */
    button_doublepush: {
      /**
       * Brightness level (in percent) set on double click.
       *
       * Default: 100
       */
      brightness: number;
    } | null;
  };
  /**
   * Remaps output 0%-100% range to values in array.
   *
   * First value in array is min setting, second value is max setting.
   * Array elements are of type number.
   * Accepted range for values is from 0% to 100%.
   *
   * Default values are [0, 100].
   * Max must be greater than min.
   *
   * (shown if applicable)
   */
  range_map?: [number, number] | null;
  /**
   * Limit (in Watts) over which overpower condition occurs.
   *
   * (shown if applicable)
   */
  power_limit?: number;
  /**
   * Limit (in Volts) over which overvoltage condition occurs.
   *
   * (shown if applicable)
   */
  voltage_limit?: number;
  /**
   * Limit (in Volts) under which undervoltage condition occurs.
   *
   * (shown if applicable)
   */
  undervoltage_limit?: number;
  /**
   * Limit (in Amperes) over which overcurrent condition occurs.
   * For PlusRGBWPM shown if device is calibrated.
   *
   * (shown if applicable)
   */
  current_limit?: number;
};

export type LightStatus = {
  // Identifier of the Light component instance
  id: number;
  // Source of the last command, for example: init, WS_in, http, ...
  source: string;
  // true if the output channel is currently on, false otherwise
  output: boolean;
  // Current brightness level (in percent)
  brightness: number;
  // Unix timestamp, start time of the timer (in UTC).
  // (shown if the timer is triggered)
  timer_started_at?: number;
  // Duration of the timer in seconds.
  // (shown if the timer is triggered)
  timer_duration?: number;
  // Information about the transition.
  // (shown if transition is triggered)
  transition?: {
    target: {
      // True if the output channel becomes on, false otherwise
      output: boolean;
      // Brightness level (in percent)
      brightness: number;
    };
    // Unix timestamp, start time of the transition (in UTC)
    started_at: number;
    // Duration of the transition in seconds
    duration: number;
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
  // Last measured instantaneous active power (in Watts) delivered to the attached load
  // (shown if applicable)
  apower?: number;
  // Last measured voltage in Volts
  // (shown if applicable)
  voltage?: number;
  // Last measured current in Amperes
  // (shown if applicable)
  current?: number;
  // Information about the calibration process.
  // Only present when calibration is running.
  calibration?: {
    // Calibration progress in percent
    progress: number;
  };
  // Error conditions occurred.
  // Shown if at least one error is present.
  // Possible values depend on component capabilities.
  // cal_abort:interrupted      - input or output are triggered
  // cal_abort:power_read       - there is an error in reading the powermeter
  // cal_abort:no_load          - there is no load attached
  // cal_abort:non_dimmable     - attached load is not dimmable
  // cal_abort:overpower        - load power exceeds max limit
  // cal_abort:unsupported_load - load can not be calibrated
  errors?: (
    | 'overtemp'
    | 'overpower'
    | 'overvoltage'
    | 'undervoltage'
    | 'overcurrent'
    | 'unsupported_load'
    | 'cal_abort:interrupted'
    | 'cal_abort:power_read'
    | 'cal_abort:no_load'
    | 'cal_abort:no_synchro'
    | 'cal_abort:non_dimmable'
    | 'cal_abort:overpower'
    | 'cal_abort:unsupported_load'
  )[];
  // Communicates present conditions.
  // Shown if at least one flag is set.
  // Possible values depend on component capabilities.
  flags?: ('no_load' | 'uncalibrated')[];
};

export type LightHomeySettings = {
  'Light:in_mode': 'follow' | 'flip' | 'activate' | 'detached' | 'dim' | 'dual_dim';
  'Light:op_mode': '0' | '1';
  'Light:initial_state': 'off' | 'on' | 'restore_last';
  'Light:transition_duration': number;
  'Light:min_brightness_on_toggle': number;
  'Light:night_mode.enable': boolean;
  'Light:night_mode.brightness': number;
  'Light:night_mode.active_between.start': `${number}:${number}`;
  'Light:night_mode.active_between.end': `${number}:${number}`;
  'Light:button_fade_rate': '1' | '2' | '3' | '4' | '5';
  'Light:button_presets.button_doublepush.enable': boolean;
  'Light:button_presets.button_doublepush.brightness': number;
  'Light:range_map.min': number;
  'Light:range_map.max': number;
  'Light:power_limit': number;
  'Light:voltage_limit': number;
  'Light:undervoltage_limit': number;
  'Light:current_limit': number;
};

/**
 * The Light component handles a dimmable light output with additional on/off control.
 * It has night mode capability that can reduce brightness in selected period of time.
 */
export default class Light extends ComponentWithId<'Light', LightStatus, LightConfig, LightHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  readonly namespace = 'Light';
  static uiName = 'Light';

  async Set(channel: RpcChannel, params: LightSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  async Toggle(channel: RpcChannel): ReturnType<typeof Toggle> {
    return Toggle(channel, this.id);
  }

  async DimUp(channel: RpcChannel, params?: LightDimUpParams): ReturnType<typeof DimUp> {
    return DimUp(channel, this.id, params);
  }

  async DimDown(channel: RpcChannel, params?: LightDimDownParams): ReturnType<typeof DimDown> {
    return DimDown(channel, this.id, params);
  }

  async DimStop(channel: RpcChannel): ReturnType<typeof DimStop> {
    return DimStop(channel, this.id);
  }

  async SetAll(channel: RpcChannel, params: LightSetAllParams): ReturnType<typeof SetAll> {
    return SetAll(channel, params);
  }

  async Calibrate(channel: RpcChannel): ReturnType<typeof Calibrate> {
    return Calibrate(channel, this.id);
  }

  async ResetCounters(channel: RpcChannel, params?: LightResetCountersParams): ReturnType<typeof ResetCounters> {
    return ResetCounters(channel, this.id, params);
  }

  async register(methods: ComponentMethod<'Light'>[]): Promise<void> {}

  async registerHomeyDevice(homeyDevice: ShellyLocalDevice, methods: ComponentMethod<'Light'>[]): Promise<void> {
    {
      // output
      const capabilityId = 'onoff';
      await this.registerCapability(homeyDevice, 'output', capabilityId).catch(homeyDevice.error);
      homeyDevice.registerCapabilityListener(capabilityId, async (value: boolean) => {
        await this.Set(this.device.getChannel(), { on: value });
      });
    }

    {
      // brightness
      const capabilityId = 'dim';
      await this.registerCapability(homeyDevice, 'brightness', capabilityId).catch(homeyDevice.error);
      homeyDevice.registerCapabilityListener(capabilityId, async (value: number) => {
        await this.Set(this.device.getChannel(), { brightness: value * 100 });
      });
    }

    await this.registerCapability(homeyDevice, 'temperature', 'measure_temperature').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'aenergy', 'meter_power').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'apower', 'measure_power').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'voltage', 'measure_voltage').catch(homeyDevice.error);
    await this.registerCapability(homeyDevice, 'current', 'measure_current').catch(homeyDevice.error);
    // TODO errors

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

    if (methods.includes('Calibrate')) {
      const maintenanceActionId = 'button.calibrate';
      await homeyDevice.safeAddCapability(maintenanceActionId);
      homeyDevice.registerCapabilityListener(maintenanceActionId, async () => {
        await this.Calibrate(this.device.getChannel());
      });
      await homeyDevice
        .setCapabilityOptions(maintenanceActionId, capabilitiesOptions['button.calibrate'])
        .catch(homeyDevice.error);
    }

    // Set correct capability values
    await this.onStatusUpdate(homeyDevice, this.status);
    // Set correct setting values
    await this.onConfigUpdate(homeyDevice, this.config);
  }

  async onStatusUpdate(
    homeyDevice: ShellyLocalDevice,
    status: RecursivePartial<LightStatus, AllowedPrimitives>,
  ): Promise<void> {
    await this.updateMeasured(homeyDevice, status, 'output', 'onoff');
    if (status.brightness !== undefined) {
      await homeyDevice.safeSetCapability('dim', status.brightness / 100);
    }
    if (status.temperature !== undefined) {
      await homeyDevice.safeSetCapability('measure_temperature', status.temperature.tC);
    }
    if (status.aenergy?.total !== undefined) {
      const consumedEnergy = status.aenergy.total;
      await homeyDevice.safeSetCapability('meter_power', consumedEnergy / 1000);
    }
    await this.updateMeasured(homeyDevice, status, 'apower', 'measure_power');
    await this.updateMeasured(homeyDevice, status, 'voltage', 'measure_voltage');
    await this.updateMeasured(homeyDevice, status, 'current', 'measure_current');
    // TODO errors
  }

  async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: LightConfig): Promise<void> {
    // TODO update settings
  }

  async registerCapability(
    homeyDevice: ShellyLocalDevice,
    statusProperty: keyof LightStatus,
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

  async updateMeasured(
    homeyDevice: ShellyLocalDevice,
    status: RecursivePartial<LightStatus, AllowedPrimitives>,
    statusProperty: keyof LightStatus,
    homeyCapability: string,
  ): Promise<void> {
    if (status[statusProperty] !== undefined) {
      await homeyDevice.safeSetCapability(homeyCapability, status[statusProperty]).catch(homeyDevice.error);
    }
  }
}
