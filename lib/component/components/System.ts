import { ComponentWithoutId } from '../Component.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import SetConfig from './System/SetConfig.js';
import GetConfig from './System/GetConfig.js';
import GetStatus from './System/GetStatus.js';
import SetTime from './System/SetTime.js';
import type { NotificationEventParam } from '../../rpc/Rpc.js';

export type SystemConfig = {
  /** Information about the device */
  device: {
    /** Name of the device */
    name: string;
    /**
     * Decreases power consumption when set to true, at the cost of reduced execution speed and increased network latency
     *
     * Experimental
     */
    eco_mode: boolean;
    /** Base MAC address of the device */
    readonly mac: string;
    /** Build identifier of the current firmware image */
    readonly string: string;
    /**
     * Name of the device profile
     *
     * (only applicable for multi-profile devices)
     */
    profile?: string;
    /** If true, device is shown in 'Discovered devices'. If false, the device is hidden. */
    discoverable: boolean;
    /**
     * Enable/disable addon board
     *
     * (if supported).
     */
    addon_type?: 'sensor' | 'prooutput' | 'LoRa' | null;
    /**
     * Enable/disable outputs toggle when the system (reset) button is pressed
     *
     * (shown if applicable).
     */
    sys_btn_toggle?: boolean;
    /**
     * When true, TLS certificate date/time validation is enforced for outbound connections.
     *
     * (Since 2.0.0)
     *
     * Can only be set to false when enhanced_security is false.
     * This is a temporary option for users experiencing certificate validation issues
     * due to time synchronization problems; subject to deprecation in future releases.
     */
    tls_check_cert_validity_time?: boolean;
    /**
     * When enabled, enforces additional security measures
     * (see https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Sys#enhanced-security).
     *
     * (Since 2.0.0)
     *
     * Read-only on devices shipped with firmware 2.0.0+ from the factory (always true).
     * On devices with factory firmware prior to 2.0.0,
     * it can be set to true but can only be reset to false via factory reset.
     */
    enhanced_security?: boolean;
  };
  /** Information about the current location of the device */
  readonly location: {
    /**
     * Timezone
     *
     * (null if unavailable)
     */
    readonly tz: string | null;
    /**
     * Latitude in degrees
     *
     * (null if unavailable)
     */
    readonly lat: string | null;
    /**
     * Longitude in degrees
     *
     * (null if unavailable)
     */
    readonly lon: string | null;
  };
  /**
   * Configuration of the device's debug logs.
   *
   * https://shelly-api-docs.shelly.cloud/gen2/General/DebugLogs/
   */
  debug: {
    /** Configuration of logs streamed over MQTT */
    mqtt: {
      enable: boolean;
    };
    /** Configuration of logs streamed over websocket. */
    websocket: {
      enable: boolean;
    };
    /** Configuration of logs streamed over UDP */
    udp: {
      /**
       * Address that the device log is streamed to.
       *
       * (null to disable logs)
       */
      enable: string | null;
    };
  };
  /** User interface data */
  ui_data: unknown;
  /** Configuration for the RPC over UDP */
  rpc_udp: {
    dst_addr: string;
    /**
     * Port number for inbound UDP RPC channel, null disables.
     *
     * Restart is required for changes to apply
     */
    listen_port: number | null;
  };
  /** Configuration for the sntp server */
  sntp: {
    /** Name of the sntp server */
    server: string;
  };
  /**
   * Configuration revision.
   *
   * This number will be incremented for every configuration change of a device component.
   * If the new config value is the same as the old one there will be no change of this property.
   */
  readonly cfg_rev: number;
};

