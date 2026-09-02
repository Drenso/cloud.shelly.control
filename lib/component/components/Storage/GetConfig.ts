import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { StorageConfig } from '../Storage.js';

/** Obtain the component's configuration. */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<StorageConfig>> {
  const requestFrame = createRequestFrame('Storage.GetConfig', { id });
  return channel.sendRequestFrame(requestFrame);
}
