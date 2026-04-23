import type ShellyLocalDevice from '../../local/LocalDevice.mjs';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { deepAssign, includesAny, type RecursivePartial } from '../../util.mjs';
import { type AllowedPrimitives, ComponentWithId } from '../Component.mjs';
import { parseNightModeActiveBetween } from '../util/NightMode.mjs';
import DimDown, { type CCTDimDownParams } from './CCT/DimDown.mjs';
import DimStop from './CCT/DimStop.mjs';
import DimUp, { type CCTDimUpParams } from './CCT/DimUp.mjs';
import GetConfig from './CCT/GetConfig.mjs';
import GetStatus from './CCT/GetStatus.mjs';
import Set, { type CCTSetParams } from './CCT/Set.mjs';
import SetConfig from './CCT/SetConfig.mjs';
import Toggle from './CCT/Toggle.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import capabilitiesOptions from './CCT/capabilitiesOptions.json' with { type: 'json' };

export type CCTConfig = {
  /** Id of the CCT component instance */
  id: number;

  /** Name of the CCT instance */
  name: string | null;

  /** Output state to set on power_on. Range of values: off, on, restore_last */
  initial_state: 'off' | 'on' | 'restore_last';

  /** True if the "Automatic ON" function is enabled, false otherwise */
  auto_on: boolean;

  /** Seconds to pass until the component is switched back on */
  auto_on_delay: number;

  /** True if the "Automatic OFF" function is enabled, false otherwise */
  auto_off: boolean;

  /** Seconds to pass until the component is switched back off */
  auto_off_delay: number;

  /** Transition time (in seconds) - time to change from 0% to 100% of brightness (if applicable) */
  transition_duration?: number;

  /** Brightness level (in percent) applied when there is a toggle and current brightness is lower than min_brightness_on_toggle. */
  min_brightness_on_toggle: number;

  /** Night mode configuration */
  night_mode: {
    /** Enable or disable night mode */
    enable: boolean;

    /** Brightness level limit when night mode is active. null overrides night_mode.brightness with current brightness when night mode starts. Default value 50. */
    brightness: number | null;

    /** Color temperature level limit (in Kelvin) when night mode is active. null overrides night_mode.ct value with current ct value when night mode starts. Default value: 50% of ct_range. For DuoBulbG3: 4600 */
    ct: number | null;

    /** Containing 2 elements of type string, the first element indicates the start of the period during which the night mode will be active, the second indicates the end of that period. Both start and end are strings in the format HH:MM, where HH and MM are hours and minutes with optional leading zeros */
    active_between: [`${number}:${number}`, `${number}:${number}`] | [];
  };

  /** Controls how quickly the output level changes while a button is held down for dimming (if applicable). Default value 3. Range [1,5] where 5 is fastest, 1 is slowest */
  button_fade_rate?: 1 | 2 | 3 | 4 | 5;

  /** Button presets config (if applicable) */
  button_presets?: {
    /** null disables button_doublepush preset */
    button_doublepush: null | {
      /** Brightness level (in percent) set on double click (if applicable). null overrides brightness with current brightness when preset is applied. Default: 100 */
      brightness?: number | null;
      /** Color temperature level (in Kelvin) set on double click (if applicable). null overrides ct with current ct when preset is applied. Default: max setting of ct_range (device specific) */
      ct?: number | null;
    };
  };

  /** Remaps output 0%-100% range to values in array (if applicable). First value in array is min setting, second value is max setting. Array elements are of type number. Accepted range for values is from 0% to 100%. Default values are [0, 100]. max must be greater than min. */
  range_map?: [number, number] | null;

  /** Sets the color temperature operating range in Kelvin (if applicable). First value in array is min setting, second value is max setting. Array elements are of type number. Accepted range for values is from 1000K to 10000K. Default values are device specific. Default values for DuoBulbG3: [2700, 6500]. max must be greater than min. */
  ct_range?: [number, number] | null;

  /** Limit (in Amperes) over which overcurrent condition occurs (shown if applicable). For specific devices applies for color channels, not CCT component */
  current_limit?: number;

  /** Limit (in Watts) over which overpower condition occurs (shown if applicable) */
  power_limit?: number;

  /** Limit (in Volts) over which overvoltage condition occurs (shown if applicable) */
  voltage_limit?: number;
};

