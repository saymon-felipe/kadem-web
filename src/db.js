import Dexie from 'dexie';

export const db = new Dexie('KademDB');

db.version(14).stores({
  tasks: '++id, title, tempId',
  syncQueue: '++id, type, timestamp, status, next_attempt_at, idempotency_key, compact_key',
  users: '&id',
  user_occupations: '++localId, &id, user_id',
  medals: '&id',
  projects: '++localId, &id, name',
  accounts: '++localId, &id, data',
  kanban_columns: '++local_id, id, project_id',
  kanban_tasks: '++local_id, id, column_id, project_id',
  kanban_task_attachments: '++local_id, id, task_local_id, task_id, project_id',
  playlists: '++local_id, &id, name, created_at',
  tracks: '++local_id, &id, title, youtube_id, playlist_local_id',
  global_audio_cache: '&youtube_id, created_at',
  lyrics: 'video_id',
  finance_categories: '++local_id, local_key, id, name, type, macro_category, investment_flow_type, linked_investment_category_id',
  finance_macro_categories: '++local_id, local_key, id, name, is_investment',
  finance_transactions: '++local_id, local_key, id, transaction_date, type, category_id',
  finance_budget_groups: '++local_id, id, month, macro_category_id',
  finance_budgets: '++local_id, id, month, category_id, group_local_id',
  finance_connections: '++local_id, id, item_id, provider',
  finance_investment_goals: '++local_id, local_key, id, horizon, is_archived',
  finance_investment_events: '++local_id, local_key, id, event_date, event_type, category_id'
});
