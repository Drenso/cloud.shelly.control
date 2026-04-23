import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RGBCCTConfig } from '../RGBCCT.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<RGBCCTConfig>> {
  const requestFrame = createRequestFrame('RGBCCT.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
