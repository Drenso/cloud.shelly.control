import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * This method (if applicable) starts calibration of device's outputs.
 *
 * In `PlusRGBWPM` all light instances are calibrated with one call to Light.Calibrate and the id parameter is ignored.
 */
export default async function Calibrate(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Light.Calibrate', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
