import express from "express";
import cors from "cors";
import { apiRouter } from "./controllers";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.send("Backend funcionando en Render 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});