import type ShellyLocalDevice from '../../Device.mjs';
import type { RecursivePartial } from '../../util.mjs';
import { type AllowedPrimitives, ComponentWithId } from '../Component.mjs';
import GetConfig from './Illuminance/GetConfig.mjs';
import GetStatus from './Illuminance/GetStatus.mjs';
import SetConfig from './Illuminance/SetConfig.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import type ShellyApp from '../../../app.mjs';

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
  errors: string[];
};

export type IlluminanceHomeySettings = {
  'Illuminance:dark_thr': number;
  'Illuminance:bright_thr': number;
};

const simpleSettingKeys = ['dark_thr', 'bright_thr'] as const satisfies (keyof IlluminanceConfig)[];

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

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Illuminance'>[],
  ): Promise<void> {
    await this.registerCapability(homeyDevice, 'lux', 'measure_luminance');
    await this.registerCapability(homeyDevice, 'illumination', 'shelly_illumination');

    // Set correct capability values
    await this.onStatusUpdate(homeyDevice, this.status);
    // Set correct setting values
    await this.onConfigUpdate(homeyDevice, this.config);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: IlluminanceStatus): Promise<void> {
    await this.updateMeasured(homeyDevice, status, 'lux', 'measure_luminance');
    await this.updateMeasured(homeyDevice, status, 'illumination', 'shelly_illumination');
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

  private async registerCapability(
    homeyDevice: ShellyLocalDevice,
    statusProperty: keyof IlluminanceStatus,
    homeyCapability: string,
  ): Promise<void> {
    if (this.status[statusProperty] === undefined) {
      return;
    }

    await homeyDevice.safeAddCapability(homeyCapability);
  }

  private async updateMeasured(
    homeyDevice: ShellyLocalDevice,
    status: RecursivePartial<IlluminanceStatus, AllowedPrimitives>,
    statusProperty: keyof IlluminanceStatus,
    homeyCapability: string,
  ): Promise<void> {
    if (status[statusProperty] === undefined) {
      return;
    }

    await homeyDevice.safeSetCapability(homeyCapability, status[statusProperty]).catch(homeyDevice.error);
  }

  public static registerFlowCards(app: ShellyApp): void {
    type ValueArg = 'dark' | 'twilight' | 'bright';

    app.homey.flow
      .getDeviceTriggerCard('shelly_illumination_changed')
      .registerRunListener((flowArgs: { value: Array<ValueArg> }, triggerArgs: { value: ValueArg }) => {
        return flowArgs.value.includes(triggerArgs.value);
      });

    app.homey.flow
      .getConditionCard('shelly_illumination_is')
      .registerRunListener(
        (flowArgs: { value: Array<ValueArg>; device: ShellyLocalDevice }, _triggerArgs: { manual: boolean }) => {
          return flowArgs.value.includes(flowArgs.device.getCapabilityValue('shelly_illumination'));
        },
      );
  }
}
