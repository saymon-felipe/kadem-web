import { defineAsyncComponent } from 'vue';

const importWithRetry = (importFn) => {
  return defineAsyncComponent({
    loader: () => {
      return importFn().catch(error => {
        const isChunkError =
          error.message.includes('dynamically imported module') ||
          error.message.includes('Loading chunk') ||
          error.message.includes('not found');

        if (isChunkError) {
          console.warn('[ComponentMap] Chunk missing, reloading app...', error);
          window.location.reload(true);
          return new Promise(() => { });
        }
        throw error;
      });
    },
  });
};

export const windowComponentMap = {
  'ProjectsWindow': importWithRetry(() =>
    import('@/components/windows/ProjectsWindow.vue')
  ),
  'ProductivityWindow': importWithRetry(() =>
    import('@/components/windows/ProductivityWindow.vue')
  )
};
