/**
 * Update flows that have device arguments with driver id filters,
 * adding all drivers to all filters.
 */
import path from 'node:path';
import * as fs from 'node:fs';
import type { JsonObject } from './types/json.js';

const flowsRootFolder = '.homeycompose/flow';
const driversFolder = 'drivers';

const driverIds = fs.readdirSync(driversFolder);
const driversString = driverIds.filter((id: string) => !id.endsWith('_matter')).join('|');
console.log('Inserting', driversString);

const flowCategoryFolders = fs.readdirSync(flowsRootFolder);

type FlowArg = {
  type: string;
  filter?: {
    driver_id: string;
  };
};

function insertDrivers(flowDefinitionFile: string): void {
  const flowDefinition: JsonObject = JSON.parse(fs.readFileSync(flowDefinitionFile, 'utf8'));
  const flowArgs = flowDefinition['args'] as FlowArg[] | undefined;
  if (flowArgs !== undefined) {
    for (let i = 0; i < flowArgs.length; i++) {
      const flowArg = flowArgs[i];
      if (flowArg.type === 'device') {
        flowArg['filter']!['driver_id'] = driversString;
      }
    }
  }
  console.log(flowDefinitionFile);
  fs.writeFileSync(flowDefinitionFile, JSON.stringify(flowDefinition, undefined, 2) + '\n', 'utf8');
}

for (const flowCategoryFolder of flowCategoryFolders) {
  const flowDefinitionFiles = fs.readdirSync(path.join(flowsRootFolder, flowCategoryFolder));
  for (const flowDefinitionFile of flowDefinitionFiles) {
    insertDrivers(path.join(flowsRootFolder, flowCategoryFolder, flowDefinitionFile));
  }
}
