import {
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { NatureRemoPlatform } from './platform';

export class NatureNemoAirConAccessory {
  private readonly service: Service;
  private readonly name: string;
  private readonly id: string;
  private readonly deviceId: string;

  private state = {
    targetHeatingCoolingState: this.platform.Characteristic.TargetHeatingCoolingState.OFF,
    targetTemperature: 24,
  };

  constructor(
    private readonly platform: NatureRemoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nature Inc.')
      .setCharacteristic(this.platform.Characteristic.Model, 'Nature Remo series')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'S-e-r-i-a-l');

    this.service
      = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.appliance.nickname);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .on(CharacteristicEventTypes.GET, this.getCurrentHeatingCoolingState.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .on(CharacteristicEventTypes.GET, this.getTargetHeatingCoolingState.bind(this))
      .on(CharacteristicEventTypes.SET, this.setTargetHeatingCoolingState.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .on(CharacteristicEventTypes.GET, this.getCurrentTemperature.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .on(CharacteristicEventTypes.GET, this.getTargetTemperature.bind(this))
      .on(CharacteristicEventTypes.SET, this.setTargetTemperature.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .on(CharacteristicEventTypes.GET, this.getTemperatureDisplayUnits.bind(this))
      .on(CharacteristicEventTypes.SET, this.setTemperatureDisplayUnits.bind(this));

    this.platform.logger.debug('[%s] id -> %s', accessory.context.appliance.nickname, accessory.context.appliance.id);
    this.name = accessory.context.appliance.nickname;
    this.id = accessory.context.appliance.id;
    this.deviceId = accessory.context.appliance.device.id;
  }

  getCurrentHeatingCoolingState(callback: CharacteristicGetCallback): void {
    this.platform.logger.debug('getCurrentHeatingCoolingState called');
    this.platform.natureRemoApi.getAirConState(this.id).then((airConState) => {
      this.platform.logger.info('[%s] Current Heater Cooler State -> %s, %s', this.name, airConState.on, airConState.mode);
      const state = this.convertHeatingCoolingState(airConState.on, airConState.mode);
      callback(null, state);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    });
  }

  getTargetHeatingCoolingState(callback: CharacteristicGetCallback): void {
    this.platform.logger.debug('getTargetHeatingCoolingState called');
    this.platform.natureRemoApi.getAirConState(this.id).then((airConState) => {
      this.platform.logger.info('[%s] Target Heater Cooler State -> %s, %s', this.name, airConState.on, airConState.mode);
      const state = this.convertHeatingCoolingState(airConState.on, airConState.mode);
      this.state.targetHeatingCoolingState = state;
      callback(null, state);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    });
  }

  setTargetHeatingCoolingState(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    this.platform.logger.debug('setTargetHeatingCoolingState called ->', value);
    if (typeof value !== 'number') {
      callback(new Error('value must be a number'));
      return;
    }
    if (value === this.state.targetHeatingCoolingState) {
      this.platform.logger.debug('[%s] Same state. skip sending', this.name);
      callback(null);
      return;
    }
    this.state.targetHeatingCoolingState = value;
    if (value === this.platform.Characteristic.TargetHeatingCoolingState.OFF) {
      this.platform.natureRemoApi.setAirconPowerOff(this.id).then(() => {
        this.platform.logger.info('[%s] Target Heater Cooler State <- OFF', this.name);
        callback(null);
      }).catch((err) => {
        this.platform.logger.error(err.message);
        callback(err);
      });
    } else {
      const mode = this.convertOperationMode(value);
      this.platform.natureRemoApi.setAirconOperationMode(this.id, mode).then(() => {
        this.platform.logger.info('[%s] Target Heater Cooler State <- %s', this.name, mode);
        callback(null);
      }).catch((err) => {
        this.platform.logger.error(err.message);
        callback(err);
      });
    }
  }

  getCurrentTemperature(callback: CharacteristicGetCallback): void {
    this.platform.natureRemoApi.getSensorValue(this.deviceId).then((sensorValue) => {
      this.platform.logger.info('[%s] Current Temperature -> %s', this.name, sensorValue.te);
      callback(null, sensorValue.te);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    });
  }

  getTargetTemperature(callback: CharacteristicGetCallback): void {
    this.platform.logger.debug('getTargetTemperature called');
    this.platform.natureRemoApi.getAirConState(this.id).then((airConState) => {
      this.platform.logger.info('[%s] Target Temperature -> %s', this.name, airConState.temp);
      this.state.targetTemperature = parseFloat(airConState.temp);
      callback(null, airConState.temp);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    });
  }

  setTargetTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    this.platform.logger.debug('setTargetTemperature called ->', value);
    if (typeof value !== 'number') {
      callback(new Error('value must be a number'));
      return;
    }
    if (value === this.state.targetTemperature) {
      this.platform.logger.debug('[%s] Same state. skip sending', this.name);
      callback(null);
      return;
    }
    this.state.targetTemperature = value;
    const targetTemp = `${Math.round(value)}`;
    this.platform.natureRemoApi.setAirconTemperature(this.id, targetTemp).then(() => {
      this.platform.logger.info('[%s] Target Temperature <- %s', this.name, targetTemp);
      callback(null);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    });
  }

  getTemperatureDisplayUnits(callback: CharacteristicGetCallback): void {
    this.platform.logger.debug('getTemperatureDisplayUnits called');
    callback(null, this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
  }

  setTemperatureDisplayUnits(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    this.platform.logger.debug('setTemperatureDisplayUnits called ->', value);
    callback(null);
  }

  private convertHeatingCoolingState(on: boolean, mode: string): number {
    if (!on) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    } else {
      if (mode === 'warm') {
        return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      } else if (mode === 'cool') {
        return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
      } else {
        throw new Error(`This plugin does not support ${mode}`);
      }
    }
  }

  private convertOperationMode(state: number): string {
    switch (state) {
      case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
        return 'power-off';
      case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
        return 'warm';
      case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
        return 'cool';
      case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
        return 'auto';
      default:
        throw new Error(`This plugin does not support ${state}`);
    }
  }
}
