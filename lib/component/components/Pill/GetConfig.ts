import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PillConfig } from '../Pill.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<PillConfig>> {
  const requestFrame = createRequestFrame('Pill.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
