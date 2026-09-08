import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import type { NotificationEventParam } from '../../rpc/Rpc.js';
import { safeAddCapability } from '../../safeFunctions.js';
import { deepAssign, type RecursivePartial } from '../../util.js';
import { type AllowedPrimitives, ComponentWithId } from '../Component.js';
import AddZone, { type CameraAddZoneParams } from './Camera/AddZone.js';
import capabilitiesOptions from './Camera/capabilitiesOptions.json' with { type: 'json' };
import CaptureImage, { type CameraCaptureImageParams } from './Camera/CaptureImage.js';
import DeleteZone, { type CameraDeleteZoneParams } from './Camera/DeleteZone.js';
import GetCapabilities from './Camera/GetCapabilities.js';
import GetConfig from './Camera/GetConfig.js';
import GetStatus from './Camera/GetStatus.js';
import type { CameraSetParams } from './Camera/Set.js';
import Set from './Camera/Set.js';
import SetConfig from './Camera/SetConfig.js';
import StartRecording, { type CameraStartRecordingParams } from './Camera/StartRecording.js';
import StopRecording, { type CameraStopRecordingParams } from './Camera/StopRecording.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

export type CameraConfig = {
  /** Id of the camera component */
  id: number;
  /** Name of the camera. */
  name: string;
  /** LED settings. */
  led: {
    /** Enable the LED activity indication. */
    enable: boolean;
  };
  /** Audio settings. */
  audio: {
    /** Microphone settings. */
    input: {
      /** Enable the microphone (audio capture). */
      enable: boolean;
    };
    /** Speaker settings. */
    output: {
      /** Speaker volume, 0..100. */
      volume: number;
    };
  };
  /** Event sound settings. */
  sounds: {
    /** Enable playing sounds. When false, Camera.PlaySound returns an error and event sounds (e.g. camera on, privacy on/off, factory/network reset) are not played. */
    enable: boolean;
  };
  /** Motion detection settings. */
  motion: {
    /** Motion detection sensitivity preset. */
    sensitivity: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    /** Motion-triggered recording settings. */
    recording: {
      /** Record a clip when motion is detected. */
      enable: boolean;
    };
  };
  /** Night-vision (IR-cut filter and IR LEDs) settings. */
  night_vision: {
    /** Night-vision mode. See accepted values. */
    mode:
      | 'auto' // Switch between day and night mode automatically based on the configured thresholds.
      | 'day' // Force day mode.
      | 'night'; // Force night mode.
    /** Enable the IR LEDs in night mode. */
    ir_leds: boolean;
    /** Ambient light level around which day and night mode switch, 0..100. Lower values switch at a darker level (night mode engages only when it gets quite dark), higher values switch at a brighter level. Used in auto mode. */
    light_threshold: number;
    /** Day/night switch sensitivity, 0..100 (0 = most stable / most resistant to flipping between modes, 100 = most sensitive). Used in auto mode. */
    sensitivity: number;
  };
  /** RTSP server settings. */
  rtsp: {
    /** Enable the RTSP server. */
    enable: boolean;
  };
  /** Video image settings. */
  video: {
    /** Brightness, 0..100. */
    brightness: number;
    /** Contrast, 0..100. */
    contrast: number;
    /** Saturation, 0..100. */
    saturation: number;
    /** Sharpness, 0..100. */
    sharpness: number;
    /** Tint, -256..256. */
    tint: number;
    /** Color temperature, -256..256. */
    temperature: number;
    /** Flip the image vertically. */
    flip: boolean;
    /** Mirror the image horizontally. */
    mirror: boolean;
    /** Anti-flicker mode, matched to the local mains frequency to avoid banding under artificial lighting. See accepted values. */
    antiflicker:
      | '50Hz' // Anti-flicker tuned for 50 Hz mains (Europe, Asia, Africa, Australia).
      | '60Hz'; // Anti-flicker tuned for 60 Hz mains (North America, parts of South America).
  };
  /** Per-stream configuration. The object is keyed by stream id (e.g. "0", "1"). */
  streams: Record<
    number,
    {
      /** Stream resolution and frame rate (e.g. "1920x1080@25"). Must be one of the values reported by Camera.GetCapabilities in resolutions. */
      resolution: string;
      /** Stream bitrate in kbps. Must fall within the range reported by Camera.GetCapabilities in bitrate_range. */
      bitrate: number;
    }
  >;
};

