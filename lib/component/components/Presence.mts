import type ShellyLocalDevice from '../../Device.mjs';
import type { NotificationEventParam } from '../../rpc/Rpc.mjs';
import { type AllowedPrimitives, ComponentWithoutId } from '../Component.mjs';
import SetConfig from './Presence/SetConfig.mjs';
import GetConfig from './Presence/GetConfig.mjs';
import GetStatus from './Presence/GetStatus.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import AddZone from './Presence/AddZone.mjs';
import DeleteZone from './Presence/DeleteZone.mjs';
import TiltCalibrate from './Presence/TiltCalibrate.mjs';
import LiveTrack from './Presence/LiveTrack.mjs';
import SetSensor from './Presence/SetSensor.mjs';
import capabilitiesOptions from './Presence/capabilitiesOptions.json' with { type: 'json' };
import type { RecursivePartial } from '../../util.mjs';

export type PresenceConfig = {
  /** Enable or disable tracking sensor */
  enable: boolean;
  /** Lower detection limit in meters */
  zmin: number | null;
  /** Upper detection limit in meters */
  zmax: number | null;
  /** Sensor configuration */
  sensor: SensorConfig;
  /** UI configuration */
  ui: {
    /** Units are in imeprial system, otherwise units are in metric system */
    imperial: boolean;
  };
  /**
   * Blind zone in which sensor will ignore objects.
   *
   * Given as array of x0, y0, x1, y1 definitions.
   *
   * See https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/PresenceZone/#zone-area
   */
  blind: Array<[number, number, number, number]>;
  /** LED configuration */
  leds: {
    /**
     * Max brightness of led.
     *
     * Range 0-100
     */
    brightness: number;
    /** LED configuration for night mode */
    night_mode: {
      /** Enable or disable night mode */
      enable: boolean;
      /** range 0-100 */
      brightness: number;
      /**
       * start and end time of night_mode in format HH:MM
       *
       * range 00:00 - 23:59
       */
      active_between: [`${number}:${number}`, `${number}:${number}`] | [];
    };
  };
  /**
   * Default presence zone key.
   *
   * (readonly)
   */
  main_zone: string;
};

type SensorConfig = {
  /** Sensor is flipped by 180 degrees */
  flipped: boolean;
  /**
   * Mount height of sensor
   *
   * (in meters)
   */
  height: number;
  /**
   * Sensor vertical tilt.
   *
   * Can be omitted and set automatic with `Presence.TiltCalibrate`
   */
  tilt: number;
  /** Mount position of sensor in room */
  position: 'left' | 'center' | 'right';
  /** Power of sensor */
  power: 'low' | 'medium' | 'high';
  /** Sensor sensitivity. */
  sensitivity: 'low' | 'medium' | 'high' | 'custom';
  /**
   * Object recognition threshold
   *
   * The points required to recognize an object.
   * Lower values allow detection of smaller or partially visible objects.
   *
   * Range: 10 to 100 points.
   */
  points: number;
  /**
   * Velocity threshold
   *
   * the minimum speed to detect an object. Use low values to better detect slow movement.
   * Use high values to ignore slow or stationary objects.
   *
   * Range: 0.01 m to 1 m per second.
   */
  velocity: number;
  /**
   * SNR threshold
   *
   * The minimum signal strength to detect motion.
   * Lower values increase sensitivity; higher values reduce false detections.
   *
   * Range: 10 to 100.
   */
  snr: number;
  /**
   * Max velocity difference
   *
   * The speed variance for grouping points as one target.
   * Prevents unrelated motion (e.g., one object moving past another) from being grouped together.
   *
   * Range: 1 m to 50 m per second.
   */
  max_velocity: number;
  /** Detection state thresholds */
  state: {
    /**
     * Motion activation threshold
     *
     * The frames required to mark an object as active.
     * Lower values react faster to motion; higher values improve stability and reduce false triggers.
     *
     * Range: 1 to 100 frames.
     */
    det_act_thr: number;
    /**
     * Motion release threshold
     *
     * the frames required to clear a detection.
     * Lower values stop detection quickly; higher values help avoid flickering.
     *
     * Range: 1 to 100 frames.
     */
    det_free_thr: number;
    /**
     * Tracking loss threshold
     *
     * The frames required for an active object to switch to free (not shown on the map).
     * Lower values switch sooner; higher values delay the transition.
     *
     * Range: 1 to 1000 frames.
     */
    act_free_thr: number;
    /**
     * Stillness tracking threshold
     *
     * The frames required to confirm a stationary object as presence.
     * Higher values improve the detection of stationary objects.
     *
     * Range: 1 to 1000 frames.
     */
    stat_free_thr: number;
    /**
     * Stillness timeout threshold
     *
     * The maximum time to hold a detection when no motion is sensed.
     * Higher values maintain presence during long inactivity of stationary objects.
     *
     * Range: 1 to 65535 frames.
     */
    sleep_free_thr: number;
  };
};

