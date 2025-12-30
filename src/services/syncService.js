import { api } from '../plugins/api';
import {
  syncQueueRepository,
  userRepository,
  occupationRepository,
  medalRepository,
  projectRepository,
  kanbanRepository,
  accountsRepository,
  radioRepository
} from './localData';

import { useProjectStore } from '../stores/projects';
import { useAuthStore } from '../stores/auth';
import { useUtilsStore } from '../stores/utils';

let isProcessing = false;

// ============================================================================
// HELPERS & UTILS
// ============================================================================

/**
 * Salva os dados do perfil recebidos do servidor no banco local.
 */
async function _saveServerData(apiUserData) {
  const authStore = useAuthStore();
  const { occupations, medals, ...profileData } = apiUserData;

  await userRepository.saveLocalUserProfile(profileData);
  await occupationRepository.mergeApiOccupations(occupations || []);
  await medalRepository.setLocalMedals(medals || []);

  const mergedOccupations = await occupationRepository.getLocalUserOccupations();
  const mergedMedals = await medalRepository.getLocalMedals();

  authStore.setUser({ ...profileData, occupations: mergedOccupations, medals: mergedMedals });
}

/**
 * Garante que temos um ID de projeto válido do servidor.
 */
const resolveServerProjectId = async (localProjectId) => {
  const numericLocalId = parseInt(localProjectId, 10);
  if (isNaN(numericLocalId)) return localProjectId;

  const localProject = await projectRepository.getLocalProject(numericLocalId);

  if (!localProject) return localProjectId;
  if (localProject.id) return localProject.id;

  throw new Error(`PROJECT_NOT_SYNCED: Aguardando ID do servidor para projeto local ${numericLocalId}`);
};

/**
 * Garante que temos um ID de playlist válido do servidor (Radio Flow).
 */
const resolveServerPlaylistId = async (localPlaylistId) => {
  const numericLocalId = parseInt(localPlaylistId, 10);
  if (isNaN(numericLocalId)) return localPlaylistId;

  const localPlaylist = await radioRepository.getLocalPlaylist(numericLocalId);

  if (!localPlaylist) return localPlaylistId;
  if (localPlaylist.id) return localPlaylist.id;

  throw new Error(`PLAYLIST_NOT_SYNCED: Aguardando ID do servidor para playlist local ${numericLocalId}`);
};

/**
 * Transforma um objeto plano em um array de alterações para Delta Sync.
 * Ignora chaves de controle interno.
 */
const buildChangesArray = (payload, timestamp) => {
  const changes = [];
  const ignoreKeys = ['id', 'local_id', 'localId', 'project_id', 'timestamp', 'type', 'entity_id', 'playlist_id_is_server'];
  const changeTs = timestamp || new Date().toISOString();

  for (const key in payload) {
    if (ignoreKeys.includes(key)) continue;
    if (payload[key] !== undefined) {
      changes.push({
        field: key,
        value: payload[key],
        timestamp: changeTs
      });
    }
  }
  return changes;
};

// ============================================================================
// BATCH PROCESSORS (Processamento em Lote)
// ============================================================================

