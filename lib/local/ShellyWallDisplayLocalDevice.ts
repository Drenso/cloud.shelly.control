import Shelly from '../component/components/Shelly.js';
import ShellyLocalDevice from './LocalDevice.js';

export default class ShellyWallDisplayLocalDevice extends ShellyLocalDevice {
  private statusInterval?: NodeJS.Timeout;

  public override async onInit(): Promise<void> {
    await super.onInit();
    // Wall Display firmware does not consistently send every change over WS.
    // Refresh readings without taking over an existing outbound WS connection.
    this.statusInterval = this.homey.setInterval(() => {
      this.pollStatus().catch(err => this.debug('Status refresh failed:', err));
    }, 20_000);
  }

  protected async pollStatus(): Promise<void> {
    if (this.virtualDevice === undefined || !this.getAvailable()) {
      return;
    }
    const { result } = await Shelly.GetStatus(this.virtualDevice.getChannel());
    const statuses = result as Record<string, object | undefined>;
    for (const [key, component] of this.virtualComponents) {
      const status = statuses[key];
      if (status === undefined || status === null || typeof status !== 'object') {
        continue;
      }
      const currentStatus = component.status as Record<string, unknown>;
      const nextStatus = { ...status } as Record<string, unknown>;
      if ('errors' in currentStatus) {
        nextStatus['errors'] ??= [];
      }
      const changed = Object.entries(nextStatus).some(
        ([property, value]) => JSON.stringify(currentStatus[property]) !== JSON.stringify(value),
      );
      if (changed) {
        await component.updateStatus(this, nextStatus as never);
      }
    }
  }

  public override async onDeleted(): Promise<void> {
    this.homey.clearInterval(this.statusInterval);
    await super.onDeleted();
  }
}
