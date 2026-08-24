import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { ComponentWithId } from '../Component.js';
import SetConfig from './DevicePower/SetConfig.js';
import GetConfig from './DevicePower/GetConfig.js';
import GetStatus from './DevicePower/GetStatus.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import capabilitiesOptions from './DevicePower/capabilitiesOptions.json' with { type: 'json' };
import { safeAddCapability, safeSetCapabilityValue } from '../../safeFunctions.js';
import type { VirtualDevice } from '../../VirtualDevice.js';
import type ShellyApp from '../../../app.js';
import { translate } from '../../util.js';

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

/**
 * The DevicePower component handles the monitoring of device's battery charge and is only available on battery-operated devices.
 */
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
  protected static readonly key = 'devicepower';

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
    }

    if (DevicePower.hasExternalPowerSupply(homeyDevice.virtualDevice!)) {
      await safeAddCapability(homeyDevice, 'hidden.has_external_device_power');
    }

    if (this.status.external !== undefined) {
      await this.registerCapability(homeyDevice, 'alarm_shelly_power_lost', undefined);
    }
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: DevicePowerStatus): Promise<void> {
    if (status.battery?.percent !== undefined) {
      await this.setCapability(homeyDevice, 'measure_battery', status.battery.percent);
    }

    if (this.status.external !== undefined) {
      await safeSetCapabilityValue(homeyDevice, 'alarm_shelly_power_lost', !this.status.external.present);
    }
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: DevicePowerConfig): Promise<void> {}

  public static hasExternalPowerSupply(virtualDevice: VirtualDevice): boolean {
    for (const [, component] of virtualDevice.virtualComponents.entries()) {
      if (component instanceof DevicePower && component.status.external !== undefined) {
        return true;
      }
    }
    return false;
  }

  public static registerFlowCards(app: ShellyApp): void {
    const getPowerSupplies = (device: ShellyLocalDevice): DevicePower[] => {
      if (device.virtualDevice === undefined) {
        return [];
      }

      return [...device.virtualComponents.values()].filter(
        component => component instanceof DevicePower && component.status.external !== undefined,
      ) as DevicePower[];
    };

    const autoCompleteListener = (
      query: string,
      { device }: { device: ShellyLocalDevice },
    ): { name: string; id: number }[] => {
      return getPowerSupplies(device)
        .map(powerSupply => ({
          name: translate(app.homey.__('locale'), capabilitiesOptions['devicePowerName'], {
            number: `${powerSupply.id}`,
          }),
          id: powerSupply.id,
        }))
        .filter(powerSupply => powerSupply.name.toLowerCase().includes(query.toLowerCase()));
    };

    app.homey.flow
      .getConditionCard('alarm_shelly_power_lost')
      .registerArgumentAutocompleteListener('devicePower', autoCompleteListener)
      .registerRunListener((flowArgs: { devicePower: { id: number }; device: ShellyLocalDevice }) => {
        const componentKey = `${DevicePower.key}:${flowArgs.devicePower.id}`;
        const component = flowArgs.device.virtualComponents.get(componentKey) as DevicePower | undefined;
        if (component === undefined) {
          throw new Error(app.homey.__('error.component_not_found', { component: componentKey }));
        }
        return !component.status.external;
      });

    for (const flow of ['alarm_shelly_power_lost_false', 'alarm_shelly_power_lost_true']) {
      app.homey.flow
        .getDeviceTriggerCard(flow)
        .registerArgumentAutocompleteListener('devicePower', autoCompleteListener)
        .registerRunListener((flowArgs: { devicePower: { id: number } }, triggerArgs: { devicePower: number }) => {
          return flowArgs.devicePower.id === triggerArgs.devicePower;
        });
    }
  }
}
