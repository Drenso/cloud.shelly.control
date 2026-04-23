import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PresenceConfig } from '../Presence.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type PresenceSetConfigParams = {
  config: RecursivePartial<Omit<PresenceConfig, 'main_zone'>, AllowedPrimitives>;
};

export type PresenceSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  params: PresenceSetConfigParams,
): Promise<ResponseSuccessFrame<PresenceSetConfigResponse>> {
  const requestFrame = createRequestFrame('Presence.SetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
