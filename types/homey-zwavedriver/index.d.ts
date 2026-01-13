/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'homey-zwavedriver' {
  import Homey, { type ZwaveNode } from 'homey';

  class Util {
    static calculateDimDuration(duration: number, opts?: { maxValue?: number }): number;
  }

  class ZwaveDevice extends Homey.Device {
    thermostatSetpointType: string;

    async onNodeInit(payload: { node: ZwaveNode }): Promise<void>;

    registerCapability(capabilityId: string, commandClassId: string, userOpts?: any): void;

    node: ZwaveNode;

    registerReportListener(commandClassId: string, commandId: string, triggerFn: (report: any) => void): void;

    enableDebug(): void;

    async configurationGet(options: { index: number }): Promise<any>;

    async configurationSet(
      options: {
        id: number;
        index: number;
        size: number;
        signed: boolean;
      },
      value: any,
    );

    async getCommandClass(commandClassId: string): any;

    printNode(): void;
  }
}
