import { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

import { colors } from "../theme";

type LatLng = { lat: number; lng: number };

type Props = {
  rider: LatLng;
  destination: LatLng;
  /** Fired with a human ETA string as the rider's position updates. */
  onEta?: (text: string) => void;
  /** Stretch to fill the parent (square corners) instead of the boxed 200px card. */
  fill?: boolean;
};

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function etaText(rider: LatLng, destination: LatLng) {
  const km = haversineKm(rider, destination);
  if (km < 0.05) return "Arriving now · your rider is here";
  const mins = Math.max(1, Math.round((km / 18) * 60));
  return `Arriving in ~${mins} min · ${km < 1 ? Math.round(km * 1000) + " m" : km.toFixed(1) + " km"} away`;
}

// Native Google Maps tracking: the rider and destination on real Google tiles,
// with a straight guide line and a live ETA. The rider marker reflects the actual
// polled position (no simulated movement), so it stays accurate.
export default function TrackingMap({ rider, destination, onEta, fill }: Props) {
  const mapRef = useRef<MapView>(null);
  const onEtaRef = useRef(onEta);
  onEtaRef.current = onEta;

  const riderCoord = { latitude: rider.lat, longitude: rider.lng };
  const destCoord = { latitude: destination.lat, longitude: destination.lng };

  // Emit the ETA whenever either endpoint changes.
  useEffect(() => {
    onEtaRef.current?.(etaText(rider, destination));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider.lat, rider.lng, destination.lat, destination.lng]);

  // Keep both points in view as the rider moves.
  function fit() {
    mapRef.current?.fitToCoordinates([riderCoord, destCoord], {
      edgePadding: { top: 70, right: 60, bottom: 70, left: 60 },
      animated: true,
    });
  }
  useEffect(() => {
    const id = setTimeout(fit, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider.lat, rider.lng, destination.lat, destination.lng]);

  return (
    <View style={[styles.wrap, fill && styles.fill]}>
      <MapView
        ref={mapRef}
        // Google Maps on Android (accurate); iOS falls back to Apple Maps in Expo
        // Go and uses Google in a standalone build configured with a key.
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={{
          latitude: (rider.lat + destination.lat) / 2,
          longitude: (rider.lng + destination.lng) / 2,
          latitudeDelta: Math.max(0.02, Math.abs(rider.lat - destination.lat) * 2.5),
          longitudeDelta: Math.max(0.02, Math.abs(rider.lng - destination.lng) * 2.5),
        }}
        onMapReady={fit}
        toolbarEnabled={false}
        showsMyLocationButton={false}
      >
        <Polyline
          coordinates={[riderCoord, destCoord]}
          strokeColor={colors.green}
          strokeWidth={4}
          lineDashPattern={[2, 6]}
        />
        <Marker coordinate={riderCoord} anchor={{ x: 0.5, y: 0.5 }} title="Your rider">
          <View style={styles.rider}>
            <Text style={styles.riderEmoji}>🛵</Text>
          </View>
        </Marker>
        <Marker coordinate={destCoord} anchor={{ x: 0.5, y: 1 }} title="Delivery address">
          <View style={styles.home}>
            <Text style={styles.homeEmoji}>🏠</Text>
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 200, borderRadius: 16, overflow: "hidden", backgroundColor: "#e6efe9" },
  fill: { flex: 1, height: undefined, borderRadius: 0 },
  map: { flex: 1 },
  rider: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  riderEmoji: { fontSize: 16 },
  home: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.heading,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  homeEmoji: { fontSize: 14 },
});
