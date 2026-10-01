import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../rpc/Rpc.js';
import { safeSetCapabilityValue } from '../../safeFunctions.js';
import { ComponentWithoutId } from '../Component.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

type MediaStatus = {
  playback?: {
    enable: boolean;
    buffering?: boolean;
    volume: number;
    media_type?: 'RADIO' | 'AUDIO' | 'RINGTONE' | 'ALERT';
    media_meta?: { title?: string };
  };
};
type MediaConfig = { rev: number };
export type MediaItem = {
  id: number;
  title?: string;
  filename?: string;
  name?: string;
  type?: 'AUDIO' | 'RINGTONE' | 'ALERT' | 'PHOTO' | 'VIDEO';
  valid?: boolean;
};
export type MediaControl = 'play' | 'pause' | 'stop' | 'next' | 'previous';

export default class Media extends ComponentWithoutId<'Media', MediaStatus, MediaConfig, Record<never, never>> {
  public readonly namespace = 'Media';
  public static readonly key = 'media';
  public static readonly uiName = 'Audio';

  protected readonly _SetConfig = (
    channel: RpcChannel,
    params: { config: Partial<MediaConfig> },
  ): Promise<ResponseSuccessFrame<{ restart_required: boolean }>> =>
    channel.sendRequestFrame(createRequestFrame('Media.SetConfig', params));
  protected readonly _GetConfig = (channel: RpcChannel): Promise<ResponseSuccessFrame<MediaConfig>> =>
    channel.sendRequestFrame(createRequestFrame('Media.GetConfig'));
  protected readonly _GetStatus = (channel: RpcChannel): Promise<ResponseSuccessFrame<MediaStatus>> =>
    channel.sendRequestFrame(createRequestFrame('Media.GetStatus'));

  public async setVolume(value: number): Promise<void> {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error('Volume must be between 0 and 1');
    }
    // Both Wall Display web interfaces use the integer volume range 0..10.
    await this.device
      .getChannel()
      .sendRequestFrame(createRequestFrame('Media.SetVolume', { volume: Math.round(value * 10) }));
  }

  public async control(action: MediaControl): Promise<void> {
    const radio = this.status.playback?.media_type === 'RADIO';
    const methods: Record<MediaControl, string> = {
      play: 'MediaPlayer.Play',
      pause: 'MediaPlayer.Pause',
      stop: radio ? 'Radio.Stop' : 'MediaPlayer.Stop',
      next: radio ? 'Radio.PlayNextFavourite' : 'MediaPlayer.Next',
      previous: radio ? 'Radio.PlayPreviousFavourite' : 'MediaPlayer.Previous',
    };
    if (!Object.hasOwn(methods, action)) {
      throw new Error('Unknown playback action');
    }
    await this.device.getChannel().sendRequestFrame(createRequestFrame('Media.' + methods[action]));
  }

  public async listItems(radio: boolean): Promise<MediaItem[]> {
    const method = radio ? 'Media.Radio.ListFavourites' : 'Media.List';
    const { result } = await this.device
      .getChannel()
      .sendRequestFrame<{ list: MediaItem[] }>(createRequestFrame(method));
    return result.list.filter(
      item => radio || (['AUDIO', 'RINGTONE', 'ALERT'].includes(item.type ?? '') && item.valid !== false),
    );
  }

  public async playItem(item: Pick<MediaItem, 'id' | 'type'>, radio: boolean): Promise<void> {
    const method = radio
      ? 'Radio.PlayFavourite'
      : item.type === 'RINGTONE'
        ? 'MediaPlayer.PlayRingtone'
        : item.type === 'ALERT'
          ? 'MediaPlayer.PlayAlert'
          : 'MediaPlayer.Play';
    await this.device.getChannel().sendRequestFrame(createRequestFrame('Media.' + method, { id: item.id }));
  }

  public async refreshStatus(homeyDevice: ShellyLocalDevice): Promise<void> {
    const { result } = await this.GetStatus(this.device.getChannel());
    await this.onStatusUpdate(homeyDevice, result);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    methods: ComponentMethod<'Media'>[],
  ): Promise<string[]> {
    const capabilities: string[] = [];
    if (methods.includes('SetVolume')) {
      homeyDevice.registerCapabilityListener('volume_set', async (value: number) => {
        await this.setVolume(value);
        await this.refreshStatus(homeyDevice);
      });
      capabilities.push('volume_set');
    }
    if (methods.includes('MediaPlayer.Play') && methods.includes('MediaPlayer.Pause')) {
      homeyDevice.registerCapabilityListener('speaker_playing', async (playing: boolean) => {
        await this.control(playing ? 'play' : 'pause');
        await this.refreshStatus(homeyDevice);
      });
      capabilities.push('speaker_playing', 'speaker_track');
    }
    for (const action of ['next', 'previous'] as const) {
      const method = action === 'next' ? 'MediaPlayer.Next' : 'MediaPlayer.Previous';
      if (methods.includes(method)) {
        const capability = action === 'previous' ? 'speaker_prev' : 'speaker_next';
        homeyDevice.registerCapabilityListener(capability, () => this.control(action));
        capabilities.push(capability);
      }
    }
    if (methods.includes('MediaPlayer.Stop')) {
      homeyDevice.registerCapabilityListener('speaker_stop', async () => {
        await this.control('stop');
        await this.refreshStatus(homeyDevice);
      });
      capabilities.push('speaker_stop');
    }
    return capabilities;
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: MediaStatus): Promise<void> {
    const playback = status.playback;
    if (playback === undefined) {
      return;
    }
    if (typeof playback.volume === 'number' && Number.isFinite(playback.volume)) {
      await safeSetCapabilityValue(homeyDevice, 'volume_set', Math.max(0, Math.min(1, playback.volume / 10)));
    }
    if (typeof playback.enable === 'boolean') {
      await safeSetCapabilityValue(homeyDevice, 'speaker_playing', playback.enable);
    }
    if (playback.media_meta !== undefined) {
      await safeSetCapabilityValue(homeyDevice, 'speaker_track', playback.media_meta.title ?? null);
    }
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: MediaConfig): Promise<void> {}
}
