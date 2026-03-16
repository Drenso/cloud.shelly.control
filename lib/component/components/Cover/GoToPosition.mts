import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { Either } from '../../../util.mjs';

export type CoverGoToPositionParams =
  | CoverGoToPositionPositionParams
  | CoverGoToPositionSlatParams
  | (CoverGoToPositionPositionParams & CoverGoToPositionSlatParams);

type CoverGoToPositionPositionParams = Either<
  {
    /**
     * represents target position in %,
     *
     * mutually exclusive with `rel` (`pos` or `rel` must be provided, but not both at the same time).
     *
     * allowed range [0..100].
     */
    pos: number;
  },
  {
    /**
     * `rel` represents a relative move in %,
     *
     * mutually exclusive with `pos`
     * (`pos` or `rel` must be provided, but not both at the same time).
     *
     * If `rel` is provided, Cover will move to a target_position = current_position + rel.
     * If the value of `rel` is so big that it results in overshoot
     * (i.e. target_position is beyond fully open / fully closed),
     * target_position will be silently capped to fully open / fully closed.
     *
     * allowed range [-100..100].
     */
    rel: number;
  }
>;

type CoverGoToPositionSlatParams = Either<
  {
    /**
     * Represents target slat position in %,
     *
     * allowed range [0..100].
     *
     * Only available if slat control is supported.
     */
    slat_pos: number;
  },
  {
    /**
     * represents a relative slat move in %
     *
     * If `slat_rel` is provided, Cover will move to a target_slat_position = current_slat_position + slat_rel.
     * If the value of `slat_rel` is so big that it results in overshoot
     * (i.e. target_position is beyond fully open / fully closed),
     * target_position will be silently capped to fully open / fully closed.
     *
     * allowed range [-100..100].
     */
    slat_rel: number;
  }
>;

/**
 * Move the cover to a certain position.
 *
 * Cover will not accept the command if:
 * - Cover calibration is running at the time of the request
 */
export default async function GoToPosition(
  channel: RpcChannel,
  id: number,
  params: CoverGoToPositionParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Cover.GoToPosition', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