async function processAccountsSync(accountTasks) {
  if (accountTasks.length === 0) return;

  const tasksByAccount = accountTasks.reduce((acc, task) => {
    const key = task.payload.id;
    if (!key) {
      console.warn(`[SyncService] Ignorando UPDATE_ACCOUNT para item local (${task.payload.localId}) sem ID de servidor.`);
      return acc;
    }
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  console.log(`[SyncService] Sincronizando mudanças para ${Object.keys(tasksByAccount).length} contas do cofre...`);

  for (const accountId of Object.keys(tasksByAccount)) {
    const tasksForThisAccount = tasksByAccount[accountId];
    const localId = tasksForThisAccount[0].payload.localId;

    const changes = tasksForThisAccount.map(task => ({
      field: 'data',
      value: task.payload.data,
      timestamp: task.timestamp
    }));

    try {
      const response = await api.post(`/accounts/${accountId}/sync`, { changes });

      const accountToSave = {
        id: response.data.id,
        data: response.data.data,
        localId: localId
      };

      await accountsRepository.saveLocalAccount(accountToSave);

      const taskIds = tasksForThisAccount.map(t => t.id);
      await syncQueueRepository.deleteTasks(taskIds);

      console.log(`[SyncService] Conta ${accountId} (LocalID: ${localId}) sincronizada com sucesso.`);

    } catch (error) {
      console.error(`[SyncService] Falha ao sincronizar conta ${accountId}.`, error);
      if (error.response && error.response.status === 404) {
        console.warn(`[SyncService] Conta ${accountId} não encontrada (404). Limpando tarefas.`);
        const taskIds = tasksForThisAccount.map(t => t.id);
        await syncQueueRepository.deleteTasks(taskIds);
      } else {
        throw error;
      }
    }
  }
}

async function processProfileSync(profileTasks) {
  if (profileTasks.length === 0) return;

  console.log(`[SyncService] Sincronizando ${profileTasks.length} mudanças de perfil...`);
  const changes = profileTasks.map(task => task.payload);

  try {
    const response = await api.post('/users/profile/sync', { changes });
    await _saveServerData(response.data);

    const taskIds = profileTasks.map(t => t.id);
    await syncQueueRepository.deleteTasks(taskIds);
    console.log(`[SyncService] Mudanças de perfil sincronizadas com sucesso.`);
  } catch (error) {
    console.error(`[SyncService] Falha ao sincronizar mudanças de perfil.`, error);
    throw error;
  }
}

async function processProjectSync(projectTasks) {
  if (projectTasks.length === 0) return;

  const tasksByProject = projectTasks.reduce((acc, task) => {
    const key = task.payload.project_id || `local_${task.payload.localId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  console.log(`[SyncService] Sincronizando mudanças para ${Object.keys(tasksByProject).length} projetos...`);

  for (const projectKey of Object.keys(tasksByProject)) {
    const tasksForThisProject = tasksByProject[projectKey];
    const projectId = tasksForThisProject[0].payload.project_id;
    const localId = tasksForThisProject[0].payload.localId;

    if (!projectId) continue;

    const changes = tasksForThisProject.map(task => ({
      field: task.payload.field,
      value: task.payload.value,
      timestamp: task.payload.timestamp
    }));

    try {
      const response = await api.post(`/projects/${projectId}/sync`, { changes });

      const projectToSave = {
        ...response.data,
        localId: localId
      };

      await projectRepository.saveLocalProject(projectToSave);

      const taskIds = tasksForThisProject.map(t => t.id);
      await syncQueueRepository.deleteTasks(taskIds);

      console.log(`[SyncService] Projeto ${projectId} (LocalID: ${localId}) sincronizado com sucesso.`);

    } catch (error) {
      console.error(`[SyncService] Falha ao sincronizar projeto ${projectId}.`, error);
      if (error.response && error.response.status === 404) {
        console.warn(`[SyncService] Projeto ${projectId} não encontrado (404). Limpando tarefas.`);
        const taskIds = tasksForThisProject.map(t => t.id);
        await syncQueueRepository.deleteTasks(taskIds);
      } else {
        throw error;
      }
    }
  }
}

// ============================================================================
// DOMAIN HANDLERS (Processadores por Módulo)
// ============================================================================

async function _handleProjectTask(task) {
  let serverId;
  switch (task.type) {
    case 'CREATE_PROJECT':
      try {
        const { localId, ...projectData } = task.payload;
        const response = await api.post('/projects', projectData);
        const serverData = response.data;

        if (projectRepository.updateLocalProject) {
          await projectRepository.updateLocalProject(localId, {
            id: serverData.id,
            updated_at: serverData.updated_at
          });
        } else {
          await projectRepository.deleteLocalProject(localId);
          await projectRepository.saveLocalProject(serverData);
        }

        const projectStore = useProjectStore();
        await projectStore._loadProjectsFromDB();
      } catch (error) {
        console.error(`[SyncService] Falha ao criar projeto na API:`, error);
        throw error;
      }
      break;

    case 'DELETE_PROJECT':
      serverId = task.payload.id;
      if (serverId) {
        try { await api.delete(`/projects/${serverId}`); }
        catch (e) { if (e.response?.status !== 404) throw e; }
      }
      break;

    case 'REMOVE_PROJECT_MEMBER':
      await api.delete(`/projects/${task.payload.projectId}/members/${task.payload.targetUserId}`);
      break;

    case 'REVOKE_PROJECT_INVITE':
      const encodedEmail = encodeURIComponent(task.payload.targetEmail);
      await api.delete(`/projects/${task.payload.projectId}/invites/${encodedEmail}`);
      break;
  }
}

async function _handleKanbanTask(task) {
  let serverId, response;

  switch (task.type) {
    case 'CREATE_COLUMN':
      const serverProjId = await resolveServerProjectId(task.payload.project_id);
      const colPayload = {
        title: task.payload.title,
        order: task.payload.order,
        project_id: serverProjId
      };
      response = await api.post(`/kanban/columns`, colPayload);
      await kanbanRepository.setServerIdForColumn(task.entity_id, response.data.id);
      break;

    case 'UPDATE_COLUMN':
      serverId = task.payload.id;
      if (!serverId) {
        const col = await kanbanRepository.get_column_by_local_id(task.entity_id);
        if (!col?.id) throw new Error("COLUMN_NOT_SYNCED: Update em coluna sem ID server.");
        serverId = col.id;
      }

      // Delta Sync: Converte objeto em array changes
      const colChanges = buildChangesArray(task.payload, task.timestamp);
      if (colChanges.length > 0) {
        await api.put(`/kanban/columns/${serverId}`, { changes: colChanges });
      }
      break;

    case 'DELETE_COLUMN':
      serverId = task.payload.id;
      if (serverId) {
        try { await api.delete(`/kanban/columns/${serverId}`); }
        catch (e) { if (e.response?.status !== 404) throw e; }
      }
      break;

    case 'REORDER_COLUMNS':
      const pIdReorder = await resolveServerProjectId(task.payload.project_id);
      const colsOrder = task.payload.columns_order.filter(c => c.id).map(c => ({ id: c.id, order: c.order }));
      if (colsOrder.length) await api.post(`/kanban/projects/${pIdReorder}/reorder-columns`, { columns: colsOrder });
      break;

    case 'CREATE_TASK':
      const tProjId = await resolveServerProjectId(task.payload.project_id);
      const parentCol = await kanbanRepository.get_column_by_local_id(task.payload.column_id);
      if (!parentCol || !parentCol.id) throw new Error("COLUMN_NOT_SYNCED: Coluna pai não sincronizada.");

      const taskPayload = { ...task.payload, project_id: tProjId, column_id: parentCol.id };
      response = await api.post(`/kanban/tasks`, taskPayload);
      await kanbanRepository.setServerIdForTask(task.entity_id, response.data.id);
      break;

    case 'UPDATE_TASK':
      serverId = task.payload.id;
      if (task.payload.column_id) {
        const col = await kanbanRepository.get_column_by_local_id(task.payload.column_id);
        if (col && col.id) task.payload.column_id = col.id;
      }

      if (!serverId) {
        const t = await kanbanRepository.get_task_by_local_id(task.entity_id);
        serverId = t?.id;
      }

      if (serverId) {
        const taskChanges = buildChangesArray(task.payload, task.timestamp);
        if (taskChanges.length > 0) {
          await api.put(`/kanban/tasks/${serverId}`, { changes: taskChanges });
        }
      }
      break;

    case 'DELETE_TASK':
      serverId = task.payload.id;
      if (serverId) {
        try { await api.delete(`/kanban/tasks/${serverId}`); }
        catch (e) { if (e.response?.status !== 404) throw e; }
      }
      break;

    case 'CREATE_TASK_COMMENT':
      const localTask = await kanbanRepository.get_task_by_local_id(task.payload.task_local_id);
      if (!localTask?.id) throw new Error("TASK_NOT_SYNCED: Comentário aguardando Task.");

      response = await api.post(`/kanban/tasks/${localTask.id}/comments`, {
        content: task.payload.content,
        created_at: task.payload.created_at
      });
      const commentLocalId = task.payload.local_id || task.entity_id;
      await kanbanRepository.update_local_comment_state(task.payload.task_local_id, commentLocalId, { id: response.data.id });
      break;

    case 'UPDATE_TASK_COMMENT':
      const lTaskUpd = await kanbanRepository.get_task_by_local_id(task.payload.task_local_id);
      if (!lTaskUpd) return;
      const commToUpdate = lTaskUpd.comments.find(c => c.local_id === task.payload.comment_local_id);
      if (commToUpdate && !commToUpdate.id) throw new Error("COMMENT_NOT_SYNCED: Edição aguardando ID do servidor.");
      if (!commToUpdate) return;

      await api.put(`/kanban/comments/${commToUpdate.id}`, { content: task.payload.content });
      break;

    case 'DELETE_TASK_COMMENT':
      serverId = task.payload.server_id;
      if (serverId) {
        try { await api.delete(`/kanban/comments/${serverId}`); }
        catch (error) { if (error.response && error.response.status === 404) return; throw error; }
      }
      break;

    case 'TOGGLE_COMMENT_LIKE':
      const lTaskLike = await kanbanRepository.get_task_by_local_id(task.payload.task_local_id);
      if (!lTaskLike) return;
      const targetComment = lTaskLike.comments.find(c => c.local_id === task.payload.comment_local_id);
      if (!targetComment?.id) throw new Error("COMMENT_NOT_SYNCED: Like aguardando comentário.");
      try { await api.post(`/kanban/comments/${targetComment.id}/like`); }
      catch (e) { if (e.response?.status !== 404) throw e; }
      break;
  }
}

async function _handleRadioTask(task) {
  let serverId, response;

  switch (task.type) {
    case 'CREATE_PLAYLIST':
      const { localId, ...playlistData } = task.payload;
      response = await api.post('/radio/playlists', playlistData);
      const serverData = response.data;

      await radioRepository.updateLocalPlaylist(localId, {
        id: serverData.id,
        updated_at: serverData.updated_at
      });
      break;

    case 'DELETE_PLAYLIST':
      serverId = task.payload.id;
      if (serverId) {
        try { await api.delete(`/radio/playlists/${serverId}`); }
        catch (e) { if (e.response?.status !== 404) throw e; }
      }
      break;

    case 'SYNC_PLAYLIST_CHANGE':
      serverId = task.payload.playlist_id;
      if (!serverId) {
        const localPl = await radioRepository.getLocalPlaylist(task.payload.localId);
        serverId = localPl?.id;
      }
      if (serverId) {
        await api.post(`/radio/playlists/${serverId}/sync`, {
          changes: [{
            field: task.payload.field,
            value: task.payload.value,
            timestamp: task.payload.timestamp
          }]
        });
      }
      break;

    case 'ADD_TRACK':
      let parentPlaylistId = task.payload.playlist_id;

      if (!task.payload.playlist_id_is_server) {
        parentPlaylistId = await resolveServerPlaylistId(task.payload.playlist_local_id);
      }

      const trackPayload = { ...task.payload, playlist_id: parentPlaylistId };
      delete trackPayload.playlist_local_id;
      delete trackPayload.localId;
      delete trackPayload.playlist_id_is_server;

      response = await api.post(`/radio/playlists/${parentPlaylistId}/tracks`, trackPayload);

      await radioRepository.updateLocalTrack(task.payload.localId, { id: response.data.id });
      break;

    case 'DELETE_TRACK':
      serverId = task.payload.id;
      if (serverId) {
        try { await api.delete(`/radio/playlists/0/tracks/${serverId}`); }
        catch (e) { if (e.response?.status !== 404) throw e; }
      }
      break;
  }
}

async function _handleAccountTask(task) {
  if (task.type === 'CREATE_ACCOUNT') {
    const response = await api.post('/accounts', { data: task.payload.data });
    await accountsRepository.setServerId(task.payload.localId, response.data.id);
  } else if (task.type === 'DELETE_ACCOUNT') {
    const serverId = task.payload.id;
    if (!serverId) return;
    try { await api.delete(`/accounts/${serverId}`); }
    catch (error) { if (error.response && error.response.status === 404) return; throw error; }
  }
}

async function _handleUserTask(task) {
  if (task.type === 'CREATE_OCCUPATION') {
    await api.post('/users/occupations', task.payload);
  } else if (task.type === 'DELETE_OCCUPATION') {
    await api.delete(`/users/occupations/${task.payload.id}`);
  }
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

async function processTaskItem(task) {
  if (['CREATE_PROJECT', 'DELETE_PROJECT', 'REMOVE_PROJECT_MEMBER', 'REVOKE_PROJECT_INVITE'].includes(task.type)) {
    await _handleProjectTask(task);
  }
  else if (task.type.includes('COLUMN') || task.type.includes('TASK') || task.type.includes('COMMENT')) {
    await _handleKanbanTask(task);
  }
  else if (task.type.includes('ACCOUNT')) {
    await _handleAccountTask(task);
  }
  else if (task.type.includes('OCCUPATION')) {
    await _handleUserTask(task);
  }
  else if (task.type.includes('PLAYLIST') || task.type.includes('TRACK')) {
    await _handleRadioTask(task);
  }
  else {
    console.warn(`[SyncService] Tarefa desconhecida: ${task.type}`);
  }
}

export const syncService = {
  async processSyncQueue() {
    if (isProcessing) return;

    const utilsStore = useUtilsStore();
    if (!utilsStore.connection.connected) return;

    isProcessing = true;

    try {
      const pendingTasks = await syncQueueRepository.getPendingTasks();
      if (pendingTasks.length === 0) {
        isProcessing = false;
        return;
      }

      console.log(`[SyncService] Iniciando sincronização de ${pendingTasks.length} tarefas...`);

      // Separa tarefas de lote (Batch)
      const profileTasks = pendingTasks.filter(t => t.type === 'SYNC_PROFILE_CHANGE');
      const projectFieldTasks = pendingTasks.filter(t => t.type === 'SYNC_PROJECT_CHANGE');
      const accountSyncTasks = pendingTasks.filter(t => t.type === 'UPDATE_ACCOUNT');

      const individualTasks = pendingTasks.filter(t =>
        t.type !== 'SYNC_PROFILE_CHANGE' &&
        t.type !== 'SYNC_PROJECT_CHANGE' &&
        t.type !== 'UPDATE_ACCOUNT'
      );

      // Processa Lotes
      await processProfileSync(profileTasks);
      await processProjectSync(projectFieldTasks);
      await processAccountsSync(accountSyncTasks);

      // Ordena tarefas individuais por dependência lógica
      const creationOrder = { 'CREATE_PROJECT': 1, 'CREATE_COLUMN': 2, 'CREATE_TASK': 3, 'CREATE_PLAYLIST': 4, 'ADD_TRACK': 5 };
      const sortedTasks = individualTasks.sort((a, b) => {
        const orderA = creationOrder[a.type] || 10;
        const orderB = creationOrder[b.type] || 10;
        if (orderA !== orderB) return orderA - orderB;
        return a.timestamp - b.timestamp;
      });

      // Processa Individualmente
      for (const task of sortedTasks) {
        try {
          await processTaskItem(task);
          await syncQueueRepository.deleteTask(task.id);
          console.log(`[SyncService] OK: ${task.type} (${task.id})`);

        } catch (error) {
          if (error.response && (error.response.status === 403 || error.response.status === 404)) {
            console.warn(`[SyncService] Erro Fatal (${error.response.status}). Removendo tarefa ${task.type}.`);
            await syncQueueRepository.deleteTask(task.id);

            if (error.response.status === 403 && task.payload && task.payload.projectId) {
              const projectStore = useProjectStore();
              projectStore.forceLocalProjectRemoval(task.payload.projectId);
            }
            continue;
          }

          const msg = error.message || "";
          if (msg.includes("NOT_SYNCED")) {
            console.warn(`[SyncService] Adiado: ${task.type} (Dependência não resolvida)`);
            continue;
          }

          const current_retries = task.retry_count || 0;
          const max_retries = 5;

          if (current_retries >= max_retries) {
            console.error(`[SyncService] FALHA FINAL: Tarefa ${task.id} excedeu ${max_retries} tentativas. Removendo.`);
            await syncQueueRepository.deleteTask(task.id);
          } else {
            const new_count = current_retries + 1;
            console.warn(`[SyncService] Falha na tarefa ${task.type}. Tentativa ${new_count}/${max_retries}.`);

            await syncQueueRepository.updateTask(task.id, {
              retry_count: new_count
            });
          }
        }
      }
    } catch (globalError) {
      console.error("[SyncService] Erro Crítico na Fila:", globalError);
    } finally {
      isProcessing = false;
    }
  },
};
