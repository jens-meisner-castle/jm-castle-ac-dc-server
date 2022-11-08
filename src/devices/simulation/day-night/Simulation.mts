import { DateTime } from "luxon";
import {
  EngineControlResponse,
  DatapointState,
  Device,
  DeviceStatus,
} from "../../../Types.mjs";
import { getUrl } from "../Status.mjs";
import { Simulation } from "../Types.mjs";

const latitudeHH = 53.551085;
const longitudeHH = 9.993682;

export class SimulationDayAndNight implements Simulation {
  constructor(device: Device) {
    this.device = device;
  }

  private device: Device;
  private longitude: number | undefined = undefined;
  private latitude: number | undefined = undefined;

  public start = async (): Promise<EngineControlResponse> => {
    try {
      const { api } = this.device;
      const { searchParams } = getUrl(api);
      const longitude = searchParams.get("longitude");
      const latitude = searchParams.get("latitude");
      this.longitude = Number.parseFloat(longitude);
      this.latitude = Number.parseFloat(latitude);
      if (!(typeof this.latitude === "number")) {
        this.latitude = latitudeHH;
        return {
          success: false,
          error: `Unable to parse latitude (${latitude}). Falling back to Hamburg (${latitudeHH}).`,
        };
      }
      if (!(typeof this.longitude === "number")) {
        this.longitude = longitudeHH;
        return {
          success: false,
          error: `Unable to parse longitude (${longitude}). Falling back to Hamburg (${longitudeHH}).`,
        };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };

  public stop = async (): Promise<EngineControlResponse> => {
    return { success: true };
  };

  private getValuesAt = (at: DateTime, latitude: number, longitude: number) => {
    const bigT = at.ordinal;
    const bigB = (Math.PI * latitude) / 180;
    const declination = 0.4095 * Math.sin(0.016906 * (bigT - 80.086));
    // Sonnenaufgang h=-50 Bogenminuten = -0.0145 rad
    const h = -0.0145;
    const timeDiffInHours =
      (12 *
        Math.acos(
          (Math.sin(h) - Math.sin(bigB) * Math.sin(declination)) /
            (Math.cos(bigB) * Math.cos(declination))
        )) /
      Math.PI;
    // Sonnenaufgang um 12 - 4.479 = 7.521 Uhr Wahre Ortszeit (WOZ).
    const wozMozDiff =
      -0.171 * Math.sin(0.0337 * bigT + 0.465) -
      0.1299 * Math.sin(0.01787 * bigT - 0.168);
    const sunriseWoz = 12 - timeDiffInHours;
    const sunsetWoz = 12 + timeDiffInHours;
    const sunriseMoz = sunriseWoz - wozMozDiff;
    const sunsetMoz = sunsetWoz - wozMozDiff;
    const correctedSunriseMoz = sunriseMoz - longitude / 15;
    const correctedSunsetMoz = sunsetMoz - longitude / 15;
    const localSunriseAt = at
      .startOf("day")
      .plus({ hours: correctedSunriseMoz })
      .plus({ minutes: at.offset });
    const localSunsetAt = at
      .startOf("day")
      .plus({ hours: correctedSunsetMoz })
      .plus({ minutes: at.offset });
    const isDaylight =
      at.diff(localSunriseAt).valueOf() > 0 &&
      at.diff(localSunsetAt).valueOf() < 0;
    const sunriseAtFormatted = localSunriseAt.toFormat("yyyy-LL-dd HH:mm:ss");
    const sunsetAtFormatted = localSunsetAt.toFormat("yyyy-LL-dd HH:mm:ss");
    const daylightDuration = localSunsetAt.diff(localSunriseAt).as("minutes");
    const accessedAtMillis = at.toMillis();
    return {
      "is-daylight": {
        id: "is-daylight",
        valueNum: isDaylight ? 1 : 0,
        valueString: isDaylight ? "true" : "false",
        at: accessedAtMillis,
      },
      "daylight-duration": {
        id: "daylight-duration",
        valueNum: daylightDuration,
        at: accessedAtMillis,
      },
      "sunrise-at": {
        id: "sunrise-at",
        valueNum: localSunriseAt.toMillis(),
        valueString: sunriseAtFormatted,
        at: accessedAtMillis,
      },
      "sunset-at": {
        id: "sunset-at",
        valueNum: localSunsetAt.toMillis(),
        valueString: sunsetAtFormatted,
        at: accessedAtMillis,
      },
    };
  };

  /**
   *
   * @param at milliseconds of Date
   * @returns
   */
  public fetchStatus = async (at?: number): Promise<DeviceStatus> => {
    const accessedAtDateTime = at ? DateTime.fromMillis(at) : DateTime.now();
    const latitude = this.latitude || latitudeHH;
    const longitude = this.longitude || longitudeHH;
    try {
      const datapoints: Record<string, DatapointState> = this.getValuesAt(
        accessedAtDateTime,
        latitude,
        longitude
      );
      return {
        responsive: true,
        accessedAt: accessedAtDateTime.toMillis(),
        datapoints,
      };
    } catch (error) {
      return {
        responsive: false,
        accessedAt: accessedAtDateTime.toMillis(),
        error: error.toString(),
        datapoints: {},
      };
    }
  };

  public getPreviewData = async (
    atArr: number[]
  ): Promise<{
    data: Record<string, DatapointState[]>;
    error?: string;
  }> => {
    try {
      const latitude = this.latitude || latitudeHH;
      const longitude = this.longitude || longitudeHH;
      const data: Record<string, DatapointState[]> = {
        "daylight-duration": [],
      };
      atArr.forEach((n) => {
        const atDateTime = DateTime.fromMillis(n);
        const values = this.getValuesAt(atDateTime, latitude, longitude);
        return data["daylight-duration"].push(values["daylight-duration"]);
      });
      return { data };
    } catch (error) {
      return {
        error: error.toString(),
        data: {},
      };
    }
  };
}
