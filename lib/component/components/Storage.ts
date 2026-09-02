import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.js';
import { ComponentWithId } from '../Component.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type { StorageDeleteParams } from './Storage/Delete.js';
import Delete from './Storage/Delete.js';
import Eject from './Storage/Eject.js';
import Format from './Storage/Format.js';
import GetConfig from './Storage/GetConfig.js';
import GetStatus from './Storage/GetStatus.js';
import type { StorageListParams } from './Storage/List.js';
import List from './Storage/List.js';
import SetConfig from './Storage/SetConfig.js';

export type StorageConfig = {
  /** Id of the storage component. */
  id: number;
  /** Name of the storage. */
  name: string;

  /** NFS settings. Set to null to clear all NFS fields and disable NFS. */
  nfs: {
    /** Hostname or IP address of the NFS server. Set to null (or omit) to disable NFS. */
    host: string;
    /** Exported path on the NFS server. Set to null (or omit) to disable NFS. */
    path: string;
  };
};

export type StorageStatus = {
  /** Id of the storage component. */
  id: number;
  /** Storage revision counter. Incremented every time the contents of the storage change. */
  rev: number;
  /** true if the underlying storage medium is detected. For SD card: the physical disk is present. For NFS: the network share is successfully mounted. */
  present: boolean;
  /** true if the filesystem is mounted and ready for reading and writing. */
  active: boolean;
  /** Available free space on the storage in bytes. 0 when the storage is not active. */
  fs_free: number;
  /** Total size of the storage in bytes. 0 when the storage is not active. */
  fs_size: number;
  /** Optional. List of currently active error/transient conditions. Absent when there are none. See accepted values. */
  errors?: Array<
    | 'needs_formatting' // An SD card is present but its filesystem could not be mounted; the card likely needs to be formatted (see Storage.Format).
    | 'mounting' // The SD card is currently being mounted.
    | 'mount_failed' // Mounting the NFS share failed.
    | 'mounting_nfs' // The NFS share is currently being mounted.
    | 'unmounting_nfs' // The NFS share is currently being unmounted (e.g. after a network disconnection).
    | 'unmount_failed' // Unmounting the storage failed.
    | 'resolving_nfs_host' // DNS resolution of the NFS host is in progress.
    | 'filesystem_error' // The storage was mounted successfully but the media database could not be initialized (e.g. directory creation or database open failed).
    | 'formatting' // The SD card is currently being formatted.
    | 'format_failed' // The most recent format operation failed.
    | 'ejected' // The SD card has been ejected via Storage.Eject and will not be auto-mounted again until it is removed and re-inserted.
    | 'eject_failed' // Ejecting the SD card via Storage.Eject failed.
  >;
};

export type StorageHomeySettings = Record<never, never>;

export default class Storage extends ComponentWithId<'Storage', StorageStatus, StorageConfig, StorageHomeySettings> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Storage';
  public static readonly uiName = 'Storage';
  public static readonly key = 'storage';

  public async List(channel: RpcChannel, params: StorageListParams): ReturnType<typeof List> {
    return List(channel, this.id, params);
  }

  public async Delete(channel: RpcChannel, params: StorageDeleteParams): ReturnType<typeof Delete> {
    return Delete(channel, this.id, params);
  }

  public async Format(channel: RpcChannel): ReturnType<typeof Format> {
    return Format(channel, this.id);
  }

  public async Eject(channel: RpcChannel): ReturnType<typeof Eject> {
    return Eject(channel, this.id);
  }

  public async registerHomeyDevice(homeyDevice: ShellyLocalDevice, methods: ComponentMethod<'Storage'>[]): Promise<void> {
    // todo
  }

  public async onStatusUpdate(homeyDevice: ShellyLocalDevice, status: StorageStatus): Promise<void> {
    // todo
  }

  public async onConfigUpdate(homeyDevice: ShellyLocalDevice, config: StorageConfig): Promise<void> {
    // todo
  }
}
