import type { BTHomeButtonEvent, BTHomeDimmerEvent } from '../../lib/ble/BTHome.js';
import ShellyBleDevice from '../../lib/ble/BleDevice.js';

type ButtonEvent = {
  battery: number;
  leftButtonEvent: BTHomeButtonEvent;
  rightButtonEvent: BTHomeButtonEvent;
  channel: number;
};

type ScrollEvent = {
  battery: number;
  direction: BTHomeDimmerEvent;
  steps: number;
  channel: number;
};

type RotateEvent = {
  battery: number;
  x: number;
  y: number;
  z: number;
  channel: number;
};

export default class ShellyBluRemoteControlDevice extends ShellyBleDevice {
  public async handleBtHomeForward(btHomeData: [string, unknown][]): Promise<void> {
    const event = {} as {
      battery: number;
      channel: number;
    };

    for (const [property, value] of btHomeData) {
      if (property === 'battery') {
        event.battery = value as number;
      } else if (property === 'channel') {
        event.channel = value as number;
      } else if (property === 'buttonEvent') {
        return this.handleButtonEvent(btHomeData);
      } else if (property === 'dimmerEvent') {
        return this.handleScrollEvent(btHomeData);
      } else if (property === 'rotation') {
        return this.handleRotateEvent(btHomeData);
      } else if (['deviceInformation', 'packetId'].includes(property)) {
        // ignore
      } else {
        const properties = btHomeData.map(entry => entry[0]);
        throw new Error(`Unexpected BTHome frame: ${properties}`);
      }
    }

    this.log('Other:', event);
    // TODO handle rest event
  }

  public async handleButtonEvent(data: [string, unknown][]): Promise<void> {
    const event = {} as ButtonEvent;
    let buttonIndex = 0;
    for (const [property, value] of data) {
      if (property === 'battery') {
        event.battery = value as number;
      } else if (property === 'channel') {
        event.channel = value as number;
      } else if (property === 'buttonEvent') {
        if (buttonIndex === 0) {
          event.leftButtonEvent = value as number;
        } else if (buttonIndex === 1) {
          event.rightButtonEvent = value as number;
        } else {
          throw new Error('Unexpected buttonEvent');
        }
        buttonIndex += 1;
      }
    }
    this.log('Button:', event);
  }

  public async handleScrollEvent(data: [string, unknown][]): Promise<void> {
    const event = {} as ScrollEvent;
    for (const [property, value] of data) {
      if (property === 'battery') {
        event.battery = value as number;
      } else if (property === 'channel') {
        event.channel = value as number;
      } else if (property === 'dimmerEvent') {
        const [direction, steps] = value as [number, number];
        event.direction = direction;
        event.steps = steps;
      }
    }
    this.log('Scroll:', event);
  }

  public async handleRotateEvent(data: [string, unknown][]): Promise<void> {
    const event = {} as RotateEvent;
    let rotationIndex = 0;
    for (const [property, value] of data) {
      if (property === 'battery') {
        event.battery = value as number;
      } else if (property === 'channel') {
        event.channel = value as number;
      } else if (property === 'rotation') {
        if (rotationIndex === 0) {
          event.x = (value as number) / 10;
        } else if (rotationIndex === 1) {
          event.y = (value as number) / 10;
        } else if (rotationIndex === 2) {
          event.z = (value as number) / 10;
        } else {
          throw new Error('Unexpected rotation');
        }
        rotationIndex += 1;
      }
    }
    this.log('Rotation:', event);
  }
}
