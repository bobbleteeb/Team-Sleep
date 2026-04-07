export interface Location {
  latitude: number;
  longitude: number;
}

export async function getUserLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // Default to New York if user denies location
        resolve({
          latitude: 40.7128,
          longitude: -74.006,
        });
      }
    );
  });
}
