import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { PresenceZoneConfig } from '../PresenceZone.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

export type PresenceZoneSetConfigParams = {
  config: RecursivePartial<Omit<PresenceZoneConfig, 'id'>, AllowedPrimitives>;
};

export type PresenceZoneSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: PresenceZoneSetConfigParams,
): Promise<ResponseSuccessFrame<PresenceZoneSetConfigResponse>> {
  const requestFrame = createRequestFrame('PresenceZone.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
