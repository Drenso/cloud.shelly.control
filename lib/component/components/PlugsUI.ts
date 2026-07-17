import { type AllowedPrimitives, ComponentWithoutId } from '../Component.js';
import { parseNightModeActiveBetween } from '../util/NightMode.js';
import GetConfig from './PlugsUI/GetConfig.js';
import SetConfig from './PlugsUI/SetConfig.js';
import GetStatus from './PlugsUI/GetStatus.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import { deepAssign, type RecursivePartial } from '../../util.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';

export type PlugsUIStatus = Record<string, never>;

export type PlugsUIConfig = {
  // LED configuration
  leds: {
    /**
     * LED indication mode
     * The color mode is valid for all 4 channels.
     * 'power' - LED indication according to the power consumption
     * 'switch' - LED indication according to the user-defined values for output state on/off
     * 'off' - disabled LED indication
     */
    mode: 'power' | 'switch' | 'off';
    // LED colors and brightness in RGB format
    colors: {
      // Switch component instance
      'switch:0': {
        // LED configuration for output state on
        on: LedConfiguration;
        // LED configuration for output state off
        off: LedConfiguration;
      };
      // LED brightness for LED indication mode power
      power: {
        // range 0-100
        brightness: number;
      };
    };
    // LED configuration for night mode
    night_mode: {
      // Enable or disable night mode
      enable: boolean;
      // range 0-100
      brightness: number;
      // start and end time of night_mode in format HH:MM
      // range 00:00 - 23:59
      active_between: [`${number}:${number}`, `${number}:${number}`] | [];
    };
  };
  controls: {
    'switch:0': PlugsUISwitchControl;
  };
};

export type LedConfiguration = {
  // range 0-100
  rgb: [number, number, number] | null;
  // range 0-100
  brightness: number;
};

export type PlugsUISwitchControl = {
  /**
   * Button mode
   * 'momentary' - Button switches on/off the relay
   * 'detached' - Button is detached from the relay
   */
  in_mode: 'momentary' | 'detached';
};

export type PlugsUIHomeySettings = {
  'PLUGS_UI:leds.mode': 'power' | 'switch' | 'off';
  'PLUGS_UI:leds.colors.power.brightness': number;
  'PLUGS_UI:leds.colors.switch:0.on.brightness': number;
  'PLUGS_UI:leds.colors.switch:0.on.r': number;
  'PLUGS_UI:leds.colors.switch:0.on.g': number;
  'PLUGS_UI:leds.colors.switch:0.on.b': number;
  'PLUGS_UI:leds.colors.switch:0.off.brightness': number;
  'PLUGS_UI:leds.colors.switch:0.off.r': number;
  'PLUGS_UI:leds.colors.switch:0.off.g': number;
  'PLUGS_UI:leds.colors.switch:0.off.b': number;
  'PLUGS_UI:leds.night_mode.enable': boolean;
  'PLUGS_UI:leds.night_mode.brightness': number;
  'PLUGS_UI:leds.night_mode.active_between.start': `${number}:${number}`;
  'PLUGS_UI:leds.night_mode.active_between.end': `${number}:${number}`;
  'PLUGS_UI:controls.switch.in_mode': 'momentary' | 'detached';
};

/**
 * The PLUGS_UI component handles the settings of a Shelly AZ Plug device's LEDs.
 */
export default class PlugsUI extends ComponentWithoutId<
  'PLUGS_UI',
  PlugsUIStatus,
  PlugsUIConfig,
  PlugsUIHomeySettings
> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'PLUGS_UI';
  public static readonly uiName = 'Plug';
  protected static readonly key = 'plugs_ui';

  public async registerHomeyDevice(
    _homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'PLUGS_UI'>[],
  ): Promise<void> {}

  protected async staticallyUnregisterHomeyDevice(this: never, _homeyDevice: ShellyLocalDevice): Promise<void> {}

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: PlugsUIStatus): Promise<void> {}

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: PlugsUIConfig): Promise<void> {
    const newSettings: Partial<PlugsUIHomeySettings> = {
      'PLUGS_UI:leds.mode': config.leds.mode,
      'PLUGS_UI:leds.colors.power.brightness': config.leds.colors.power.brightness,
      'PLUGS_UI:leds.colors.switch:0.on.brightness': config.leds.colors['switch:0'].on.brightness,
      'PLUGS_UI:leds.colors.switch:0.off.brightness': config.leds.colors['switch:0'].off.brightness,
      'PLUGS_UI:leds.night_mode.enable': config.leds.night_mode.enable,
      'PLUGS_UI:leds.night_mode.brightness': config.leds.night_mode.brightness,
    };
    const onRgb = config.leds.colors['switch:0'].on.rgb;
    if (onRgb !== null) {
      const [r, g, b] = onRgb;
      newSettings['PLUGS_UI:leds.colors.switch:0.on.r'] = r;
      newSettings['PLUGS_UI:leds.colors.switch:0.on.g'] = g;
      newSettings['PLUGS_UI:leds.colors.switch:0.on.b'] = b;
    }
    const offRgb = config.leds.colors['switch:0'].off.rgb;
    if (offRgb !== null) {
      const [r, g, b] = offRgb;
      newSettings['PLUGS_UI:leds.colors.switch:0.off.r'] = r;
      newSettings['PLUGS_UI:leds.colors.switch:0.off.g'] = g;
      newSettings['PLUGS_UI:leds.colors.switch:0.off.b'] = b;
    }
    const nightModePeriod = config.leds.night_mode.active_between;
    if (nightModePeriod.length === 2) {
      const [start, end] = nightModePeriod;
      newSettings['PLUGS_UI:leds.night_mode.active_between.start'] = start;
      newSettings['PLUGS_UI:leds.night_mode.active_between.end'] = end;
    }
    const switchId = homeyDevice.getTypedData().subdevice_id;
    if (switchId !== undefined && switchId >= 0 && switchId <= 3) {
      newSettings['PLUGS_UI:controls.switch.in_mode'] = config.controls['switch:0'].in_mode;
    }
    await homeyDevice.setComponentSettings(this.namespace, undefined, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<PlugsUIHomeySettings>,
  ): Promise<boolean> {
    const changedConfigs: RecursivePartial<PlugsUIConfig, AllowedPrimitives> = {};
    if (changedKeys.includes('PLUGS_UI:leds.mode')) {
      const newSetting = newSettings['PLUGS_UI:leds.mode'];
      deepAssign(changedConfigs, { leds: { mode: newSetting } });
    }

    if (changedKeys.includes('PLUGS_UI:leds.colors.power.brightness')) {
      const newSetting = newSettings['PLUGS_UI:leds.colors.power.brightness'];
      deepAssign(changedConfigs, {
        leds: { colors: { power: { brightness: newSetting } } },
      });
    }

    if (changedKeys.includes('PLUGS_UI:leds.colors.switch:0.on.brightness')) {
      const newSetting = newSettings['PLUGS_UI:leds.colors.switch:0.on.brightness'];
      deepAssign(changedConfigs, {
        leds: {
          colors: {
            'switch:0': { on: { brightness: newSetting } },
          },
        },
      });
    }

    if (
      changedKeys.includes('PLUGS_UI:leds.colors.switch:0.on.r') ||
      changedKeys.includes('PLUGS_UI:leds.colors.switch:0.on.g') ||
      changedKeys.includes('PLUGS_UI:leds.colors.switch:0.on.b')
    ) {
      const r = newSettings['PLUGS_UI:leds.colors.switch:0.on.r'];
      const g = newSettings['PLUGS_UI:leds.colors.switch:0.on.g'];
      const b = newSettings['PLUGS_UI:leds.colors.switch:0.on.b'];
      deepAssign(changedConfigs, {
        leds: { colors: { 'switch:0': { on: { rgb: [r, g, b] } } } },
      });
    }

    if (changedKeys.includes('PLUGS_UI:leds.colors.switch:0.off.brightness')) {
      const newSetting = newSettings['PLUGS_UI:leds.colors.switch:0.off.brightness'];
      deepAssign(changedConfigs, {
        leds: {
          colors: {
            'switch:0': { off: { brightness: newSetting } },
          },
        },
      });
    }

    if (
      changedKeys.includes('PLUGS_UI:leds.colors.switch:0.off.r') ||
      changedKeys.includes('PLUGS_UI:leds.colors.switch:0.off.g') ||
      changedKeys.includes('PLUGS_UI:leds.colors.switch:0.off.b')
    ) {
      const r = newSettings['PLUGS_UI:leds.colors.switch:0.off.r'];
      const g = newSettings['PLUGS_UI:leds.colors.switch:0.off.g'];
      const b = newSettings['PLUGS_UI:leds.colors.switch:0.off.b'];
      deepAssign(changedConfigs, {
        leds: { colors: { 'switch:0': { off: { rgb: [r, g, b] } } } },
      });
    }

    if (changedKeys.includes('PLUGS_UI:leds.night_mode.enable')) {
      const newSetting = newSettings['PLUGS_UI:leds.night_mode.enable'];
      deepAssign(changedConfigs, { leds: { night_mode: { enable: newSetting } } });
    }

    if (changedKeys.includes('PLUGS_UI:leds.night_mode.brightness')) {
      const newSetting = newSettings['PLUGS_UI:leds.night_mode.brightness'];
      deepAssign(changedConfigs, { leds: { night_mode: { brightness: newSetting } } });
    }

    if (
      changedKeys.includes('PLUGS_UI:leds.night_mode.active_between.start') ||
      changedKeys.includes('PLUGS_UI:leds.night_mode.active_between.end')
    ) {
      deepAssign(changedConfigs, {
        leds: {
          night_mode: parseNightModeActiveBetween(
            homeyDevice,
            'PLUGS_UI',
            newSettings['PLUGS_UI:leds.night_mode.active_between.start'],
            newSettings['PLUGS_UI:leds.night_mode.active_between.end'],
          ),
        },
      });
    }

    if (changedKeys.includes('PLUGS_UI:controls.switch.in_mode')) {
      const newSetting = newSettings['PLUGS_UI:controls.switch.in_mode'];
      deepAssign(changedConfigs, { controls: { ['switch:0']: { in_mode: newSetting } } });
    }

    if (Object.keys(changedConfigs).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfigs });
    return result.result.restart_required;
  }
}
