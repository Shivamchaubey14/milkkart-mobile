import { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { colors } from "../theme";

type LatLng = { lat: number; lng: number };

type Props = {
  rider: LatLng;
  destination: LatLng;
  /** Fired as the rider glides along the route, with a human ETA string. */
  onEta?: (text: string) => void;
};

// A keyless Leaflet map (OpenStreetMap raster tiles) that fetches a road route
// from OSRM and animates the rider along it — the same Blinkit-style tracking
// the web storefront uses (see milkkart-web/js/track.js), ported into a WebView.
function buildHtml(rider: LatLng, destination: LatLng) {
  const data = JSON.stringify({ rider, destination, green: colors.green, ink: colors.heading });
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;background:#e6efe9}
  .leaflet-control-attribution{font-size:9px}
  .rider-marker{position:relative;width:34px;height:34px}
  .rider-marker .pulse{position:absolute;inset:0;border-radius:50%;background:${colors.green};opacity:.25;animation:pulse 1.8s ease-out infinite}
  .rider-marker .core{position:absolute;inset:6px;border-radius:50%;background:${colors.green};border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25);font-size:14px}
  @keyframes pulse{0%{transform:scale(.6);opacity:.45}100%{transform:scale(1.8);opacity:0}}
  .home-marker{width:30px;height:30px;border-radius:50% 50% 50% 0;background:${colors.heading};transform:rotate(-45deg);border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25)}
  .home-marker span{transform:rotate(45deg);font-size:14px}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var D = ${data};
  var SPEED_KMH = 18;
  function post(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }

  var map = L.map('map', { zoomControl:false, attributionControl:true })
    .setView([D.rider.lat, D.rider.lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap'
  }).addTo(map);

  var riderIcon = L.divIcon({ className:'', html:'<div class="rider-marker"><span class="pulse"></span><span class="core">🛵</span></div>', iconSize:[34,34], iconAnchor:[17,17] });
  var homeIcon  = L.divIcon({ className:'', html:'<div class="home-marker"><span>🏠</span></div>', iconSize:[30,30], iconAnchor:[15,28] });

  var riderMarker = L.marker([D.rider.lat, D.rider.lng], { icon:riderIcon }).addTo(map);
  L.marker([D.destination.lat, D.destination.lng], { icon:homeIcon }).addTo(map);

  var planned = L.polyline([], { color:'#bcd6c5', weight:5, dashArray:'4 10', lineCap:'round' }).addTo(map);
  var traveled = L.polyline([], { color:D.green, weight:5, lineCap:'round' }).addTo(map);

  function haversineKm(a,b){
    var R=6371, toRad=function(d){return d*Math.PI/180;};
    var dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
    var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  }

  // --- route geometry (built from OSRM coordinates) ---
  var routeCoords=null, segLenKm=[], routeCum=[0], routeDistanceKm=0;
  function setRoute(coords){ // coords: [[lng,lat], ...]
    routeCoords = coords.map(function(c){return [c[1],c[0]];});
    segLenKm=[]; routeCum=[0];
    for(var i=1;i<routeCoords.length;i++){
      var d=haversineKm({lat:routeCoords[i-1][0],lng:routeCoords[i-1][1]},{lat:routeCoords[i][0],lng:routeCoords[i][1]});
      segLenKm.push(d); routeCum.push(routeCum[i-1]+d);
    }
    routeDistanceKm=routeCum[routeCum.length-1];
  }
  function pointAtDistance(km){
    if(!routeCoords) return null;
    km=Math.max(0,Math.min(routeDistanceKm,km));
    var i=0; while(i<segLenKm.length && routeCum[i+1]<km) i++;
    if(i>=segLenKm.length) return routeCoords[routeCoords.length-1];
    var t=(km-routeCum[i])/(segLenKm[i]||1e-9);
    return [routeCoords[i][0]+(routeCoords[i+1][0]-routeCoords[i][0])*t,
            routeCoords[i][1]+(routeCoords[i+1][1]-routeCoords[i][1])*t];
  }
  function coordsUpTo(km){
    var out=[routeCoords[0]];
    for(var i=1;i<routeCoords.length;i++){ if(routeCum[i]<km) out.push(routeCoords[i]); else break; }
    var tip=pointAtDistance(km); if(tip) out.push(tip);
    return out;
  }

  var riderDistKm=0, rafId=null, lastFrame=0;
  function emitEta(){
    var km = routeCoords ? Math.max(0, routeDistanceKm-riderDistKm) : haversineKm(D.rider,D.destination);
    var text;
    if(km<0.05) text='Arriving now · your rider is here';
    else { var mins=Math.max(1,Math.round(km/SPEED_KMH*60));
      text='Arriving in ~'+mins+' min · '+(km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km')+' away'; }
    post({type:'eta',text:text});
  }
  function frame(now){
    var dt=now-lastFrame; lastFrame=now;
    if(!routeCoords){ rafId=null; return; }
    riderDistKm=Math.min(routeDistanceKm, riderDistKm + SPEED_KMH*(dt/3600000));
    var pt=pointAtDistance(riderDistKm);
    if(pt){ riderMarker.setLatLng(pt); }
    traveled.setLatLngs(coordsUpTo(riderDistKm));
    emitEta();
    if(riderDistKm>=routeDistanceKm-0.0005){ rafId=null; return; } // arrived
    rafId=requestAnimationFrame(frame);
  }

  function fit(line){
    try{ map.fitBounds(L.latLngBounds(line).pad(0.25), { maxZoom:16 }); }catch(e){}
  }

  function fallbackLine(){
    var line=[[D.rider.lat,D.rider.lng],[D.destination.lat,D.destination.lng]];
    planned.setLatLngs(line); fit(line); emitEta();
  }

  // OSRM road route — keyless public demo server, same as the web.
  var url='https://router.project-osrm.org/route/v1/driving/'+
    D.rider.lng+','+D.rider.lat+';'+D.destination.lng+','+D.destination.lat+'?overview=full&geometries=geojson';
  fetch(url).then(function(r){return r.json();}).then(function(j){
    var route=j&&j.routes&&j.routes[0];
    if(route&&route.geometry&&route.geometry.coordinates.length>1){
      setRoute(route.geometry.coordinates);
      planned.setLatLngs(routeCoords);
      fit(routeCoords);
      emitEta();
      lastFrame=performance.now();
      rafId=requestAnimationFrame(frame);
    } else { fallbackLine(); }
  }).catch(function(){ fallbackLine(); });
})();
</script>
</body></html>`;
}

export default function TrackingMap({ rider, destination, onEta }: Props) {
  const onEtaRef = useRef(onEta);
  onEtaRef.current = onEta;

  // Rebuild only when the endpoints change, so the WebView isn't recreated each render.
  const html = useMemo(
    () => buildHtml(rider, destination),
    [rider.lat, rider.lng, destination.lat, destination.lng],
  );

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === "eta") onEtaRef.current?.(msg.text);
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 200, borderRadius: 16, overflow: "hidden", backgroundColor: "#e6efe9" },
  web: { flex: 1, backgroundColor: "transparent" },
});
