import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseFrame } from '../../rpc/Rpc.mjs';

type ShellyCheckForUpdateResult = {
  // Indicates new stable version of the firmware.
  stable?: {
    // The new version
    version: string;
    // Identifier of the new build
    build_id: string;
  };
  beta?: {
    // The new version
    version: string;
    // Identifier of the new build
    build_id: string;
  };
};

/**
 * This method checks for new firmware version for the device and returns information about it.
 * If no update is available returns empty JSON object as result.
 */
export default async function CheckForUpdate(channel: RpcChannel): Promise<ResponseFrame<ShellyCheckForUpdateResult>> {
  const requestFrame = createRequestFrame('Shelly.CheckForUpdate');
  return channel.sendRequestFrame(requestFrame);
}
