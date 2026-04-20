import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EM1DataConfig } from '../EM1Data.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EM1DataConfig>> {
  const requestFrame = createRequestFrame('EM1Data.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
