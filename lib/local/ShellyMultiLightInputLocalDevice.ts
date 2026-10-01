import type { NameSpace } from '../component/components/Shelly/ListMethods.js';
import ShellyMultiInputLocalDevice from './ShellyMultiInputLocalDevice.js';

export default abstract class ShellyMultiLightInputLocalDevice extends ShellyMultiInputLocalDevice {
  protected getInputIndices(): number[] {
    return [...this.virtualComponents.keys()]
      .filter(key => key.startsWith('input:'))
      .map(key => Number(key.split(':')[1]))
      .sort((a, b) => a - b);
  }

  public async onSettings(event: SettingsEvent<Record<string, unknown>>): Promise<string | void> {
    const inputIds = this.getInputIndices();
    const remapKey = (key: string): string => {
      const [namespace, index, setting] = key.split(':');
      if (namespace !== 'Input' || setting === undefined) {
        return key;
      }
      return 'Input:' + inputIds[Number(index)] + ':' + setting;
    };
    const remapSettings = (settings: Record<string, unknown>): Record<string, unknown> =>
      Object.fromEntries(Object.entries(settings).map(([key, value]) => [remapKey(key), value]));

    return super.onSettings({
      changedKeys: event.changedKeys.map(remapKey),
      oldSettings: remapSettings(event.oldSettings),
      newSettings: remapSettings(event.newSettings),
    });
  }

  public async setComponentSettings(
    component: NameSpace,
    id: number | undefined,
    settings: Record<string, unknown>,
  ): Promise<void> {
    if (component === 'Input') {
      const localIndex = this.getInputIndices().indexOf(id!);
      const remappedSettings: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(settings)) {
        remappedSettings['Input:' + localIndex + ':' + key.substring(component.length + 1)] = value;
      }
      await this.setSettings(remappedSettings);
    } else {
      await super.setComponentSettings(component, id, settings);
    }
  }
}
