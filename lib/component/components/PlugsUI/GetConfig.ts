import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PlugsUIConfig } from '../PlugsUI.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<PlugsUIConfig>> {
  const requestFrame = createRequestFrame('PLUGS_UI.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
