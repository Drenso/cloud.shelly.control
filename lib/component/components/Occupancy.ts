import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../rpc/Rpc.js';
import { ComponentWithId } from '../Component.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

type OccupancyStatus = { id: number; value: boolean };
type OccupancyConfig = { id: number; name?: string | null; wake_screen: boolean };
type OccupancySettings = { 'Occupancy:wake_screen': boolean };

export default class Occupancy extends ComponentWithId<
  'Occupancy',
  OccupancyStatus,
  OccupancyConfig,
  OccupancySettings
> {
  public readonly namespace = 'Occupancy';
  public static readonly key = 'occupancy';
  public static readonly uiName = 'Proximity';

  protected readonly _SetConfig = (
    channel: RpcChannel,
    id: number,
    params: { config: Partial<Omit<OccupancyConfig, 'id'>> },
  ): Promise<ResponseSuccessFrame<{ restart_required: boolean }>> =>
    channel.sendRequestFrame(createRequestFrame('Occupancy.SetConfig', { id, ...params }));
  protected readonly _GetConfig = (channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<OccupancyConfig>> =>
    channel.sendRequestFrame(createRequestFrame('Occupancy.GetConfig', { id }));
  protected readonly _GetStatus = (channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<OccupancyStatus>> =>
    channel.sendRequestFrame(createRequestFrame('Occupancy.GetStatus', { id }));

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Occupancy'>[],
  ): Promise<string[]> {
    return [
      await this.registerCapability(homeyDevice, 'alarm_presence', {
        title: { en: 'Proximity', no: 'Nærhet' },
      }),
    ];
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Partial<OccupancyStatus>): Promise<void> {
    if (typeof status.value === 'boolean') {
      await this.setCapability(homeyDevice, 'alarm_presence', status.value);
    }
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: OccupancyConfig): Promise<void> {
    await homeyDevice.setComponentSettings(this.namespace, this.id, {
      'Occupancy:wake_screen': config.wake_screen,
    });
  }

  public async handleSettings(
    _homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<OccupancySettings>,
  ): Promise<boolean> {
    if (!changedKeys.includes('Occupancy:wake_screen')) {
      return false;
    }
    const response = await this.SetConfig(this.device.getChannel(), {
      config: { wake_screen: newSettings['Occupancy:wake_screen'] },
    });
    return response.result?.restart_required ?? false;
  }
}
