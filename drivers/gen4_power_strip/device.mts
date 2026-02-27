import ShellyLocalDevice from '../local/device.mjs';
import type PowerStripUI from '../../lib/component/components/PowerStripUI.mjs';
import type { PowerStripUIHomeySettings } from '../../lib/component/components/PowerStripUI.mjs';
import type { UnionToIntersection } from '../../lib/util.mjs';

type HomeySettings = UnionToIntersection<PowerStripUIHomeySettings>;

export default class ShellyGen4PowerStripDevice extends ShellyLocalDevice {
  async onSettings(event: SettingsEvent<HomeySettings>): Promise<string | void> {
    const component = this.registered.get('powerstrip_ui') as PowerStripUI | undefined;
    await component?.handleSettings(event);
  }
}
