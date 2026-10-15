import { defineAsyncComponent } from 'vue';
import ProjectsWindowSkeleton from '@/components/projects/ProjectsWindowSkeleton.vue';
import ProductivityWindowSkeleton from '@/components/windows/ProductivityWindowSkeleton.vue';

// `loadingComponent` ocupa o conteudo da janela enquanto o chunk baixa (sem ele a janela abria vazia).
// delay: 0 porque os esqueletos ja trazem o proprio atraso anti-flash (ver KademSkeletonGroup).
const importWithRetry = (importFn, loadingComponent) => {
  return defineAsyncComponent({
    loadingComponent,
    delay: 0,
    loader: importFn,
    timeout: 15000,
  });
};

export const createWindowComponentMap = () => ({
  'ProjectsWindow': importWithRetry(
    () => import('@/components/windows/ProjectsWindow.vue'),
    ProjectsWindowSkeleton
  ),
  'ProductivityWindow': importWithRetry(
    () => import('@/components/windows/ProductivityWindow.vue'),
    ProductivityWindowSkeleton
  )
});

export const windowComponentMap = createWindowComponentMap();
