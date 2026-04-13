import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

/**
 * Calibrate sensor tilt.
 *
 * For proper operation this must be called after sensor mounting.
 */
export default async function TiltCalibrate(channel: RpcChannel): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Presence.TiltCalibrate');
  return channel.sendRequestFrame(requestFrame);
}
