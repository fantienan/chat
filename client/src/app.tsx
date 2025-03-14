import 'mapbox-gl/dist/mapbox-gl.css';
import './app.css';
import { createStyles } from 'antd-style';
import { Independent } from '@/components';
import { useMap } from '@/pages';
import { Button, Popover } from 'antd';
import { Bot } from 'lucide-react';

const useStyle = createStyles(({ token, css }) => {
  return {
    container: css`
      width: 100vw;
      height: 100vh;
    `,
    content: css`
      width: calc(100vw - 300px);
      min-width: 1000px;
      height: calc(100vh - 150px);
      min-height: 500px;
      border-radius: ${token.borderRadius}px;
      border: 1px solid ${token.colorBorder};
    `,
    bot: css`
      position: absolute;
      right: 20px;
      bottom: 20px;
    `,
  };
});

function App() {
  const { styles } = useStyle();
  const { Map } = useMap();

  return (
    <div className={styles.container}>
      <Map />
      <Popover trigger="click" content={<Independent />}>
        <Button className={styles.bot} icon={<Bot />} type="default" shape="circle" />
      </Popover>
    </div>
  );
}

export default App;
