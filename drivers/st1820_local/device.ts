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

// https://shelly-api-docs.shelly.cloud/gen2/Devices/ShellyX/XT1/LinkedGoSmartHeatingThermostat
export default class LinkedGoFloorThermostatLocalDevice extends ShellyLocalDevice {
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
      case 'target_temperature':
        return this.registerReadWrite(component as Number, 'target_temperature');
      case 'enable':
        return this.registerReadWrite(component as Boolean, 'onoff');
      case 'anti_freeze':
        return this.registerReadWrite(component as Boolean, 'shelly_anti_freeze');
      case 'c1c2_relay_status':
        return this.registerRead(component as Boolean, 'shelly_heating_relay');
      case 'child_lock':
        return this.registerReadWrite(component as Boolean, 'shelly_child_lock');
      default: {
        return component.registerHomeyDevice(this, methods as never);
      }
    }
  }

  private async registerRead(component: Number | Boolean, capability: string): Promise<string[]> {
    // @ts-ignore Handler is valid for both component types
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
      await component.Set(channel, { value });
    });
    return [capability];
  }
}
