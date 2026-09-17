import app from "./server-app";

const PORT = process.env.PORT || 3000;

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`[Optixia Server] Backend & Frontend online on http://localhost:${PORT}`);
});
