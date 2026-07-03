import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { ScriptConfig } from '../Script.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';

export type ScriptSetConfigParams = {
  config: RecursivePartial<Omit<ScriptConfig, 'id'>, AllowedPrimitives>;
};

export type ScriptSetConfigResponse = {
  restart_required: boolean;
};

/**
 * Update the component's configuration
 */
export default async function SetConfig(
  channel: RpcChannel,
  id: number,
  params: ScriptSetConfigParams,
): Promise<ResponseSuccessFrame<ScriptSetConfigResponse>> {
  const requestFrame = createRequestFrame('Script.SetConfig', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