export type CameraStatus = {
  /** Id of the camera component. */
  id: number;
  /** Whether the camera is armed. */
  arm: boolean;
  /** Privacy mode. When enabled, the streamer is suspended: video and audio capture stop, the speaker is disabled, and no streams or recordings can be served until privacy mode is turned off. */
  privacy: boolean;
  /** Current state of the streamer. See accepted values. */
  streamer:
    | 'stopped' // The streamer is not running.
    | 'starting' // The streamer is starting up.
    | 'running' // The streamer is running and ready to serve streams, snapshots and recordings.
    | 'stopping' // The streamer is shutting down (e.g. after entering privacy mode or before a reboot).
    | 'unknown'; // The streamer state could not be determined.
  /** Optional. Version string reported by the streamer; absent if the streamer has not reported one yet. */
  streamer_version?: string;
  /**   true if motion is currently detected in any CameraZone. */
  motion: boolean;
  /** Number of currently active live streams. */
  streams: number;
  /** Recording encryption state. */
  recording_encryption: {
    /** true if end-to-end encryption of cloud recordings has been set up on this device. */
    configured: boolean;
  };
  /** Active recordings. Present only when at least one recording is in progress. The object is keyed by recording id (UUID). */
  recordings?: Record<
    string,
    {
      /** Unix timestamp when the recording started. */
      ts: number;
      /** Stream id being recorded. */
      stream: number;
      /** Optional. Requested recording duration in seconds; absent for recordings without a fixed duration. */
      duration?: number;
      /** Optional. The event that triggered the recording. Present only for motion-triggered recordings; absent for recordings started via Camera.StartRecording. Carries the source component (component, id), the event name (always "motion_detected") and the timestamp (ts). */
      trigger?: Pick<NotificationEventParam, 'ts' | 'component' | 'id' | 'event'> & {
        event: 'motion_detected';
      };
    }
  >;
  /** Optional. Currently active error conditions. Absent when there are no errors. See accepted values. */
  errors?: Array<'streamer_fs_bad'>; // The streamer's filesystem version does not match the expected version and may need to be reflashed.
};

export type CameraHomeySettings = {
  'Camera:audio.input.enable': boolean;
  'Camera:audio.output.volume': number;
  'Camera:led.enable': boolean;
  'Camera:motion.recording.enable': boolean;
  'Camera:motion.sensitivity': 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  'Camera:night_vision.ir_leds': boolean;
  'Camera:night_vision.light_threshold': number;
  'Camera:night_vision.mode': 'auto' | 'day' | 'night';
  'Camera:night_vision.sensitivity': number;
  'Camera:sounds.enable': boolean;
  'Camera:video.antiflicker': '50Hz' | '60Hz';
  'Camera:video.brightness': number;
  'Camera:video.contrast': number;
  'Camera:video.flip': boolean;
  'Camera:video.mirror': boolean;
  'Camera:video.saturation': number;
  'Camera:video.sharpness': number;
  'Camera:video.temperature': number;
  'Camera:video.tint': number;
};

