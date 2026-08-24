import type { JsonObject } from '../../../types/json.js';
import { ComponentWithId } from '../Component.js';
import SetConfig from './Object/SetConfig.js';
import GetConfig from './Object/GetConfig.js';
import GetStatus from './Object/GetStatus.js';
import Set from './Object/Set.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import type { ObjectSetParams } from './Object/Set.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

export type ObjectConfig = {
  /** Identifier of the Object component instance */
  id: number;
  /**
   * Name of the Object instance.
   *
   * name length should not exceed 64 chars
   */
  name: string | null;
  /** Stores the component's metadata */
  meta: {
    cloud: 'bymin'[];
    ui: {
      unit: string;
    };
  } | null;
  /** The component that controls the value of this virtual component */
  owner?: string;
  /** Access flags, consisting of c, r(ead), and w(rite) or `*` for all */
  access?: string;
};

export type ObjectStatus = {
  /** Source of the last command */
  source: string;
  value: JsonObject | null;
  /** Unix timestamp for the last value update */
  last_update_ts: number;
};

export type ObjectHomeySettings = Record<never, never>;

/**
 * The virtual Object component is used to store an object (or null).
 *
 * It is only used in XT1 (powered by Shelly) devices.
 */
export default class Object extends ComponentWithId<'Object', ObjectStatus, ObjectConfig, ObjectHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Object';
  public static readonly uiName = 'Object';
  protected static readonly key = 'object';

  public async Set(channel: RpcChannel, params: ObjectSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  public async registerHomeyDevice(
    _homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Object'>[],
  ): Promise<void> {}

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: Partial<ObjectStatus>): Promise<void> {}

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: ObjectConfig): Promise<void> {}
}
