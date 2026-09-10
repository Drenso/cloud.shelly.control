import * as fs from 'node:fs';

if (process.argv.length < 3) {
  console.error('Path to interview JSON file is required as argument');
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
    _clusters: Record<string, number>;
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

const endpointDescriptions = interview.endpoints.extendedEndpointDescriptors;

const zigbeeClustersModule = await import('zigbee-clusters');

const clusterMapping: Record<string, number> = {};

const clusterDefinitions = zigbeeClustersModule.default.CLUSTER;
for (const clusterKey in clusterDefinitions) {
  const clusterDefinition = clusterDefinitions[clusterKey as keyof typeof clusterDefinitions] as {
    NAME: string;
    ID: number;
  };
  const clusterName = clusterDefinition.NAME;
  clusterMapping[clusterName] = clusterDefinition.ID;
}

for (const endpointId in endpointDescriptions) {
  const endpointDescription = endpointDescriptions[endpointId];
  const endpointCompose: { clusters: number[]; bindings: number[] } = {
    clusters: [],
    bindings: [],
  };

  for (const clusterName in endpointDescription.clusters) {
    const clusterId = clusterMapping[clusterName];
    endpointCompose.clusters.push(clusterId);
    driverCompose.zigbee._clusters[clusterName] = clusterId;
  }

  driverCompose.zigbee.endpoints[`${endpointId}`] = endpointCompose;
}

console.log(JSON.stringify(driverCompose, undefined, 2));
