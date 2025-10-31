import { defineAsyncComponent } from 'vue';

export const windowComponentMap = {
    'ProjectsWindow': defineAsyncComponent(() =>
        import('@/components/windows/ProjectsWindow.vue')
    ),
    'ProductivityWindow': defineAsyncComponent(() =>
        import('@/components/windows/ProductivityWindow.vue')
    )
};
