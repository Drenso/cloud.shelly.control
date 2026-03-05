import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

type RPCPingResponse = {
  channel_info: string;
};

/**
 * This method pings the device.
 */
export default async function Ping(channel: RpcChannel): Promise<ResponseSuccessFrame<RPCPingResponse>> {
  const requestFrame = createRequestFrame('RPC.Ping');
  return channel.sendRequestFrame(requestFrame);
}
