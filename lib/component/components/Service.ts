import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import GetConfig from './Service/GetConfig.js';
import GetStatus from './Service/GetStatus.js';
import SetConfig from './Service/SetConfig.js';
import Set, { type ServiceSetParams } from './Service/Set.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import type { RecursivePartial } from '../../util.js';
import { safeAddCapability } from '../../safeFunctions.js';

export type ServiceConfig = {
  /** Identifier of the Service component instance */
  id: number;
} & ValveServiceConfig;

type ValveServiceConfig = {
  /**
   * Defines the behavior of the valve when the power gets lost:
   */
  on_power_loss: 'close' | 'open' | 'none' | 'set_position';
  /**
   * Defines the behavior of the valve when the power is restored:
   */
  on_power_restore: 'close' | 'open' | 'none' | 'set_position' | 'restore_last';
  /**
   * Applies when `on_power_restore` is set to `set_position`, defining the valve position after power is restored.
   */
  power_restored_pos: number;
  /**
   * Applies when `on_power_loss` is set to `set_position`, defining the valve position when power is lost.
   */
  power_loss_pos: number;
  /** Name of the service instance */
  name: string | null;
} & Record<string, undefined>;

export type ServiceStatus = {
  /** Unique MD5 hash of the current service file. */
  etag: string;
  /** Current state of the service. */
  state: 'running' | string;
  /** System resource usage statistics. */
  stats: {
    /** Number of variables currently in use by the service. */
    mem: number;
    /** Maximum number of variables in use by the service since its start. */
    mem_peak: number;
  };
  /**
   * Active service errors.
   *
   * Only present if there are active errors.
   */
  errors?: string[];
  /**
   * Active service flags.
   *
   * Only present if there are active flags.
   */
  flags?: string[];
};

export type ServiceHomeySettings = {
  'Service:on_power_loss': 'close' | 'open' | 'none' | 'set_position';
  'Service:on_power_restore': 'close' | 'open' | 'none' | 'set_position' | 'restore_last';
  'Service:power_restored_pos': number;
  'Service:power_loss_pos': number;
};

const simpleSettings = [
  'on_power_loss',
  'on_power_restore',
  'power_restored_pos',
  'power_loss_pos',
] as const satisfies (keyof Required<ServiceConfig>)[];

/**
 * The Service component represents a virtual service.
 */
export default class Service extends ComponentWithId<'Service', ServiceStatus, ServiceConfig, ServiceHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'Service';
  public static readonly uiName = 'Service';
  protected static readonly key = 'service';

  public async Set(channel: RpcChannel, params: ServiceSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Service'>[],
  ): Promise<void> {
    await safeAddCapability(homeyDevice, 'alarm_generic');
    await safeAddCapability(homeyDevice, 'shelly_errors');
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    _homeyDevice: ShellyLocalDevice,
    _id: number,
  ): Promise<void> {}

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<ServiceStatus>): Promise<void> {
    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: ServiceConfig): Promise<void> {
    const newSettings: RecursivePartial<ServiceHomeySettings, AllowedPrimitives> = {};

    for (const settingKey of simpleSettings) {
      if (config[settingKey] !== undefined) {
        newSettings[`Service:${settingKey}`] = config[settingKey] as never;
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, this.id, newSettings);
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<ServiceHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<ServiceConfig, AllowedPrimitives> = {};

    for (const settingKey of simpleSettings) {
      if (changedKeys.includes(`Service:${settingKey}`)) {
        changedConfig[settingKey] = newSettings[
          `Service:${settingKey}`
        ] as unknown as ServiceConfig[keyof ServiceConfig];
      }
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }
}
