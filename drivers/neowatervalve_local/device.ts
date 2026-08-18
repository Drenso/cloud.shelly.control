import ShellyLocalDevice from '../../lib/local/LocalDevice.js';
import type { ComponentMethod, NameSpace } from '../../lib/component/components/Shelly/ListMethods.js';
import type { MappedComponent } from '../../lib/component/ComponentMapping.js';
import type Boolean from '../../lib/component/components/Boolean.js';
import type Number from '../../lib/component/components/Number.js';
import type Object from '../../lib/component/components/Object.js';
import type { ObjectStatus } from '../../lib/component/components/Object.js';
import type { NumberStatus } from '../../lib/component/components/Number.js';
import type { BooleanStatus } from '../../lib/component/components/Boolean.js';
import { safeAddCapability, safeSetCapabilityValue } from '../../lib/safeFunctions.js';

// https://shelly-api-docs.shelly.cloud/gen2/Devices/ShellyX/XT1/NeoAdvancedWaterValve
export default class NeoWaterValveLocalDevice extends ShellyLocalDevice {
  protected async registerComponent(
    virtualComponent: InstanceType<MappedComponent>,
    methods: ComponentMethod<NameSpace>[],
  ): Promise<void> {
    const role = virtualComponent.attrs?.role;
    switch (role) {
      case 'flow_rate':
        await this.registerFlowRate(virtualComponent as Number);
        await virtualComponent.setInitialValues(this);
        return;
      case 'state':
        await this.registerState(virtualComponent as Boolean);
        await virtualComponent.setInitialValues(this);
        return;
      case 'water_consumption': {
        await this.registerWaterConsumption(virtualComponent as Object);
        await virtualComponent.setInitialValues(this);
        return;
      }
      case 'water_pressure': {
        await this.registerWaterPressure(virtualComponent as Number);
        await virtualComponent.setInitialValues(this);
        return;
      }
      case 'water_temperature': {
        await this.registerWaterTemperature(virtualComponent as Number);
        await virtualComponent.setInitialValues(this);
        return;
      }
      default: {
        await virtualComponent.registerHomeyDevice(this, methods as never);
        await virtualComponent.setInitialValues(this);
      }
    }
  }

  private async registerFlowRate(virtualComponent: Number): Promise<void> {
    await safeAddCapability(this, 'measure_water');
    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<NumberStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        // convert from m³/min to l/min
        await safeSetCapabilityValue(this, 'measure_water', status.value / 1000);
      }
    };
  }

  private async registerState(virtualComponent: Boolean): Promise<void> {
    await safeAddCapability(this, 'onoff');
    this.registerCapabilityListener('onoff', async (value: boolean) => {
      if (this.virtualDevice === undefined) {
        throw new Error(this.homey.__('error.not_initialized'));
      }
      await virtualComponent.Set(this.virtualDevice.getChannel(), {
        value,
      });
    });

    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<BooleanStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(this, 'onoff', status.value);
      }
    };
  }

  private async registerWaterConsumption(virtualComponent: Object): Promise<void> {
    await safeAddCapability(this, 'meter_water');
    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<ObjectStatus>,
    ): Promise<void> => {
      const waterConsumption = status.value as { counter: { total: number } } | undefined;
      if (waterConsumption?.counter?.total !== undefined) {
        // convert m³ to l
        await safeSetCapabilityValue(this, 'meter_water', waterConsumption.counter.total * 1000);
      }
    };
  }

  private async registerWaterPressure(virtualComponent: Number): Promise<void> {
    await safeAddCapability(this, 'measure_pressure');
    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<NumberStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        // convert from kPa to mbar
        await safeSetCapabilityValue(this, 'measure_pressure', status.value * 10);
      }
    };
  }

  private async registerWaterTemperature(virtualComponent: Number): Promise<void> {
    await safeAddCapability(this, 'measure_temperature');
    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<NumberStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(this, 'measure_temperature', status.value);
      }
    };
  }
}
