import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { ComponentWithId } from '../Component.js';
import GetConfig from './CameraZone/GetConfig.js';
import GetStatus from './CameraZone/GetStatus.js';
import SetConfig from './CameraZone/SetConfig.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

export type CameraZoneStatus = {
  /** Id of the component instance. */
  id: number;
  /** true if motion is currently detected in the zone, false otherwise. Present only for zones of type "motion"; privacy zones do not report a motion state. */
  motion?: boolean;
};

export type CameraZoneConfig = {
  /** Id of the component instance */
  id: number;
  /** Activate or deactivate zone processing. */
  enable: boolean;
  /** Zone type. See accepted values. */
  type:
    | 'motion' // Motion-detection zone. Motion events inside the zone are reported via CameraZone notifications and aggregated into the camera's overall motion status.
    | 'privacy'; // Privacy zone. The area is blacked out in all video streams; no motion is reported for this zone.
  /** Polygon coordinates in the format [x0, y0, x1, y1, ...]. The coordinate values use the normalized grid described in the coordinate system section: each axis ranges from 0 to 10000. At least two points (4 values) must be supplied. */
  coordinates: number[];
  /** Optional. Preview color in the format [R, G, B], where each component is in the range 0..255. */
  color?: [number, number, number];
  /** Optional. Human-readable zone name. */
  name?: string;
};

export type CameraZoneHomeySettings = Record<never, never>;

export default class CameraZone extends ComponentWithId<
  'CameraZone',
  CameraZoneStatus,
  CameraZoneConfig,
  CameraZoneHomeySettings
> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'CameraZone';
  public static readonly uiName = 'Camera Zone';
  public static readonly key = 'camerazone';

  public async registerHomeyDevice(homeyDevice: ShellyLocalDevice, methods: ComponentMethod<'CameraZone'>[]): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: CameraZoneStatus): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: CameraZoneConfig): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
