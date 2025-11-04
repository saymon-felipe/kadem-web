// src/db.js
import Dexie from 'dexie';

export const db = new Dexie('KademDB');

db.version(4).stores({
    // Tabelas anteriores
    tasks: '++id, title, tempId',
    syncQueue: '++id, type',

    /**
     * Tabela para os dados do perfil do usuário.
     * '&id' = Chave primária (vem do backend)
     */
    users: '&id',

    /**
     * Tabela para as ocupações do usuário.
     * '&id' = Chave primária (vem do backend)
     * 'user_id' = Campo indexado para podermos buscar por usuário
     */
    user_occupations: '++localId, &id, user_id',

    /**
     * Tabela mestre das medalhas.
     * '&id' = Chave primária (vem do backend)
     */
    medals: '&id'

    // Tabela 'user_medals' removida. Não é necessária.
});