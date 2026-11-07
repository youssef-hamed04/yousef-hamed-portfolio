import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { contentAdmin } from "./admin-server";

export default defineConfig({
  plugins: [react(), contentAdmin()],
});
