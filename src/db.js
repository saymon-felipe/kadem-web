// src/db.js
import Dexie from 'dexie';

export const db = new Dexie('KademDB');

db.version(2).stores({
    tasks: '++id, title, tempId',
    syncQueue: '++id, type, timestamp',

    /**
     * Tabela para os dados do perfil do usuário.
     * '&id' = Chave primária (vem do backend)
     */
    users: '&id',

    /**
     * Tabela para as ocupações do usuário.
     * '++localId' = Chave primária local auto-incremental
     * '&id' = Chave primária (vem do backend, única)
     * 'user_id' = Campo indexado para podermos buscar por usuário
     */
    user_occupations: '++localId, &id, user_id',

    /**
     * Tabela mestre das medalhas.
     * '&id' = Chave primária (vem do backend)
     */
    medals: '&id',

    /**
     * Tabela de Projetos
     * '++localId' = Chave primária local auto-incremental
     * '&id' = Chave primária (vem do backend, única)
     * 'name' = Indexado para busca
     */
    projects: '++localId, &id, name'
});