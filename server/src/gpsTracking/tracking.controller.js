import {
  getLatestLocationService,
  getAllLocationsService,
} from "./tracking.service.js";

/*
   Convert BigInt safely
*/

const serializeBigInt = (data) => {

  return JSON.parse(
    JSON.stringify(
      data,
      (_, value) =>
        typeof value === "bigint"
          ? value.toString()
          : value
    )
  );

};

/*
   GET single device
*/

export const getLatestDeviceLocation =
  async (req, res) => {

    try {

      const { deviceId } =
        req.params;

      const location =
        await getLatestLocationService(
          deviceId
        );

      const safeData =
        serializeBigInt(location);

      return res.json({
        success: true,
        data: safeData,
      });

    } catch (error) {

      console.log(
        "[getLatestDeviceLocation]",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server Error",
      });

    }

  };

/*
   GET all latest devices
*/

export const getAllDeviceLocations =
  async (_req, res) => {

    try {

      const locations =
        await getAllLocationsService();

      const safeData =
        serializeBigInt(locations);

      return res.json({
        success: true,
        data: safeData,
      });

    } catch (error) {

      console.log(
        "[getAllDeviceLocations]",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server Error",
      });

    }

  };