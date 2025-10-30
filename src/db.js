// src/db.js
import Dexie from 'dexie';

export const db = new Dexie('KademDB');

// Define a estrutura do banco
db.version(1).stores({
    /**
     * Tabela para nossos dados.
     * '++id' = ID auto-incremental
     * 'title' = Um campo que talvez queiramos pesquisar
     * 'tempId' = ID temporário que usamos no front
     */
    tasks: '++id, title, tempId',

    /**
     * Tabela para a fila de sincronização.
     * '++id' = Ordem da fila
     * 'type' = 'CREATE_TASK', 'UPDATE_TASK', etc.
     */
    syncQueue: '++id, type'
});