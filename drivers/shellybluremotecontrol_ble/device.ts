import { BTHomeButtonEvent, type BTHomeData, BTHomeDimmerEvent } from '../../lib/ble/BTHome.js';
import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import { safeSetCapabilityValue, safeTriggerDeviceCard } from '../../lib/safeFunctions.js';
import type { Button, ScrollDirection } from './driver.js';

export default class ShellyBluRemoteControlDevice extends ShellyBleDevice {
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    this.debug(
      'Received channel:',
      btHomeData.channel,
      'buttons:',
      btHomeData.buttonEvent,
      'rotations:',
      btHomeData.rotation,
      'scroll:',
      btHomeData.dimmerEvent,
    );

    if (btHomeData.battery?.length === 1) {
      await safeSetCapabilityValue(this, 'measure_battery', btHomeData.battery[0]);
    }

    if (btHomeData.buttonEvent?.length === 2) {
      const left = btHomeData.buttonEvent[0];
      const right = btHomeData.buttonEvent[1];
      this.debug('Buttons:', { left: left, right: right });

      if (left !== BTHomeButtonEvent.None) {
        const args: { button: Button } = { button: 'left' };
        await safeTriggerDeviceCard(this, 'blu_remote_control_button_pressed', args, args);
      }
      if (right !== BTHomeButtonEvent.None) {
        const args: { button: Button } = { button: 'right' };
        await safeTriggerDeviceCard(this, 'blu_remote_control_button_pressed', args, args);
      }
    }

    if (btHomeData.rotation?.length === 3) {
      const x = btHomeData.rotation[0];
      const y = btHomeData.rotation[1];
      const z = btHomeData.rotation[2];
      this.debug('Rotations:', { x: x, y: y, z: z });
      await safeTriggerDeviceCard(this, 'blu_remote_control_rotation_measured', { x, y, z });
    }

    if (btHomeData.dimmerEvent?.length === 1) {
      const [scrollDirection, scrollSteps] = btHomeData.dimmerEvent[0];
      this.debug('Scroll:', { direction: scrollDirection, steps: scrollSteps });
      let direction: ScrollDirection;

      switch (scrollDirection) {
        case BTHomeDimmerEvent.None:
          direction = 'none';
          break;
        case BTHomeDimmerEvent.RotateLeft:
          direction = 'up';
          break;
        case BTHomeDimmerEvent.RotateRight:
          direction = 'down';
          break;
      }

      const args: { direction: ScrollDirection; steps: number } = {
        direction: direction,
        steps: scrollSteps,
      };
      if (scrollSteps === 0) {
        await safeTriggerDeviceCard(this, 'blu_remote_control_scrolling_start', args, args);
      } else {
        await safeTriggerDeviceCard(this, 'blu_remote_control_scrolled', args, args);
      }
    }
  }
}
