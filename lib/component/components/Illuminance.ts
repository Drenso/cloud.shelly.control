import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { safeAddCapability } from '../../safeFunctions.js';
import { fillTranslationTagsRecursively, type RecursivePartial, translate } from '../../util.js';
import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import GetConfig from './Illuminance/GetConfig.js';
import GetStatus from './Illuminance/GetStatus.js';
import SetConfig from './Illuminance/SetConfig.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type ShellyApp from '../../../app.js';
import capabilitiesOptions from './Illuminance/capabilitiesOptions.json' with { type: 'json' };

export type IlluminanceConfig = {
  /**
   * Identifier of the Illuminance component instance
   */
  id: number;
  /**
   * Name of the Illuminance instance. name length should not exceed 64 chars
   */
  name: string | null;

  /**
   * Threshold in lux. Accepted range is device-specific
   */
  dark_thr: number;

  /**
   * Bright threshold in lux. Accepted range is device-specific
   */
  bright_thr: number;
};

export type IlluminanceStatus = {
  /**
   * Identifier of the Illuminance component instance
   */
  id: number;
  /**
   * Illuminance in lux (null if valid value could not be obtained) (if applicable)
   */
  lux: number | null;

  /**
   * Illuminance level interpreted according to dark_thr/bright_thr (null if valid value could not be obtained): lux below dark_thr is interpreted as dark, lux between dark_thr and bright_thr is interpreted as twilight, lux above bright_thr is interpreted as bright
   */
  illumination: 'dark' | 'twilight' | 'bright' | null;

  /**
   * Shown only if at least one error is present. May contain out_of_range, read when there is problem reading sensor
   */
  errors?: string[];
};

export type IlluminanceHomeySettings = {
  'Illuminance:dark_thr': number;
  'Illuminance:bright_thr': number;
};

const simpleSettingKeys = ['dark_thr', 'bright_thr'] as const satisfies (keyof IlluminanceConfig)[];

/**
 * The Illuminance component handles the monitoring of the device's illuminance sensors.
 */
export default class Illuminance extends ComponentWithId<
  'Illuminance',
  IlluminanceStatus,
  IlluminanceConfig,
  IlluminanceHomeySettings
> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'Illuminance';
  public static readonly uiName = 'Illuminance';
  protected static readonly key = 'illuminance';

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Illuminance'>[],
  ): Promise<void> {
    for (const [statusKey, homeyCapability] of [
      ['lux', 'measure_luminance'],
      ['illumination', 'shelly_illumination'],
    ] as const) {
      if (this.status[statusKey] !== undefined) {
        const capabilityOptions = capabilitiesOptions[homeyCapability as never];
        await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions);
      } else {
        await Illuminance.unregisterCapability(homeyDevice, homeyCapability, this.id);
      }
    }

    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    for (const capability of ['measure_luminance', 'shelly_illumination']) {
      await Illuminance.unregisterCapability(homeyDevice, capability, id);
    }
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: IlluminanceStatus): Promise<void> {
    for (const [statusKey, homeyCapability] of [
      ['lux', 'measure_luminance'],
      ['illumination', 'shelly_illumination'],
    ] as const) {
      if (status[statusKey] !== undefined) {
        await this.setCapability(homeyDevice, homeyCapability, status[statusKey]);
      }
    }

    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: IlluminanceConfig): Promise<void> {
    const newSettings: RecursivePartial<IlluminanceHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      if (config[settingKey] !== undefined) {
        newSettings[`Illuminance:${settingKey}`] = config[settingKey] as never;
      }
    }

    homeyDevice.debug(newSettings);
    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<IlluminanceHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<IlluminanceConfig, AllowedPrimitives> = {};

    for (const settingKey of simpleSettingKeys) {
      const homeySettingKey = `Illuminance:${settingKey}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[settingKey] = newSettings[homeySettingKey] as never;
      }
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }

  public getTitleTranslations(): string | { en: string; [p: string]: string } {
    if (this.config.name !== null) {
      return this.config.name;
    }
    return fillTranslationTagsRecursively(capabilitiesOptions['illuminanceName'], {
      name: `${this.id}`,
    }) as string | { en: string; [p: string]: string };
  }

  public static registerFlowCards(app: ShellyApp): void {
    type ValueArg = 'dark' | 'twilight' | 'bright';

    const getIlluminanceComponents = (device: ShellyLocalDevice): Illuminance[] => {
      if (device.virtualDevice === undefined) {
        return [];
      }

      return [...device.virtualComponents.values()].filter(component => component instanceof Illuminance);
    };

    const autoCompleteListener = (
      query: string,
      { device }: { device: ShellyLocalDevice },
    ): { name: string; id: number }[] => {
      return getIlluminanceComponents(device)
        .map(component => ({
          name: translate(app.homey.__('locale'), component.getTitleTranslations()),
          id: component.id,
        }))
        .filter(component => component.name.toLowerCase().includes(query.toLowerCase()));
    };

    app.homey.flow
      .getDeviceTriggerCard('shelly_illumination_changed')
      .registerArgumentAutocompleteListener('illuminance', autoCompleteListener)
      .registerRunListener(
        (
          flowArgs: { value: Array<ValueArg>; illuminance: { name: string; id: number } },
          triggerArgs: { value: ValueArg; illuminance: number },
        ) => {
          return flowArgs.illuminance.id === triggerArgs.illuminance && flowArgs.value.includes(triggerArgs.value);
        },
      );

    app.homey.flow
      .getConditionCard('shelly_illumination_is')
      .registerArgumentAutocompleteListener('illuminance', autoCompleteListener)
      .registerRunListener(
        (
          flowArgs: { value: Array<ValueArg>; device: ShellyLocalDevice; illuminance: { name: string; id: number } },
          _triggerArgs: { manual: boolean },
        ) => {
          const componentKey = `${Illuminance.key}:${flowArgs.illuminance.id}`;
          const component = flowArgs.device.virtualComponents.get(componentKey) as Illuminance | undefined;
          if (component === undefined) {
            throw new Error(app.homey.__('error.component_not_found', { component: componentKey }));
          }
          return flowArgs.value.includes(component.status.illumination!);
        },
      );
  }
}
