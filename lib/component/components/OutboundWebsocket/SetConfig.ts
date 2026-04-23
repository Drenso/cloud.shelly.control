import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { OutBoundWebsocketConfig } from '../OutboundWebsocket.js';

export type OutBoundWebsocketSetConfigParams = {
  config: Partial<OutBoundWebsocketConfig>;
};

export type OutBoundWebsocketSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  params: OutBoundWebsocketSetConfigParams,
): Promise<ResponseSuccessFrame<OutBoundWebsocketSetConfigResponse>> {
  const requestFrame = createRequestFrame('Ws.SetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
