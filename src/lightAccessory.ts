import {
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { NatureRemoPlatform } from './platform';

export class NatureNemoLightAccessory {
  private readonly service: Service;
  private readonly name: string;
  private readonly id: string;
  
  constructor(
    private readonly platform: NatureRemoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nature Inc.')
      .setCharacteristic(this.platform.Characteristic.Model, 'Nature Remo series')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'S-e-r-i-a-l');

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.appliance.nickname);
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.GET, this.getOn.bind(this))
      .on(CharacteristicEventTypes.SET, this.setOn.bind(this));

    this.platform.logger.debug('[%s] id -> %s', accessory.context.appliance.nickname, accessory.context.appliance.id);
    this.name = accessory.context.appliance.nickname;
    this.id = accessory.context.appliance.id;
  }

  getOn(callback: CharacteristicGetCallback): void {
    this.platform.logger.debug('getOn called');
    this.platform.natureRemoApi.getLightState(this.id).then((appliance) => {
      this.platform.logger.info('[%s] On -> %s', this.name, appliance.on);
      callback(null, appliance.on);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    }); 
  }

  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    this.platform.logger.debug('setOn called ->', value);
    if (typeof value !== 'boolean') {
      callback(new Error('value must be a boolean'));
      return;
    }
    this.platform.natureRemoApi.setLight(this.id, value).then(() => {
      this.platform.logger.info('[%s] On <- %s', this.name, value);
      callback(null);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    });
  }
}
