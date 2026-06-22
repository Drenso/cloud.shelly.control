import { ComponentWithId } from '../Component.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import SetConfig from './Button/SetConfig.js';
import GetConfig from './Button/GetConfig.js';
import GetStatus from './Button/GetStatus.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import Trigger, { type ButtonTriggerParams } from './Button/Trigger.js';
import type { JsonObject } from '../../../types/json.js';

export type ButtonConfig = {
  /** Identifier of the Button component instance */
  id: number;
  /**
   * Name of the Button instance.
   *
   * name length should not exceed 64 chars
   */
  name: string | null;
  meta: null | {
    ui: {
      /**
       * How the button should be shown in the ui.
       *
       * Empty string for hidden.
       */
      view: '' | 'button';
      /**
       * Url to custom icon
       */
      icon?: null | string;
    };
  };
  /** The component that controls the value of this virtual component */
  owner?: string;
  /** Access flags, consisting of c, r(ead), and w(rite) */
  access?: string;
};

export type ButtonStatus = {
  /** Identifier of the Button component instance */
  id: number;
};

export type ButtonHomeySettings = Record<never, never>;

/**
 * The virtual Button component is used to store a true/false value.
 */
export default class Button extends ComponentWithId<'Button', ButtonStatus, ButtonConfig, ButtonHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Button';
  public static readonly uiName = 'Button';

  public async Trigger(channel: RpcChannel, params: ButtonTriggerParams): ReturnType<typeof Trigger> {
    return Trigger(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Button'>[],
  ): Promise<void> {
    const homeyCapability = 'virtual_button';
    const capabilityOptions: JsonObject = {
      title: '__name__',
    };
    const meta = this.config.meta;

    if (meta !== null) {
      if (meta.ui.view === '') {
        capabilityOptions.uiComponent = null;
      }
    }

    await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions, async (_value: boolean) => {
      await this.Trigger(this.device.getChannel(), { event: 'single_push' });
    });
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    await Button.unregisterCapability(homeyDevice, 'virtual_button', id);
  }

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: Partial<ButtonStatus>): Promise<void> {}

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: ButtonConfig): Promise<void> {}
}
