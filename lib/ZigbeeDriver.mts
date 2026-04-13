import Homey from 'homey';

let deviceCount = 0;
let deviceInitialisedCount = 0;

export default abstract class ShellyZigbeeDriver extends Homey.Driver {
  /** Request a timeout to gradually bring up the Zigbee devices */
  public getStartupTimeout(): number {
    deviceCount++;

    return (deviceCount - deviceInitialisedCount) * 1000;
  }

  public markInitialized(): void {
    deviceInitialisedCount++;
  }
}
