import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { ComponentWithId } from '../Component.js';
import capabilitiesOptions from './EM1/capabilitiesOptions.json' with { type: 'json' };
import GetConfig from './EM1Data/GetConfig.js';
import GetStatus from './EM1Data/GetStatus.js';
import SetConfig from './EM1Data/SetConfig.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

export type EM1DataConfig = { id: never; name: never } & Record<string, never>;

export type EM1DataStatus = {
  /** Id of the EM1Data component instance */
  id: number;
  /** Total active energy, Wh */
  total_act_energy: number;
  /** Total active returned energy, Wh */
  total_act_ret_energy: number;
  /** Error condition occurred. May contain database_error or ct_type_not_set, (shown if the error is present). */
  errors: string[];
};

export type EM1DataHomeySettings = Record<never, never>;

export default class EM1Data extends ComponentWithId<'EM1Data', EM1DataStatus, EM1DataConfig, EM1DataHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'EM1Data';
  public static readonly uiName = 'Electrical Measurement Data';

  public get id(): number {
    return this.status.id;
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'EM1Data'>[],
  ): Promise<void> {
    for (const [statusKey, homeyCapability] of [
      ['total_act_energy', 'meter_power'],
      ['total_act_ret_energy', 'meter_power.returned'],
    ] as const) {
      if (this.status[statusKey] !== undefined) {
        await this.registerCapability(homeyDevice, homeyCapability, capabilitiesOptions[homeyCapability as never]);
      } else {
        await EM1Data.unregisterCapability(homeyDevice, homeyCapability, this.id);
      }
    }
  }

  protected async staticallyUnregisterHomeyDevice(homeyDevice: ShellyLocalDevice, id: number): Promise<void> {
    for (const capability of ['meter_power', 'meter_power.returned']) {
      await EM1Data.unregisterCapability(homeyDevice, capability, id);
    }
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: EM1DataStatus): Promise<void> {
    for (const [statusKey, homeyCapability] of [
      ['total_act_energy', 'meter_power'],
      ['total_act_ret_energy', 'meter_power.returned'],
    ] as const) {
      if (status[statusKey] !== undefined) {
        await this.setCapability(homeyDevice, homeyCapability, status[statusKey] / 1000);
      }
    }
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: EM1DataConfig): Promise<void> {
    return;
  }
}
