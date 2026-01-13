/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'homey-zigbeedriver' {
  import Homey, { type ZigBeeNode } from 'homey';
  import { Cluster, ZCLNode } from 'zigbee-clusters';

  class Util {
    static calculateLevelControlTransitionTime: (opts: { duration?: number }) => number;
    static wait: (timeout: number) => Promise<void>;
  }

  interface ClusterSpecification {
    NAME: string;
    ID: number;
  }

  interface ClusterCapabilityConfiguration {
    get?: string;
    set?: string | ((value: any) => string);
    setParser?: (setValue: any) => object | null | Promise<object | null>;
    report?: string;
    reportOpts?: {
      configureAttributeReporting?: AttributeReportingConfiguration;
    };
    reportParser?: (reportValue: any) => null | any | Promise<any>;
    endpoint?: number;
    getOpts?: {
      getOnStart?: boolean;
      getOnOnline?: boolean;
      pollInterval?: number | string;
    };
  }

  interface AttributeReportingConfiguration {
    cluster?: ClusterSpecification;
    attributeName?: string;
    minInterval?: number;
    maxInterval?: number;
    minChange?: number;
    endpointId?: number;
  }

  class ZigBeeDevice extends Homey.Device {
    onNodeInit(payload: {
      zclNode: ZCLNode;
      node: ZigBeeNode;
      supportsHueAndSaturation?: boolean;
      supportsColorTemperature?: boolean;
    }): Promise<void>;
    onMeshInit(): void;
    onEndDeviceAnnounce(): void;
    triggerFlow(payload: { id: string; tokens?: object; state?: object }): Promise<void>;
    registerCapability(
      capabilityId: string,
      cluster: ClusterSpecification,
      clusterCapabilityConfiguration?: ClusterCapabilityConfiguration,
    ): void;
    registerMultipleCapabilities(
      multipleCapabilitiesConfiguration: Array<any>,
      multipleCapabilitiesListener: () => any,
    ): void;
    getClusterEndpoint(cluster: ClusterSpecification): number | null;
    configureAttributeReporting(attributeReportingConfigurations: AttributeReportingConfiguration[]): Promise<any>;
    parseAttributeReport(capabilityId: string, cluster: ClusterSpecification, payload: any): Promise<any | null>;
    getClusterCapabilityValue(capabilityId: string, cluster: ClusterSpecification): Promise<any>;
    setClusterCapabilityValue(
      capabilityId: string,
      cluster: ClusterSpecification,
      value: any,
      opts: object,
    ): Promise<any | null>;
    scheduleForNextEndDeviceAnnounce(method: any): Promise<unknown>;
    printNode(): void;
    debug(...args: any): void;
    enableDebug(): void;
    disableDebug(): void;
    isSubDevice(): boolean;
    isFirstInit(): boolean;
    zclNode: ZCLNode;
  }

  class ZigBeeDriver extends Homey.Driver {
    _zclNodes: Map<any, any>;
  }

  interface DurationOptions {
    duration?: number;
  }

  class ZigBeeLightDevice extends ZigBeeDevice {
    get supportsHueAndSaturation(): boolean;
    get supportsColorTemperature(): boolean;
    get colorTemperatureRange(): { min: any; max: any };
    get levelControlCluster(): Cluster;
    get onOffCluster(): Cluster;
    get colorControlCluster(): Cluster;
    readColorControlAttributes(): Promise<any>;
    registerOnOffAndDimCapabilities(payload: { zclNode: ZCLNode }): void;
    registerColorCapabilities(payload: { zclNode: ZCLNode }): void;
    changeOnOff(onoff: boolean): Promise<any>;
    changeDimLevel(dim: number, opts?: DurationOptions): Promise<void>;
    changeColorTemperature(temperature: number, opts?: DurationOptions): Promise<void>;
    changeColor(payload: { hue: number; saturation: number; value: number }, opts?: DurationOptions): Promise<void>;
  }
}
