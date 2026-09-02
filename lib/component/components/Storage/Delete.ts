import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type StorageDeleteParams = {
  /** Unique identifier of the media file to delete. */
  media_id: number;
};

/** Deletes a specific media file from the storage. Both the media file and its associated thumbnail (if any) are removed. */
export default async function Delete(
  channel: RpcChannel,
  id: number,
  params: StorageDeleteParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Storage.Delete', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
