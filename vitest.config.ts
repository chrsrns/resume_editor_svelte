import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
            '$app/environment': fileURLToPath(
                new URL('./src/test-stubs/app-environment.ts', import.meta.url)
            )
        }
    },
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
        environment: 'node',
        setupFiles: ['./src/test-setup.ts']
    }
});
