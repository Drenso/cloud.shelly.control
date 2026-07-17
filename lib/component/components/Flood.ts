import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import SetConfig from './Flood/SetConfig.js';
import GetConfig from './Flood/GetConfig.js';
import GetStatus from './Flood/GetStatus.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import capabilitiesOptions from './Flood/capabilitiesOptions.json' with { type: 'json' };
import { includesAny, type RecursivePartial } from '../../util.js';

export type FloodConfig = {
  /** Identifier of the component instance */
  id: number;
  /** Name of the component instance */
  name: string | null;
  /**
   * Configuration of sound made on alarm.
   *
   * - `Rain`: reports rain, no sound alarm
   * - `Economic`: reports flood, no sound alarm
   * - `Normal`: reports flood, sound alarm is on, mutable with button press
   * - `Intense`: reports flood, sound alarm is on and frequent, mutable with button press
   *
   * When cable is unplugged value is null
   */
  alarm_mode: 'disabled' | 'normal' | 'intense' | 'rain' | null;
  /**
   * Time waited before reporting flood status.
   * For this period status must be steady.
   *
   * Accepted values are between 0-60 sec with step 5 sec
   */
  report_holdoff: number;
};

export type FloodStatus = {
  /** Identifier of the component instance */
  id: number;
  alarm: boolean;
  mute: boolean;
  errors?: Array<'cable_unplugged'>;
};

export type FloodHomeySettings = {
  'Flood:alarm_mode:mode': 'rain' | 'flood';
  'Flood:alarm_mode:sound': 'disabled' | 'normal' | 'intense';
  'Flood:report_holdoff': number;
};

/**
 * The Flood component handles the monitoring of the device's flood sensors.
 */
export default class Flood extends ComponentWithId<'Flood', FloodStatus, FloodConfig, FloodHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'Flood';
  public static readonly uiName = 'Flood Sensor';
  protected static readonly key = 'flood';

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Flood'>[],
  ): Promise<void> {
    if (this.status.alarm !== undefined) {
      const homeyCapability = 'alarm_water';
      const capabilityOptions = capabilitiesOptions[homeyCapability as never];
      await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions);
    } else {
      await Flood.unregisterCapability(homeyDevice, 'alarm_water', this.id);
    }
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    await Flood.unregisterCapability(homeyDevice, 'alarm_water', id);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: FloodStatus): Promise<void> {
    if (status.alarm !== undefined) {
      await this.setCapability(homeyDevice, 'alarm_water', status.alarm);
    }
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: FloodConfig): Promise<void> {
    const newSettings: Partial<FloodHomeySettings> = {};

    if (config.report_holdoff !== undefined) {
      newSettings['Flood:report_holdoff'] = config.report_holdoff;
    }

    if (config.alarm_mode !== undefined && config.alarm_mode !== null) {
      if (config.alarm_mode === 'rain') {
        newSettings['Flood:alarm_mode:mode'] = 'rain';
      } else {
        newSettings['Flood:alarm_mode:mode'] = 'flood';
        newSettings['Flood:alarm_mode:sound'] = config.alarm_mode;
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<FloodHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<FloodConfig, AllowedPrimitives> = {};

    if (changedKeys.includes('Flood:report_holdoff')) {
      changedConfig.report_holdoff = newSettings['Flood:report_holdoff'];
    }

    if (includesAny(changedKeys, ['Flood:alarm_mode:mode', 'Flood:alarm_mode:sound'])) {
      if (newSettings['Flood:alarm_mode:mode'] === 'rain') {
        changedConfig.alarm_mode = 'rain';
      } else {
        changedConfig.alarm_mode = newSettings['Flood:alarm_mode:sound'];
      }
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }
}
