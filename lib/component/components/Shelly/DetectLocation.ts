import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

type ShellyDetectLocationResult = {
  // Timezone of the detected location (null if not available)
  tz: string | null;
  // Latitude of the detected location in degrees (null if not available)
  lat: string | null;
  // Longitude of the detected location in degrees (null if not available)
  long: string | null;
};

/**
 * This method detects and returns the location of the device.
 */
export default async function DetectLocation(
  channel: RpcChannel,
): Promise<ResponseSuccessFrame<ShellyDetectLocationResult>> {
  const requestFrame = createRequestFrame('Shelly.DetectLocation');
  return channel.sendRequestFrame(requestFrame);
}
