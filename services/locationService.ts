
import { SCHOOL_COORDINATES, ALLOWED_RADIUS_METERS } from '../constants';

export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
};

// Haversine formula to calculate distance between two points on Earth
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

export const isWithinSchoolRadius = (coords: GeolocationCoordinates): boolean => {
  const distance = getDistance(
    coords.latitude,
    coords.longitude,
    SCHOOL_COORDINATES.latitude,
    SCHOOL_COORDINATES.longitude
  );
  return distance <= ALLOWED_RADIUS_METERS;
};
