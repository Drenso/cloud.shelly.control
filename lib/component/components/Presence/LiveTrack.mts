import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

/**
 * Restart interval for live tracking.
 *
 * While live track is active, periodical events with tracking objects are triggered.
 */
export default async function LiveTrack(channel: RpcChannel): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Presence.LiveTrack');
  return channel.sendRequestFrame(requestFrame);
}
