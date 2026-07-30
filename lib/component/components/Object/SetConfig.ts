import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { ObjectConfig } from '../Object.js';

export type ObjectSetConfigParams = {
  config: RecursivePartial<Omit<ObjectConfig, 'id'>, AllowedPrimitives>;
};

export type ObjectConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: ObjectSetConfigParams,
): Promise<ResponseSuccessFrame<ObjectConfigResponse>> {
  const requestFrame = createRequestFrame('Object.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
