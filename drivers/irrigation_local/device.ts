import ShellyLocalDevice from '../../lib/local/LocalDevice.js';
import type { ComponentMethod, NameSpace } from '../../lib/component/components/Shelly/ListMethods.js';
import type { MappedComponent } from '../../lib/component/ComponentMapping.js';
import type Boolean from '../../lib/component/components/Boolean.js';
import type { BooleanStatus } from '../../lib/component/components/Boolean.js';
import { safeSetCapabilityValue } from '../../lib/safeFunctions.js';
import Service from '../../lib/component/components/Service.js';

// https://shelly-api-docs.shelly.cloud/gen2/Devices/ShellyX/XT1/IrrigationController
export default class IrrigationControllerLocalDevice extends ShellyLocalDevice {
  protected async registerComponent(
    virtualComponent: InstanceType<MappedComponent>,
    methods: ComponentMethod<NameSpace>[],
  ): Promise<string[]> {
    const role = virtualComponent.attrs?.role;

    if (role?.startsWith('zone') && role !== 'zones_status') {
      return this.registerZoneBoolean(virtualComponent as Boolean);
    }

    if (virtualComponent instanceof Service) {
      return virtualComponent.registerHomeyDevice(this, methods as never);
    }

    return [];
  }

  private async registerZoneBoolean(virtualComponent: Boolean): Promise<string[]> {
    virtualComponent.onStatusUpdate = async (
      homeyDevice: ShellyLocalDevice,
      status: Partial<BooleanStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(homeyDevice, 'onoff', status.value);
      }
    };

    return [
      await virtualComponent.registerCapability(this, 'onoff', undefined, async (value: boolean) => {
        const channel = this.virtualDevice?.getChannel();
        if (channel === undefined) {
          throw new Error(this.homey.__('error.host_unreachable'));
        }
        await virtualComponent.Set(channel, { value: value });
      }),
    ];
  }
}
