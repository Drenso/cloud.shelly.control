import type { BTHomeButtonEvent, BTHomeDimmerEvent } from '../../lib/ble/BTHome.js';
import ShellyBleDevice from '../../lib/ble/BleDevice.js';

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
      await this.setCapabilityValue('measure_battery', battery);
    }

    if (buttons.length === 2) {
      const left = buttons[0];
      const right = buttons[1];
      console.log('Buttons:', { left: left, right: right });
      // TODO
    }

    if (rotations.length === 3) {
      const x = rotations[0];
      const y = rotations[1];
      const z = rotations[2];
      console.log('Rotations:', { x: x, y: y, z: z });
      // TODO
    }

    if (scrollDirection !== undefined) {
      console.log('Scroll:', { direction: scrollDirection, steps: scrollSteps });
      // TODO
    }
  }
}
