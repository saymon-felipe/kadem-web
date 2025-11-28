import { api } from '../plugins/api';
import {
    syncQueueRepository,
    userRepository,
    occupationRepository,
    medalRepository,
    projectRepository,
    kanbanRepository,
    accountsRepository
} from './localData';

import { useProjectStore } from '../stores/projects';
import { useAuthStore } from '../stores/auth';

let isProcessing = false;

// --- HELPERS ---

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

const resolveServerProjectId = async (localProjectId) => {
    const numericLocalId = parseInt(localProjectId, 10);
    if (isNaN(numericLocalId)) return localProjectId;

    const localProject = await projectRepository.getLocalProject(numericLocalId);

    if (!localProject) return localProjectId;
    if (localProject.id) return localProject.id;

    throw new Error(`PROJECT_NOT_SYNCED: Aguardando ID do servidor para projeto local ${numericLocalId}`);
};


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
                console.warn(`[SyncService] Conta ${accountId} não encontrada no servidor (404). Removendo tarefas zumbis.`);
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
                console.warn(`[SyncService] Projeto ${projectId} não encontrado no servidor (404). Removendo tarefas zumbis.`);
                const taskIds = tasksForThisProject.map(t => t.id);
                await syncQueueRepository.deleteTasks(taskIds);
            } else {
                throw error;
            }
        }
    }
}

// --- PROCESSADORES INDIVIDUAIS (KANBAN/CRUD) ---

