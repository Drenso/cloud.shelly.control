import type ShellyApp from '../../../app.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { safeAddCapability, safeSetCapabilityValue, safeTriggerDeviceCard } from '../../safeFunctions.js';
import { translate } from '../../util.js';
import { ComponentWithId } from '../Component.js';
import capabilitiesOptions from './CameraZone/capabilitiesOptions.json' with { type: 'json' };
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

// NOTE: since we add all zones to a single device, we cannot set individual zone settings
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

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'CameraZone'>[],
  ): Promise<void> {
    for (const [statusKey, homeyCapability] of [['motion', 'alarm_motion']] as const) {
      if (this.status[statusKey] !== undefined) {
        const capabilityOptions = capabilitiesOptions[homeyCapability];
        await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions);
      }
    }

    await safeAddCapability(homeyDevice, 'hidden.has_camera_motion');
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: CameraZoneStatus): Promise<void> {
    if (status.motion !== undefined) {
      const capabilityId = this.getCapabilityId(homeyDevice, 'alarm_motion');
      if (homeyDevice.getCapabilityValue(capabilityId) !== status.motion) {
        await safeSetCapabilityValue(homeyDevice, capabilityId, status.motion);
        await safeTriggerDeviceCard(
          homeyDevice,
          status.motion ? 'shelly_camera_motion' : 'shelly_camera_motion_end',
          { zone: this.id },
          { zone: this.id },
        );
      }
    }
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: CameraZoneConfig): Promise<void> {
    return;
  }

  public static registerFlowCards(app: ShellyApp): void {
    const getZones = (device: ShellyLocalDevice): CameraZone[] => {
      if (device.virtualDevice === undefined) {
        return [];
      }

      return [...device.virtualComponents.values()].filter(component => component instanceof CameraZone);
    };

    const autoCompleteListener = (
      query: string,
      { device }: { device: ShellyLocalDevice },
    ): { name: string; id: number }[] => {
      return getZones(device)
        .filter(cameraZone => cameraZone.config.type === 'motion')
        .map(cameraZone => ({
          name:
            cameraZone.config.name ??
            translate(app.homey.__('locale'), capabilitiesOptions['cameraZoneName'], {
              number: `${cameraZone.id}`,
            }),
          id: cameraZone.id,
        }))
        .filter(cameraZone => cameraZone.name.toLowerCase().includes(query.trim().toLowerCase()));
    };

    for (const flow of ['shelly_camera_motion', 'shelly_camera_motion_end'] as const) {
      app.homey.flow
        .getDeviceTriggerCard(flow)
        .registerArgumentAutocompleteListener('zone', autoCompleteListener)
        .registerRunListener((flowArgs: { zone: { id: number } }, triggerArgs: { zone: number }) => {
          return flowArgs.zone.id === triggerArgs.zone;
        });
    }

    app.homey.flow
      .getConditionCard('shelly_camera_motion_has')
      .registerArgumentAutocompleteListener('zone', autoCompleteListener)
      .registerRunListener((flowArgs: { zone: { id: number }; device: ShellyLocalDevice }) => {
        const componentKey = `${CameraZone.key}:${flowArgs.zone.id}`;
        const component = flowArgs.device.virtualComponents.get(componentKey) as CameraZone | undefined;
        if (component === undefined) {
          throw new Error(app.homey.__('error.component_not_found', { component: componentKey }));
        }
        return component.status.motion;
      });
  }
}
