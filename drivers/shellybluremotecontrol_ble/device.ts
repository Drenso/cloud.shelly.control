import Homey from 'homey';
import type ShellyApp from '../../app.js';
import type { ShellyBluDeviceData } from '../../lib/types.js';
import type { BTHomeDimmerEvent } from '../../lib/ble/BTHome.js';
import type { BTHomeButtonEvent } from '../../lib/ble/BTHome.js';
import { type BleForwardEventData, parseBleForward } from '../../lib/ble/BTHome.js';

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

export default class ShellyBluRemoteControlDevice extends Homey.Device {
  declare public readonly __id: string;

  public get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  public getTypedData(): ShellyBluDeviceData {
    return this.getData();
  }

  public async onInit(): Promise<void> {
    const macAddress = this.getTypedData().id.toLowerCase();
    this.app.btHomeServer.btHomeMitt.on(macAddress, this.handleBleForward.bind(this));
  }

  public async handleBleForward(data: BleForwardEventData): Promise<void> {
    const btHomeData = parseBleForward(data);
    // TODO deduplicate using packet id
    // console.log(btHomeData);

    if (btHomeData === undefined) {
      return;
    }

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
