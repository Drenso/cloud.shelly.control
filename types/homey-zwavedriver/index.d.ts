/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'homey-zwavedriver' {
  import Homey, { type ZwaveNode } from 'homey';

  class Util {
    static calculateDimDuration(duration: number, opts?: { maxValue?: number }): number;
  }

  class ZwaveDevice extends Homey.Device {
    thermostatSetpointType: string;
    async onNodeInit({ node: ZwaveNode }): Promise<void>;
    registerCapability(capabilityId: string, commandClassId: string, userOpts?: any): void;
    node: ZwaveNode;
    registerReportListener(commandClassId: string, commandId: string, triggerFn: (report: any) => void): void;
    registerMultiChannelReportListener(
      multiChannelNodeId: number,
      commandClassId: string,
      commandId: string,
      triggerFn: (report: any) => void,
    ): void;
    enableDebug(): void;
    async configurationGet(options: { index: number }): Promise<any>;
    async configurationSet(
      options: { index: number; size: number; signed?: boolean; useSettingParser?: boolean },
      value: any,
    );
    getCommandClass(commandClassId: string, opts?: { multiChannelNodeId?: number }): ZwaveCommandClass;
    printNode(): void;
    meterReset(payload?: { multiChannelNodeId?: number }, options?: any): Promise<void>;
    refreshCapabilityValue(capabilityId: string, commandClassId: string): Promise<any>;
    async executeCapabilitySetCommand(capabilityId, commandClassId, value, opts = {}): Promise<void>;
  }
}
