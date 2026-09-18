import type { NameSpace } from '../component/components/Shelly/ListMethods.js';
import ShellyLocalDevice from './LocalDevice.js';

export default abstract class  ShellyMultiInputLocalDevice extends ShellyLocalDevice {
  protected inputCount: number = 2;

  public async onSettings(event: SettingsEvent<Record<string, unknown>>): Promise<string | void> {
    const splitSettings: Record<string, SettingsEvent<Record<string, unknown>>> = {
      Rest: {
        changedKeys: [],
        oldSettings: {},
        newSettings: {},
      },
    };

    for (const inputIndex of this.getInputIndices()) {
      splitSettings[`Input:${inputIndex}`] = {
        changedKeys: [],
        oldSettings: {},
        newSettings: {},
      };
    }

    // Remap changed keys
    for (const changedKey of event.changedKeys) {
      const [namespace, identifier, setting] = changedKey.split(':') as [string, string, string | undefined];
      if (setting === undefined) {
        // Only two parts, no identifier present
        splitSettings['Rest'].changedKeys.push(changedKey);
      } else {
        splitSettings[`${namespace}:${identifier}`].changedKeys.push(`${namespace}:${setting}`);
      }
    }

    // Remap newSettings
    for (const newSettingsKey in event.newSettings) {
      const settingValue = event.newSettings[newSettingsKey];
      const [namespace, identifier, setting] = newSettingsKey.split(':') as [string, string, string | undefined];
      if (setting === undefined) {
        // Only two parts, no identifier present
        splitSettings['Rest'].newSettings[newSettingsKey] = settingValue;
      } else {
        splitSettings[`${namespace}:${identifier}`].newSettings[`${namespace}:${setting}`] = settingValue;
      }
    }

    // Remap oldSettings
    for (const oldSettingsKey in event.oldSettings) {
      const settingValue = event.oldSettings[oldSettingsKey];
      const [namespace, identifier, setting] = oldSettingsKey.split(':') as [string, string, string | undefined];
      if (setting === undefined) {
        // Only two parts, no identifier present
        splitSettings['Rest'].oldSettings[oldSettingsKey] = settingValue;
      } else {
        splitSettings[`${namespace}:${identifier}`].oldSettings[`${namespace}:${setting}`] = settingValue;
      }
    }

    for (const inputIndex of this.getInputIndices()) {
      await this.virtualComponents.get(`input:${inputIndex}`)?.handleSettings(this, splitSettings[`Input:${inputIndex}`] as never);
    }

    return super.onSettings(splitSettings['Rest']);
  }

  public async setComponentSettings(
    component: NameSpace,
    id: number | undefined,
    settings: Record<string, unknown>,
  ): Promise<void> {
    if (component === 'Input') {
      const remappedSettings: Record<string, unknown> = {};
      for (const settingsKey in settings) {
        const settingValue = settings[settingsKey];
        const settingIdentifier = settingsKey.substring(component.length + 1);
        const remappedKey = `${component}:${id}:${settingIdentifier}`;
        remappedSettings[remappedKey] = settingValue;
      }
      await this.setSettings(remappedSettings);
    } else {
      await super.setComponentSettings(component, id, settings);
    }
  }

  protected getInputIndices(): number[] {
    return [...Array(this.inputCount)].map((_, index) => index);
  }
}
