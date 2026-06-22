import { ComponentWithId } from '../Component.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import SetConfig from './Boolean/SetConfig.js';
import GetConfig from './Boolean/GetConfig.js';
import GetStatus from './Boolean/GetStatus.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import Set, { type BooleanSetParams } from './Boolean/Set.js';
import type { JsonObject } from '../../../types/json.js';

export type BooleanConfig = {
  /** Identifier of the Boolean component instance */
  id: number;
  /**
   * Name of the Boolean instance.
   *
   * name length should not exceed 64 chars
   */
  name: string | null;
  /** Whether the value should persist */
  persisted: boolean;
  /** Value applied on reboot if `persisted` is false */
  default_value: boolean;
  meta: null | {
    cloud?: ['log'];
    ui: {
      /**
       * How the boolean should be shown in the ui.
       *
       * Empty string for hidden.
       */
      view: '' | 'label' | 'toggle';
      /**
       * Title to be used for false and true.
       *
       * Empty string for default value.
       */
      titles: [string, string];
      /**
       * Urls to icons to be used for false and true.
       */
      buttonIcons: null | [string, string];
      /**
       * Url to custom icon
       */
      icon: null | string;
    };
  };
  /** The component that controls the value of this virtual component */
  owner?: string;
  /** Access flags, consisting of c, r(ead), and w(rite) */
  access?: string;
};

export type BooleanStatus = {
  /** Source of the last command */
  source: string;
  value: boolean;
  /** Unix timestamp for the last value update */
  last_update_ts: number;
};

export type BooleanHomeySettings = Record<never, never>;

/**
 * The virtual Boolean component is used to store a true/false value.
 */
export default class Boolean extends ComponentWithId<'Boolean', BooleanStatus, BooleanConfig, BooleanHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Boolean';
  public static readonly uiName = 'Boolean';

  public async Set(channel: RpcChannel, params: BooleanSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Boolean'>[],
  ): Promise<void> {
    const homeyCapability = 'virtual_boolean';
    let capabilityOptions: JsonObject = {
      title: '__name__',
    };
    const meta = this.config.meta;

    if (this.config.access !== undefined) {
      if (this.config.access !== '*' && !this.config.access.includes('w')) {
        capabilityOptions.uiComponent = 'sensor';
        capabilityOptions.setable = 'false';
      }
    }

    if (meta !== null) {
      const titles = meta.ui.titles;
      const titleFalse = titles.length !== 2 || titles[0] === '' ? 'Off' : titles[0];
      const titleTrue = titles.length !== 2 || titles[1] === '' ? 'On' : titles[1];
      capabilityOptions = {
        ...capabilityOptions,
        titleTrue: titleTrue,
        titleFalse: titleFalse,
        insightsTitleTrue: {
          en: `Became ${titleTrue}`,
        },
        insightsTitleFalse: {
          en: `Became ${titleFalse}`,
        },
      };

      if (meta.ui.view === '') {
        capabilityOptions.uiComponent = null;
      }
    }

    await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions, async (value: boolean) => {
      await this.Set(this.device.getChannel(), { value });
    });
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    await Boolean.unregisterCapability(homeyDevice, 'virtual_boolean', id);
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<BooleanStatus>): Promise<void> {
    if (status.value !== undefined) {
      await this.setCapability(homeyDevice, 'virtual_boolean', status.value);
    }
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: BooleanConfig): Promise<void> {}
}
