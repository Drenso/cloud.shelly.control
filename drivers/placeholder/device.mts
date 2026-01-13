import Homey from 'homey';

export default class PlaceholderDevice extends Homey.Device {
  async onInit(): Promise<void> {
    this.log('PlaceholderDevice has been initialized');
  }
}
