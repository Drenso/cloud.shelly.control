import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

type ShellyUpdateParams =
  | {
      // The type of the new version - either stable or beta.
      // By default, updates to stable version.
      stage: 'stable' | 'default';
    }
  | {
      // Url address of the update.
      url: string;
    };

/**
 * This method updates the firmware version of the device.
 */
export default async function Update(
  channel: RpcChannel,
  params: ShellyUpdateParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Shelly.Update', params);
  return channel.sendRequestFrame(requestFrame);
}
