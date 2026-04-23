import type ShellyLocalDevice from '../../local/LocalDevice.mjs';
import type { NotificationEventParam } from '../../rpc/Rpc.mjs';
import { createMitt, translate } from '../../util.mjs';
import { ComponentWithId } from '../Component.mjs';
import SetConfig from './PresenceZone/SetConfig.mjs';
import GetConfig from './PresenceZone/GetConfig.mjs';
import GetStatus from './PresenceZone/GetStatus.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import capabilitiesOptions from './PresenceZone/capabilitiesOptions.json' with { type: 'json' };
import type { IlluminanceStatus } from './Illuminance.mjs';
import type ShellyApp from '../../../app.mjs';

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

// TODO
type PresenceZoneHomeySettings = Record<never, never>;

type PresenceMittEvents = {
  presence: boolean;
  detailed_presence: Array<[number, number]>;
  enter: never;
  leave: never;
};

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

  private readonly presenceMitt = createMitt<PresenceMittEvents>();

  public async registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    _methods: Array<ComponentMethod<'PresenceZone'>>,
  ): Promise<void> {
    await this.registerCapability(homeyDevice, 'alarm_presence', capabilitiesOptions['alarm_presence']);
    await this.registerCapability(homeyDevice, 'shelly_presence_count', capabilitiesOptions['shelly_presence_count']);

    if (
      !homeyDevice.hasCapability('hidden.has_presence_sensor') &&
      !homeyDevice.hasCapability('hidden.has_presence_sensor_multiple')
    ) {
      const presenceZones = homeyDevice.componentCounts.get(this.namespace)!;
      if (presenceZones > 1) {
        await homeyDevice.safeRemoveCapability('hidden.has_presence_sensor');
        await homeyDevice.safeAddCapability('hidden.has_presence_sensor_multiple');
      } else {
        await homeyDevice.safeRemoveCapability('hidden.has_presence_sensor_multiple');
        await homeyDevice.safeAddCapability('hidden.has_presence_sensor');
      }
    }

    this.presenceMitt.on('presence', state => {
      this.setCapability(homeyDevice, 'alarm_presence', state);
    });
    this.presenceMitt.on('detailed_presence', objects => {
      this.setCapability(homeyDevice, 'shelly_presence_count', objects.length);
      this.setCapability(homeyDevice, 'alarm_presence', objects.length > 0);
      const countUpdate = { zone: this.id, value: objects.length };
      homeyDevice.safeTriggerDeviceCard('presence_count_changed', countUpdate);
      homeyDevice.safeTriggerDeviceCard('presence_count_changed_multiple', countUpdate, { zone: this.id });
    });
    this.presenceMitt.on('enter', () => {
      homeyDevice.safeTriggerDeviceCard('presence_enter', { zone: this.id });
      homeyDevice.safeTriggerDeviceCard('presence_enter_multiple', { zone: this.id }, { zone: this.id });
    });
    this.presenceMitt.on('leave', () => {
      homeyDevice.safeTriggerDeviceCard('presence_exit', { zone: this.id });
      homeyDevice.safeTriggerDeviceCard('presence_exit_multiple', { zone: this.id }, { zone: this.id });
    });

    await this.onConfigUpdate(homeyDevice, this.config);
    await this.onStatusUpdate(homeyDevice, this.status);
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
    await homeyDevice.safeRemoveCapability('hidden.has_presence_sensor');
    await homeyDevice.safeRemoveCapability('hidden.has_presence_sensor_multiple');
  }

  public static registerFlowCards(app: ShellyApp): void {
    const autoCompleteListener = (
      query: string,
      { device }: { device: ShellyLocalDevice },
    ): { name: string; id: number }[] => {
      if (device.virtualDevice === undefined) {
        return [];
      }

      const presenceZones: string[] = [];
      for (const [componentId, component] of device.virtualDevice.virtualComponents.entries()) {
        if (component instanceof PresenceZone) {
          presenceZones.push(componentId);
        }
      }

      const devicePresenceZones: PresenceZone[] = [];
      for (const inputId of presenceZones) {
        const presenceZone = device.virtualComponents.get(inputId) as PresenceZone | undefined;
        if (presenceZone !== undefined) {
          devicePresenceZones.push(presenceZone);
        }
      }
      return devicePresenceZones.map(presenceZone => ({
        name:
          presenceZone.config.name ??
          translate(app.homey.__('locale'), capabilitiesOptions['presenceZoneName'], {
            number: `${presenceZone.id}`,
          }),
        id: presenceZone.id,
      }));
    };

    for (const flow of [
      'presence_count_changed_multiple',
      'presence_enter_multiple',
      'presence_exit_multiple',
    ] as const) {
      app.homey.flow
        .getDeviceTriggerCard(flow)
        .registerRunListener((flowArgs: { zone: { id: number } }, triggerArgs: { zone: number }) => {
          return flowArgs.zone.id === triggerArgs.zone;
        })
        .registerArgumentAutocompleteListener('zone', autoCompleteListener);
    }
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
