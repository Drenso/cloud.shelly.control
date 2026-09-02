import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { StorageStatus } from '../Storage.js';

/** Obtain the component's status. */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<StorageStatus>> {
  const requestFrame = createRequestFrame('Storage.GetStatus', { id });
  return channel.sendRequestFrame(requestFrame);
}