/** Camera component. */
export default class Camera extends ComponentWithId<'Camera', CameraStatus, CameraConfig, CameraHomeySettings> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'Camera';
  public static readonly uiName = 'Camera';
  public static readonly key = 'camera';

  private readonly capabilityMap = [
    ['arm', 'shelly_armed'],
    ['privacy', 'shelly_privacy_mode'],
    ['streams', 'shelly_stream_count'],
  ] as const;

  public async GetCapabilities(channel: RpcChannel): ReturnType<typeof GetCapabilities> {
    return GetCapabilities(channel, this.id);
  }

  public async Set(channel: RpcChannel, params: CameraSetParams): ReturnType<typeof Set> {
    return Set(channel, this.id, params);
  }

  public async CaptureImage(channel: RpcChannel, params: CameraCaptureImageParams): ReturnType<typeof CaptureImage> {
    return CaptureImage(channel, this.id, params);
  }

  public async StartRecording(
    channel: RpcChannel,
    params: CameraStartRecordingParams,
  ): ReturnType<typeof StartRecording> {
    return StartRecording(channel, this.id, params);
  }

  public async StopRecording(channel: RpcChannel, params: CameraStopRecordingParams): ReturnType<typeof StopRecording> {
    return StopRecording(channel, this.id, params);
  }

  public async AddZone(channel: RpcChannel, params: CameraAddZoneParams): ReturnType<typeof AddZone> {
    return AddZone(channel, this.id, params);
  }

  public async DeleteZone(channel: RpcChannel, params: CameraDeleteZoneParams): ReturnType<typeof DeleteZone> {
    return DeleteZone(channel, this.id, params);
  }

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: Array<ComponentMethod<'Camera'>>,
  ): Promise<void> {
    // @ts-expect-error SDK types not available yet
    const video = await homeyDevice.homey.videos.createVideoRTSP({
      acceptInvalidCertificates: true,
    });

    video.registerVideoUrlListener(async () => {
      // RTSP needs to be enabled
      if (!this.config.rtsp?.enable) {
        await SetConfig(this.device.getChannel(), this.id, { config: { rtsp: { enable: true } } });
      }

      let auth = '';
      const password = homeyDevice.getStoreValue('password');
      if (password !== undefined) {
        auth = `admin:${password}@`;
      }

      return {
        url: `rtsp://${auth}${this.device.ipAddress}/stream/0`,
      };
    });

    // @ts-expect-error SDK types not available yet
    homeyDevice.setCameraVideo(`camera:${this.id}`, this.config.name ?? homeyDevice.homey.__('camera._name'), video);

    for (const [statusKey, homeyCapability] of this.capabilityMap) {
      if (this.status[statusKey] !== undefined) {
        await this.registerCapability(homeyDevice, homeyCapability, capabilitiesOptions[homeyCapability as never]);
      }
    }

    await safeAddCapability(homeyDevice, 'shelly_errors');
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: CameraStatus): Promise<void> {
    for (const [statusKey, homeyCapability] of this.capabilityMap) {
      if (status[statusKey] !== undefined) {
        await this.setCapability(homeyDevice, homeyCapability, status[statusKey]);
      }
    }

    await homeyDevice.updateErrors(this.getComponentKey(), status.errors ?? []);
  }

  public async onConfigUpdate(
    homeyDevice: ShellyLocalDevice,
    config: RecursivePartial<CameraConfig, AllowedPrimitives>,
  ): Promise<void> {
    const newSettings: Partial<CameraHomeySettings> = {};

    if (config.audio?.input?.enable !== undefined) {
      newSettings['Camera:audio.input.enable'] = config.audio.input.enable;
    }
    if (config.audio?.output?.volume !== undefined) {
      newSettings['Camera:audio.output.volume'] = config.audio.output.volume;
    }
    if (config.led?.enable !== undefined) {
      newSettings['Camera:led.enable'] = config.led.enable;
    }
    if (config.motion?.recording?.enable !== undefined) {
      newSettings['Camera:motion.recording.enable'] = config.motion.recording.enable;
    }

    for (const key of ['sensitivity'] as const) {
      const homeySettingKey = `Camera:motion.${key}` as const;
      if (config.motion?.[key] !== undefined) {
        newSettings[homeySettingKey] = config.motion[key] as never;
      }
    }

    for (const key of ['ir_leds', 'light_threshold', 'mode', 'sensitivity'] as const) {
      const homeySettingKey = `Camera:night_vision.${key}` as const;
      if (config.night_vision?.[key] !== undefined) {
        newSettings[homeySettingKey] = config.night_vision[key] as never;
      }
    }

    for (const key of ['enable'] as const) {
      const homeySettingKey = `Camera:sounds.${key}` as const;
      if (config.sounds?.[key] !== undefined) {
        newSettings[homeySettingKey] = config.sounds[key];
      }
    }

    for (const key of [
      'antiflicker',
      'brightness',
      'contrast',
      'flip',
      'mirror',
      'saturation',
      'sharpness',
      'temperature',
      'tint',
    ] as const) {
      const homeySettingKey = `Camera:video.${key}` as const;
      if (config.video?.[key] !== undefined) {
        newSettings[homeySettingKey] = config.video[key] as never;
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, undefined, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<CameraHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<CameraConfig, AllowedPrimitives> = {};

    if (changedKeys.includes('Camera:audio.input.enable')) {
      deepAssign(changedConfig, { audio: { input: { enable: newSettings['Camera:audio.input.enable'] } } });
    }

    if (changedKeys.includes('Camera:audio.output.volume')) {
      deepAssign(changedConfig, { audio: { output: { volume: newSettings['Camera:audio.output.volume'] } } });
    }

    if (changedKeys.includes('Camera:led.enable')) {
      deepAssign(changedConfig, { led: { enable: newSettings['Camera:led.enable'] } });
    }

    if (changedKeys.includes('Camera:motion.recording.enable')) {
      deepAssign(changedConfig, { motion: { recording: { enable: newSettings['Camera:motion.recording.enable'] } } });
    }

    for (const key of ['sensitivity'] as const) {
      const homeySettingKey = `Camera:motion.${key}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        deepAssign(changedConfig, { motion: { [key]: newSettings[homeySettingKey] } });
      }
    }

    for (const key of ['ir_leds', 'light_threshold', 'mode', 'sensitivity'] as const) {
      const homeySettingKey = `Camera:night_vision.${key}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        deepAssign(changedConfig, { night_vision: { [key]: newSettings[homeySettingKey] } });
      }
    }

    for (const key of ['enable'] as const) {
      const homeySettingKey = `Camera:sounds.${key}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        deepAssign(changedConfig, { sounds: { [key]: newSettings[homeySettingKey] } });
      }
    }
    for (const key of [
      'antiflicker',
      'brightness',
      'contrast',
      'flip',
      'mirror',
      'saturation',
      'sharpness',
      'temperature',
      'tint',
    ] as const) {
      const homeySettingKey = `Camera:video.${key}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        deepAssign(changedConfig, { video: { [key]: newSettings[homeySettingKey] } });
      }
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }
}
