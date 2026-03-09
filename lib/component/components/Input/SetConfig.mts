import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { InputConfig } from '../Input.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';

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
