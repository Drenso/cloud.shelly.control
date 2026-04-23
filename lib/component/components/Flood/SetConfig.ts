import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { FloodConfig } from '../Flood.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type FloodSetConfigParams = {
  config: RecursivePartial<Omit<FloodConfig, 'id'>, AllowedPrimitives>;
};

export type FloodSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: FloodSetConfigParams,
): Promise<ResponseSuccessFrame<FloodSetConfigResponse>> {
  const requestFrame = createRequestFrame('Flood.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
