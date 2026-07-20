import type ShellyApp from '../../../app.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { NotificationEventParam } from '../../rpc/Rpc.js';
import { safeAddCapability, safeRemoveCapability, safeTriggerDeviceCard } from '../../safeFunctions.js';
import { createMitt, translate } from '../../util.js';
import { ComponentWithId } from '../Component.js';
import type { IlluminanceStatus } from './Illuminance.js';
import capabilitiesOptions from './PresenceZone/capabilitiesOptions.json' with { type: 'json' };
import GetConfig from './PresenceZone/GetConfig.js';
import GetStatus from './PresenceZone/GetStatus.js';
import SetConfig from './PresenceZone/SetConfig.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';

export type PresenceZoneConfig = {
  /** Identifier of the component instance */
  id: number;
  /** Name of the component instance */
  name: string | null;
  /** Activate or deactivate zone */
  enable: boolean;
  /**
   * Preview color defined in format [R, G, B].
   *
   * Range 0 - 255
   */
  color: [number, number, number];
  /** Active period of presence before trigger (in seconds) */
  presence_delay: number | null;
  /** Active period of absence before trigger (in seconds) */
  absence_delay: number | null;
  /**
   * Zone area defines the grid cells of the zone.
   *
   * Every cell in grid is 0.5 meters by 0.5 meters.
   *
   * Every square shaped cells are grouped in segment with coordinates
   * of starting point `x0` , `y0` and ending point `x1`, `y1`.
   *
   * The area can contain multiple segment definitions.
   *
   * See https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/PresenceZone/#zone-area
   */
  area: Array<[number, number, number, number]>;
};

export type PresenceZoneStatus = {
  /** Identifier of the component instance */
  id: number;
  /** State of zone presence */
  value: boolean;
  /** Number of objects located in zone */
  num_objects: number;
};

type PresenceZoneEvent = Pick<NotificationEventParam, 'ts' | 'component' | 'id' | 'event'> & {
  illumination: IlluminanceStatus['illumination'];
};

type PresenceEventNotification = PresenceZoneEvent & {
  /** Contains state of presence in zone. */
  value: boolean;
};

type CounterEventNotification = PresenceZoneEvent & {
  /** Contains number of objects detected in zone. */
  num_objects: number;
  /**
   * Contains coordinates of every object.
   *
   * [x, y] relative to the sensor.
   */
  object?: Array<[number, number]>;
};

// NOTE: since we add all zones to a single device, we cannot set individual zone settings
type PresenceZoneHomeySettings = Record<never, never>;

type PresenceMittEvents = {
  presence: boolean;
  detailed_presence: Array<[number, number]>;
  enter: never;
  leave: never;
};

/**
 * The PresenceZone is a component stands for an individual physical sensor
 */
export default class PresenceZone extends ComponentWithId<
  'PresenceZone',
  PresenceZoneStatus,
  PresenceZoneConfig,
  PresenceZoneHomeySettings
> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  public readonly namespace = 'PresenceZone';
  public static readonly uiName = 'Presence Zone';
  protected static readonly key = 'presencezone';

  private readonly presenceMitt = createMitt<PresenceMittEvents>();

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: Array<ComponentMethod<'PresenceZone'>>,
  ): Promise<void> {
    // TODO remove in 1.0.0
    // Migration to remove old capability
    await safeRemoveCapability(homeyDevice, 'hidden.has_presence_sensor_multiple');

    for (const [statusKey, homeyCapability] of [
      ['value', 'alarm_presence'],
      ['num_objects', 'shelly_presence_count'],
    ] as const) {
      if (this.status[statusKey] !== undefined) {
        const capabilityOptions = capabilitiesOptions[homeyCapability];
        await this.registerCapability(homeyDevice, homeyCapability, capabilityOptions);
      } else {
        await PresenceZone.unregisterCapability(homeyDevice, homeyCapability, this.id);
      }
    }

    await safeAddCapability(homeyDevice, 'hidden.has_presence_sensor');

    this.presenceMitt.on('presence', state => {
      this.setCapability(homeyDevice, 'alarm_presence', state);
    });
    this.presenceMitt.on('detailed_presence', objects => {
      this.setCapability(homeyDevice, 'shelly_presence_count', objects.length);
      this.setCapability(homeyDevice, 'alarm_presence', objects.length > 0);
      const countUpdate = { zone: this.id, value: objects.length };
      safeTriggerDeviceCard(homeyDevice, 'presence_count_changed', countUpdate, { zone: this.id });
    });
    this.presenceMitt.on('enter', () => {
      safeTriggerDeviceCard(homeyDevice, 'presence_enter', { zone: this.id }, { zone: this.id });
    });
    this.presenceMitt.on('leave', () => {
      safeTriggerDeviceCard(homeyDevice, 'presence_exit', { zone: this.id }, { zone: this.id });
    });
  }

  public async unregisterHomeyDevice(homeyDevice: ShellyLocalDevice): Promise<void> {
    this.presenceMitt.all.clear();
    await this.staticallyUnregisterHomeyDevice.call(undefined as never, homeyDevice, this.id);
  }

  protected async staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number,
  ): Promise<void> {
    await PresenceZone.unregisterCapability(homeyDevice, 'alarm_presence', id);
    await PresenceZone.unregisterCapability(homeyDevice, 'shelly_presence_count', id);
    await safeRemoveCapability(homeyDevice, 'hidden.has_presence_sensor');

    // TODO remove in 1.0.0
    // Migration to remove old capability
    await safeRemoveCapability(homeyDevice, 'hidden.has_presence_sensor_multiple');
  }

  public static registerFlowCards(app: ShellyApp): void {
    const getZones = (device: ShellyLocalDevice): PresenceZone[] => {
      if (device.virtualDevice === undefined) {
        return [];
      }

      return [...device.virtualComponents.values()].filter(component => component instanceof PresenceZone);
    };

    const autoCompleteListener = (
      query: string,
      { device }: { device: ShellyLocalDevice },
    ): { name: string; id: number }[] => {
      return getZones(device)
        .map(presenceZone => ({
          name:
            presenceZone.config.name ??
            translate(app.homey.__('locale'), capabilitiesOptions['presenceZoneName'], {
              number: `${presenceZone.id}`,
            }),
          id: presenceZone.id,
        }))
        .filter(presenceZone => presenceZone.name.toLowerCase().includes(query.toLowerCase()));
    };

    for (const flow of ['presence_count_changed', 'presence_enter', 'presence_exit'] as const) {
      app.homey.flow
        .getDeviceTriggerCard(flow)
        .registerArgumentAutocompleteListener('zone', autoCompleteListener)
        .registerRunListener((flowArgs: { zone: { id: number } }, triggerArgs: { zone: number }) => {
          return flowArgs.zone.id === triggerArgs.zone;
        });
    }

    app.homey.flow
      .getConditionCard('presence_has')
      .registerArgumentAutocompleteListener('zone', autoCompleteListener)
      .registerRunListener((flowArgs: { zone: { id: number }; device: ShellyLocalDevice }) => {
        const componentKey = `${PresenceZone.key}:${flowArgs.zone.id}`;
        const component = flowArgs.device.virtualComponents.get(componentKey) as PresenceZone | undefined;
        if (component === undefined) {
          throw new Error(app.homey.__('error.component_not_found', { component: componentKey }));
        }
        return component.status.value;
      });
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: PresenceZoneStatus): Promise<void> {
    if (status.value !== undefined) {
      await this.setCapability(homeyDevice, 'alarm_presence', status.value);
    }
    if (status.num_objects !== undefined) {
      await this.setCapability(homeyDevice, 'shelly_presence_count', status.num_objects);
    }
  }

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: PresenceZoneConfig): Promise<void> {
    return;
  }

  public async handleEvent(event: NotificationEventParam): Promise<void> {
    if (event.event === 'presence') {
      const presenceEvent = event as PresenceEventNotification;
      this.presenceMitt.emit('presence', presenceEvent.value);
    } else if (event.event === 'counter') {
      const counterEvent = event as CounterEventNotification;
      this.presenceMitt.emit('detailed_presence', counterEvent.object ?? []);
    } else if (event.event === 'enter') {
      this.presenceMitt.emit('enter', undefined as never);
    } else if (event.event === 'leave') {
      this.presenceMitt.emit('leave', undefined as never);
    } else {
      return super.handleEvent(event);
    }
  }
}
