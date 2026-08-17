import { BTHomeButtonEventType, type BTHomeData, BTHomeDimmerEventType } from '../../lib/ble/BTHome.js';
import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import { safeSetCapabilityValue, safeTriggerDeviceCard } from '../../lib/safeFunctions.js';
import type { Button, ScrollDirection } from './driver.js';
import { addCapabilityIfNotExists } from '@drenso/homey-zigbee-library/lib/helper/capability.mjs';

export default class ShellyBluRemoteControlBleDevice extends ShellyBleDevice {
  public async onInit(): Promise<void> {
    // Migrate to use refactored flow cards
    await addCapabilityIfNotExists(this, 'hidden.blu_remote_control');
    await super.onInit();
  }

  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    if (btHomeData.battery?.length === 1) {
      await safeSetCapabilityValue(this, 'measure_battery', btHomeData.battery[0]);
    }

    // Change to 1-indexed for ui parity
    const channel = btHomeData.channel?.length === 1 ? btHomeData.channel[0] + 1 : undefined;

    if (channel === undefined) {
      this.error('Missing channel');
      return;
    }

    if (btHomeData.buttonEvent?.length === 2) {
      const left = btHomeData.buttonEvent[0];
      const right = btHomeData.buttonEvent[1];

      if (left !== BTHomeButtonEventType.None) {
        const args: { button: Button; channel: number } = { button: 'left', channel: channel };
        await safeTriggerDeviceCard(this, 'blu_remote_control_button_pressed', args, args);
      }
      if (right !== BTHomeButtonEventType.None) {
        const args: { button: Button; channel: number } = { button: 'right', channel: channel };
        await safeTriggerDeviceCard(this, 'blu_remote_control_button_pressed', args, args);
      }
    }

    if (btHomeData.rotation?.length === 3) {
      const x = btHomeData.rotation[0];
      const y = btHomeData.rotation[1];
      const z = btHomeData.rotation[2];
      await safeTriggerDeviceCard(
        this,
        'blu_remote_control_rotation_measured',
        { x, y, z, channel },
        { channel: channel },
      );
    }

    if (btHomeData.dimmerEvent?.length === 1) {
      const { direction: scrollDirection, steps: scrollSteps } = btHomeData.dimmerEvent[0];
      let direction: ScrollDirection;

      switch (scrollDirection) {
        case BTHomeDimmerEventType.None:
          direction = 'none';
          break;
        case BTHomeDimmerEventType.RotateLeft:
          direction = 'up';
          break;
        case BTHomeDimmerEventType.RotateRight:
          direction = 'down';
          break;
      }

      const args: { direction: ScrollDirection; steps: number; channel: number } = {
        direction: direction,
        steps: scrollSteps,
        channel: channel,
      };
      if (scrollSteps === 0) {
        await safeTriggerDeviceCard(this, 'blu_remote_control_scrolling_start', args, args);
      } else {
        await safeTriggerDeviceCard(this, 'blu_remote_control_scrolled', args, args);
      }
    }
  }
}
