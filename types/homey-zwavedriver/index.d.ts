/* eslint-disable @typescript-eslint/no-explicit-any */

type UserOpts<CapabilityValue extends number | boolean | string | null> = {
  /** The command to get a value (e.g. BASIC_GET) */
  get?: string;
  /** The function that is called when a GET request is made. Should return an Object. */
  getParser?: () => object;
  /** The function that is called when a GET request is made. Should return an Object. */
  getParserV2?: () => object;
  /** The function that is called when a GET request is made. Should return an Object. */
  getParserV3?: () => object;
  /** The function that is called when a GET request is made. Should return an Object. */
  getParserV4?: () => object;
  getOpts?: {
    /**
     * Get the value on App start.
     *
     * Avoid using this option, it should only be used for values that the device does not automatically report.
     */
    getOnStart?: boolean;
    /**
     * Only for battery devices, get the value on device wake up.
     *
     * Avoid using this option, it should only be used for values that the device does not automatically report.
     */
    getOnOnline?: boolean;
    /**
     * Interval (in ms) to poll with a GET request.
     *
     * When provided a string, the device's setting with the string as ID will be used (e.g. poll_interval).
     */
    pollInterval?: number | string;
    /**
     * Multiplication factor for the pollInterval key.
     *
     * Must be a number.
     * (e.g. 1000 to convert to seconds, 60.000 for minutes, 3600000 for hours).
     */
    pollMultiplication?: number;
  };
  /**
   * The command to set a value (e.g. BASIC_SET)
   */
  set?: string;
  /** The function that is called when a SET request is made. Should return an Object. */
  setParser?: (value: CapabilityValue, opts?: unknown) => object;
  /** The function that is called when a SET request is made. Should return an Object. */
  setParserV2?: (value: CapabilityValue, opts?: unknown) => object;
  /** The function that is called when a SET request is made. Should return an Object. */
  setParserV3?: (value: CapabilityValue, opts?: unknown) => object;
  /** The function that is called when a SET request is made. Should return an Object. */
  setParserV4?: (value: CapabilityValue, opts?: unknown) => object;
  setOpts?: {
    /**
     * This function is called after a setCapabilityValue has been resolved.
     */
    fn?: (value: number | boolean | string | null, opts?: unknown) => void | Promise<void>;
  };
  /**
   * The command to report a value (e.g. BASIC_REPORT)
   */
  report?: string;
  /**
   * Boolean flag to determine if the reportParser method should override all report parsers.
   *
   * (Assumed false when not specified).
   */
  reportParserOverride?: boolean;
  /** The function that is called when a REPORT request is made. Should return an Object. */
  reportParser?: (report: unknown) => object;
  /** An ID to use a MultiChannel Node for this capability. */
  multiChannelNodeId?: number;
};

declare module 'homey-zwavedriver' {
  import Homey, { type ZwaveNode } from 'homey';

  class Util {
    static calculateDimDuration(duration: number, opts?: { maxValue?: number }): number;
  }

  class ZwaveDevice extends Homey.Device {
    thermostatSetpointType: string;
    async onNodeInit({ node: ZwaveNode }): Promise<void>;
    registerCapability(capabilityId: string, commandClassId: string, userOpts?: UserOpts): void;
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
    async _getCapabilityValue(capabilityId: string, commandClassId: string): Promise<void>;
  }
}
