import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { HTUIConfig } from '../HTUI.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<HTUIConfig>> {
  const requestFrame = createRequestFrame('HT_UI.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
