import './app.css';
import { createStyles } from 'antd-style';
import Independent from './chat';
// import Independent from './send';

const useStyle = createStyles(({ token, css }) => {
  return {
    container: css`
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    `,
    content: css`
      width: calc(100vw - 300px);
      min-width: 1000px;
      height: calc(100vh - 150px);
      min-height: 500px;
      border-radius: ${token.borderRadius}px;
      border: 1px solid ${token.colorBorder};
    `,
  };
});

function App() {
  const { styles } = useStyle();
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* <Independent /> */}
        <Independent />
      </div>
    </div>
  );
}

export default App;
