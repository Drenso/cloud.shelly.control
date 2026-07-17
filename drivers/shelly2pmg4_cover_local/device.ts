import ShellyLocalDevice from '../../lib/local/LocalDevice.js';
import type { NameSpace } from '../../lib/component/components/Shelly/ListMethods.js';

export default class Shelly2PMGen4CoverLocalDevice extends ShellyLocalDevice {
  public async onSettings(event: SettingsEvent<Record<string, unknown>>): Promise<string | void> {
    const splitSettings: Record<string, SettingsEvent<Record<string, unknown>>> = {
      'Input:0': {
        changedKeys: [],
        oldSettings: {},
        newSettings: {},
      },
      'Input:1': {
        changedKeys: [],
        oldSettings: {},
        newSettings: {},
      },
      Rest: {
        changedKeys: [],
        oldSettings: {},
        newSettings: {},
      },
    };
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

    await this.virtualComponents.get('input:0')?.handleSettings(this, splitSettings['Input:0'] as never);
    await this.virtualComponents.get('input:1')?.handleSettings(this, splitSettings['Input:1'] as never);

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
}
