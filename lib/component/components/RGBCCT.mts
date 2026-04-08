import convert from 'color-convert';
import type ShellyLocalDevice from '../../Device.mjs';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { deepAssign, includesAny, type RecursivePartial } from '../../util.mjs';
import { type AllowedPrimitives, ComponentWithId } from '../Component.mjs';
import { parseNightModeActiveBetween } from '../util/NightMode.mjs';
import DimDown, { type RGBCCTDimDownParams } from './RGBCCT/DimDown.mjs';
import DimStop from './RGBCCT/DimStop.mjs';
import DimUp, { type RGBCCTDimUpParams } from './RGBCCT/DimUp.mjs';
import GetConfig from './RGBCCT/GetConfig.mjs';
import GetStatus from './RGBCCT/GetStatus.mjs';
import Set, { type RGBCCTSetParams } from './RGBCCT/Set.mjs';
import SetConfig from './RGBCCT/SetConfig.mjs';
import Toggle from './RGBCCT/Toggle.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';

export type RGBCCTConfig = {
  /** Id of the RGBCCT component instance */
  id: number;

  /** Name of the RGBCCT instance */
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

  /** Transition time (in seconds) - time to change from 0% to 100% of brightness, RGB levels or color temperature value */
  transition_duration?: number;

  /** Brightness level (in percent) applied when there is a toggle and current brightness is lower than min_brightness_on_toggle. */
  min_brightness_on_toggle: number;

  /** Night mode configuration */
  night_mode: {
    /** Enable or disable night mode */
    enable: boolean;

    /** Brightness level limit when night mode is active. null overrides night_mode.brightness with current brightness when night mode starts. Default value 50. */
    brightness: number | null;

    /** Color level when night mode is active. Red, Green, Blue [r,g,b] - each value represents level between 0..255. null overrides night_mode.rgb array with current rgb array when night mode starts. Default value 255 for each color */
    rgb: [number, number, number] | null;

    /** Color temperature level limit (in Kelvin) when night mode is active. null overrides night_mode.ct value with current ct value when night mode starts. Default value: 50% of ct_range. For DuoBulbG3: 4600 */
    ct: number | null;

    /** Operating mode of the light output when night mode is active. Range of values: rgb, cct or null. null overrides night_mode.mode value with current mode when night mode starts. Default value: rgb */
    mode: 'rgb' | 'cct' | null;

    /** Containing 2 elements of type string, the first element indicates the start of the period during which the night mode will be active, the second indicates the end of that period. Both start and end are strings in the format HH:MM, where HH and MM are hours and minutes with optional leading zeros */
    active_between: [`${number}:${number}`, `${number}:${number}`] | [];
  };
};

