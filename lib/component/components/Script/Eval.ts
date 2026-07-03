import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';

export type ScriptEvalParams = {
  /**
   * Code to evaluate.
   *
   * The length must be greater than 0
   */
  code: string;
};

export type ScriptEvalResponse = {
  /** The result of the evaluation */
  result: string;
};

/**
 * This method evaluates or executes some code inside of a specified script.
 *
 * The specified script must be running.
 */
export default async function Eval(
  channel: RpcChannel,
  id: number,
  params: ScriptEvalParams,
): Promise<ResponseSuccessFrame<ScriptEvalResponse>> {
  const requestFrame = createRequestFrame('Script.Eval', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
