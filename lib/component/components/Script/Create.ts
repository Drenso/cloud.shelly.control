import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';

export type ScriptCreateParams = {
  /**
   * Name of the script.
   *
   * If not provided, a default name `script_{id}` will be assigned (e.g. script_0)
   */
  name?: string;
};

export type ScriptCreateResponse = {
  /** Identifier of the script */
  id: number;
};

/**
 * This method creates a new script.
 */
export default async function Create(
  channel: RpcChannel,
  params?: ScriptCreateParams,
): Promise<ResponseSuccessFrame<ScriptCreateResponse>> {
  const requestFrame = createRequestFrame('Script.Create', params);
  return channel.sendRequestFrame(requestFrame);
}