export type CCTStatus = {
  /** Id of the CCT component instance */
  id: number;

  /** Source of the last command, for example: init, WS_in, http, ... */
  source: string;

  /** True if the output channel is currently on, false otherwise */
  output: boolean;

  /** Current brightness level (in percent) */
  brightness: number;

  /** Current color temperature level (in Kelvin) */
  ct: number;

  /** Unix timestamp, start time of the timer (in UTC) (shown if the timer is triggered) */
  timer_started_at?: number;

  /** Duration of the timer in seconds (shown if the timer is triggered) */
  timer_duration?: number;

  /** Information about the transition (shown if transition is triggered) */
  transition?: {
    target: {
      /** True if the output channel becomes on, false otherwise */
      output: boolean;
      /** Brightness level (in percent) */
      brightness: number;
      /** Color temperature level (in Kelvin) */
      ct: number;
    };
    /** Unix timestamp, start time of the transition (in UTC) */
    started_at: number;
    /** Duration of the transition in seconds */
    duration: number;
  };

  /** Information about the temperature (if applicable) */
  temperature?: {
    /** Temperature in Celsius (null if temperature is out of the measurement range) */
    tC: number | null;
    /** Temperature in Fahrenheit (null if temperature is out of the measurement range) */
    tF: number | null;
  };

  /** Information about the active energy counter (shown if applicable) */
  aenergy?: {
    /** Total energy consumed in Watt-hours */
    total: number;
    /**
     * Total energy flow in Milliwatt-hours for the last three complete minutes.
     * The 0-th element indicates the counts accumulated during the minute preceding minute_ts.
     * Present only if the device clock is synced.
     */
    by_minute?: number[];
    /** Unix timestamp marking the start of the current minute (in UTC). */
    minute_ts?: number;
  };

  /** Last measured instantaneous active power (in Watts) delivered to the attached load (shown if applicable) */
  apower?: number;

  /** Last measured voltage in Volts (shown if applicable) */
  voltage?: number;

  /** Last measured current in Amperes (shown if applicable) */
  current?: number;

  /** Error conditions occurred. May contain overtemp, (shown if at least one error is present) */
  errors?: string[];
};

export type CCTHomeySettings = {
  'CCT:initial_state': 'off' | 'on' | 'restore_last';
  'CCT:transition_duration': number;
  'CCT:min_brightness_on_toggle': number;
  'CCT:night_mode.enable': boolean;
  'CCT:night_mode.brightness_enabled': boolean;
  'CCT:night_mode.brightness': number;
  'CCT:night_mode.ct_enabled': boolean;
  'CCT:night_mode.ct': number;
  'CCT:night_mode.active_between.start': `${number}:${number}`;
  'CCT:night_mode.active_between.end': `${number}:${number}`;
  'CCT:button_fade_rate': '1' | '2' | '3' | '4' | '5';
  'CCT:button_presets.button_doublepush.enable': boolean;
  'CCT:button_presets.button_doublepush.brightness_enabled': boolean;
  'CCT:button_presets.button_doublepush.brightness': number;
  'CCT:button_presets.button_doublepush.ct_enabled': boolean;
  'CCT:button_presets.button_doublepush.ct': number;
  'CCT:range_map.min': number;
  'CCT:range_map.max': number;
  'CCT:current_limit': number;
  'CCT:power_limit': number;
  'CCT:voltage_limit': number;
};

const simpleSettingKeys = [
  'initial_state',
  'transition_duration',
  'min_brightness_on_toggle',
  'current_limit',
  'power_limit',
  'voltage_limit',
] as const satisfies (keyof CCTConfig)[];

