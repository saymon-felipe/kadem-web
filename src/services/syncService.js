import { api } from "../plugins/api";
import {
  syncQueueRepository,
  userRepository,
  occupationRepository,
  medalRepository,
  projectRepository,
  kanbanRepository,
  accountsRepository,
  radioRepository,
  financeRepository,
} from "./localData";

import { useProjectStore } from "../stores/projects";
import { useAuthStore } from "../stores/auth";
import { useUtilsStore } from "../stores/utils";
import { useRadioStore } from "../stores/radio";
import { parse_srt } from "../utils/srt_parser";
import { apiServices } from "../plugins/apiServices";
import { db } from "../db";

let isProcessing = false;
const FINANCE_BATCH_LIMIT = 100;

// ============================================================================
// HELPERS & UTILS
// ============================================================================

/**
 * Utilitário para liberar a Thread Principal (UI)
 * Permite que o navegador renderize a tela entre tarefas pesadas.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const ignoreKeys = [
    "id",
    "local_id",
    "localId",
    "project_id",
    "timestamp",
    "type",
    "entity_id",
    "playlist_id_is_server",
    "attachments",
  ];
  const changeTs = timestamp || new Date().toISOString();

  for (const key in payload) {
    if (ignoreKeys.includes(key)) continue;
    if (payload[key] !== undefined) {
      changes.push({
        field: key,
        value: payload[key],
        timestamp: changeTs,
      });
    }
  }
  return changes;
};

const sanitizeTransactionPayload = (data) => {
  if (!data) return {};
  const allowedKeys = [
    "description",
    "observation",
    "amount",
    "type",
    "category_id",
    "transaction_date",
    "status",
    "source",
    "is_ignored",
  ];
  const clean = {};
  allowedKeys.forEach((key) => {
    if (data[key] !== undefined) {
      clean[key] = data[key];
    }
  });
  return clean;
};

const sanitizeCategoryPayload = (data) => {
  if (!data) return {};
  const allowedKeys = [
    "macro_category",
    "macro_color",
    "name",
    "type",
    "icon",
    "color",
    "investment_flow_type",
    "linked_investment_category_id",
  ];
  const clean = {};
  allowedKeys.forEach((key) => {
    if (data[key] !== undefined) {
      if (key === "linked_investment_category_id") {
        const numeric = Number(data[key]);
        if (Number.isFinite(numeric)) clean[key] = numeric;
      } else {
        clean[key] = data[key];
      }
    }
  });
  return clean;
};

const sanitizeMacroCategoryPayload = (data) => {
  if (!data) return {};
  const allowedKeys = ["name", "color", "is_investment"];
  const clean = {};
  allowedKeys.forEach((key) => {
    if (data[key] !== undefined) {
      clean[key] = data[key];
    }
  });
  return clean;
};

// ============================================================================
// BATCH PROCESSORS (Processamento em Lote)
// ============================================================================

async function processAccountsSync(accountTasks) {
  if (accountTasks.length === 0) return;

  const tasksByAccount = accountTasks.reduce((acc, task) => {
    const key = task.payload.id;
    if (!key) {
      console.warn(
        `[SyncService] Ignorando UPDATE_ACCOUNT para item local (${task.payload.localId}) sem ID de servidor.`,
      );
      return acc;
    }
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  console.log(`[SyncService] Sincronizando mudanças para ${Object.keys(tasksByAccount).length} contas do cofre...`);

  for (const accountId of Object.keys(tasksByAccount)) {
    await delay(20);

    const tasksForThisAccount = tasksByAccount[accountId];
    const localId = tasksForThisAccount[0].payload.localId;

    const changes = tasksForThisAccount.map((task) => ({
      field: "data",
      value: task.payload.data,
      timestamp: task.timestamp,
    }));

    try {
      const response = await api.post(`/accounts/${accountId}/sync`, { changes });

      const accountToSave = {
        id: response.data.id,
        data: response.data.data,
        localId: localId,
      };

      await accountsRepository.saveLocalAccount(accountToSave);

      const taskIds = tasksForThisAccount.map((t) => t.id);
      await syncQueueRepository.deleteTasks(taskIds);

      console.log(`[SyncService] Conta ${accountId} (LocalID: ${localId}) sincronizada com sucesso.`);
    } catch (error) {
      console.error(`[SyncService] Falha ao sincronizar conta ${accountId}.`, error);
      if (error.response && error.response.status === 404) {
        console.warn(`[SyncService] Conta ${accountId} não encontrada (404). Limpando tarefas.`);
        const taskIds = tasksForThisAccount.map((t) => t.id);
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
  const changes = profileTasks.map((task) => task.payload);

  try {
    const response = await api.post("/users/profile/sync", { changes });
    await _saveServerData(response.data);

    const taskIds = profileTasks.map((t) => t.id);
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
    await delay(20);

    const tasksForThisProject = tasksByProject[projectKey];
    const projectId = tasksForThisProject[0].payload.project_id;
    const localId = tasksForThisProject[0].payload.localId;

    if (!projectId) continue;

    const changes = tasksForThisProject.map((task) => ({
      field: task.payload.field,
      value: task.payload.value,
      timestamp: task.payload.timestamp,
    }));

    try {
      const response = await api.post(`/projects/${projectId}/sync`, { changes });

      const projectToSave = {
        ...response.data,
        localId: localId,
      };

      await projectRepository.saveLocalProject(projectToSave);

      const taskIds = tasksForThisProject.map((t) => t.id);
      await syncQueueRepository.deleteTasks(taskIds);

      console.log(`[SyncService] Projeto ${projectId} (LocalID: ${localId}) sincronizado com sucesso.`);
    } catch (error) {
      console.error(`[SyncService] Falha ao sincronizar projeto ${projectId}.`, error);
      if (error.response && error.response.status === 404) {
        console.warn(`[SyncService] Projeto ${projectId} não encontrado (404). Limpando tarefas.`);
        const taskIds = tasksForThisProject.map((t) => t.id);
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
    case "CREATE_PROJECT":
      try {
        const { localId, ...projectData } = task.payload;
        const response = await api.post("/projects", projectData);
        const serverData = response.data;

        if (projectRepository.updateLocalProject) {
          await projectRepository.updateLocalProject(localId, {
            id: serverData.id,
            updated_at: serverData.updated_at,
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

    case "DELETE_PROJECT":
      serverId = task.payload.id;
      if (serverId) {
        try {
          await api.delete(`/projects/${serverId}`);
        } catch (e) {
          if (e.response.status !== 404) throw e;
        }
      }
      break;

    case "REMOVE_PROJECT_MEMBER":
      await api.delete(`/projects/${task.payload.projectId}/members/${task.payload.targetUserId}`);
      break;

    case "REVOKE_PROJECT_INVITE":
      const encodedEmail = encodeURIComponent(task.payload.targetEmail);
      await api.delete(`/projects/${task.payload.projectId}/invites/${encodedEmail}`);
      break;
  }
}

async function _handleKanbanTask(task) {
  let serverId, response;

  switch (task.type) {
    case "CREATE_COLUMN":
      const serverProjId = await resolveServerProjectId(task.payload.project_id);
      const colPayload = {
        title: task.payload.title,
        order: task.payload.order,
        project_id: serverProjId,
      };
      response = await api.post(`/kanban/columns`, colPayload);
      await kanbanRepository.setServerIdForColumn(task.entity_id, response.data.id);
      break;

    case "UPDATE_COLUMN":
      serverId = task.payload.id;
      if (!serverId) {
        const col = await kanbanRepository.get_column_by_local_id(task.entity_id);
        if (!col.id) throw new Error("COLUMN_NOT_SYNCED: Update em coluna sem ID server.");
        serverId = col.id;
      }

      // Delta Sync: Converte objeto em array changes
      const colChanges = buildChangesArray(task.payload, task.timestamp);
      if (colChanges.length > 0) {
        await api.put(`/kanban/columns/${serverId}`, { changes: colChanges });
      }
      break;

    case "DELETE_COLUMN":
      serverId = task.payload.id;
      if (serverId) {
        try {
          await api.delete(`/kanban/columns/${serverId}`);
        } catch (e) {
          if (e.response.status !== 404) throw e;
        }
      }
      break;

    case "REORDER_COLUMNS":
      const pIdReorder = await resolveServerProjectId(task.payload.project_id);
      const colsOrder = [];
      for (const c of task.payload.columns_order) {
        let colServerId = c.id;
        if (!colServerId && c.local_id) {
          const localColumn = await kanbanRepository.get_column_by_local_id(c.local_id);
          colServerId = localColumn.id;
        }
        if (colServerId) colsOrder.push({ id: colServerId, order: c.order });
      }
      if (colsOrder.length) await api.post(`/kanban/projects/${pIdReorder}/reorder-columns`, { columns: colsOrder });
      break;

    case "CREATE_TASK":
      const tProjId = await resolveServerProjectId(task.payload.project_id);
      const parentCol = await kanbanRepository.get_column_by_local_id(task.payload.column_id);
      if (!parentCol || !parentCol.id) throw new Error("COLUMN_NOT_SYNCED: Coluna pai não sincronizada.");

      const taskPayload = { ...task.payload, project_id: tProjId, column_id: parentCol.id };
      response = await api.post(`/kanban/tasks`, taskPayload);
      await kanbanRepository.setServerIdForTask(task.entity_id, response.data.id);
      break;

    case "UPDATE_TASK":
      serverId = task.payload.id;
      if (task.payload.column_id) {
        const col = await kanbanRepository.get_column_by_local_id(task.payload.column_id);
        if (col && col.id) task.payload.column_id = col.id;
      }

      if (!serverId) {
        const t = await kanbanRepository.get_task_by_local_id(task.entity_id);
        serverId = t.id;
      }

      if (!serverId) {
        throw new Error("TASK_NOT_SYNCED: Update em tarefa sem ID server.");
      }

      const taskChanges = buildChangesArray(task.payload, task.timestamp);
      if (taskChanges.length > 0) {
        await api.put(`/kanban/tasks/${serverId}`, { changes: taskChanges });
      }
      break;

    case "ADD_TASK_ATTACHMENT":
      const attachment = await kanbanRepository.get_attachment_by_local_id(task.payload.attachment_local_id);
      if (!attachment) return;

      const parentTaskForAttachment = await kanbanRepository.get_task_by_local_id(attachment.task_local_id);
      if (!parentTaskForAttachment.id) throw new Error("TASK_NOT_SYNCED: Anexo aguardando Task.");
      if (!attachment.blob) throw new Error("ATTACHMENT_BLOB_MISSING");

      response = await api.post(`/kanban/tasks/${parentTaskForAttachment.id}/attachments`, attachment.blob, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Mime-Type": attachment.mime_type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(attachment.name || "arquivo"),
          "X-File-Size": attachment.size_bytes || attachment.blob.size || 0,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      await kanbanRepository.setServerDataForAttachment(attachment.local_id, response.data);
      break;

    case "DELETE_TASK_ATTACHMENT":
      serverId = task.payload.id;
      if (!serverId && task.payload.local_id) {
        const localAttachment = await kanbanRepository.get_attachment_by_local_id(task.payload.local_id);
        serverId = localAttachment.id;
      }
      if (serverId) {
        try {
          await api.delete(`/kanban/attachments/${serverId}`);
        } catch (e) {
          if (e.response.status !== 404) throw e;
        }
      }
      break;

    case "DELETE_TASK":
      serverId = task.payload.id;
      if (serverId) {
        try {
          await api.delete(`/kanban/tasks/${serverId}`);
        } catch (e) {
          if (e.response.status !== 404) throw e;
        }
      }
      break;

    case "MOVE_TASK_LIST":
      const targetColLocalId = task.payload.column_id;
      const targetCol = await kanbanRepository.get_column_by_local_id(targetColLocalId);

      if (!targetCol || !targetCol.id) {
        throw new Error("COLUMN_NOT_SYNCED: Tentativa de mover tarefas para coluna sem ID (Server).");
      }
      const serverColId = targetCol.id;
      const tasksToReorder = [];

      for (const t of task.payload.tasks) {
        let tServerId = t.id;

        if (!tServerId) {
          const localTaskData = await kanbanRepository.get_task_by_local_id(t.local_id);
          tServerId = localTaskData.id;
        }

        if (tServerId) {
          tasksToReorder.push({
            id: tServerId,
            order: t.order,
          });
        } else {
          console.warn(`[SyncService] Tarefa ${t.local_id} ignorada no reorder (sem ID server).`);
        }
      }

      if (tasksToReorder.length > 0) {
        await api.post(`/kanban/columns/${serverColId}/reorder-tasks`, {
          tasks: tasksToReorder,
        });
      }
      break;

    case "CREATE_TASK_COMMENT":
      const localTask = await kanbanRepository.get_task_by_local_id(task.payload.task_local_id);
      if (!localTask.id) throw new Error("TASK_NOT_SYNCED: Comentário aguardando Task.");

      response = await api.post(`/kanban/tasks/${localTask.id}/comments`, {
        content: task.payload.content,
        created_at: task.payload.created_at,
      });
      const commentLocalId = task.payload.local_id || task.entity_id;
      await kanbanRepository.update_local_comment_state(task.payload.task_local_id, commentLocalId, {
        id: response.data.id,
      });
      break;

    case "UPDATE_TASK_COMMENT":
      const lTaskUpd = await kanbanRepository.get_task_by_local_id(task.payload.task_local_id);
      if (!lTaskUpd) return;
      const commToUpdate = lTaskUpd.comments.find((c) => c.local_id === task.payload.comment_local_id);
      if (commToUpdate && !commToUpdate.id) throw new Error("COMMENT_NOT_SYNCED: Edição aguardando ID do servidor.");
      if (!commToUpdate) return;

      await api.put(`/kanban/comments/${commToUpdate.id}`, { content: task.payload.content });
      break;

    case "DELETE_TASK_COMMENT":
      serverId = task.payload.server_id;
      if (serverId) {
        try {
          await api.delete(`/kanban/comments/${serverId}`);
        } catch (error) {
          if (error.response && error.response.status === 404) return;
          throw error;
        }
      }
      break;

    case "TOGGLE_COMMENT_LIKE":
      const lTaskLike = await kanbanRepository.get_task_by_local_id(task.payload.task_local_id);
      if (!lTaskLike) return;
      const targetComment = lTaskLike.comments.find((c) => c.local_id === task.payload.comment_local_id);
      if (!targetComment.id) throw new Error("COMMENT_NOT_SYNCED: Like aguardando comentário.");
      try {
        await api.post(`/kanban/comments/${targetComment.id}/like`);
      } catch (e) {
        if (e.response.status !== 404) throw e;
      }
      break;
  }
}

async function _handleRadioTask(task) {
  let serverId, response;

  switch (task.type) {
    case "CREATE_PLAYLIST":
      const { localId, ...playlistData } = task.payload;
      response = await api.post("/radio/playlists", playlistData);
      const serverData = response.data;

      await radioRepository.updateLocalPlaylist(localId, {
        id: serverData.id,
        updated_at: serverData.updated_at,
      });
      break;

    case "DELETE_PLAYLIST":
      serverId = task.payload.id;
      if (serverId) {
        try {
          await api.delete(`/radio/playlists/${serverId}`);
        } catch (e) {
          if (e.response.status !== 404) throw e;
        }
      }
      break;

    case "SYNC_PLAYLIST_CHANGE":
      serverId = task.payload.playlist_id;
      if (!serverId) {
        const localPl = await radioRepository.getLocalPlaylist(task.payload.localId);
        serverId = localPl.id;
      }
      if (serverId) {
        await api.post(`/radio/playlists/${serverId}/sync`, {
          changes: [
            {
              field: task.payload.field,
              value: task.payload.value,
              timestamp: task.payload.timestamp,
            },
          ],
        });
      }
      break;

    case "ADD_TRACK":
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

    case "DELETE_TRACK":
      serverId = task.payload.id;
      if (serverId) {
        try {
          await api.delete(`/radio/playlists/0/tracks/${serverId}`);
        } catch (e) {
          if (e.response.status !== 404) throw e;
        }
      }
      break;
  }
}

async function _handleAccountTask(task) {
  if (task.type === "CREATE_ACCOUNT") {
    const response = await api.post("/accounts", { data: task.payload.data });
    await accountsRepository.setServerId(task.payload.localId, response.data.id);
  } else if (task.type === "DELETE_ACCOUNT") {
    const serverId = task.payload.id;
    if (!serverId) return;
    try {
      await api.delete(`/accounts/${serverId}`);
    } catch (error) {
      if (error.response && error.response.status === 404) return;
      throw error;
    }
  }
}

async function _handleUserTask(task) {
  if (task.type === "CREATE_OCCUPATION") {
    await api.post("/users/occupations", task.payload);
  } else if (task.type === "DELETE_OCCUPATION") {
    await api.delete(`/users/occupations/${task.payload.id}`);
  }
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

async function _handleDownloadLyricsTask(task) {
  const { video_id, track_local_id } = task.payload;
  const radioStore = useRadioStore();

  // 1. Verifica Cache Local antes de bater na API
  try {
    const existing = await db.lyrics.get(video_id);
    const hasCachedContent =
      existing &&
      existing.content &&
      ((Array.isArray(existing.content) && existing.content.length > 0) ||
        (typeof existing.content === "string" && existing.content.trim().length > 0));

    if (hasCachedContent) {
      console.log(`[SyncService] Legenda recuperada do cache local: ${video_id}`);
      await radioRepository.updateLocalTrack(track_local_id, {
        has_lyrics: true,
        lyrics_unavailable: false,
      });
      radioStore.update_track_lyrics_status_in_memory(video_id, {
        has_lyrics: true,
        lyrics_unavailable: false,
      });
      radioStore.set_lyric_downloading(video_id, false);
      return;
    }
  } catch (cacheErr) {
    console.warn(`[SyncService] Erro ao ler cache de legendas:`, cacheErr);
  }

  try {
    const authStore = useAuthStore();
    const token = authStore.token || authStore.getToken;
    const endpoint = `${apiServices.MEDIA_ENGINE}/subtitles/${video_id}?nocache=${Date.now()}`;

    const response = await api.get(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });

    const data = response.data;

    let subtitle_payload = data;
    if (data && typeof data === "object" && "subtitles" in data) {
      subtitle_payload = data.subtitles;
    }

    if (subtitle_payload === null || subtitle_payload === undefined) {
      throw new Error("LYRICS_EMPTY");
    }

    const isValidContent =
      (Array.isArray(subtitle_payload) && subtitle_payload.length > 0) ||
      (typeof subtitle_payload === "string" && subtitle_payload.trim().length > 0);

    if (!isValidContent) {
      throw new Error("LYRICS_EMPTY");
    }

    let final_content = subtitle_payload;
    if (typeof subtitle_payload === "string") {
      final_content = parse_srt(subtitle_payload);
    }

    await db.lyrics.put({
      video_id: video_id,
      content: final_content,
      downloaded_at: new Date().toISOString(),
    });

    await radioRepository.updateLocalTrack(track_local_id, {
      has_lyrics: true,
      lyrics_unavailable: false,
    });
    radioStore.update_track_lyrics_status_in_memory(video_id, {
      has_lyrics: true,
      lyrics_unavailable: false,
    });

    console.log(`[SyncService] Legendas baixadas e salvas para ${video_id}`);
  } catch (error) {
    const isNotFound = error.response && error.response.status === 404;
    const isEmpty = error.message === "LYRICS_EMPTY";

    if (isNotFound || isEmpty) {
      console.warn(
        `[SyncService] Legenda indisponível para ${video_id} (Motivo: ${isEmpty ? "Vazio/Null" : "404"}). Marcando como indisponível.`,
      );

      try {
        await radioRepository.updateLocalTrack(track_local_id, {
          lyrics_unavailable: true,
          has_lyrics: false,
        });

        radioStore.update_track_lyrics_status_in_memory(video_id, {
          has_lyrics: false,
          lyrics_unavailable: true,
        });
      } catch (dbError) {
        console.error(`[SyncService] Erro ao salvar status 'unavailable' localmente:`, dbError);
      }

      return;
    }

    console.error(`[SyncService] Erro de rede/servidor ao baixar legenda:`, error);
    throw error;
  } finally {
    radioStore.set_lyric_downloading(video_id, false);
  }
}

const updateFinanceLocalRecord = async (table, localId, serverData) => {
  if (!localId || !serverData) return;
  const current = await db[table].get(localId);
  await db[table].update(localId, {
    ...serverData,
    pending_sync: false,
    updated_at: serverData.updated_at || new Date().toISOString(),
  });

  if (table === "finance_categories" && current.id && serverData.id) {
    const transactions = await db.finance_transactions.where("category_id").equals(current.id).toArray();
    if (transactions.length) {
      await Promise.all(
        transactions.map((transaction) =>
          db.finance_transactions.update(transaction.local_id, {
            category_id: serverData.id,
            updated_at: transaction.updated_at || new Date().toISOString(),
          }),
        ),
      );
    }

    const budgets = await db.finance_budgets.where("category_id").equals(current.id).toArray();
    if (budgets.length) {
      await Promise.all(
        budgets.map((budget) =>
          db.finance_budgets.update(budget.local_id, {
            category_id: serverData.id,
            updated_at: budget.updated_at || new Date().toISOString(),
          }),
        ),
      );
    }

    const linkedCategories = await db.finance_categories
      .where("linked_investment_category_id")
      .equals(current.id)
      .toArray();
    if (linkedCategories.length) {
      await Promise.all(
        linkedCategories.map((category) =>
          db.finance_categories.update(category.local_id, {
            linked_investment_category_id: serverData.id,
            updated_at: category.updated_at || new Date().toISOString(),
          }),
        ),
      );
    }
  }

  if (table === "finance_macro_categories" && current.id && serverData.id) {
    const budgetGroups = await db.finance_budget_groups.where("macro_category_id").equals(current.id).toArray();
    if (budgetGroups.length) {
      await Promise.all(
        budgetGroups.map((group) =>
          db.finance_budget_groups.update(group.local_id, {
            macro_category_id: serverData.id,
            updated_at: group.updated_at || new Date().toISOString(),
          }),
        ),
      );
    }

    const categories = await db.finance_categories.where("macro_category").equals(current.name).toArray();
    if (categories.length) {
      await Promise.all(
        categories.map((category) =>
          db.finance_categories.update(category.local_id, {
            macro_category: serverData.name || current.name,
            macro_category_id: serverData.id,
            macro_color: serverData.color || category.macro_color || "#999999",
            color: serverData.color || category.color || "#999999",
            ...(serverData.is_investment && category.investment_flow_type !== "INVESTMENT_OUT"
              ? { type: "EXPENSE" }
              : {}),
            pending_sync: false,
            updated_at: new Date().toISOString(),
          }),
        ),
      );
    }
  }

  if (table === "finance_investment_events" && current.category_id && serverData.category_id) {
    await db.finance_investment_events.update(localId, {
      category_id: serverData.category_id,
      pending_sync: false,
      updated_at: serverData.updated_at || new Date().toISOString(),
    });
  }
};

const deleteFinanceLocalRecord = async (table, payload = {}) => {
  if (payload.local_id) {
    const current = await db[table].get(payload.local_id);
    if (current) {
      await db[table].delete(payload.local_id);
      return;
    }
  }

  const id = payload.server_id || payload.id;
  if (!id) return;

  const numeric = Number(id);
  const current = Number.isFinite(numeric)
    ? await db[table].where("id").equals(numeric).first()
    : await db[table].where("local_key").equals(id).first();

  if (current?.local_id) {
    await db[table].delete(current.local_id);
  }
};

const resolveFinanceServerId = async (table, payload) => {
  if (payload.server_id && Number.isFinite(Number(payload.server_id))) return Number(payload.server_id);
  if (payload.id && Number.isFinite(Number(payload.id))) return Number(payload.id);
  if (!payload.local_id) throw new Error(`FINANCE_NOT_SYNCED: ${table} sem ID local`);
  const row = await db[table].get(payload.local_id);
  if (row.id && Number.isFinite(Number(row.id))) return Number(row.id);
  throw new Error(`FINANCE_NOT_SYNCED: aguardando ID do servidor para ${table} local ${payload.local_id}`);
};

const resolveFinanceEntityId = async (table, id) => {
  if (!id) return null;
  const numeric = Number(id);
  if (Number.isFinite(numeric)) return numeric;
  const row = await db[table].where("local_key").equals(id).first();
  if (row.id && Number.isFinite(Number(row.id))) return Number(row.id);
  throw new Error(`FINANCE_NOT_SYNCED: aguardando ID do servidor para ${table} ${id}`);
};

const resolveBudgetGroupsForServer = async (groups = []) => {
  const resolved = [];
  for (const group of groups) {
    const macroId = await resolveFinanceEntityId("finance_macro_categories", group.macro_category_id);
    const items = [];
    for (const item of group.items || []) {
      const categoryId = await resolveFinanceEntityId("finance_categories", item.category_id);
      items.push({
        category_id: categoryId,
        amount: Number(item.amount || 0),
        type: item.type || "EXPENSE",
      });
    }
    resolved.push({
      macro_category_id: macroId,
      planned_amount: Number(group.planned_amount || 0),
      items,
    });
  }
  return resolved;
};

const resolveTransactionPayloadForServer = async (data) => {
  const cleanData = sanitizeTransactionPayload(data);
  if (cleanData.category_id) {
    cleanData.category_id = await resolveFinanceEntityId("finance_categories", cleanData.category_id);
  }
  return cleanData;
};

const sanitizeInvestmentGoalPayload = (data) => {
  if (!data) return {};
  const allowedKeys = ["name", "horizon", "target_amount", "target_date", "current_amount", "color"];
  const clean = {};
  allowedKeys.forEach((key) => {
    if (data[key] !== undefined) clean[key] = data[key];
  });
  return clean;
};

const sanitizeInvestmentEventPayload = (data) => {
  if (!data) return {};
  const allowedKeys = ["category_id", "event_type", "description", "amount", "event_date", "notes"];
  const clean = {};
  allowedKeys.forEach((key) => {
    if (data[key] !== undefined) clean[key] = data[key];
  });
  return clean;
};

const resolveInvestmentEventPayloadForServer = async (data) => {
  const cleanData = sanitizeInvestmentEventPayload(data);
  if (cleanData.category_id) {
    cleanData.category_id = await resolveFinanceEntityId("finance_categories", cleanData.category_id);
  }
  return cleanData;
};

async function _handleFinanceTask(task) {
  const { payload } = task;

  switch (task.type) {
    case "CREATE_FINANCE_TRANSACTION": {
      const cleanData = await resolveTransactionPayloadForServer(payload.data);
      const response = await api.post("/finance/transactions", cleanData);
      await updateFinanceLocalRecord("finance_transactions", payload.local_id, response.data);
      return;
    }
    case "CREATE_FINANCE_TRANSACTIONS_BATCH": {
      if ((payload.transactions || []).length > FINANCE_BATCH_LIMIT) {
        for (let index = 0; index < payload.transactions.length; index += FINANCE_BATCH_LIMIT) {
          await syncQueueRepository.addSyncQueueTask({
            type: "CREATE_FINANCE_TRANSACTIONS_BATCH",
            payload: {
              local_ids: (payload.local_ids || []).slice(index, index + FINANCE_BATCH_LIMIT),
              transactions: (payload.transactions || []).slice(index, index + FINANCE_BATCH_LIMIT),
            },
            timestamp: task.timestamp || new Date().toISOString(),
          });
        }
        return;
      }

      const cleanTransactions = [];
      for (const tx of payload.transactions || []) {
        cleanTransactions.push(await resolveTransactionPayloadForServer(tx));
      }
      const response = await api.post("/finance/transactions/batch", {
        transactions: cleanTransactions,
      });
      if (Array.isArray(response.data)) {
        for (let i = 0; i < response.data.length; i++) {
          const serverData = response.data[i];
          const localId = payload.local_ids[i];
          await updateFinanceLocalRecord("finance_transactions", localId, serverData);
        }
      }
      return;
    }

    case "UPDATE_FINANCE_TRANSACTION": {
      const id = await resolveFinanceServerId("finance_transactions", payload);
      const cleanData = await resolveTransactionPayloadForServer(payload.data);
      const response = await api.put(`/finance/transactions/${id}`, cleanData);
      await updateFinanceLocalRecord("finance_transactions", payload.local_id, response.data);
      return;
    }
    case "DELETE_FINANCE_TRANSACTION": {
      const id = await resolveFinanceServerId("finance_transactions", payload);
      await api.delete(`/finance/transactions/${id}`);
      return;
    }
    case "CREATE_FINANCE_CATEGORY": {
      const cleanData = sanitizeCategoryPayload(payload.data);
      const response = await api.post("/finance/categories", cleanData);
      await updateFinanceLocalRecord("finance_categories", payload.local_id, response.data);
      return;
    }
    case "UPDATE_FINANCE_CATEGORY": {
      const id = await resolveFinanceServerId("finance_categories", payload);
      const cleanData = sanitizeCategoryPayload(payload.data);
      const response = await api.put(`/finance/categories/${id}`, cleanData);
      await updateFinanceLocalRecord("finance_categories", payload.local_id, response.data);
      return;
    }
    case "DELETE_FINANCE_CATEGORY": {
      const id = await resolveFinanceServerId("finance_categories", payload);
      await api.delete(`/finance/categories/${id}`);
      await deleteFinanceLocalRecord("finance_categories", payload);
      return;
    }
    case "CREATE_FINANCE_MACRO_CATEGORY": {
      const cleanData = sanitizeMacroCategoryPayload(payload.data);
      const response = await api.post("/finance/macro-categories", cleanData);
      await updateFinanceLocalRecord("finance_macro_categories", payload.local_id, response.data);
      return;
    }
    case "UPDATE_FINANCE_MACRO_CATEGORY": {
      const id = await resolveFinanceServerId("finance_macro_categories", payload);
      const cleanData = sanitizeMacroCategoryPayload(payload.data);
      const response = await api.put(`/finance/macro-categories/${id}`, cleanData);
      await updateFinanceLocalRecord("finance_macro_categories", payload.local_id, response.data);
      return;
    }
    case "DELETE_FINANCE_MACRO_CATEGORY": {
      const id = await resolveFinanceServerId("finance_macro_categories", payload);
      await api.delete(`/finance/macro-categories/${id}`);
      await deleteFinanceLocalRecord("finance_macro_categories", payload);
      return;
    }
    case "SAVE_FINANCE_BUDGETS": {
      const groups = await resolveBudgetGroupsForServer(payload.groups || []);
      const response = await api.post("/finance/budgets", {
        month: payload.month,
        groups,
      });
      await financeRepository.setBudgetGroups(payload.month, response.data || []);
      return;
    }
    case "CREATE_FINANCE_INVESTMENT_GOAL": {
      const cleanData = sanitizeInvestmentGoalPayload(payload.data);
      const response = await api.post("/finance/investments/goals", cleanData);
      await updateFinanceLocalRecord("finance_investment_goals", payload.local_id, response.data);
      return;
    }
    case "UPDATE_FINANCE_INVESTMENT_GOAL": {
      const id = await resolveFinanceServerId("finance_investment_goals", payload);
      const cleanData = sanitizeInvestmentGoalPayload(payload.data);
      const response = await api.put(`/finance/investments/goals/${id}`, cleanData);
      await updateFinanceLocalRecord("finance_investment_goals", payload.local_id, response.data);
      return;
    }
    case "DELETE_FINANCE_INVESTMENT_GOAL": {
      const id = await resolveFinanceServerId("finance_investment_goals", payload);
      await api.delete(`/finance/investments/goals/${id}`);
      return;
    }
    case "CREATE_FINANCE_INVESTMENT_EVENT": {
      const cleanData = await resolveInvestmentEventPayloadForServer(payload.data);
      const response = await api.post("/finance/investments/events", cleanData);
      await updateFinanceLocalRecord("finance_investment_events", payload.local_id, response.data);
      return;
    }
    case "UPDATE_FINANCE_INVESTMENT_EVENT": {
      const id = await resolveFinanceServerId("finance_investment_events", payload);
      const cleanData = await resolveInvestmentEventPayloadForServer(payload.data);
      const response = await api.put(`/finance/investments/events/${id}`, cleanData);
      await updateFinanceLocalRecord("finance_investment_events", payload.local_id, response.data);
      return;
    }
    case "DELETE_FINANCE_INVESTMENT_EVENT": {
      const id = await resolveFinanceServerId("finance_investment_events", payload);
      await api.delete(`/finance/investments/events/${id}`);
      return;
    }
    default:
      throw new Error(`Tarefa financeira desconhecida: ${task.type}`);
  }
}

async function processTaskItem(task) {
  if (task.type === "DOWNLOAD_LYRICS") {
    await _handleDownloadLyricsTask(task);
  } else if (task.type.includes("FINANCE")) {
    await _handleFinanceTask(task);
  } else if (
    ["CREATE_PROJECT", "DELETE_PROJECT", "REMOVE_PROJECT_MEMBER", "REVOKE_PROJECT_INVITE"].includes(task.type)
  ) {
    await _handleProjectTask(task);
  } else if (task.type.includes("COLUMN") || task.type.includes("TASK") || task.type.includes("COMMENT")) {
    await _handleKanbanTask(task);
  } else if (task.type.includes("ACCOUNT")) {
    await _handleAccountTask(task);
  } else if (task.type.includes("OCCUPATION")) {
    await _handleUserTask(task);
  } else if (task.type.includes("PLAYLIST") || task.type.includes("TRACK")) {
    await _handleRadioTask(task);
  } else {
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
      while (true) {
        const pendingTasks = await syncQueueRepository.getPendingTasks();
        if (pendingTasks.length === 0) break;

        console.log(`[SyncService] Iniciando sincronização de ${pendingTasks.length} tarefas...`);

        const profileTasks = pendingTasks.filter((t) => t.type === "SYNC_PROFILE_CHANGE");
        const projectFieldTasks = pendingTasks.filter((t) => t.type === "SYNC_PROJECT_CHANGE");
        const accountSyncTasks = pendingTasks.filter((t) => t.type === "UPDATE_ACCOUNT");

        const individualTasks = pendingTasks.filter(
          (t) => t.type !== "SYNC_PROFILE_CHANGE" && t.type !== "SYNC_PROJECT_CHANGE" && t.type !== "UPDATE_ACCOUNT",
        );

        await processProfileSync(profileTasks);
        await processProjectSync(projectFieldTasks);
        await processAccountsSync(accountSyncTasks);

        const creationOrder = {
          CREATE_PROJECT: 1,
          CREATE_COLUMN: 2,
          CREATE_TASK: 3,
          ADD_TASK_ATTACHMENT: 4,
          CREATE_PLAYLIST: 5,
          ADD_TRACK: 6,
          CREATE_FINANCE_MACRO_CATEGORY: 7,
          CREATE_FINANCE_CATEGORY: 8,
          CREATE_FINANCE_TRANSACTION: 9,
          CREATE_FINANCE_TRANSACTIONS_BATCH: 9,
          CREATE_FINANCE_INVESTMENT_GOAL: 10,
          SAVE_FINANCE_BUDGETS: 11,
          CREATE_FINANCE_INVESTMENT_EVENT: 12,
        };
        const sortedTasks = individualTasks.sort((a, b) => {
          const orderA = creationOrder[a.type] || 10;
          const orderB = creationOrder[b.type] || 10;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });

        let hadDeferredDependency = false;
        let hadFailure = false;

        for (const task of sortedTasks) {
          if (hadFailure) {
            console.log(`[SyncService] Sincronização interrompida devido a falha anterior.`);
            break;
          }
          await delay(50);

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
              hadDeferredDependency = true;
              console.warn(`[SyncService] Adiado: ${task.type} (Dependência não resolvida)`);
              continue;
            }

            const current_retries = task.retry_count || 0;
            const max_retries = 5;

            if (current_retries >= max_retries) {
              console.error(`[SyncService] FALHA FINAL: Tarefa ${task.id} excedeu ${max_retries} tentativas.`);
              await syncQueueRepository.updateTask(task.id, {
                status: "FAILED",
                last_error: error.message || "Erro desconhecido",
              });
            } else {
              const new_count = current_retries + 1;
              const retryDelayMs = Math.min(5 * 60 * 1000, 1000 * 2 ** (new_count - 1));
              console.warn(`[SyncService] Falha na tarefa ${task.type}. Tentativa ${new_count}/${max_retries}.`);

              await syncQueueRepository.updateTask(task.id, {
                retry_count: new_count,
                status: "RETRY",
                next_attempt_at: new Date(Date.now() + retryDelayMs).toISOString(),
                last_error: error.message || "Erro desconhecido",
              });
              hadFailure = true;
            }
          }
        }

        if (hadFailure) {
          break;
        }

        if (hadDeferredDependency) {
          const remainingTasks = await syncQueueRepository.getPendingTasks();
          if (remainingTasks.length === sortedTasks.length) break;
        }
      }
    } catch (globalError) {
      console.error("[SyncService] Erro Crítico na Fila:", globalError);
    } finally {
      isProcessing = false;
    }
  },
};
