import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

type ShellyListProfilesResponse = {
  profiles: {
    [profileId: string]: {
      components: ShellyListProfilesResponseProfileComponent[];
    };
  };
};

type ShellyListProfilesResponseProfileComponent = {
  // Component type
  type: string;
  // Amount of components of this type present
  count: number;
};

/**
 * The term profile abstracts high-level device functionality.
 * Some devices can operate in different exclusive modes or profiles.
 * For example, Shelly Plus2PM and Shelly Pro2PM can operate in a switch or cover profile.
 * Shelly.ListProfiles lists the names of available profiles and the type/count of functional components exposed for each profile.
 * Shelly.ListProfiles is only available on multi-profile devices.
 */
export default async function ListProfiles(
  channel: RpcChannel,
): Promise<ResponseSuccessFrame<ShellyListProfilesResponse>> {
  const requestFrame = createRequestFrame('Shelly.ListProfiles');
  return channel.sendRequestFrame(requestFrame);
}
