import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import type { NotificationEventParam, ResponseSuccessFrame } from '../../rpc/Rpc.js';
import { ComponentWithId } from '../Component.js';
import capabilitiesOptions from './EMData/capabilitiesOptions.json' with { type: 'json' };
import GetConfig from './EMData/GetConfig.js';
import GetStatus from './EMData/GetStatus.js';
import ResetCounters from './EMData/ResetCounters.js';
import SetConfig from './EMData/SetConfig.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import { safeAddCapability } from '../../safeFunctions.js';

export type EMDataConfig = { id: never; name: never } & Record<string, never>;

export type EMDataStatus = {
  /** Id of the EMData component instance */
  id: number;
  /** Phase A total active energy, Wh */
  a_total_act_energy: number;
  /** Phase A total active returned energy, Wh */
  a_total_act_ret_energy: number;
  /** Phase B total active energy, Wh */
  b_total_act_energy: number;
  /** Phase B total active returned energy, Wh */
  b_total_act_ret_energy: number;
  /** Phase C total active energy, Wh */
  c_total_act_energy: number;
  /** Phase C total active returned energy, Wh */
  c_total_act_ret_energy: number;
  /** Total active energy of all phases, Wh */
  total_act: number;
  /** Total active returned energy of all phases, Wh */
  total_act_ret: number;
  /** Error condition occurred. May contain database_error or ct_type_not_set, (shown if the error is present). */
  errors?: string[];
};

export type EMDataHomeySettings = Record<never, never>;

type DataEvent = {
  component: string;
  id: number;
  event: 'data';
  ts: number;
  data: {
    ts: number;
    period: number;
    values: Array<Array<number>>;
  };
};

/**
 * The EMData component stores data from a triphase energy meter.
 */
export default class EMData extends ComponentWithId<'EMData', EMDataStatus, EMDataConfig, EMDataHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'EMData';
  public static readonly uiName = 'Electrical Measurement Data';
  public static readonly key = 'emdata';

  public async ResetCounters(channel: RpcChannel): Promise<ResponseSuccessFrame<null>> {
    return ResetCounters(channel, this.id);
  }

  public get id(): number {
    return this.status.id;
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    methods: ComponentMethod<'EMData'>[],
  ): Promise<void> {
    if (this.status.total_act !== undefined) {
      await this.registerCapability(homeyDevice, 'meter_power', capabilitiesOptions['meter_power' as never]);
    }
    if (this.status.total_act_ret !== undefined) {
      await this.registerCapability(
        homeyDevice,
        'meter_power.total_returned',
        capabilitiesOptions['meter_power.total_returned' as never],
      );
    }

    for (const [phase, energyKey, returnedEnergyKey] of [
      ['a', 'a_total_act_energy', 'a_total_act_ret_energy'],
      ['b', 'b_total_act_energy', 'b_total_act_ret_energy'],
      ['c', 'c_total_act_energy', 'c_total_act_ret_energy'],
    ] as const) {
      if (this.status[energyKey] !== undefined) {
        await this.registerCapability(
          homeyDevice,
          `meter_power.${phase}`,
          capabilitiesOptions[`meter_power.${phase}` as never],
        );
      }
      if (this.status[returnedEnergyKey] !== undefined) {
        await this.registerCapability(
          homeyDevice,
          `meter_power.returned_${phase}`,
          capabilitiesOptions[`meter_power.returned_${phase}` as never],
        );
      }
    }

    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');

    if (this.status.total_act !== undefined || this.status.total_act_ret !== undefined) {
      let energy = homeyDevice.getEnergy();
      energy = {
        ...energy,
        cumulative: true,
        meterPowerImportedCapability: 'meter_power',
        meterPowerExportedCapability: 'meter_power.total_returned',
      };
      await homeyDevice.setEnergy(energy).catch(homeyDevice.error);
    }

    if (methods.includes('ResetCounters')) {
      const maintenanceActionId = 'button.reset_energy_counters';
      await this.registerCapability(
        homeyDevice,
        maintenanceActionId,
        capabilitiesOptions[maintenanceActionId as never],
        async () => {
          await this.ResetCounters(this.device.getChannel());
        },
      );
    }
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: EMDataStatus): Promise<void> {
    if (status.total_act !== undefined) {
      await this.setCapability(homeyDevice, 'meter_power', status.total_act / 1000);
    }
    if (status.total_act_ret !== undefined) {
      await this.setCapability(homeyDevice, 'meter_power.total_returned', status.total_act_ret / 1000);
    }

    for (const [phase, energyKey, returnedEnergyKey] of [
      ['a', 'a_total_act_energy', 'a_total_act_ret_energy'],
      ['b', 'b_total_act_energy', 'b_total_act_ret_energy'],
      ['c', 'c_total_act_energy', 'c_total_act_ret_energy'],
    ] as const) {
      if (status[energyKey] !== undefined) {
        await this.setCapability(homeyDevice, `meter_power.${phase}`, status[energyKey] / 1000);
      }
      if (status[returnedEnergyKey] !== undefined) {
        await this.setCapability(homeyDevice, `meter_power.returned_${phase}`, status[returnedEnergyKey] / 1000);
      }
    }

    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: EMDataConfig): Promise<void> {
    return;
  }

  public async handleEvent(event: NotificationEventParam): Promise<void> {
    if (event.event === 'data') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const dataEvent = event as DataEvent;
      // Ignore, since we do not use period data.
      // The cumulative data gets updated with a StatusChange vent at the same time.
    } else {
      return super.handleEvent(event);
    }
  }
}
