import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type InputCheckExpressionParams = {
  /**
   *  JS expression to evaluate
   */
  expr: string;
  /**
   * Input values on which to apply `expr`.
   *
   * Elements are allowed to be null.
   * Maximum of 5 input values are accepted.
   */
  inputs: (number | null)[];
};

export type InputCheckExpressionResponse = {
  /**
   * Array of 2-tuples, each containing an input and an output value: `[input, output]`.
   *
   * Input values are those from the request, but after processing into a number internally and back to a string.
   * Outputs are corresponding results of the evaluated expression, and can be `null`.
   *
   * If the JS interpreter fails to parse or evaluate the expression a third element is added to the array,
   * so it becomes `[input, output, error message]`
   */
  results: ([number | null, number | null] | [number | null, number | null, string])[];
};

/**
 * Evaluate a JS expression based on input states
 */
export default async function CheckExpression(
  channel: RpcChannel,
  params: InputCheckExpressionParams,
): Promise<ResponseSuccessFrame<InputCheckExpressionResponse>> {
  const requestFrame = createRequestFrame('Input.CheckExpression', { ...params });
  return channel.sendRequestFrame(requestFrame);
}
