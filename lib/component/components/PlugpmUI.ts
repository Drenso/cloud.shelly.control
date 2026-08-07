import { type AllowedPrimitives, ComponentWithoutId } from '../Component.js';
import { parseNightModeActiveBetween } from '../util/NightMode.js';
import GetConfig from './PlugpmUI/GetConfig.js';
import SetConfig from './PlugpmUI/SetConfig.js';
import GetStatus from './PlugpmUI/GetStatus.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import { deepAssign, type RecursivePartial } from '../../util.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';

export type PlugpmUIStatus = Record<string, never>;

export type PlugpmUIConfig = {
  /** LED configuration */
  leds: {
    /**
     * LED indication mode
     * The color mode is valid for all 4 channels.
     * 'power' - LED indication according to the power consumption
     * 'switch' - LED indication according to the user-defined values for output state on
     * 'off' - disabled LED indication
     */
    mode: 'power' | 'switch' | 'off';
    /** LED colors and brightness in RGB format */
    colors: {
      /** PM1 component instance */
      'pm1:0': {
        /** LED configuration for output state on */
        on: LedConfiguration;
      };
      /** LED brightness for LED indication mode power */
      power: {
        /** range 0-100 */
        brightness: number;
      };
    };
    /** LED configuration for night mode */
    night_mode: {
      /** Enable or disable night mode */
      enable: boolean;
      /** range 0-100 */
      brightness: number;
      /**
       * start and end time of night_mode in format HH:MM
       * range 00:00 - 23:59
       */
      active_between: [`${number}:${number}`, `${number}:${number}`] | [];
    };
  };
};

export type LedConfiguration = {
  /** range 0-100 */
  rgb: [number, number, number] | null;
  /** range 0-100 */
  brightness: number;
};

export type PlugpmUIHomeySettings = {
  'PLUGPM_UI:leds.mode': 'power' | 'switch' | 'off';
  'PLUGPM_UI:leds.colors.power.brightness': number;
  'PLUGPM_UI:leds.colors.pm1:0.on.brightness': number;
  'PLUGPM_UI:leds.colors.pm1:0.on.r': number;
  'PLUGPM_UI:leds.colors.pm1:0.on.g': number;
  'PLUGPM_UI:leds.colors.pm1:0.on.b': number;
  'PLUGPM_UI:leds.night_mode.enable': boolean;
  'PLUGPM_UI:leds.night_mode.brightness': number;
  'PLUGPM_UI:leds.night_mode.active_between.start': `${number}:${number}`;
  'PLUGPM_UI:leds.night_mode.active_between.end': `${number}:${number}`;
};

/**
 * The PLUGPM_UI component handles the settings of a Shelly AZ Plug device's LEDs.
 */
export default class PlugpmUI extends ComponentWithoutId<
  'PLUGPM_UI',
  PlugpmUIStatus,
  PlugpmUIConfig,
  PlugpmUIHomeySettings
> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'PLUGPM_UI';
  public static readonly uiName = 'Plug';
  protected static readonly key = 'plugpm_ui';

  public async registerHomeyDevice(
    _homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'PLUGPM_UI'>[],
  ): Promise<void> {}

  protected async staticallyUnregisterHomeyDevice(this: never, _homeyDevice: ShellyLocalDevice): Promise<void> {}

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: PlugpmUIStatus): Promise<void> {}

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: PlugpmUIConfig): Promise<void> {
    const newSettings: Partial<PlugpmUIHomeySettings> = {
      'PLUGPM_UI:leds.mode': config.leds.mode,
      'PLUGPM_UI:leds.colors.power.brightness': config.leds.colors.power.brightness,
      'PLUGPM_UI:leds.colors.pm1:0.on.brightness': config.leds.colors['pm1:0'].on.brightness,
      'PLUGPM_UI:leds.night_mode.enable': config.leds.night_mode.enable,
      'PLUGPM_UI:leds.night_mode.brightness': config.leds.night_mode.brightness,
    };
    const onRgb = config.leds.colors['pm1:0'].on.rgb;
    if (onRgb !== null) {
      const [r, g, b] = onRgb;
      newSettings['PLUGPM_UI:leds.colors.pm1:0.on.r'] = r;
      newSettings['PLUGPM_UI:leds.colors.pm1:0.on.g'] = g;
      newSettings['PLUGPM_UI:leds.colors.pm1:0.on.b'] = b;
    }
    const nightModePeriod = config.leds.night_mode.active_between;
    if (nightModePeriod.length === 2) {
      const [start, end] = nightModePeriod;
      newSettings['PLUGPM_UI:leds.night_mode.active_between.start'] = start;
      newSettings['PLUGPM_UI:leds.night_mode.active_between.end'] = end;
    }
    await homeyDevice.setComponentSettings(this.namespace, undefined, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<PlugpmUIHomeySettings>,
  ): Promise<boolean> {
    const changedConfigs: RecursivePartial<PlugpmUIConfig, AllowedPrimitives> = {};
    if (changedKeys.includes('PLUGPM_UI:leds.mode')) {
      const newSetting = newSettings['PLUGPM_UI:leds.mode'];
      deepAssign(changedConfigs, { leds: { mode: newSetting } });
    }

    if (changedKeys.includes('PLUGPM_UI:leds.colors.power.brightness')) {
      const newSetting = newSettings['PLUGPM_UI:leds.colors.power.brightness'];
      deepAssign(changedConfigs, {
        leds: { colors: { power: { brightness: newSetting } } },
      });
    }

    if (changedKeys.includes('PLUGPM_UI:leds.colors.pm1:0.on.brightness')) {
      const newSetting = newSettings['PLUGPM_UI:leds.colors.pm1:0.on.brightness'];
      deepAssign(changedConfigs, {
        leds: {
          colors: {
            'pm1:0': { on: { brightness: newSetting } },
          },
        },
      });
    }

    if (
      changedKeys.includes('PLUGPM_UI:leds.colors.pm1:0.on.r') ||
      changedKeys.includes('PLUGPM_UI:leds.colors.pm1:0.on.g') ||
      changedKeys.includes('PLUGPM_UI:leds.colors.pm1:0.on.b')
    ) {
      const r = newSettings['PLUGPM_UI:leds.colors.pm1:0.on.r'];
      const g = newSettings['PLUGPM_UI:leds.colors.pm1:0.on.g'];
      const b = newSettings['PLUGPM_UI:leds.colors.pm1:0.on.b'];
      deepAssign(changedConfigs, {
        leds: { colors: { 'pm1:0': { on: { rgb: [r, g, b] } } } },
      });
    }

    if (changedKeys.includes('PLUGPM_UI:leds.night_mode.enable')) {
      const newSetting = newSettings['PLUGPM_UI:leds.night_mode.enable'];
      deepAssign(changedConfigs, { leds: { night_mode: { enable: newSetting } } });
    }

    if (changedKeys.includes('PLUGPM_UI:leds.night_mode.brightness')) {
      const newSetting = newSettings['PLUGPM_UI:leds.night_mode.brightness'];
      deepAssign(changedConfigs, { leds: { night_mode: { brightness: newSetting } } });
    }

    if (
      changedKeys.includes('PLUGPM_UI:leds.night_mode.active_between.start') ||
      changedKeys.includes('PLUGPM_UI:leds.night_mode.active_between.end')
    ) {
      deepAssign(changedConfigs, {
        leds: {
          night_mode: parseNightModeActiveBetween(
            homeyDevice,
            'PLUGPM_UI',
            newSettings['PLUGPM_UI:leds.night_mode.active_between.start'],
            newSettings['PLUGPM_UI:leds.night_mode.active_between.end'],
          ),
        },
      });
    }

    if (Object.keys(changedConfigs).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfigs });
    return result.result.restart_required;
  }
}
