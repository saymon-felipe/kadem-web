import Dexie from 'dexie';

export const db = new Dexie('KademDB');

db.version(2).stores({
    tasks: '++id, title, tempId',
    syncQueue: '++id, type, timestamp',
    users: '&id',
    user_occupations: '++localId, &id, user_id',
    medals: '&id',
    projects: '++localId, &id, name',
    accounts: '++localId, &id, data'
});