import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const port = process.env.PORT ? Number(process.env.PORT) : undefined;

export default defineConfig({
  plugins: [reactRouter()],
  server: Number.isInteger(port) ? { port, strictPort: true } : undefined,
});
