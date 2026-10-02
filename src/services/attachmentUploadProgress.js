import { reactive } from "vue";

// Progresso do envio de anexos de tarefa, indexado por `local_id` do anexo.
//
// O upload acontece dentro de `syncService.processSyncQueue()`, longe de quem exibe a lista de
// anexos. Este estado compartilhado liga os dois lados sem que o syncService precise importar
// stores (a store do kanban ja importa o syncService).
//
// Uma entrada existe somente enquanto os bytes estao sendo enviados; quando ela some, o anexo
// ou foi confirmado pelo servidor ou voltou para a fila de retentativa.
export const attachmentUploads = reactive({});

export function reportAttachmentUpload(local_id, loaded, total) {
  const percent = total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 0;
  attachmentUploads[local_id] = {
    percent,
    // Todos os bytes saíram, mas o servidor ainda grava o arquivo e responde.
    processing: total > 0 && loaded >= total,
  };
}

export function finishAttachmentUpload(local_id) {
  delete attachmentUploads[local_id];
}
