import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { ScriptConfig } from '../Script.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<ScriptConfig>> {
  const requestFrame = createRequestFrame('Script.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
