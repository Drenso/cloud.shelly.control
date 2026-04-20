import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EM1Config } from '../EM1.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EM1Config>> {
  const requestFrame = createRequestFrame('EM1.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
