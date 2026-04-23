import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { InputConfig } from '../Input.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type InputSetConfigParams = {
  config: RecursivePartial<Omit<InputConfig, 'id'>, AllowedPrimitives>;
};

export type InputSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: InputSetConfigParams,
): Promise<ResponseSuccessFrame<InputSetConfigResponse>> {
  const requestFrame = createRequestFrame('Input.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
