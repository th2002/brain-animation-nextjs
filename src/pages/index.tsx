import ThreeApp from "./three-app";

const App = () => {
  const width = 800;
  const height = 300;
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

