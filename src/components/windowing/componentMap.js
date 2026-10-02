import { defineAsyncComponent } from 'vue';
import ProjectsWindowSkeleton from '@/components/projects/ProjectsWindowSkeleton.vue';
import ProductivityWindowSkeleton from '@/components/windows/ProductivityWindowSkeleton.vue';

// `loadingComponent` ocupa o conteudo da janela enquanto o chunk baixa (sem ele a janela abria vazia).
// delay: 0 porque os esqueletos ja trazem o proprio atraso anti-flash (ver KademSkeletonGroup).
const importWithRetry = (importFn, loadingComponent) => {
  return defineAsyncComponent({
    loadingComponent,
    delay: 0,
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
  'ProjectsWindow': importWithRetry(
    () => import('@/components/windows/ProjectsWindow.vue'),
    ProjectsWindowSkeleton
  ),
  'ProductivityWindow': importWithRetry(
    () => import('@/components/windows/ProductivityWindow.vue'),
    ProductivityWindowSkeleton
  )
};
