import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * Erases and reformats the SD card to the expected filesystem. The operation is asynchronous: the call returns once formatting has been started, and progress is reflected in Storage.GetStatus (with errors containing "formatting" while in progress).
 * This method applies to SD card storage only and requires an SD card to be physically present. It has no effect on network-mounted (NFS) storage.
 * Danger: This operation will permanently delete all data on the SD card.
 */
export default async function Format(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Storage.Format', { id });
  return channel.sendRequestFrame(requestFrame);
}
