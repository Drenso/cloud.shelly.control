import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type NotificationEventParam, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type StorageListParams = {
  /** Number of items to skip (for pagination) */
  offset: number;
};

type StorageListResponse = {
  /** Total number of media files available. */
  total: number;
  /** The offset that was used to produce this page (echoed from the request). */
  offset: number;
  /** Storage revision counter. Incremented every time the contents of the storage change (new media added, media deleted, cleanup, etc.). Clients can use it to detect changes between calls. */
  rev: number;
  /** List of media items. */
  items: Array<{
    /** Unique identifier (UUID) of the media file. */
    media_id: string;
    /** Type of media. See accepted values. */
    type:
      | 'image' // Still image (JPEG).
      | 'video'; // Video file (MP4).
    /** Unix timestamp at which the media was created. */
    ts: number;
    /** Optional. Duration in seconds. Present only for video items with a known duration. */
    duration?: number;
    /** Optional. File size in bytes. Present when known. */
    size?: number;
    /** Pre-signed URL pointing to the media file on the device. The embedded signature authorizes access; no additional HTTP authentication is required. */
    url: string;
    /** Optional. Pre-signed URL pointing to the thumbnail image. Present for video items with an associated thumbnail. The embedded signature authorizes access; no additional HTTP authentication is required. */
    thumbnail_url?: string;
    /** Optional. The event that triggered the recording. Present only when the recording was created in response to an event (e.g. motion detection); absent for manually started recordings or for still images. Carries the source component (component, id), the event name (always "motion_detected") and the timestamp (ts). */
    trigger?: Pick<NotificationEventParam, 'ts' | 'component' | 'id' | 'event'> & {
      event: 'motion_detected';
    };
  }>;
};

/** Lists recorded media files stored on the device with pagination support. */
export default async function List(
  channel: RpcChannel,
  id: number,
  params: StorageListParams,
): Promise<ResponseSuccessFrame<StorageListResponse>> {
  const requestFrame = createRequestFrame('Storage.List', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
