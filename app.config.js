// Dynamic Expo config: starts from app.json and injects build-time secrets from
// the environment so they aren't committed to git. Expo loads .env files into
// process.env for this evaluation (locally); for EAS cloud builds, set the same
// variable as an EAS environment variable.
//
// The Google Maps Android key MUST be present in the native build (the maps SDK
// reads it from the manifest at startup) — it can't be fetched at runtime.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...(config.android && config.android.config),
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || "",
      },
    },
  },
});
