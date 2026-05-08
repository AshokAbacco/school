import { prisma } from "../config/db.js";

/*
   GET latest location
   for single device
*/

export const getLatestLocationService =
  async (deviceId) => {

    const location =
      await prisma.deviceLocation.findFirst({
        where: {
          deviceId,
        },

        orderBy: {
          timestamp: "desc",
        },
      });

    if (!location) {
      return null;
    }

    return {
      id: location.id.toString(),

      deviceId:
        location.deviceId,

      latitude: Number(
        location.latitude
      ),

      longitude: Number(
        location.longitude
      ),
    };

  };

/*
   GET latest location
   for ALL devices
*/

export const getAllLocationsService = async () => {
  const grouped = await prisma.deviceLocation.groupBy({
    by: ["deviceId"],
    _max: { timestamp: true },
  });

  const locations = await Promise.all(
    grouped.map((item) =>
      prisma.deviceLocation.findFirst({
        where: {
          deviceId: item.deviceId,
          timestamp: item._max.timestamp,
          // ✅ FIX: Only fetch rows where lat/lng are NOT null
          latitude: { not: null },
          longitude: { not: null },
        },
      })
    )
  );

  // ✅ FIX: Filter out nulls (devices that had NO valid location at all)
  return locations
    .filter(
      (location) =>
        location !== null &&
        location.latitude !== null &&
        location.longitude !== null
    )
    .map((location) => ({
      id: location.id.toString(),
      deviceId: location.deviceId,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      battery: location.battery,
      speed: location.speed,
      timestamp: location.timestamp,
    }));
};