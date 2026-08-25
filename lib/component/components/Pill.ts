import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { type AllowedPrimitives, ComponentWithoutId } from '../Component.js';
import SetConfig from './Pill/SetConfig.js';
import GetConfig from './Pill/GetConfig.js';
import GetStatus from './Pill/GetStatus.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type { RecursivePartial } from '../../util.js';

export type PillStatus = Record<string, never>;

export type PillConfig = {
  /**
   * Peripheral mode.
   *
   * - `onewire`: Temperature sensor: OneWire (DS18B20)
   *
   * - `dht22`: Temperature & Humidity: DHT22
   *
   * - `analog_in`: Analog sensor (Range: 0-2.5V without additional addons)
   *
   * - `ssr`: Solid State Relay Addon (2x channels; IO3 is available)
   *
   * - `digital_io`: Digital IO: Inputs/Outputs are configurable via the `pinX_mode`
   *
   * - `serial`: Serial port. Creates a [Serial](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Serial)
   *    component instance for UART, Modbus RTU Client, or Server.
   *    **NOTE: this value does not seem to get accepted**
   *
   * Modes affect the current set of device components.
   * Switching a mode may cause new components to emerge,
   * and/or components that were created under the previous mode to disappear.
   *
   * Some device modes use specific pins for their functionality.
   * When such a mode is enabled, the corresponding pin mode appears as `reserved`,
   * and any changes to it will have no effect until the device switches to a mode that does not use the pin.
   */
  mode: 'onewire' | 'dht22' | 'analog_in' | 'ssr' | 'digital_io' | 'serial';
  pin0_mode: PinMode;
  pin1_mode: PinMode;
  pin2_mode: PinMode;
};

/**
 * Individual I/O pin mode.
 *
 * - `none`: I/O not used (default)
 *
 * - `digital_in`: Digital input (NOTE: Active LOW state)
 *
 * - `digital_out`: Digital output
 *
 * - `reserved`: Reserved for Device Peripheral function
 *
 * Some device modes use specific pins for their functionality.
 * When such a mode is enabled, the corresponding pin mode appears as `reserved`,
 * and any changes to it will have no effect until the device switches to a mode that does not use the pin.
 */
type PinMode = 'none' | 'reserved' | 'digital_in' | 'digital_out';

export type PillHomeySettings = {
  'Pill:mode': 'onewire' | 'dht22' | 'analog_in' | 'ssr' | 'digital_io';
  'Pill:pin0_mode': 'none' | 'digital_in' | 'digital_out' | 'reserved';
  'Pill:pin1_mode': 'none' | 'digital_in' | 'digital_out' | 'reserved';
  'Pill:pin2_mode': 'none' | 'digital_in' | 'digital_out' | 'reserved';
};

const simpleSettingKeys = ['mode', 'pin0_mode', 'pin1_mode', 'pin2_mode'] as const satisfies (keyof PillConfig)[];

export default class Pill extends ComponentWithoutId<'Pill', PillStatus, PillConfig, PillHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Pill';
  public static readonly uiName = 'The Pill';
  public static readonly key = 'pill';

  public async registerHomeyDevice(
    _homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Pill'>[],
  ): Promise<void> {}

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: PillStatus): Promise<void> {}

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: PillConfig): Promise<void> {
    const newSettings: Partial<PillHomeySettings> = {};

    for (const settingKey of simpleSettingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`Pill:${settingKey}`] = config[settingKey] as never;
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, undefined, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<PillHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<PillConfig, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      const homeySettingKey = `Pill:${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[settingKey] = newSettings[homeySettingKey] as never;
      }
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }
}
