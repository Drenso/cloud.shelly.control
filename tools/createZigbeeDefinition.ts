import * as fs from 'node:fs';

if (process.argv.length < 3) {
  console.error('Path to interview JSON file is required as argument'); // eslint-disable-line no-restricted-syntax -- Allowed for local tools
  process.exit(1);
}

const interviewFilePath = process.argv[2];

const interviewFile = fs.readFileSync(interviewFilePath, 'utf8');
const interview = JSON.parse(interviewFile);

const driverCompose: {
  zigbee: {
    manufacturerName: string;
    productId: string[];
    endpoints: Record<string, { clusters: number[]; bindings: number[] }>;
    _clusters: Record<string, string>;
    learnmode: { instruction: { en: string } };
  };
} = {
  zigbee: {
    manufacturerName: interview.ids.manufacturerName,
    productId: [interview.ids.modelId],
    endpoints: {},
    _clusters: {},
    learnmode: {
      instruction: {
        en: 'TODO',
      },
    },
  },
};

type EndpointDescription = {
  status: string;
  nwkAddrOfInterest: number;
  _reserved: number;
  endpointId: number;
  applicationProfileId: number;
  applicationDeviceId: number;
  applicationDeviceVersion: number;
  _reserved1: number;
  inputClusters: number[];
  outputClusters: number[];
};

const endpointDescriptions: EndpointDescription[] = interview.endpoints.endpointDescriptors;

const zigbeeClustersModule = await import('zigbee-clusters');

const clusterMapping: Record<number, string> = {};

const clusterDefinitions = zigbeeClustersModule.default.CLUSTER;
for (const clusterKey in clusterDefinitions) {
  const clusterDefinition = clusterDefinitions[clusterKey as keyof typeof clusterDefinitions] as {
    NAME: string;
    ID: number;
  };
  const clusterName = clusterDefinition.NAME;
  clusterMapping[clusterDefinition.ID] = clusterName;
}

for (const endpointDescription of endpointDescriptions) {
  const endpointCompose: { clusters: number[]; bindings: number[] } = {
    clusters: [...new Set([...endpointDescription.inputClusters, ...endpointDescription.outputClusters])].toSorted(),
    bindings: [],
  };

  for (const clusterId of endpointCompose.clusters) {
    const clusterName = clusterMapping[clusterId];
    driverCompose.zigbee._clusters[clusterId] = clusterName;
  }

  driverCompose.zigbee.endpoints[`${endpointDescription.endpointId}`] = endpointCompose;
}

console.log(JSON.stringify(driverCompose, undefined, 2)); // eslint-disable-line no-restricted-syntax -- Allowed for local tools