async function processTaskItem(task) {
    let response, serverId;

    switch (task.type) {
        case 'CREATE_PROJECT':
            try {
                const { localId, ...projectData } = task.payload;
                response = await api.post('/projects', projectData);
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
            return;

        case 'DELETE_PROJECT':
            serverId = task.payload.id;
            if (serverId) {
                try { await api.delete(`/projects/${serverId}`); } catch (e) { if (e.response?.status !== 404) throw e; }
            }
            return;

        case 'CREATE_COLUMN':
            const serverProjId = await resolveServerProjectId(task.payload.project_id);
            const colPayload = {
                title: task.payload.title,
                order: task.payload.order,
                project_id: serverProjId
            };
            response = await api.post(`/kanban/columns`, colPayload);
            serverId = response.data.id;
            await kanbanRepository.setServerIdForColumn(task.entity_id, serverId);
            return;

        case 'UPDATE_COLUMN':
            serverId = task.payload.id;
            if (!serverId) {
                const col = await kanbanRepository.get_column_by_local_id(task.entity_id);
                if (!col?.id) throw new Error("COLUMN_NOT_SYNCED: Update em coluna sem ID server.");
                serverId = col.id;
            }
            await api.put(`/kanban/columns/${serverId}`, task.payload);
            return;

        case 'DELETE_COLUMN':
            serverId = task.payload.id;
            if (serverId) {
                try { await api.delete(`/kanban/columns/${serverId}`); } catch (e) { if (e.response?.status !== 404) throw e; }
            }
            return;

        case 'REORDER_COLUMNS':
            const pIdReorder = await resolveServerProjectId(task.payload.project_id);
            const colsOrder = task.payload.columns_order.filter(c => c.id).map(c => ({ id: c.id, order: c.order }));
            if (colsOrder.length) await api.post(`/kanban/projects/${pIdReorder}/reorder-columns`, { columns: colsOrder });
            return;

        case 'CREATE_TASK':
            const tProjId = await resolveServerProjectId(task.payload.project_id);
            const parentCol = await kanbanRepository.get_column_by_local_id(task.payload.column_id);
            if (!parentCol || !parentCol.id) throw new Error("COLUMN_NOT_SYNCED: Coluna pai não sincronizada.");

            const taskPayload = { ...task.payload, project_id: tProjId, column_id: parentCol.id };
            response = await api.post(`/kanban/tasks`, taskPayload);
            await kanbanRepository.setServerIdForTask(task.entity_id, response.data.id);
            return;

        case 'UPDATE_TASK':
            serverId = task.payload.id;
            const updateData = { ...task.payload };
            if (updateData.column_id) {
                const col = await kanbanRepository.get_column_by_local_id(updateData.column_id);
                if (col && col.id) updateData.column_id = col.id;
            }
            delete updateData.project_id;

            if (!serverId) {
                const t = await kanbanRepository.get_task_by_local_id(task.entity_id);
                serverId = t?.id;
            }
            if (serverId) await api.put(`/kanban/tasks/${serverId}`, updateData);
            return;

        case 'DELETE_TASK':
            serverId = task.payload.id;
            if (serverId) {
                try { await api.delete(`/kanban/tasks/${serverId}`); } catch (e) { if (e.response?.status !== 404) throw e; }
            }
            return;

        case 'CREATE_ACCOUNT':
            try {
                response = await api.post('/accounts', { data: task.payload.data });
                await accountsRepository.setServerId(task.payload.localId, response.data.id);
                return;
            } catch (error) { console.error(`Falha CREATE_ACCOUNT`, error); throw error; }

        case 'DELETE_ACCOUNT':
            try {
                serverId = task.payload.id;
                if (!serverId) return;
                await api.delete(`/accounts/${serverId}`);
                return;
            } catch (error) {
                if (error.response && error.response.status === 404) return;
                throw error;
            }

        case 'UPDATE_TASK_COMMENT':
            const lTaskUpd = await kanbanRepository.get_task_by_local_id(task.payload.task_local_id);
            if (!lTaskUpd) return;

            const commToUpdate = lTaskUpd.comments.find(c => c.local_id === task.payload.comment_local_id);

            if (commToUpdate && !commToUpdate.id) {
                throw new Error("COMMENT_NOT_SYNCED: Edição aguardando ID do servidor.");
            }
            if (!commToUpdate) return;

            await api.put(`/kanban/comments/${commToUpdate.id}`, {
                content: task.payload.content
            });
            return;

        case 'DELETE_TASK_COMMENT':
            serverId = task.payload.server_id;

            if (serverId) {
                try {
                    await api.delete(`/kanban/comments/${serverId}`);
                } catch (error) {
                    if (error.response && error.response.status === 404) return;
                    throw error;
                }
            } else {
                console.log("[Sync] Comentário local deletado antes de subir pro servidor.");
            }
            return;

        case 'CREATE_OCCUPATION':
            return await api.post('/users/occupations', task.payload);

        case 'DELETE_OCCUPATION':
            return await api.delete(`/users/occupations/${task.payload.id}`);

        case 'REMOVE_PROJECT_MEMBER':
            try {
                await api.delete(`/projects/${task.payload.projectId}/members/${task.payload.targetUserId}`);
                console.log(`[SyncService] Membro ${task.payload.targetUserId} removido do projeto ${task.payload.projectId}.`);
                return Promise.resolve();
            } catch (error) {
                console.error(`[SyncService] Falha ao remover membro:`, error);
                throw error;
            }

        case 'REVOKE_PROJECT_INVITE':
            try {
                const encodedEmail = encodeURIComponent(task.payload.targetEmail);
                await api.delete(`/projects/${task.payload.projectId}/invites/${encodedEmail}`);
                console.log(`[SyncService] Convite para ${task.payload.targetEmail} cancelado.`);
                return Promise.resolve();
            } catch (error) {
                console.error(`[SyncService] Falha ao cancelar convite:`, error);
                throw error;
            }

        default:
            if (task.type === 'CREATE_TASK_COMMENT') {
                const localTask = await kanbanRepository.get_task_by_local_id(task.payload.task_local_id);
                if (!localTask?.id) throw new Error("TASK_NOT_SYNCED: Comentário aguardando Task.");
                response = await api.post(`/kanban/tasks/${localTask.id}/comments`, {
                    content: task.payload.content,
                    created_at: task.payload.created_at
                });
                const commentLocalId = task.payload.local_id || task.entity_id;
                await kanbanRepository.update_local_comment_state(task.payload.task_local_id, commentLocalId, { id: response.data.id });
                return;
            }
            if (task.type === 'TOGGLE_COMMENT_LIKE') {
                const lTask = await kanbanRepository.get_task_by_local_id(task.payload.task_local_id);
                if (!lTask) return;
                const targetComment = lTask.comments.find(c => c.local_id === task.payload.comment_local_id);
                if (!targetComment?.id) throw new Error("COMMENT_NOT_SYNCED: Like aguardando comentário.");
                try { await api.post(`/kanban/comments/${targetComment.id}/like`); }
                catch (e) { if (e.response?.status !== 404) throw e; }
                return;
            }
            console.warn(`[SyncService] Tarefa desconhecida: ${task.type}`);
            return;
    }
}

// --- FILA PRINCIPAL (MESCLADA) ---

export const syncService = {
    async processSyncQueue(force = false) {
        if ((isProcessing && !force) || !navigator.onLine) return;
        isProcessing = true;

        try {
            const allTasks = await syncQueueRepository.getPendingTasks();
            if (allTasks.length === 0) {
                isProcessing = false;
                return;
            }

            console.log(`[SyncService] Iniciando sincronização de ${allTasks.length} tarefas...`);

            const profileTasks = allTasks.filter(t => t.type === 'SYNC_PROFILE_CHANGE');
            const projectFieldTasks = allTasks.filter(t => t.type === 'SYNC_PROJECT_CHANGE');
            const accountSyncTasks = allTasks.filter(t => t.type === 'UPDATE_ACCOUNT');

            const individualTasks = allTasks.filter(t =>
                t.type !== 'SYNC_PROFILE_CHANGE' &&
                t.type !== 'SYNC_PROJECT_CHANGE' &&
                t.type !== 'UPDATE_ACCOUNT'
            );

            await processProfileSync(profileTasks);
            await processProjectSync(projectFieldTasks);
            await processAccountsSync(accountSyncTasks);

            const creationOrder = { 'CREATE_PROJECT': 1, 'CREATE_COLUMN': 2, 'CREATE_TASK': 3 };
            const sortedTasks = individualTasks.sort((a, b) => {
                const orderA = creationOrder[a.type] || 10;
                const orderB = creationOrder[b.type] || 10;
                if (orderA !== orderB) return orderA - orderB;
                return a.timestamp - b.timestamp;
            });

            for (const task of sortedTasks) {
                try {
                    await processTaskItem(task);
                    await syncQueueRepository.deleteTask(task.id);
                    console.log(`[SyncService] OK: ${task.type} (${task.id})`);
                } catch (error) {
                    if (error.response && error.response.status === 403) {
                        console.error(`[Security] Acesso negado ao processar ${task.type}. Removendo projeto local.`);

                        await syncQueueRepository.deleteTask(task.id);

                        if (task.payload && task.payload.projectId) {
                            const projectStore = useProjectStore();
                            projectStore.forceLocalProjectRemoval(task.payload.projectId);
                        }
                        continue;
                    }

                    const msg = error.message || "";
                    if (msg.includes("NOT_SYNCED")) {
                        console.warn(`[SyncService] Adiado: ${task.type} (Dependência)`);
                    } else if (error.response && error.response.status === 404) {
                        console.warn(`[SyncService] 404 (Não Encontrado). Limpando tarefa ${task.type}.`);
                        await syncQueueRepository.deleteTask(task.id);
                    } else {
                        console.error(`[SyncService] Erro em ${task.type}:`, error);
                    }
                }
            }
        } catch (globalError) {
            console.error("[SyncService] Erro fatal no loop:", globalError);
        } finally {
            isProcessing = false;
        }
    }
};