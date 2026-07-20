import ShellyLocalDevice from '../../lib/local/LocalDevice.js';
import type { ComponentMethod, NameSpace } from '../../lib/component/components/Shelly/ListMethods.js';
import type { MappedComponent } from '../../lib/component/ComponentMapping.js';
import type Boolean from '../../lib/component/components/Boolean.js';
import type Number from '../../lib/component/components/Number.js';
import type { NumberStatus } from '../../lib/component/components/Number.js';
import type { BooleanStatus } from '../../lib/component/components/Boolean.js';
import { safeAddCapability, safeSetCapabilityValue, safeTriggerDeviceCard } from '../../lib/safeFunctions.js';

// https://shelly-api-docs.shelly.cloud/gen2/Devices/ShellyX/XT1/SmartWaterValve/
export default class WaterValveLocalDevice extends ShellyLocalDevice {
  protected async registerComponent(
    virtualComponent: InstanceType<MappedComponent>,
    methods: ComponentMethod<NameSpace>[],
  ): Promise<void> {
    const role = virtualComponent.attrs?.role;
    switch (role) {
      case 'open':
      case 'close':
        // Handled by position
        return;
      case 'position': {
        await this.registerValvePosition(virtualComponent as Number);
        await virtualComponent.setInitialValues(this);
        return;
      }
      case 'has_power': {
        await this.registerPowerAlarm(virtualComponent as Boolean);
        await virtualComponent.setInitialValues(this);
        return;
      }
      default: {
        await virtualComponent.registerHomeyDevice(this, methods as never);
        await virtualComponent.setInitialValues(this);
      }
    }
  }

  private async registerValvePosition(virtualComponent: Number): Promise<void> {
    await safeAddCapability(this, 'valve_position');

    await virtualComponent.registerCapability(this, 'valve_position', undefined, async (value: number) => {
      const channel = this.virtualDevice?.getChannel();
      if (channel !== undefined) {
        await virtualComponent.Set(channel, { value: value * 100 });
      }
    });

    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<NumberStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        await safeSetCapabilityValue(this, 'valve_position', status.value / 100);
      }
    };
  }

  private async registerPowerAlarm(virtualComponent: Boolean): Promise<void> {
    await safeAddCapability(this, 'alarm_shelly_power_lost');

    virtualComponent.onStatusUpdate = async (
      _homeyDevice: ShellyLocalDevice,
      status: Partial<BooleanStatus>,
    ): Promise<void> => {
      if (status.value !== undefined) {
        const newValue = !status.value;
        const oldValue = this.getCapabilityValue('alarm_shelly_power_lost') as boolean;

        await safeSetCapabilityValue(this, 'alarm_shelly_power_lost', newValue);

        if (oldValue !== newValue) {
          const flowCardId = `watervalve_alarm_shelly_power_lost_${newValue ? 'true' : 'false'}`;
          await safeTriggerDeviceCard(this, flowCardId);
        }
      }
    };
  }
}
