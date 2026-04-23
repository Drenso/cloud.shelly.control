import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RGBCCTStatus } from '../RGBCCT.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<RGBCCTStatus>> {
  const requestFrame = createRequestFrame('RGBCCT.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
