import https from 'https';
import querystring from 'querystring';
import { IncomingMessage } from 'http';

import { Mutex } from './mutex';

const API_URL = 'https://api.nature.global';
const CACHE_THRESHOLD = 10 * 1000;

interface Appliance {
  id: string;
  nickname: string;
  type: string;
  settings: {
    temp: string;
    mode: string;
    button: string;
  };
  light: {
    state: {
      power: string;
    };
  };
}

interface Device {
  id: string;
  name: string;
  firmware_version: string;
  serial_number: string;
  newest_events: {
    te: {
      val: number;
    };
    hu: {
      val: number;
    };
    il: {
      val: number;
    };
  };
}

interface AirConState {
  on: boolean;
  mode: string;
  temp: string;
}

interface LightState {
  on: boolean;
}

interface SensorValue {
  te: number;
  hu: number;
  il: number;
}

interface Cache {
  updated: number;
}

interface ApplianceCache extends Cache {
  appliances: Appliance[] | null;
}

interface DeviceCache extends Cache {
  devices: Device[] | null;
}

export class NatureRemoApi {

  private readonly mutex = new Mutex();

  private applianceCache: ApplianceCache = { updated: 0, appliances: null };
  private deviceCache: DeviceCache = { updated: 0, devices: null };

  constructor(
    private readonly accessToken: string,
  ) {}

  async getAllAppliances(): Promise<Appliance[]> {
    const release = await this.mutex.acquire();
    try {
      if (this.applianceCache.appliances && (Date.now() - this.applianceCache.updated) < CACHE_THRESHOLD) {
        return this.applianceCache.appliances;
      }
      const url = `${API_URL}/1/appliances`;
      const appliances = await this.getMessage(url) as Appliance[];
      this.applianceCache = { updated: Date.now(), appliances: appliances };
      return appliances;
    } finally {
      release();
    }
  }

  async getAllDevices(): Promise<Device[]> {
    const release = await this.mutex.acquire();
    try {
      if (this.deviceCache.devices && (Date.now() - this.deviceCache.updated) < CACHE_THRESHOLD) {
        return this.deviceCache.devices;
      }
      const url = `${API_URL}/1/devices`;
      const devices = await this.getMessage(url) as Device[];
      this.deviceCache = { updated: Date.now(), devices: devices };
      return devices;
    } finally {
      release();
    }
  }

  async getAirConState(id: string): Promise<AirConState> {
    const appliances = await this.getAllAppliances();
    const appliance = appliances.find(val => val.type === 'AC' && val.id === id);
    if (appliance === undefined) {
      throw new Error(`Cannnot find appliance -> ${id}`);
    }
    return {
      on: appliance.settings.button !== 'power-off',
      mode: appliance.settings.mode,
      temp: appliance.settings.temp,
    };
  }

  async getLightState(id: string): Promise<LightState> {
    const appliances = await this.getAllAppliances();
    const appliance = appliances.find(val => val.type === 'LIGHT' && val.id === id);
    if (appliance === undefined) {
      throw new Error(`Cannnot find appliance -> ${id}`);
    }
    return {
      on: appliance.light.state.power === 'on',
    };
  }

  async getSensorValue(id: string): Promise<SensorValue> {
    const devices = await this.getAllDevices();
    const device = devices.find(val => val.id === id);
    if (device === undefined) {
      throw new Error(`Cannnot find device -> ${id}`);
    }
    return {
      te: device.newest_events.te?.val || 0,
      hu: device.newest_events.hu?.val || 0,
      il: device.newest_events.il?.val >= 0.0001 ? device.newest_events.il.val : 0.0001,
    };
  }

  async setLight(applianceId: string, power: boolean): Promise<void> {
    const url = `${API_URL}/1/appliances/${applianceId}/light`;
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

  private async setAirconSettings(applianceId: string, settings: Record<string, string>): Promise<void> {
    const url = `${API_URL}/1/appliances/${applianceId}/aircon_settings`;
    this.postMessage(url, settings);
  }

  private getMessage(url: string): Promise<Appliance[] | Device[]> {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      };
      https.get(url, options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(this.getHttpErrorMessage(res)));
        } else {
          res.setEncoding('utf8');
          let rawData = '';
          res.on('data', (chunk) => {
            rawData += chunk;
          });
          res.on('end', () => {
            resolve(JSON.parse(rawData));
          });
        }
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  private postMessage(url: string, params: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
      const postData = querystring.stringify(params);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${this.accessToken}`,
        },
      };
      const req = https.request(url, options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(this.getHttpErrorMessage(res)));
        } else {
          resolve();
        }
      });
      req.on('error', (err) => {
        reject(err);
      });
      req.write(postData);
      req.end();
    });
  }
 
  private getHttpErrorMessage(res: IncomingMessage): string {
    if (res.statusCode === 401) {
      return 'Authorization error. Access token is wrong.';
    } else if (res.statusCode === 429) {
      const rateLimitLimit = res.headers['x-rate-limit-limit'];
      const rateLimitReset = res.headers['x-rate-limit-reset'];
      const rateLimitRemaining = res.headers['x-rate-limit-remaining'];
      return `Too Many Requests error. ${rateLimitLimit}, ${rateLimitReset}, ${rateLimitRemaining}`;
    } else {
      return `HTTP error. status code ->  ${res.statusCode}`;
    }
  }
}
