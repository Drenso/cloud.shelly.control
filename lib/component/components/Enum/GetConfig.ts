import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EnumConfig } from '../Enum.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EnumConfig>> {
  const requestFrame = createRequestFrame('Enum.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