export type PresenceStatus = {
  /**
   * State of live track process.
   * Only present when live track is running.
   */
  live_track?: {
    /**
     * Start time of live tracking.
     * Unix timestamp (in UTC)
     */
    timer_started_at: number;
    /**
     * Duration of live tracking before stop.
     * (in seconds)
     */
    timer_duration: number;
    /**
     * Interval between events.
     * (in seconds)
     */
    interval: number;
  };
};

type TrackEventNotification = Pick<NotificationEventParam, 'ts' | 'component' | 'event'> & {
  object: Array<{ id: number; x: number; y: number; z: number; minz: number; maxz: number }>;
};

export type PresenceHomeySettings = {
  'Presence:enable': boolean;
  'Presence:zmin': number;
  'Presence:zmax': number;
  'Presence:sensor.flipped': boolean;
  'Presence:sensor.height': number;
  'Presence:sensor.tilt': number;
  'Presence:sensor.position': 'left' | 'center' | 'right';
  'Presence:sensor.power': 'low' | 'medium' | 'high';
  'Presence:sensor.sensitivity': 'low' | 'medium' | 'high' | 'custom';
  'Presence:sensor.points': number;
  'Presence:sensor.snr': number;
  'Presence:sensor.velocity': number;
  'Presence:sensor.max_velocity': number;
  'Presence:sensor.state.det_act_thr': number;
  'Presence:sensor.state.det_free_thr': number;
  'Presence:sensor.state.act_free_thr': number;
  'Presence:sensor.state.stat_free_thr': number;
  'Presence:sensor.state.sleep_free_thr': number;
};

/**
 * The Presence component's role is to configure the sensor settings and define zones within the area for more precise tracking.
 *
 * It provides APIs to set the sensor configuration, add zones, calibrate the sensor tilt, enable live tracking,
 * and control the sensor's enable/disable state.
 */
export default class Presence extends ComponentWithoutId<
  'Presence',
  PresenceStatus,
  PresenceConfig,
  PresenceHomeySettings
> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'Presence';
  public static readonly uiName = 'Presence';

  public readonly AddZone = AddZone;
  public readonly DeleteZone = DeleteZone;
  public readonly TiltCalibrate = TiltCalibrate;
  public readonly LiveTrack = LiveTrack;
  public readonly SetSensor = SetSensor;

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    methods: Array<ComponentMethod<'Presence'>>,
  ): Promise<void> {
    if (methods.includes('TiltCalibrate')) {
      await homeyDevice.safeAddCapability('button.calibrate_presence_tilt');
      const capabilityOptions = capabilitiesOptions['button.calibrate_presence_tilt'];
      await homeyDevice.setCapabilityOptions('button.calibrate_presence_tilt', capabilityOptions);
      homeyDevice.registerCapabilityListener('button.calibrate_presence_tilt', async () => {
        await this.TiltCalibrate(this.device.getChannel());
      });
    }
  }

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: PresenceStatus): Promise<void> {
    return;
  }

  public async onConfigUpdate(
    homeyDevice: ShellyLocalDevice,
    config: RecursivePartial<PresenceConfig, AllowedPrimitives>,
  ): Promise<void> {
    const newSettings: Partial<PresenceHomeySettings> = {};

    for (const key of ['enable', 'zmin', 'zmax'] as const) {
      const homeySettingKey = `Presence:${key}` as const;
      if (config[key] !== undefined) {
        newSettings[homeySettingKey] = config[key] as never;
      }
    }

    for (const key of [
      'flipped',
      'height',
      'tilt',
      'position',
      'power',
      'sensitivity',
      'points',
      'snr',
      'velocity',
      'max_velocity',
    ] as const) {
      const homeySettingKey = `Presence:sensor.${key}` as const;
      if (config.sensor?.[key] !== undefined) {
        newSettings[homeySettingKey] = config.sensor[key] as never;
      }
    }

    for (const key of ['det_act_thr', 'det_free_thr', 'act_free_thr', 'stat_free_thr', 'sleep_free_thr'] as const) {
      const homeySettingKey = `Presence:sensor.state.${key}` as const;
      if (config?.sensor?.state?.[key] !== undefined) {
        newSettings[homeySettingKey] = config.sensor.state[key];
      }
    }

    await homeyDevice.setComponentSettings(this.namespace, undefined, newSettings);
  }

  public async handleSettings(
    homeyDevice: ShellyLocalDevice,
    { changedKeys, newSettings }: SettingsEvent<PresenceHomeySettings>,
  ): Promise<boolean> {
    const changedConfig: RecursivePartial<PresenceConfig, AllowedPrimitives> = {};

    for (const key of ['enable', 'zmin', 'zmax'] as const) {
      const homeySettingKey = `Presence:${key}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        changedConfig[key] = newSettings[homeySettingKey] as never;
      }
    }

    const sensor: RecursivePartial<PresenceConfig['sensor'], AllowedPrimitives> = {};

    for (const key of ['flipped', 'height', 'tilt', 'position', 'power', 'sensitivity'] as const) {
      const homeySettingKey = `Presence:sensor.${key}` as const;
      if (changedKeys.includes(homeySettingKey)) {
        sensor[key] = newSettings[homeySettingKey] as never;
      }
    }

    if (newSettings['Presence:sensor.sensitivity'] === 'custom') {
      for (const key of ['points', 'snr', 'velocity', 'max_velocity'] as const) {
        const homeySettingKey = `Presence:sensor.${key}` as const;
        if (changedKeys.includes(homeySettingKey)) {
          sensor[key] = newSettings[homeySettingKey] as never;
        }
      }

      const sensorState: RecursivePartial<PresenceConfig['sensor']['state'], AllowedPrimitives> = {};

      for (const key of ['det_act_thr', 'det_free_thr', 'act_free_thr', 'stat_free_thr', 'sleep_free_thr'] as const) {
        const homeySettingKey = `Presence:sensor.state.${key}` as const;
        if (changedKeys.includes(homeySettingKey)) {
          sensorState[key] = newSettings[homeySettingKey] as never;
        }
      }

      if (Object.keys(sensorState).length > 0) {
        sensor.state = sensorState;
      }
    }

    if (Object.keys(sensor).length > 0) {
      changedConfig.sensor = sensor;
    }

    if (Object.keys(changedConfig).length <= 0) {
      return false;
    }

    const result = await this.SetConfig(this.device.getChannel(), { config: changedConfig });
    return result.result.restart_required;
  }

  public async handleEvent(event: NotificationEventParam): Promise<void> {
    if (event.event === 'track') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const trackEvent = event as TrackEventNotification;
      // TODO
    } else if (event.event === 'no_track') {
      // TODO
    } else {
      return super.handleEvent(event);
    }
  }
}
