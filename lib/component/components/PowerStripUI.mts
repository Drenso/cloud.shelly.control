import { ComponentWithoutId } from '../Component.mjs';
import GetConfig from './PowerStripUI/GetConfig.mjs';
import SetConfig from './PowerStripUI/SetConfig.mjs';
import GetStatus from './PowerStripUI/GetStatus.mjs';

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
      // TODO test whether it also works for the other switches
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
      enable: false;
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

/**
 * The POWERSTRIP_UI component handles the settings of a PowerStrip Gen4 device's LEDs.
 */
export default class PowerStripUI extends ComponentWithoutId<PowerStripUIStatus, PowerStripUIConfig> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  async register(): Promise<void> {
    return;
  }
  async updateStatus(status: PowerStripUIStatus): Promise<void> {
    return;
  }
}
