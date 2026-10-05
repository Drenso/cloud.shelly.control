import { ComponentWithId } from '../Component.js';
import SetConfig from './EnergyMeterData/SetConfig.js';
import GetConfig from './EnergyMeterData/GetConfig.js';
import GetStatus from './EnergyMeterData/GetStatus.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import { fillTranslationTagsRecursively, translate } from '../../util.js';
import capabilitiesOptions from './EnergyMeterData/capabilitiesOptions.json' with { type: 'json' };
import type { JsonObject } from '../../../types/json.js';
import type { NotificationEventParam } from '../../rpc/Rpc.js';

export type EnergyMeterDataConfig = {
  id: never;
};

export type EnergyMeterDataStatus = {
  /** Identifier of the component instance */
  id: number;
  /** Total active energy on phase A, Wh */
  a_total_act_energy: number;
  /** Total active returned energy on phase A, Wh */
  a_total_act_ret_energy: number;
  /** Total active energy on phase B, Wh */
  b_total_act_energy: number;
  /** Total active returned energy on phase B, Wh */
  b_total_act_ret_energy: number;
  /** Total active energy on phase C, Wh */
  c_total_act_energy: number;
  /** Total active returned energy on phase C, Wh */
  c_total_act_ret_energy: number;
  /** Total active energy on all phases, Wh */
  total_act: number;
  /** Total active returned energy on all phases, Wh */
  total_act_ret: number;
  errors?: ('database_error' | 'ct_type_not_set')[];
};

export type EnergyMeterDataHomeySettings = Record<string, never>;

export default class EnergyMeterData extends ComponentWithId<
  'EMData',
  EnergyMeterDataStatus,
  EnergyMeterDataConfig,
  EnergyMeterDataHomeySettings
> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'EMData';
  public static readonly uiName = 'Energy Meter';
  public static readonly key = 'emdata';

  // NOTE: not all component methods have been implemented

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'EMData'>[],
  ): Promise<string[]> {
    const componentCapabilities: string[] = [];

    for (const phase of ['a', 'b', 'c'] as const) {
      const phaseTranslation = translate(homeyDevice.homey.__('locale'), capabilitiesOptions[`phase_${phase}`]);

      if (this.status[`${phase}_total_act_energy`] !== undefined) {
        componentCapabilities.push(
          await this.registerPhaseCapability(
            homeyDevice,
            `meter_power.phase_${phase}`,
            capabilitiesOptions['meter_power.phase'],
            phaseTranslation,
          ),
        );
      }
      if (this.status[`${phase}_total_act_ret_energy`] !== undefined) {
        componentCapabilities.push(
          await this.registerPhaseCapability(
            homeyDevice,
            `meter_power.returned.phase_${phase}`,
            capabilitiesOptions['meter_power.returned.phase'],
            phaseTranslation,
          ),
        );
      }
    }

    const energyConfiguration = homeyDevice.getEnergy() ?? {};

    if (this.status.total_act !== undefined) {
      const homeyCapability = await this.registerCapability(
        homeyDevice,
        'meter_power',
        capabilitiesOptions['meter_power'],
      );
      componentCapabilities.push(homeyCapability);
      energyConfiguration.cumulativeImportedCapability = homeyCapability;
      energyConfiguration.cumulative = true;
    }

    if (this.status.total_act_ret !== undefined) {
      const homeyCapability = await this.registerCapability(
        homeyDevice,
        'meter_power.returned',
        capabilitiesOptions['meter_power.returned'],
      );
      componentCapabilities.push(homeyCapability);
      energyConfiguration.cumulativeExportedCapability = homeyCapability;
      energyConfiguration.cumulative = true;
    }

    await homeyDevice
      .setEnergy(energyConfiguration)
      .catch(err => homeyDevice.error('Error while setting energy configuration:', err));

    return componentCapabilities;
  }

  private async registerPhaseCapability(
    homeyDevice: ShellyLocalDevice,
    homeyCapability: string,
    rawCapabilityOptions: JsonObject,
    phaseTranslation: string,
  ): Promise<string> {
    const singleComponent = homeyDevice.componentCounts.get(this.namespace) === 1;
    const capabilityId = singleComponent ? homeyCapability : `${homeyCapability}.${this.id}`;

    const capabilityOptions = fillTranslationTagsRecursively(rawCapabilityOptions, {
      phase: phaseTranslation,
    }) as JsonObject;
    await homeyDevice.setCapabilityOptions(capabilityId, capabilityOptions);
    return capabilityId;
  }

  public async handleEvent(event: NotificationEventParam): Promise<void> {
    if (event.event === 'data') {
      // ignore
      return;
    }
    return super.handleEvent(event);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<EnergyMeterDataStatus>): Promise<void> {
    for (const phase of ['a', 'b', 'c'] as const) {
      const energy = status[`${phase}_total_act_energy`];
      if (energy !== undefined) {
        // Convert from Wh to kWh
        await this.setCapability(homeyDevice, `meter_power.phase_${phase}`, energy / 1000);
      }
      const returnedEnergy = status[`${phase}_total_act_ret_energy`];
      if (returnedEnergy !== undefined) {
        // Convert from Wh to kWh
        await this.setCapability(homeyDevice, `meter_power.returned.phase_${phase}`, returnedEnergy / 1000);
      }
    }

    if (status.total_act !== undefined) {
      // Convert from Wh to kWh
      await this.setCapability(homeyDevice, 'meter_power', status.total_act / 1000);
    }

    if (status.total_act_ret !== undefined) {
      // Convert from Wh to kWh
      await this.setCapability(homeyDevice, 'meter_power.returned', status.total_act_ret / 1000);
    }
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: EnergyMeterDataConfig): Promise<void> {}
}
