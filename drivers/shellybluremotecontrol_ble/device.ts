import { BTHomeButtonEvent, BTHomeDimmerEvent } from '../../lib/ble/BTHome.js';
import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import { safeSetCapabilityValue, safeTriggerDeviceCard } from '../../lib/safeFunctions.js';
import type { Button, ScrollDirection } from './driver.js';

export default class ShellyBluRemoteControlDevice extends ShellyBleDevice {
  public async handleBtHomeForward(btHomeData: [string, unknown][]): Promise<void> {
    let battery: number | undefined;
    const buttons: BTHomeButtonEvent[] = [];
    let channel: number | undefined;
    let scrollDirection: BTHomeDimmerEvent | undefined;
    let scrollSteps: number | undefined;
    const rotations: number[] = [];

    for (const [property, value] of btHomeData) {
      if (property === 'battery') {
        battery = value as number;
      } else if (property === 'channel') {
        channel = value as number;
      } else if (property === 'buttonEvent') {
        buttons.push(value as number);
      } else if (property === 'dimmerEvent') {
        const [direction, steps] = value as [number, number];
        scrollDirection = direction;
        scrollSteps = steps;
      } else if (property === 'rotation') {
        rotations.push((value as number) / 10);
      } else {
        // ignore
      }
    }

    this.debug(
      'Received channel:',
      channel,
      'buttons:',
      buttons,
      'rotations:',
      rotations,
      'scroll:',
      scrollDirection,
      scrollSteps,
    );

    if (battery !== undefined) {
      await safeSetCapabilityValue(this, 'measure_battery', battery);
    }

    if (buttons.length === 2) {
      const left = buttons[0];
      const right = buttons[1];
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

    if (rotations.length === 3) {
      const x = rotations[0];
      const y = rotations[1];
      const z = rotations[2];
      this.debug('Rotations:', { x: x, y: y, z: z });
      await safeTriggerDeviceCard(this, 'blu_remote_control_rotation_measured', { x, y, z });
    }

    if (scrollDirection !== undefined && scrollSteps !== undefined) {
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