export type SystemStatus = {
  /** Mac address of the device */
  mac: string;
  /** True if restart is required, false otherwise */
  restart_required: boolean;
  /**
   * Current time in the format HH:MM (24-hour time format in the current timezone with leading zero).
   *
   * null when time is not synced from NTP server.
   */
  time: string | null;
  /**
   * Unix timestamp (in UTC)
   *
   * null when time is not synced from NTP server.
   */
  unixtime: number | null;
  /**
   * Last time the system synced time from NTP server (in UTC)
   *
   * null when time is not synced from NTP server.
   */
  last_sync_ts: number | null;
  /** Time in seconds since last reboot */
  uptime: number;
  /** Total size of the RAM in the system in Bytes */
  ram_size: number;
  /** Size of the free RAM in the system in Bytes */
  ram_free: number;
  /** Total size of the file system in Bytes */
  fs_size: number;
  /** Size of the free file system in Bytes */
  fs_free: number;
  /** Configuration revision number */
  cfg_rev: number;
  /** KVS (Key-Value Store) revision number */
  kvs_rev: number;
  /** Schedules revision number, present if schedules are enabled */
  schedule_rev: number;
  /** Webhooks revision number, present if webhooks are enabled */
  webhook_rev: number;
  /** KNX configuration revision number, present on devices supporting KNX with KNX enabled */
  knx_rev: number;
  /** BLE cloud relay configuration revision number, present on devices supporting BLE cloud relay functionality */
  btrelay_rev: number;
  /** BTHomeControl configuration revision number, present when device supports control with BLU devices */
  bthc_rev: number;
  /**
   * Information about available updates, similar to the one returned by Shelly.CheckForUpdate
   *
   * This information is automatically updated every 24 hours.
   * Note that build_id and url for an update are not displayed here
   *
   * (empty object:{}, if no updates available).
   */
  available_updates: {
    /** Shown only if beta update is available */
    beta?: {
      /** Version of the new firmware */
      version: string;
    };
    /** Shown only if stable update is available */
    stable?: {
      /** Version of the new firmware */
      version: string;
    };
  };
  /**
   * Information about boot type and cause
   *
   * (only for battery-operated devices)
   * */
  wakeup_reason?: {
    /**
     * Boot type
     *
     * `internal` indicates brownout detection, watchdog timeout, etc.
     */
    boot: 'poweron' | 'software_restart' | 'deepsleep_wake' | 'internal' | 'unknown';
    /**
     * Boot cause
     *
     * (in case of deep sleep, reset was not caused by exit from deep sleep)
     */
    cause: 'button' | 'usb' | 'periodic' | 'status_update' | 'alarm' | 'alarm_test' | 'undefined';
  };
  /**
   * Period (in seconds) at which device wakes up and sends "keep-alive" packet to cloud, readonly.
   * Count starts from last full wakeup
   */
  wakeup_period: number;
  /**
   * Time offset (in seconds).
   * This is the difference between the device local time and UTC
   */
  utc_offset: number;
};

type ComponentAddedEvent = Omit<NotificationEventParam, 'id'> & {
  /** ID of the added component */
  target: string;
  restart_required: boolean;
  cfg_rev: number;
};

type ComponentRemovedEvent = Omit<NotificationEventParam, 'id'> & {
  /** ID of the removed component */
  target: string;
  restart_required: boolean;
  cfg_rev: number;
};

/**
 * The system component provides information about general device status, resource usage, availability of firmware updates, etc.
 */
export default class System extends ComponentWithoutId<'Sys', SystemStatus, SystemConfig, Record<never, never>> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Sys';
  public static readonly uiName = 'System';
  protected static readonly key = 'sys';

  public readonly SetTime = SetTime;

  public async registerHomeyDevice(
    _homeyDevice: ShellyLocalDevice,
    _methods: ComponentMethod<'Sys'>[],
  ): Promise<void> {}

  protected async staticallyUnregisterHomeyDevice(this: never, _homeyDevice: ShellyLocalDevice): Promise<void> {}

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: Partial<SystemStatus>): Promise<void> {}

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: SystemConfig): Promise<void> {}

  public async handleEvent(event: NotificationEventParam): Promise<void> {
    if (event.event === 'component_added') {
      const addedEvent = event as ComponentAddedEvent;
      return this.device.onComponentAdded(addedEvent.target);
    } else if (event.event === 'component_removed') {
      const removedEvent = event as ComponentRemovedEvent;
      return this.device.onComponentRemoved(removedEvent.target);
    } else if (event.event === 'sleep') {
      void this.device.transition({ action: 'going_to_sleep' });
    } else if (['sys_btn_down', 'sys_btn_up', 'sys_btn_push'].includes(event.event)) {
      // Ignore
    }
    return super.handleEvent(event);
  }
}