export type RGBCCTStatus = {
  /** Id of the RGBCCT component instance */
  id: number;

  /** Source of the last command, for example: init, WS_in, http, ... */
  source: string;

  /** Tag used to identify the origin of a state change */
  tag: string | null;

  /** Current operating mode of the light output, rgb or cct */
  mode: 'rgb' | 'cct';

  /** True if the output channel is currently on, false otherwise */
  output: boolean;

  /** Current Red, Green, Blue [r,g,b] level 0..255 */
  rgb: [number, number, number];

  /** Current color temperature level (in Kelvin) */
  ct: number;

  /** Current brightness level (in percent) */
  brightness: number;

  /** Unix timestamp, start time of the timer (in UTC) (shown if the timer is triggered) */
  timer_started_at?: number;

  /** Duration of the timer in seconds (shown if the timer is triggered) */
  timer_duration?: number;

  /** Information about the transition (shown if transition is triggered) */
  transition?: {
    target: {
      /** True if the output channel becomes on, false otherwise */
      output: boolean;
      /** Red, Green, Blue [r,g,b] level 0..255 */
      rgb: [number, number, number];
      /** Color temperature level (in Kelvin) */
      ct: number;
      /** Brightness level (in percent) */
      brightness: number;
    };
    /** Unix timestamp, start time of the transition (in UTC) */
    started_at: number;
    /** Duration of the transition in seconds */
    duration: number;
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
};

export type RGBCCTHomeySettings = {
  'RGBCCT:initial_state': 'off' | 'on' | 'restore_last';
  'RGBCCT:transition_duration': number;
  'RGBCCT:min_brightness_on_toggle': number;
  'RGBCCT:night_mode.enable': boolean;
  'RGBCCT:night_mode.brightness_enabled': boolean;
  'RGBCCT:night_mode.brightness': number;
  'RGBCCT:night_mode.rgb_enabled': boolean;
  'RGBCCT:night_mode.rgb_r': number;
  'RGBCCT:night_mode.rgb_g': number;
  'RGBCCT:night_mode.rgb_b': number;
  'RGBCCT:night_mode.ct_enabled': boolean;
  'RGBCCT:night_mode.ct': number;
  'RGBCCT:night_mode.active_between.start': `${number}:${number}`;
  'RGBCCT:night_mode.active_between.end': `${number}:${number}`;
};

const simpleSettingKeys = [
  'initial_state',
  'transition_duration',
  'min_brightness_on_toggle',
] as const satisfies (keyof RGBCCTConfig)[];

export default class RGBCCT extends ComponentWithId<'RGBCCT', RGBCCTStatus, RGBCCTConfig, RGBCCTHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'RGBCCT';
  public static readonly uiName = 'RGBCCT';

  public async Set(channel: RpcChannel, params: RGBCCTSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  public async Toggle(channel: RpcChannel): ReturnType<typeof Toggle> {
    return Toggle(channel, this.id);
  }

  public async DimUp(channel: RpcChannel, params?: RGBCCTDimUpParams): ReturnType<typeof DimUp> {
    return DimUp(channel, this.id, params);
  }

  public async DimDown(channel: RpcChannel, params?: RGBCCTDimDownParams): ReturnType<typeof DimDown> {
    return DimDown(channel, this.id, params);
  }

  public async DimStop(channel: RpcChannel): ReturnType<typeof DimStop> {
    return DimStop(channel, this.id);
  }

  public async register(_methods: ComponentMethod<'RGBCCT'>[]): Promise<void> {}

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'RGBCCT'>[],
  ): Promise<void> {
    {
      // output
      const capabilityId = 'onoff';
      await this.registerCapability(homeyDevice, 'output', capabilityId);
      homeyDevice.registerCapabilityListener(capabilityId, async (value: boolean) => {
        await this.Set(this.device.getChannel(), { on: value });
      });
    }

    {
      // brightness
      const capabilityId = 'dim';
      await this.registerCapability(homeyDevice, 'brightness', capabilityId);
      homeyDevice.registerCapabilityListener(capabilityId, async (value: number) => {
        await this.Set(this.device.getChannel(), {
          brightness: value * 100,
        });
      });
    }

    {
      // rgbcct
      const capabilityIds = ['light_mode', 'light_temperature', 'light_hue', 'light_saturation'];
      for (const capabilityId of capabilityIds) {
        await homeyDevice.safeAddCapability(capabilityId);
      }

      homeyDevice.registerCapabilityListener('light_mode', async value => {
        await this.Set(this.device.getChannel(), {
          mode: value === 'color' ? 'rgb' : 'cct',
        });
      });

      homeyDevice.registerCapabilityListener('light_temperature', async value => {
        await this.Set(this.device.getChannel(), {
          ct: Math.round(2700 + (1 - value) * (6500 - 2700)),
        });
      });

      homeyDevice.registerMultipleCapabilityListener(['light_hue', 'light_saturation'], async values => {
        await this.Set(this.device.getChannel(), {
          rgb: convert.hsv.rgb(values.light_hue * 360, values.light_saturation * 100, 100),
        });
      });
    }

    await this.registerCapability(homeyDevice, 'aenergy', 'meter_power');
    await this.registerCapability(homeyDevice, 'apower', 'measure_power');
    // TODO errors

    // Set correct capability values
    await this.onStatusUpdate(homeyDevice, this.status);
    // Set correct setting values
    await this.onConfigUpdate(homeyDevice, this.config);
  }

  public async onStatusUpdate(
    homeyDevice: ShellyLocalDevice,
    status: RecursivePartial<RGBCCTStatus, AllowedPrimitives>,
  ): Promise<void> {
    await this.updateMeasured(homeyDevice, status, 'output', 'onoff');
    if (status.brightness !== undefined) {
      await homeyDevice.safeSetCapability('dim', status.brightness / 100);
    }
    if (status.ct !== undefined) {
      await homeyDevice.safeSetCapability('light_temperature', 1 - (status.ct - 2700) / (6500 - 2700));
    }
    if (status.rgb !== undefined) {
      const hsv = convert.rgb.hsv(status.rgb[0], status.rgb[1], status.rgb[2]);
      await homeyDevice.safeSetCapability('light_hue', hsv[0] / 360);
      await homeyDevice.safeSetCapability('light_saturation', hsv[1] / 100);
    }
    if (status.mode !== undefined) {
      await homeyDevice.safeSetCapability('light_mode', status.mode === 'rgb' ? 'color' : 'temperature');
    }
    if (status.aenergy?.total !== undefined) {
      const consumedEnergy = status.aenergy.total;
      await homeyDevice.safeSetCapability('meter_power', consumedEnergy / 1000);
    }
    await this.updateMeasured(homeyDevice, status, 'apower', 'measure_power');
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: RGBCCTConfig): Promise<void> {
    const newSettings: RecursivePartial<RGBCCTHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`RGBCCT:${settingKey}`] = config[settingKey] as never;
      }
    }

    if (config.night_mode !== undefined) {
      if (config.night_mode.enable !== undefined) {
        newSettings['RGBCCT:night_mode.enable'] = config.night_mode.enable;
      }
      if (config.night_mode.brightness !== undefined) {
        newSettings['RGBCCT:night_mode.brightness_enabled'] = config.night_mode.brightness !== null;
        if (config.night_mode.brightness !== null) {
          newSettings['RGBCCT:night_mode.brightness'] = config.night_mode.brightness;
        }
      }
      if (config.night_mode.ct !== undefined) {
        newSettings['RGBCCT:night_mode.ct_enabled'] = config.night_mode.ct !== null;
        if (config.night_mode.ct !== null) {
          newSettings['RGBCCT:night_mode.ct'] = config.night_mode.ct;
        }
      }
      if (config.night_mode.rgb !== undefined) {
        newSettings['RGBCCT:night_mode.rgb_enabled'] = config.night_mode.rgb !== null;
        if (config.night_mode.rgb !== null) {
          newSettings['RGBCCT:night_mode.rgb_r'] = config.night_mode.rgb[0];
          newSettings['RGBCCT:night_mode.rgb_g'] = config.night_mode.rgb[1];
          newSettings['RGBCCT:night_mode.rgb_b'] = config.night_mode.rgb[2];
        }
      }
      const nightModePeriod = config.night_mode.active_between;
      if (nightModePeriod !== undefined && nightModePeriod.length === 2) {
        const [start, end] = nightModePeriod;
        newSettings['RGBCCT:night_mode.active_between.start'] = start;
        newSettings['RGBCCT:night_mode.active_between.end'] = end;
      }
    }

    homeyDevice.debug(newSettings);
    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<RGBCCTHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<RGBCCTConfig, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      const homeySettingKey = `RGBCCT:${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[settingKey] = newSettings[homeySettingKey] as never;
      }
    }

    if (
      includesAny<RGBCCTHomeySettings>(changedKeys, [
        'RGBCCT:night_mode.enable',
        'RGBCCT:night_mode.brightness_enabled',
        'RGBCCT:night_mode.brightness',
        'RGBCCT:night_mode.ct_enabled',
        'RGBCCT:night_mode.ct',
        'RGBCCT:night_mode.rgb_enabled',
        'RGBCCT:night_mode.rgb_r',
        'RGBCCT:night_mode.rgb_g',
        'RGBCCT:night_mode.rgb_b',
      ])
    ) {
      changedConfig.night_mode = {
        enable: newSettings['RGBCCT:night_mode.enable'],
        brightness: newSettings['RGBCCT:night_mode.brightness_enabled']
          ? newSettings['RGBCCT:night_mode.brightness']
          : null,
        ct: newSettings['RGBCCT:night_mode.ct_enabled'] ? newSettings['RGBCCT:night_mode.ct'] : null,
        rgb: newSettings['RGBCCT:night_mode.rgb_enabled']
          ? [
              newSettings['RGBCCT:night_mode.rgb_r'],
              newSettings['RGBCCT:night_mode.rgb_g'],
              newSettings['RGBCCT:night_mode.rgb_b'],
            ]
          : null,
      };
    }

    if (
      changedKeys.includes('RGBCCT:night_mode.active_between.start') ||
      changedKeys.includes('RGBCCT:night_mode.active_between.end')
    ) {
      deepAssign(changedConfig, {
        night_mode: parseNightModeActiveBetween(
          homeyDevice,
          'RGBCCT',
          newSettings['RGBCCT:night_mode.active_between.start'],
          newSettings['RGBCCT:night_mode.active_between.end'],
        ),
      });
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }

  protected async registerCapability(
    homeyDevice: ShellyLocalDevice,
    statusProperty: keyof RGBCCTStatus,
    homeyCapability: string,
  ): Promise<void> {
    if (this.status[statusProperty] === undefined) {
      return;
    }

    await homeyDevice.safeAddCapability(homeyCapability);
  }

  private async updateMeasured(
    homeyDevice: ShellyLocalDevice,
    status: RecursivePartial<RGBCCTStatus, AllowedPrimitives>,
    statusProperty: keyof RGBCCTStatus,
    homeyCapability: string,
  ): Promise<void> {
    if (status[statusProperty] === undefined) {
      return;
    }

    await homeyDevice.safeSetCapability(homeyCapability, status[statusProperty]).catch(homeyDevice.error);
  }
}
