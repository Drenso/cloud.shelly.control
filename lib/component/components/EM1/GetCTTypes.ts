import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type GetCtTypeResponse = {
  /**
   * Array of strings of all supported CT types
   */
  supported: string[];
};

export default async function GetCTTypes(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<GetCtTypeResponse>> {
  const requestFrame = createRequestFrame('EM1.GetCTTypes', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
