import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: ".", // 預設根目錄
  build: {
    outDir: "public",     // ✨ Express 就會讀這個資料夾
    emptyOutDir: true,    // 每次清空舊的
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html") // 輸入入口點
      }
    }
  }
});
