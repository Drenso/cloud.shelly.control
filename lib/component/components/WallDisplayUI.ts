import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../rpc/Rpc.js';
import type { RecursivePartial } from '../../util.js';
import { type AllowedPrimitives, ComponentWithoutId } from '../Component.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

type WallDisplayUIStatus = Record<string, never>;
type WallDisplayUIConfig = {
  brightness: {
    auto: boolean;
    level: number;
    auto_off: { enable: boolean; timeout: number; by_lux: boolean };
    auto_dim: { enable: boolean; timeout: number };
  };
};
type WallDisplayUISettings = {
  'Ui:brightness.auto': boolean;
  'Ui:brightness.level': number;
};

export default class WallDisplayUI extends ComponentWithoutId<
  'Ui',
  WallDisplayUIStatus,
  WallDisplayUIConfig,
  WallDisplayUISettings
> {
  public readonly namespace = 'Ui';
  public static readonly key = 'ui';
  public static readonly uiName = 'Screen';

  protected readonly _SetConfig = (
    channel: RpcChannel,
    params: { config: RecursivePartial<WallDisplayUIConfig, AllowedPrimitives> },
  ): Promise<ResponseSuccessFrame<{ restart_required: boolean }>> =>
    channel.sendRequestFrame(createRequestFrame('Ui.SetConfig', params));
  protected readonly _GetConfig = (channel: RpcChannel): Promise<ResponseSuccessFrame<WallDisplayUIConfig>> =>
    channel.sendRequestFrame(createRequestFrame('Ui.GetConfig'));
  protected readonly _GetStatus = (channel: RpcChannel): Promise<ResponseSuccessFrame<WallDisplayUIStatus>> =>
    channel.sendRequestFrame(createRequestFrame('Ui.GetStatus'));

  public async setScreen(on: boolean): Promise<void> {
    await this.device.getChannel().sendRequestFrame(createRequestFrame('Ui.Screen.Set', { on }));
  }

  public async setBrightness(percent: number): Promise<void> {
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error('Screen brightness must be between 0 and 100');
    }
    await this.SetConfig(this.device.getChannel(), {
      config: { brightness: { auto: false, level: Math.round(percent) } },
    });
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    methods: ComponentMethod<'Ui'>[],
  ): Promise<string[]> {
    if (!methods.includes('Screen.Set')) {
      return [];
    }
    homeyDevice.registerCapabilityListener('button.screen_on', () => this.setScreen(true));
    homeyDevice.registerCapabilityListener('button.screen_off', () => this.setScreen(false));
    await homeyDevice.setCapabilityOptions('button.screen_on', { title: { en: 'Wake screen', no: 'Vekk skjermen' } });
    await homeyDevice.setCapabilityOptions('button.screen_off', {
      title: { en: 'Turn screen off', no: 'Slå av skjermen' },
    });
    // Ui.GetStatus provides no screen power state, so expose command buttons.
    return ['button.screen_on', 'button.screen_off'];
  }

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: WallDisplayUIStatus): Promise<void> {}

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: WallDisplayUIConfig): Promise<void> {
    await homeyDevice.setComponentSettings(this.namespace, undefined, {
      'Ui:brightness.auto': config.brightness.auto,
      'Ui:brightness.level': config.brightness.level,
    });
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<WallDisplayUISettings>,
  ): Promise<boolean> {
    const brightness: Partial<WallDisplayUIConfig['brightness']> = {};
    if (changedKeys.includes('Ui:brightness.auto')) {
      brightness.auto = newSettings['Ui:brightness.auto'];
    }
    if (changedKeys.includes('Ui:brightness.level')) {
      brightness.level = newSettings['Ui:brightness.level'];
    }
    if (Object.keys(brightness).length === 0) {
      return false;
    }
    const response = await this.SetConfig(this.device.getChannel(), { config: { brightness } });
    return response.result?.restart_required ?? false;
  }
}
