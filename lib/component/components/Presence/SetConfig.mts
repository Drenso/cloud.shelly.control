import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { PresenceConfig } from '../Presence.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

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
