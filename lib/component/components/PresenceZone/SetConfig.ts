import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PresenceZoneConfig } from '../PresenceZone.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

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
