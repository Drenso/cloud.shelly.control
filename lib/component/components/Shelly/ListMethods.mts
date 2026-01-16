import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

type ShellyListMethodsResponse = {
  // Names of the methods allowed
  methods: string[];
};

/**
 * This method lists all available RPC methods.
 * It takes into account both ACL and authentication restrictions and only lists the methods allowed
 * for the particular user/channel that's making the request.
 */
export default async function ListMethods(
  channel: RpcChannel,
): Promise<ResponseSuccessFrame<ShellyListMethodsResponse>> {
  const requestFrame = createRequestFrame('Shelly.ListMethods');
  return channel.sendRequestFrame(requestFrame);
}
