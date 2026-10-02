import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type EnergyMeterResetPhaseCalibrationParameters = {
  phase: 'a' | 'b' | 'c' | 'n';
};

export type EnergyMeterResetPhaseCalibrationResponse = {
  restart_required: true;
};

/**
 * Reset a user calibrated CT to factory defaults (if applicable)
 */
export default async function PhaseToPhaseCalibReset(
  channel: RpcChannel,
  id: number,
  params: EnergyMeterResetPhaseCalibrationParameters,
): Promise<ResponseSuccessFrame<EnergyMeterResetPhaseCalibrationResponse>> {
  const requestFrame = createRequestFrame('EM.PhaseToPhaseCalibReset', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
