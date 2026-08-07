import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PlugpmUIConfig } from '../PlugpmUI.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<PlugpmUIConfig>> {
  const requestFrame = createRequestFrame('PLUGPM_UI.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
