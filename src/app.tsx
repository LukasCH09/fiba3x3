import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from "react-dom/client";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  MapCameraChangedEvent,
  Pin,
  useMap
} from '@vis.gl/react-google-maps';
import type {Marker} from '@googlemaps/markerclusterer';
import {MarkerClusterer} from '@googlemaps/markerclusterer';

type Poi = { key: string, location: google.maps.LatLngLiteral }

const App = () => {
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | undefined>(undefined);
  const [markers] = useState<Marker[]>([]);
  const [, setVisibleMarkers] = useState<Marker[]>([]);
  const [locations, setLocations] = useState<Poi[]>([]);

  useEffect(() => {
    fetch('/src/locations.json')
    .then(response => response.json())
    .then(data => setLocations(data));
  }, []);

  const updateVisibleMarkers = useCallback(() => {
    if (mapBounds) {
      const ne = mapBounds.getNorthEast();
      const sw = mapBounds.getSouthWest();
      const newVisibleMarkers = markers.filter(marker =>
          marker.lat <= ne.lat() &&
          marker.lat >= sw.lat() &&
          marker.lng <= ne.lng() &&
          marker.lng >= sw.lng()
      );
      setVisibleMarkers(newVisibleMarkers);
    }
  }, [mapBounds, markers]);

  return (
      <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
                   onLoad={() => {
                     console.log('Maps API has loaded.');
                     setMapBounds(mapBounds);
                     updateVisibleMarkers();
                   }}>
        <Map
            defaultZoom={13}
            defaultCenter={{lat: -33.860664, lng: 151.208138}}
            mapId={'a0e8e2e64eb1eb96'}
            onCameraChanged={(ev: MapCameraChangedEvent) =>
                console.log('camera changed:', ev.detail.center, 'zoom:', ev.detail.zoom)
            }>
          <PoiMarkers pois={locations}/>
        </Map>
      </APIProvider>
  );
};

const PoiMarkers = (props: { pois: Poi[] }) => {
  const map = useMap();
  const [markers, setMarkers] = useState<{ [key: string]: Marker }>({}); // Create a state to store markers
  const clusterer = useRef<MarkerClusterer | null>(null);
  useEffect(() => {
    if (!map) return;
    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({map});
    }
  }, [map]);

  // Update markers, if the markers array has changed
  useEffect(() => {
    clusterer.current?.clearMarkers();
    clusterer.current?.addMarkers(Object.values(markers));
  }, [markers]);

  const setMarkerRef = (marker: Marker | null, key: string) => {
    if (marker && markers[key]) return;
    if (!marker && !markers[key]) return;

    setMarkers(prev => {
      if (marker) {
        return {...prev, [key]: marker};
      } else {
        const newMarkers = {...prev};
        delete newMarkers[key];
        return newMarkers;
      }
    });
  };

  const handleClick = useCallback((ev: google.maps.MapMouseEvent) => {
    if (!map) return;
    if (!ev.latLng) return;
    console.log('marker clicked:', ev.latLng.toString());
    map.panTo(ev.latLng);
  });

  return (
      <>
        {props.pois.map((poi: Poi) => (
            <AdvancedMarker
                key={poi.key}
                position={poi.location}
                ref={marker => setMarkerRef(marker, poi.key)}
                clickable={true}
                onClick={handleClick}
            >
              <Pin background={'#FBBC04'} glyphColor={'#000'} borderColor={'#000'}/>
            </AdvancedMarker>
        ))}
      </>
  );
};

const root = createRoot(document.getElementById('app'));
root.render(<App/>);

export default App;