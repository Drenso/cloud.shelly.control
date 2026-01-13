import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../rpc/Rpc.mjs';

type ShellySetAuthParams = {
  // Must be set to admin. Only one user is supported.
  user: string;
  // Must be the id of the device. Only one realm is supported.
  realm: string;
  // "user:realm:password" encoded in SHA256 (null to disable authentication).
  ha1: string | null;
};

/**
 * This method sets authentication details (password) for the device.
 */
export default async function SetAuth(
  channel: RpcChannel,
  params: ShellySetAuthParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Shelly.SetAuth', params);
  return channel.sendRequestFrame(requestFrame);
}
