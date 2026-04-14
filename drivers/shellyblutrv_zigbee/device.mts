import initMeasureTemperatureDevice from '@drenso/homey-zigbee-library/capabilities/measureTemperature.mjs';
import initTargetTemperatureDevice from '@drenso/homey-zigbee-library/capabilities/targetTemperature.mjs';
import type { Cluster, ZCLNode } from 'zigbee-clusters';
import { type Bitmap, CLUSTER } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.mjs';
import ShellyCustomTRVCluster from '../../lib/zigbee/cluster/ShellyCustomTRVCluster.mjs';
import { initReadOnlyCapability } from '@drenso/homey-zigbee-library/lib/attributeDevice.mjs';

type BluTrvAlarmMask = Bitmap<'initializationFailure' | 'hardwareFailure' | 'selfCalibrationFailure'>;

type BluTrvSettings = {
  'TRV.min_setpoint': number;
  'TRV.max_setpoint': number;
};

type ShellyTRVCluster = Cluster & {
  calibrate: () => Promise<void>;
};

export default class ShellyBluTrvZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    this.log(
      'Alarm',
      await zclNode.endpoints[this.getClusterEndpoint(CLUSTER.THERMOSTAT) ?? 1].clusters[
        CLUSTER.THERMOSTAT.NAME
      ].readAttributes(['alarmMask']),
    );

    await initMeasureTemperatureDevice(this, zclNode, {
      attributeName: 'localTemperature',
      cluster: CLUSTER.THERMOSTAT,
    });
    await initTargetTemperatureDevice(this, zclNode);
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);

    await initReadOnlyCapability(
      this,
      zclNode,
      'alarm_problem',
      CLUSTER.THERMOSTAT,
      'alarmMask',
      (data: BluTrvAlarmMask) => data.getBits().includes('selfCalibrationFailure'),
    );
    // TODO implement manualMode and valvePosition

    this.registerCapabilityListener('button.calibrate', async () => {
      const cluster = this.zclNode.endpoints[this.getClusterEndpoint(ShellyCustomTRVCluster) ?? 1].clusters[
        ShellyCustomTRVCluster.NAME
      ] as ShellyTRVCluster;
      await cluster.calibrate();
    });
  }

  protected async firstInitConfigureDevice(zclNode: ZCLNode): Promise<void> {
    await this.setCapabilityValue('thermostat_mode', 'heat');
    const limits = await zclNode.endpoints[this.getClusterEndpoint(CLUSTER.THERMOSTAT) ?? 1].clusters[
      CLUSTER.THERMOSTAT.NAME
    ].readAttributes(['minHeatSetpointLimit', 'maxHeatSetpointLimit']);
    const options = this.getCapabilityOptions('target_temperature');
    const settings = {
      minSetpoint: 4,
      maxSetpoint: 30,
    };
    if (limits.minheatSetpointLimit) {
      options.min = limits.minheatSetpointLimit / 100;
      settings.minSetpoint = limits.minheatSetpointLimit / 100;
    }
    if (limits.maxHeatSetpointLimit) {
      options.max = limits.maxHeatSetpointLimit / 100;
      settings.maxSetpoint = limits.maxHeatSetpointLimit / 100;
    }
    await this.setCapabilityOptions('target_temperature', options);
    await this.setSettings(settings);
  }

  public async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: SettingsEvent<BluTrvSettings>): Promise<string | void> {
    const newAttributes: Record<string, unknown> = {};
    const options = this.getCapabilityOptions('target_temperature');
    if (changedKeys.includes('TRV.min_setpoint')) {
      newAttributes['minHeatSetpointLimit'] = newSettings['TRV.min_setpoint'] * 100;
      options.min = newSettings['TRV.min_setpoint'];
    }

    if (changedKeys.includes('TRV.max_setpoint')) {
      newAttributes['maxHeatSetpointLimit'] = newSettings['TRV.max_setpoint'] * 100;
      options.max = newSettings['TRV.max_setpoint'];
    }

    if (Object.keys(newAttributes).length > 0) {
      await this.zclNode.endpoints[1].clusters[CLUSTER.THERMOSTAT.NAME]?.writeAttributes(newAttributes);
      await this.setCapabilityOptions('target_temperature', options);
    }

    await super.onSettings({ oldSettings, newSettings, changedKeys });
  }
}
