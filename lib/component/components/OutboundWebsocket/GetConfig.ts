import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { OutBoundWebsocketConfig } from '../OutboundWebsocket.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<OutBoundWebsocketConfig>> {
  const requestFrame = createRequestFrame('Ws.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
