import ShellyLocalDevice from '../../lib/local/LocalDevice.js';
import type { ComponentMethod, NameSpace } from '../../lib/component/components/Shelly/ListMethods.js';
import type { MappedComponent } from '../../lib/component/ComponentMapping.js';
import type Number from '../../lib/component/components/Number.js';
import type { NumberStatus } from '../../lib/component/components/Number.js';
import { safeSetCapabilityValue } from '../../lib/safeFunctions.js';
import type Enum from '../../lib/component/components/Enum.js';
import type { EnumStatus } from '../../lib/component/components/Enum.js';
import type Boolean from '../../lib/component/components/Boolean.js';
import type { BooleanStatus } from '../../lib/component/components/Boolean.js';
import type { RpcError } from '../../lib/rpc/RpcError.js';

// https://shelly-api-docs.shelly.cloud/gen2/Devices/ShellyX/XT1/LinkedGoSmartHVACThermostat
export default class LinkedGoHVACThermostatLocalDevice extends ShellyLocalDevice {
  protected async registerComponent(
    component: InstanceType<MappedComponent>,
    methods: ComponentMethod<NameSpace>[],
  ): Promise<string[]> {
    const role = component.attrs?.role;
    switch (role) {
      case 'current_humidity':
        return this.registerRead(component as Number, 'measure_humidity');
      case 'current_temperature':
        return this.registerRead(component as Number, 'measure_temperature');
      case 'target_humidity':
        return this.registerTargetHumidity(component as Number);
      case 'target_temperature':
        return this.registerTargetTemperature(component as Number);
      case 'working_mode':
        return this.registerReadWrite(component as Enum, 'thermostat_mode');
      case 'fan_speed':
        return this.registerReadWrite(component as Enum, 'fan_mode');
      case 'enable':
        return this.registerReadWrite(component as Boolean, 'onoff');
      case 'anti_freeze':
        return this.registerReadWrite(component as Boolean, 'shelly_anti_freeze');
      default: {
        return component.registerHomeyDevice(this, methods as never);
      }
    }
  }

  private async registerTargetHumidity(component: Number): Promise<string[]> {
    component.onStatusUpdate = async (homeyDevice, status): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(homeyDevice, 'target_humidity', status.value / 100);
      }
    };
    await this.setCapabilityOptions('target_humidity', {
      min: component.config.min / 100,
      max: component.config.max / 100,
    });
    this.registerCapabilityListener('target_humidity', async (value: number) => {
      const channel = this.virtualDevice?.getChannel();
      if (channel === undefined) {
        throw new Error(this.homey.__('error.host_unreachable'));
      }
      await component.Set(channel, { value: value * 100 });
    });
    return ['target_humidity'];
  }

  private async registerTargetTemperature(component: Number): Promise<string[]> {
    await this.setCapabilityOptions('target_temperature', {
      min: component.config.min,
      max: component.config.max,
      step: component.config.meta?.ui.step,
    });
    return this.registerReadWrite(component, 'target_temperature');
  }

  private async registerRead(component: Number, capability: string): Promise<string[]> {
    component.onStatusUpdate = async (homeyDevice, status): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(homeyDevice, capability, status.value);
      }
    };
    return [capability];
  }

  private async registerReadWrite(component: Enum | Boolean | Number, capability: string): Promise<string[]> {
    // @ts-ignore Handler is valid for all three component types
    component.onStatusUpdate = async (
      homeyDevice: ShellyLocalDevice,
      status: EnumStatus | BooleanStatus | NumberStatus,
    ): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(homeyDevice, capability, status.value);
      }
    };
    this.registerCapabilityListener(capability, async (value): Promise<void> => {
      const channel = this.virtualDevice?.getChannel();
      if (channel === undefined) {
        throw new Error(this.homey.__('error.host_unreachable'));
      }
      // @ts-ignore Handler is valid for all three component types
      await component.Set(channel, { value }).catch((err: RpcError) => {
        if (err.code === -103) {
          throw new Error(this.homey.__('component.Service.invalid_thermostat_mode'));
        }
        throw err;
      });
    });
    return [capability];
  }
}
