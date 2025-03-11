import { useEffect, useMemo, useState } from 'react';
import { Map } from 'mapbox-gl';
import { interceptRequest } from './utils';
import { createStyles } from 'antd-style';

const accessToken = 'placeholder';

const useStyle = createStyles(({ css }) => {
  return {
    map: css`
      width: 100%;
      height: 100%;
    `,
  };
});
// eslint-disable-next-line react-refresh/only-export-components
const MapPage = (props: { onMount: (map: Map) => void }) => {
  const { styles } = useStyle();
  const { onMount } = props;

  useEffect(() => {
    interceptRequest(`access_token=${accessToken}`);
    const map = new Map({
      container: 'map',
      style: '/style.json',
      center: [114.305215, 30.592935],
      zoom: 9,
      accessToken,
    });
    map.on('style.load', () => {
      onMount(map);
    });
    window.__map = map;
  }, []);

  return <div id="map" className={styles.map} />;
};

export const useMap = () => {
  const [map, setMap] = useState<Map | null>(null);
  return useMemo(
    () => ({
      Map: () => <MapPage onMount={setMap} />,
      map,
    }),
    [],
  );
};