export default class CCT extends ComponentWithId<'CCT', CCTStatus, CCTConfig, CCTHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'CCT';
  public static readonly uiName = 'CCT';

  public async Set(channel: RpcChannel, params: CCTSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  public async Toggle(channel: RpcChannel): ReturnType<typeof Toggle> {
    return Toggle(channel, this.id);
  }

  public async DimUp(channel: RpcChannel, params?: CCTDimUpParams): ReturnType<typeof DimUp> {
    return DimUp(channel, this.id, params);
  }

  public async DimDown(channel: RpcChannel, params?: CCTDimDownParams): ReturnType<typeof DimDown> {
    return DimDown(channel, this.id, params);
  }

  public async DimStop(channel: RpcChannel): ReturnType<typeof DimStop> {
    return DimStop(channel, this.id);
  }

  public async registerHomeyDevice(homeyDevice: ShellyLocalDevice, _methods: ComponentMethod<'CCT'>[]): Promise<void> {
    const onOffCapabilityListener = async (value: boolean): Promise<void> => {
      await this.Set(this.device.getChannel(), { on: value });
    };

    const dimCapabilityListener = async (value: number): Promise<void> => {
      await this.Set(this.device.getChannel(), { brightness: value * 100 });
    };

    const lightTemperatureCapabilityListener = async (value: number): Promise<void> => {
      // todo: use configured ct_range, or default value (device specific)
      await this.Set(this.device.getChannel(), { ct: Math.round(2700 + (1 - value) * (6500 - 2700)) });
    };

    for (const [statusKey, homeyCapability, capabilityListener] of [
      ['output', 'onoff', onOffCapabilityListener],
      ['brightness', 'dim', dimCapabilityListener],
      ['ct', 'light_temperature', lightTemperatureCapabilityListener],
      ['aenergy', 'meter_power'],
      ['apower', 'measure_power'],
      ['voltage', 'measure_voltage'],
      ['current', 'measure_current'],
    ] as const) {
      if (this.status[statusKey] !== undefined) {
        const capabilityOptions = capabilitiesOptions[homeyCapability as never];
        await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions, capabilityListener);
      }
    }

    // TODO errors
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    for (const capability of [
      'onoff',
      'dim',
      'light_temperature',
      'meter_power',
      'measure_power',
      'measure_voltage',
      'measure_current',
    ]) {
      await CCT.unregisterCapability(homeyDevice, capability, id);
    }
  }

  public async onStatusUpdate(
    homeyDevice: ShellyLocalDevice,
    status: RecursivePartial<CCTStatus, AllowedPrimitives>,
  ): Promise<void> {
    if (status.brightness !== undefined) {
      await this.setCapability(homeyDevice, 'dim', status.brightness / 100);
    }
    if (status.ct !== undefined) {
      // todo: use configured ct_range, or default value (device specific)
      await this.setCapability(homeyDevice, 'light_temperature', 1 - (status.ct - 2700) / (6500 - 2700));
    }
    if (status.aenergy?.total !== undefined) {
      const consumedEnergy = status.aenergy.total;
      await this.setCapability(homeyDevice, 'meter_power', consumedEnergy / 1000);
    }

    // Simple capabilities
    for (const [statusKey, homeyCapability] of [
      ['output', 'onoff'],
      ['apower', 'measure_power'],
      ['voltage', 'measure_voltage'],
      ['current', 'measure_current'],
    ] as const) {
      if (status[statusKey] !== undefined) {
        await this.setCapability(homeyDevice, homeyCapability, status[statusKey]);
      }
    }
    // TODO errors
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: CCTConfig): Promise<void> {
    const newSettings: RecursivePartial<CCTHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`CCT:${settingKey}`] = config[settingKey] as never;
      }
    }

    if (config.night_mode !== undefined) {
      if (config.night_mode.enable !== undefined) {
        newSettings['CCT:night_mode.enable'] = config.night_mode.enable;
      }
      if (config.night_mode.brightness !== undefined) {
        newSettings['CCT:night_mode.brightness_enabled'] = config.night_mode.brightness !== null;
        if (config.night_mode.brightness !== null) {
          newSettings['CCT:night_mode.brightness'] = config.night_mode.brightness;
        }
      }
      if (config.night_mode.ct !== undefined) {
        newSettings['CCT:night_mode.ct_enabled'] = config.night_mode.ct !== null;
        if (config.night_mode.ct !== null) {
          newSettings['CCT:night_mode.ct'] = config.night_mode.ct;
        }
      }
      const nightModePeriod = config.night_mode.active_between;
      if (nightModePeriod !== undefined && nightModePeriod.length === 2) {
        const [start, end] = nightModePeriod;
        newSettings['CCT:night_mode.active_between.start'] = start;
        newSettings['CCT:night_mode.active_between.end'] = end;
      }
    }

    if (config.button_fade_rate !== undefined) {
      newSettings['CCT:button_fade_rate'] = `${config.button_fade_rate}`;
    }

    const buttonDoublePushPreset = config.button_presets?.button_doublepush;

    if (buttonDoublePushPreset !== undefined) {
      newSettings['CCT:button_presets.button_doublepush.enable'] = buttonDoublePushPreset !== null;
      if (buttonDoublePushPreset !== null) {
        newSettings['CCT:button_presets.button_doublepush.brightness_enabled'] =
          buttonDoublePushPreset.brightness !== null;
        if (buttonDoublePushPreset.brightness !== null) {
          newSettings['CCT:button_presets.button_doublepush.brightness'] = buttonDoublePushPreset.brightness;
        }
        newSettings['CCT:button_presets.button_doublepush.ct_enabled'] = buttonDoublePushPreset.ct !== null;
        if (buttonDoublePushPreset.ct !== null) {
          newSettings['CCT:button_presets.button_doublepush.ct'] = buttonDoublePushPreset.ct;
        }
      }
    }

    if (config.range_map !== undefined) {
      if (config.range_map === null) {
        newSettings['CCT:range_map.min'] = 0;
        newSettings['CCT:range_map.max'] = 100;
      } else if (config.range_map.length === 2) {
        const [min, max] = config.range_map;
        newSettings['CCT:range_map.min'] = min;
        newSettings['CCT:range_map.max'] = max;
      }
    }

    homeyDevice.debug(newSettings);
    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<CCTHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<CCTConfig, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      const homeySettingKey = `CCT:${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[settingKey] = newSettings[homeySettingKey] as never;
      }
    }

    if (
      includesAny<CCTHomeySettings>(changedKeys, [
        'CCT:night_mode.enable',
        'CCT:night_mode.brightness_enabled',
        'CCT:night_mode.brightness',
        'CCT:night_mode.ct_enabled',
        'CCT:night_mode.ct',
      ])
    ) {
      changedConfig.night_mode = {
        enable: newSettings['CCT:night_mode.enable'],
        brightness: newSettings['CCT:night_mode.brightness_enabled'] ? newSettings['CCT:night_mode.brightness'] : null,
        ct: newSettings['CCT:night_mode.ct_enabled'] ? newSettings['CCT:night_mode.ct'] : null,
      };
    }

    if (
      changedKeys.includes('CCT:night_mode.active_between.start') ||
      changedKeys.includes('CCT:night_mode.active_between.end')
    ) {
      deepAssign(changedConfig, {
        night_mode: parseNightModeActiveBetween(
          homeyDevice,
          'CCT',
          newSettings['CCT:night_mode.active_between.start'],
          newSettings['CCT:night_mode.active_between.end'],
        ),
      });
    }

    if (changedKeys.includes('CCT:button_fade_rate')) {
      changedConfig.button_fade_rate = parseInt(newSettings['CCT:button_fade_rate']) as 1 | 2 | 3 | 4 | 5;
    }

    if (
      includesAny<CCTHomeySettings>(changedKeys, [
        'CCT:button_presets.button_doublepush.enable',
        'CCT:button_presets.button_doublepush.brightness_enabled',
        'CCT:button_presets.button_doublepush.brightness',
        'CCT:button_presets.button_doublepush.ct_enabled',
        'CCT:button_presets.button_doublepush.ct',
      ])
    ) {
      const enabled = newSettings['CCT:button_presets.button_doublepush.enable'];
      const brightness = newSettings['CCT:button_presets.button_doublepush.brightness_enabled']
        ? newSettings['CCT:button_presets.button_doublepush.brightness']
        : null;
      const ct = newSettings['CCT:button_presets.button_doublepush.ct_enabled']
        ? newSettings['CCT:button_presets.button_doublepush.ct']
        : null;
      deepAssign(changedConfig, { button_presets: { button_doublepush: enabled ? { brightness, ct } : null } });
    }

    if (includesAny<CCTHomeySettings>(changedKeys, ['CCT:range_map.min', 'CCT:range_map.max'])) {
      changedConfig.range_map = [newSettings['CCT:range_map.min'], newSettings['CCT:range_map.max']];
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }
}
