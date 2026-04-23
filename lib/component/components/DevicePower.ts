import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { ComponentWithId } from '../Component.js';
import SetConfig from './DevicePower/SetConfig.js';
import GetConfig from './DevicePower/GetConfig.js';
import GetStatus from './DevicePower/GetStatus.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import capabilitiesOptions from './DevicePower/capabilitiesOptions.json' with { type: 'json' };

export type DevicePowerConfig = { id: never; name: never } & Record<string, never>;

export type DevicePowerStatus = {
  /** Identifier of the component instance */
  id: number;
  /** Information about the battery charge */
  battery: {
    /**
     * Battery voltage in Volts
     *
     * (null if valid value could not be obtained)
     */
    V: number | null;
    /**
     * Battery charge level in %
     *
     * (null if valid value could not be obtained)
     */
    percent: number | null;
  };
  /**
   * Information about the external power source
   *
   * (only available if external power source is supported)
   */
  external?: {
    /** Whether external power source is connected */
    present: boolean;
  };
};

export type DevicePowerHomeySettings = Record<never, never>;

export default class DevicePower extends ComponentWithId<
  'DevicePower',
  DevicePowerStatus,
  DevicePowerConfig,
  DevicePowerHomeySettings
> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'DevicePower';
  public static readonly uiName = 'Device Power';

  public get id(): number {
    return this.status.id;
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'DevicePower'>[],
  ): Promise<void> {
    if (this.status.battery?.percent !== undefined) {
      const homeyCapability = 'measure_battery';
      const capabilityOptions = capabilitiesOptions[homeyCapability as never];
      await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions);
    } else {
      await DevicePower.unregisterCapability(homeyDevice, 'measure_battery', this.id);
    }

    if (this.status.external !== undefined) {
      // TODO
    }
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    await DevicePower.unregisterCapability(homeyDevice, 'measure_battery', id);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: DevicePowerStatus): Promise<void> {
    if (status.battery?.percent !== undefined) {
      await this.setCapability(homeyDevice, 'measure_battery', status.battery.percent);
    }
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: DevicePowerConfig): Promise<void> {}
}
