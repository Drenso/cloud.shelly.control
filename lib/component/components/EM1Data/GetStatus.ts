import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EM1DataStatus } from '../EM1Data.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EM1DataStatus>> {
  const requestFrame = createRequestFrame('EM1Data.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
