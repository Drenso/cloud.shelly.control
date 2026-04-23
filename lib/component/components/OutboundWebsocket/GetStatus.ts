import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { OutboundWebsocketStatus } from '../OutboundWebsocket.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<OutboundWebsocketStatus>> {
  const requestFrame = createRequestFrame('Ws.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
