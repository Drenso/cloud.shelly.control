import { ComponentWithId } from '../Component.js';
import SetConfig from './Smoke/SetConfig.js';
import GetConfig from './Smoke/GetConfig.js';
import GetStatus from './Smoke/GetStatus.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import Mute from './Smoke/Mute.js';
import capabilitiesOptions from './Smoke/capabilitiesOptions.json' with { type: 'json' };
import type { ComponentMethod } from './Shelly/ListMethods.js';

export type SmokeConfig = {
  /** Identifier of the component instance */
  id: number;
  /** Name of the component instance */
  name: string | null;
};

export type SmokeStatus = {
  /** Identifier of the component instance */
  id: number;
  alarm: boolean;
  mute: boolean;
};

export type SmokeHomeySettings = Record<string, never>;

export default class Smoke extends ComponentWithId<'Smoke', SmokeStatus, SmokeConfig, SmokeHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'Smoke';
  public static readonly uiName = 'Smoke Sensor';
  public static readonly key = 'smoke';

  public async Mute(channel: RpcChannel): ReturnType<typeof Mute> {
    return Mute(channel, this.id);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    methods: ComponentMethod<'Smoke'>[],
  ): Promise<string[]> {
    const componentCapabilities: string[] = [];

    if (this.status.alarm !== undefined) {
      const homeyCapability = 'alarm_smoke';
      const capabilityOptions = capabilitiesOptions[homeyCapability as never];
      componentCapabilities.push(await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions));
    }

    if (methods.includes('Mute')) {
      const homeyCapability = 'shelly_mute_alarm';
      const capabilityOptions = capabilitiesOptions[homeyCapability as never];
      const capabilityListener = async (): Promise<void> => {
        await this.Mute(this.device.getChannel());
      };
      componentCapabilities.push(
        await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions, capabilityListener),
      );
    }

    return componentCapabilities;
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: SmokeStatus): Promise<void> {
    if (status.alarm !== undefined) {
      await this.setCapability(homeyDevice, 'alarm_smoke', status.alarm);
    }
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: SmokeConfig): Promise<void> {}
}
