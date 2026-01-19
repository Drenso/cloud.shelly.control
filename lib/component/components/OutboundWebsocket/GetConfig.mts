import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { OutBoundWebsocketConfig } from '../OutboundWebsocket.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<OutBoundWebsocketConfig>> {
  const requestFrame = createRequestFrame('Ws.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
