import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

type ShellySetProfileParams = {
  // Name of the device profile
  name: string;
};

type ShellySetProfileResponse = {
  // The previously active profile
  profile_was: string;
};

/**
 * This method sets the device profile.
 * Shelly.SetProfile is only available on multi-profile devices.
 * When the newly selected profile is different than the active profile an automatic reboot follows.
 */
export default async function SetProfile(
  channel: RpcChannel,
  params: ShellySetProfileParams,
): Promise<ResponseSuccessFrame<ShellySetProfileResponse>> {
  const requestFrame = createRequestFrame('Shelly.SetProfile', params);
  return channel.sendRequestFrame(requestFrame);
}
