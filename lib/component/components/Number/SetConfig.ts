import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { NumberConfig } from '../Number.js';

export type NumberSetConfigParams = {
  config: RecursivePartial<Omit<NumberConfig, 'id'>, AllowedPrimitives>;
};

export type NumberConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: NumberSetConfigParams,
): Promise<ResponseSuccessFrame<NumberConfigResponse>> {
  const requestFrame = createRequestFrame('Number.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
