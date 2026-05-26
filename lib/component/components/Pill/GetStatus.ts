import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PillStatus } from '../Pill.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<PillStatus>> {
  const requestFrame = createRequestFrame('Pill.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
