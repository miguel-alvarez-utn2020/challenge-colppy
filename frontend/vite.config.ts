/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Las pruebas unitarias cubren las piezas puras (formato, CSV,
  // atribución de errores), que no tocan el DOM: con el entorno node
  // alcanza y corren en milisegundos.
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  css: {
    preprocessorOptions: {
      // Sass moderno: sin esto Vite usa la API vieja y avisa que se va en
      // Dart Sass 2.0.
      scss: { api: 'modern-compiler' },
    },
  },
});
