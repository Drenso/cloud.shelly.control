import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { InputConfig } from '../Input.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<InputConfig>> {
  const requestFrame = createRequestFrame('Input.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
