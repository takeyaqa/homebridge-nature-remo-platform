import { URLSearchParams } from 'url';
import axios, { Axios, AxiosError } from 'axios';
import { Mutex } from 'async-mutex';

import {
  Appliance,
  ApplianceCache,
  Device,
  DeviceCache,
  SimpleAirConState,
  SimpleLightState,
  SimpleSensorValue,
} from './types';

const API_URL = 'https://api.nature.global/1';
const CACHE_THRESHOLD = 10 * 1000;

export class NatureRemoApi {

  private readonly mutex = new Mutex();
  private readonly client: Axios;

  private applianceCache: ApplianceCache = { updated: 0, appliances: null };
  private deviceCache: DeviceCache = { updated: 0, devices: null };

  constructor(accessToken: string) {
    this.client = axios.create({
      baseURL: API_URL,
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
  }

  async getAllAppliances(): Promise<Appliance[]> {
    return await this.mutex.runExclusive(async () => {
      if (this.applianceCache.appliances && (Date.now() - this.applianceCache.updated) < CACHE_THRESHOLD) {
        return this.applianceCache.appliances;
      }
      const appliances = (await this.getMessage('/appliances')) as Appliance[];
      this.applianceCache = { updated: Date.now(), appliances: appliances };
      return appliances;  
    });
  }

  async getAllDevices(): Promise<Device[]> {
    return await this.mutex.runExclusive(async () => {
      if (this.deviceCache.devices && (Date.now() - this.deviceCache.updated) < CACHE_THRESHOLD) {
        return this.deviceCache.devices;
      }
      const devices = (await this.getMessage('/devices')) as Device[];
      this.deviceCache = { updated: Date.now(), devices: devices };
      return devices;  
    });
  }

  async getAirConState(id: string): Promise<SimpleAirConState> {
    const appliances = await this.getAllAppliances();
    const appliance = appliances.find(val => val.type === 'AC' && val.id === id);
    if (appliance === undefined) {
      throw new Error(`Cannnot find appliance -> ${id}`);
    }
    return {
      on: appliance.settings?.button !== 'power-off',
      mode: appliance.settings?.mode || '',
      temp: appliance.settings?.temp || '',
    };
  }

  async getLightState(id: string): Promise<SimpleLightState> {
    const appliances = await this.getAllAppliances();
    const appliance = appliances.find(val => val.type === 'LIGHT' && val.id === id);
    if (appliance === undefined) {
      throw new Error(`Cannnot find appliance -> ${id}`);
    }
    return {
      on: appliance.light?.state.power === 'on',
    };
  }

  async getSensorValue(id: string): Promise<SimpleSensorValue> {
    const devices = await this.getAllDevices();
    const device = devices.find(val => val.id === id);
    if (device === undefined) {
      throw new Error(`Cannnot find device -> ${id}`);
    }
    const val = {};
    if (device.newest_events.te) {
      val['te'] = device.newest_events.te.val;
    }
    if (device.newest_events.hu) {
      val['hu'] = device.newest_events.hu.val;
    }
    if (device.newest_events.il) {
      val['il'] = device.newest_events.il.val >= 0.0001 ? device.newest_events.il.val : 0.0001;
    }
    return val;
  }

  async setLight(applianceId: string, power: boolean): Promise<void> {
    const url = `/appliances/${applianceId}/light`;
    this.postMessage(url, { 'button': power ? 'on' : 'off' });
  }

  async setAirconPowerOff(applianceId: string): Promise<void> {
    this.setAirconSettings(applianceId, { 'button': 'power-off'});
  }

  async setAirconOperationMode(applianceId: string, operationMode: string): Promise<void> {
    this.setAirconSettings(applianceId, { 'operation_mode': operationMode, 'button': '' });
  }

  async setAirconTemperature(applianceId: string, temperature: string): Promise<void> {
    this.setAirconSettings(applianceId, { 'temperature': temperature });
  }

  async setTvButton(applianceId: string, button: string): Promise<void> {
    const url = `/appliances/${applianceId}/tv`;
    this.postMessage(url, { 'button': button });
  }

  private async setAirconSettings(applianceId: string, settings: Record<string, string>): Promise<void> {
    const url = `/appliances/${applianceId}/aircon_settings`;
    this.postMessage(url, settings);
  }

  private async getMessage(url: string): Promise<Appliance[] | Device[]> {
    try {
      const res = await this.client.get(url);
      return res.data;
    } catch (error) {
      throw new Error(this.getHttpErrorMessage(error as AxiosError));
    }
  }

  private async postMessage(url: string, params: Record<string, string>): Promise<void> {
    try {
      const data = new URLSearchParams(params);
      await this.client.post(url, data.toString());
    } catch (error) {
      throw new Error(this.getHttpErrorMessage(error as AxiosError));
    }
  }
 
  private getHttpErrorMessage(error: AxiosError): string {
    if (error.response?.status === 401) {
      return 'Authorization error. Access token is wrong.';
    } else if (error.response?.status === 429) {
      const rateLimitLimit = error.response?.headers['x-rate-limit-limit'];
      const rateLimitReset = error.response?.headers['x-rate-limit-reset'];
      const rateLimitRemaining = error.response?.headers['x-rate-limit-remaining'];
      return `Too Many Requests error. ${rateLimitLimit}, ${rateLimitReset}, ${rateLimitRemaining}`;
    } else {
      return `HTTP error. status code ->  ${error.response?.status}`;
    }
  }
}
