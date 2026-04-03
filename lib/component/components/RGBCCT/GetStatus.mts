import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { RGBCCTStatus } from '../RGBCCT.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<RGBCCTStatus>> {
  const requestFrame = createRequestFrame('RGBCCT.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
