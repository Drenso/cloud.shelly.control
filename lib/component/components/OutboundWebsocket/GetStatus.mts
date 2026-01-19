import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { OutboundWebsocketStatus } from '../OutboundWebsocket.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<OutboundWebsocketStatus>> {
  const requestFrame = createRequestFrame('Ws.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
