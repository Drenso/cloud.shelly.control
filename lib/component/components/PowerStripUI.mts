import { type AllowedPrimitives, ComponentWithoutId } from '../Component.mjs';
import GetConfig from './PowerStripUI/GetConfig.mjs';
import SetConfig from './PowerStripUI/SetConfig.mjs';
import GetStatus from './PowerStripUI/GetStatus.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import { deepAssign, type RecursivePartial } from '../../util.mjs';
import type ShellyLocalDevice from '../../Device.mjs';

export type PowerStripUIStatus = Record<string, never>;

export type PowerStripUIConfig = {
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
      // NOTE: Even though this says switch:0 it is used for all switches
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
    'switch:0': PowerStripUISwitchControl;
    'switch:1': PowerStripUISwitchControl;
    'switch:2': PowerStripUISwitchControl;
    'switch:3': PowerStripUISwitchControl;
  };
};

export type LedConfiguration = {
  // range 0-100
  rgb: [number, number, number] | null;
  // range 0-100
  brightness: number;
};

export type PowerStripUISwitchControl = {
  /**
   * Button mode
   * 'momentary' - Button switches on/off the relay
   * 'detached' - Button is detached from the relay
   */
  in_mode: 'momentary' | 'detached';
};

export type PowerStripUIHomeySettings = {
  'POWERSTRIP_UI:leds.mode': 'power' | 'switch' | 'off';
  'POWERSTRIP_UI:leds.colors.power.brightness': number;
  'POWERSTRIP_UI:leds.colors.switch:0.on.brightness': number;
  'POWERSTRIP_UI:leds.colors.switch:0.on.r': number;
  'POWERSTRIP_UI:leds.colors.switch:0.on.g': number;
  'POWERSTRIP_UI:leds.colors.switch:0.on.b': number;
  'POWERSTRIP_UI:leds.colors.switch:0.off.brightness': number;
  'POWERSTRIP_UI:leds.colors.switch:0.off.r': number;
  'POWERSTRIP_UI:leds.colors.switch:0.off.g': number;
  'POWERSTRIP_UI:leds.colors.switch:0.off.b': number;
  'POWERSTRIP_UI:leds.night_mode.enable': boolean;
  'POWERSTRIP_UI:leds.night_mode.brightness': number;
  'POWERSTRIP_UI:leds.night_mode.active_between.start': `${number}:${number}`;
  'POWERSTRIP_UI:leds.night_mode.active_between.end': `${number}:${number}`;
  'POWERSTRIP_UI:controls.switch.in_mode': 'momentary' | 'detached';
};

/**
 * The POWERSTRIP_UI component handles the settings of a PowerStrip Gen4 device's LEDs.
 */
export default class PowerStripUI extends ComponentWithoutId<
  'POWERSTRIP_UI',
  PowerStripUIStatus,
  PowerStripUIConfig,
  PowerStripUIHomeySettings
> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'POWERSTRIP_UI';

  public async register(_methods: ComponentMethod<'POWERSTRIP_UI'>[]): Promise<void> {
    return;
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'POWERSTRIP_UI'>[],
  ): Promise<void> {
    // Set correct setting values
    await this.onConfigUpdate(homeyDevice, this.config);
  }

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: PowerStripUIStatus): Promise<void> {}

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: PowerStripUIConfig): Promise<void> {
    const newSettings: Partial<PowerStripUIHomeySettings> = {
      'POWERSTRIP_UI:leds.mode': config.leds.mode,
      'POWERSTRIP_UI:leds.colors.power.brightness': config.leds.colors.power.brightness,
      'POWERSTRIP_UI:leds.colors.switch:0.on.brightness': config.leds.colors['switch:0'].on.brightness,
      'POWERSTRIP_UI:leds.colors.switch:0.off.brightness': config.leds.colors['switch:0'].off.brightness,
      'POWERSTRIP_UI:leds.night_mode.enable': config.leds.night_mode.enable,
      'POWERSTRIP_UI:leds.night_mode.brightness': config.leds.night_mode.brightness,
    };
    const onRgb = config.leds.colors['switch:0'].on.rgb;
    if (onRgb !== null) {
      const [r, g, b] = onRgb;
      newSettings['POWERSTRIP_UI:leds.colors.switch:0.on.r'] = r;
      newSettings['POWERSTRIP_UI:leds.colors.switch:0.on.g'] = g;
      newSettings['POWERSTRIP_UI:leds.colors.switch:0.on.b'] = b;
    }
    const offRgb = config.leds.colors['switch:0'].off.rgb;
    if (offRgb !== null) {
      const [r, g, b] = offRgb;
      newSettings['POWERSTRIP_UI:leds.colors.switch:0.off.r'] = r;
      newSettings['POWERSTRIP_UI:leds.colors.switch:0.off.g'] = g;
      newSettings['POWERSTRIP_UI:leds.colors.switch:0.off.b'] = b;
    }
    const nightModePeriod = config.leds.night_mode.active_between;
    if (nightModePeriod.length === 2) {
      const [start, end] = nightModePeriod;
      newSettings['POWERSTRIP_UI:leds.night_mode.active_between.start'] = start;
      newSettings['POWERSTRIP_UI:leds.night_mode.active_between.end'] = end;
    }
    const switchId = homeyDevice.getTypedData().subdevice_id;
    if (switchId !== undefined && switchId >= 0 && switchId <= 3) {
      newSettings['POWERSTRIP_UI:controls.switch.in_mode'] =
        config.controls[`switch:${switchId as 0 | 1 | 2 | 3}`].in_mode;
    }
    await homeyDevice.setComponentSettings(this.namespace, undefined, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<PowerStripUIHomeySettings>,
  ): Promise<boolean> {
    const changedConfigs: RecursivePartial<PowerStripUIConfig, AllowedPrimitives> = {};
    if (changedKeys.includes('POWERSTRIP_UI:leds.mode')) {
      const newSetting = newSettings['POWERSTRIP_UI:leds.mode'];
      deepAssign(changedConfigs, { leds: { mode: newSetting } });
    }

    if (changedKeys.includes('POWERSTRIP_UI:leds.colors.power.brightness')) {
      const newSetting = newSettings['POWERSTRIP_UI:leds.colors.power.brightness'];
      deepAssign(changedConfigs, {
        leds: { colors: { power: { brightness: newSetting } } },
      });
    }

    if (changedKeys.includes('POWERSTRIP_UI:leds.colors.switch:0.on.brightness')) {
      const newSetting = newSettings['POWERSTRIP_UI:leds.colors.switch:0.on.brightness'];
      deepAssign(changedConfigs, {
        leds: {
          colors: {
            'switch:0': { on: { brightness: newSetting } },
          },
        },
      });
    }

    if (
      changedKeys.includes('POWERSTRIP_UI:leds.colors.switch:0.on.r') ||
      changedKeys.includes('POWERSTRIP_UI:leds.colors.switch:0.on.g') ||
      changedKeys.includes('POWERSTRIP_UI:leds.colors.switch:0.on.b')
    ) {
      const r = newSettings['POWERSTRIP_UI:leds.colors.switch:0.on.r'];
      const g = newSettings['POWERSTRIP_UI:leds.colors.switch:0.on.g'];
      const b = newSettings['POWERSTRIP_UI:leds.colors.switch:0.on.b'];
      deepAssign(changedConfigs, {
        leds: { colors: { 'switch:0': { on: { rgb: [r, g, b] } } } },
      });
    }

    if (changedKeys.includes('POWERSTRIP_UI:leds.colors.switch:0.off.brightness')) {
      const newSetting = newSettings['POWERSTRIP_UI:leds.colors.switch:0.off.brightness'];
      deepAssign(changedConfigs, {
        leds: {
          colors: {
            'switch:0': { off: { brightness: newSetting } },
          },
        },
      });
    }

    if (
      changedKeys.includes('POWERSTRIP_UI:leds.colors.switch:0.off.r') ||
      changedKeys.includes('POWERSTRIP_UI:leds.colors.switch:0.off.g') ||
      changedKeys.includes('POWERSTRIP_UI:leds.colors.switch:0.off.b')
    ) {
      const r = newSettings['POWERSTRIP_UI:leds.colors.switch:0.off.r'];
      const g = newSettings['POWERSTRIP_UI:leds.colors.switch:0.off.g'];
      const b = newSettings['POWERSTRIP_UI:leds.colors.switch:0.off.b'];
      deepAssign(changedConfigs, {
        leds: { colors: { 'switch:0': { off: { rgb: [r, g, b] } } } },
      });
    }

    if (changedKeys.includes('POWERSTRIP_UI:leds.night_mode.enable')) {
      const newSetting = newSettings['POWERSTRIP_UI:leds.night_mode.enable'];
      deepAssign(changedConfigs, { leds: { night_mode: { enable: newSetting } } });
    }

    if (changedKeys.includes('POWERSTRIP_UI:leds.night_mode.brightness')) {
      const newSetting = newSettings['POWERSTRIP_UI:leds.night_mode.brightness'];
      deepAssign(changedConfigs, { leds: { night_mode: { brightness: newSetting } } });
    }

    if (
      changedKeys.includes('POWERSTRIP_UI:leds.night_mode.active_between.start') ||
      changedKeys.includes('POWERSTRIP_UI:leds.night_mode.active_between.end')
    ) {
      const rawStart = newSettings['POWERSTRIP_UI:leds.night_mode.active_between.start'];
      const rawEnd = newSettings['POWERSTRIP_UI:leds.night_mode.active_between.end'];
      const [rawStartHour, rawStartMinutes, ...startRest] = rawStart.split(':');
      const [rawEndHour, rawEndMinutes, ...endRest] = rawEnd.split(':');

      const startHour = parseInt(rawStartHour, 10);
      const startMinutes = parseInt(rawStartMinutes, 10);
      const endHour = parseInt(rawEndHour, 10);
      const endMinutes = parseInt(rawEndMinutes, 10);

      const invalidStart =
        startRest.length > 0 ||
        isNaN(startHour) ||
        isNaN(startMinutes) ||
        startHour < 0 ||
        startMinutes < 0 ||
        startHour >= 24 ||
        startMinutes >= 60;

      const invalidEnd =
        endRest.length > 0 ||
        isNaN(endHour) ||
        isNaN(endMinutes) ||
        endHour < 0 ||
        endMinutes < 0 ||
        endHour >= 24 ||
        endMinutes >= 60;

      // Invalid argument 'night_mode.active_between': Time range must be between [00:00, 23:59]!
      if (invalidStart && invalidEnd) {
        throw new Error(homeyDevice.homey.__('component.POWERSTRIP_UI.invalid_night_mode.start_and_end'));
      }

      if (invalidStart) {
        throw new Error(homeyDevice.homey.__('component.POWERSTRIP_UI.invalid_night_mode.start'));
      }

      if (invalidEnd) {
        throw new Error(homeyDevice.homey.__('component.POWERSTRIP_UI.invalid_night_mode.end'));
      }

      deepAssign(changedConfigs, { leds: { night_mode: { active_between: [rawStart, rawEnd] } } });
    }

    const switchId = homeyDevice.getTypedData().subdevice_id;
    if (
      switchId !== undefined &&
      switchId >= 0 &&
      switchId <= 3 &&
      changedKeys.includes('POWERSTRIP_UI:controls.switch.in_mode')
    ) {
      const newSetting = newSettings['POWERSTRIP_UI:controls.switch.in_mode'];
      deepAssign(changedConfigs, { controls: { [`switch:${switchId as 0 | 1 | 2 | 3}`]: { in_mode: newSetting } } });
    }

    if (Object.keys(changedConfigs).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfigs });
    return result.result.restart_required;
  }
}
