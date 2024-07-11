import ThreeApp from "./three-app";

const App = () => {
  const width = 1000;
  const height = 500;
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
      <ThreeApp width={width} height={height} />
    </div>
  );
};

export default App;

