import { ComponentWithoutId } from '../Component.mjs';
import GetConfig from './PowerStripUI/GetConfig.mjs';
import SetConfig from './PowerStripUI/SetConfig.mjs';
import GetStatus from './PowerStripUI/GetStatus.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import type { ShellyGetComponentsResponseComponent } from './Shelly/GetComponents.mjs';
import type { ShellyLocalListDeviceProperties } from '../../../drivers/local/driver.mjs';
import Switch from './Switch.mjs';

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
  readonly namespace = 'POWERSTRIP_UI';

  async register(methods: ComponentMethod<'POWERSTRIP_UI'>[]): Promise<void> {
    const { id, parent } = this.device.getData() as { id: string; parent: string };
    const switchId = id.substring(parent.length + 1);
    this.device.log('POWERSTRIP_UI', switchId);
    return;
  }
  async updateStatus(status: PowerStripUIStatus): Promise<void> {
    return;
  }

  static createDevices(
    id: string,
    component: ShellyGetComponentsResponseComponent,
    devices: Map<string, ShellyLocalListDeviceProperties>,
  ): Map<string, ShellyLocalListDeviceProperties> {
    const mainDevice: ShellyLocalListDeviceProperties = devices.get(id)!;

    for (const switchId of [0, 1, 2, 3] as const) {
      const subdeviceId = `${id}:switch:${switchId}`;
      const subdevice: ShellyLocalListDeviceProperties = devices.get(subdeviceId) ?? {
        name: `${mainDevice.name} - ${Switch.uiName} ${switchId + 1}`,
        data: {
          id: subdeviceId,
          parent: id,
        },
        store: {
          ...mainDevice.store,
          components: [],
        },
      };
      subdevice.store.components.push(component.key);

      devices.set(subdeviceId, subdevice);
    }

    return devices;
  }
}
