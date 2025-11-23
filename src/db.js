import Dexie from 'dexie';

export const db = new Dexie('KademDB');

db.version(3).stores({
    tasks: '++id, title, tempId',
    syncQueue: '++id, type, timestamp',
    users: '&id',
    user_occupations: '++localId, &id, user_id',
    medals: '&id',
    projects: '++localId, &id, name',
    accounts: '++localId, &id, data',
    kanban_columns: '++local_id, id, project_id',
    kanban_tasks: '++local_id, id, column_id, project_id'
});