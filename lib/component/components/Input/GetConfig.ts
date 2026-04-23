import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { InputConfig } from '../Input.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<InputConfig>> {
  const requestFrame = createRequestFrame('Input.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
