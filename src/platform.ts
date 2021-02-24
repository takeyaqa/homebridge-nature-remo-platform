import {
  API,
  APIEvent,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { NatureRemoApi } from './natureRemoApi';
import { NatureNemoLightAccessory } from './lightAccessory';
import { NatureNemoAirConAccessory } from './airConAccessory';
import { NatureNemoSensorAccessory } from './sensorAccessory';

export class NatureRemoPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  public readonly natureRemoApi: NatureRemoApi;

  constructor(
    public readonly logger: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.logger.debug('accessToken ->', this.config.accessToken);
    this.natureRemoApi = new NatureRemoApi(this.config.accessToken as string, logger);
    this.logger.debug('Finished initializing platform:', this.config.name);

    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      logger.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.logger.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices(): void {
    this.natureRemoApi.getAllAppliances().then((appliances) => {
      for (const appliance of appliances) {
        if (appliance.type === 'LIGHT' || appliance.type === 'AC') {
          const uuid = appliance.id;
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.logger.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            if (appliance.type === 'LIGHT') {
              new NatureNemoLightAccessory(this, existingAccessory);
            } else if (appliance.type === 'AC') {
              new NatureNemoAirConAccessory(this, existingAccessory);
            }
          } else {
            this.logger.info('Adding new accessory:', appliance.nickname);
            const accessory = new this.api.platformAccessory(appliance.nickname, uuid);
            accessory.context = { appliance: appliance };
            if (appliance.type === 'LIGHT') {
              new NatureNemoLightAccessory(this, accessory);
            } else if (appliance.type === 'AC') {
              new NatureNemoAirConAccessory(this, accessory);
            }
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }
      }
    }).then(() => {
      this.natureRemoApi.getAllDevices().then((devices) => {
        for (const device of devices) {
          const uuid = device.id;
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.logger.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new NatureNemoSensorAccessory(this, existingAccessory);
          } else {
            this.logger.info('Adding new accessory:', device.name);
            const accessory = new this.api.platformAccessory(device.name, uuid);
            accessory.context = { device: device };
            new NatureNemoSensorAccessory(this, accessory);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }
      });
    }).catch((err) => {
      this.logger.error(err.message);
      throw err;
    });
  }
}
