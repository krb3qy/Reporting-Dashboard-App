import { getToken } from './gcAuth';
import { API_QUERY_METRICS, FILTER_TYPES } from '../constants';

const API_BASE = 'https://api.usw2.pure.cloud';

async function gcFetch(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Paginate through a GC list endpoint, returning all entities.
 */
async function gcFetchAll(basePath, pageSize = 100) {
  let page = 1;
  let allEntities = [];
  while (true) {
    const sep = basePath.includes('?') ? '&' : '?';
    const data = await gcFetch(`${basePath}${sep}pageSize=${pageSize}&pageNumber=${page}`);
    const entities = data.entities || [];
    allEntities = allEntities.concat(entities);
    if (entities.length < pageSize || page >= (data.pageCount || 1)) break;
    page++;
  }
  return allEntities;
}

/**
 * Query conversation aggregates with the full metric set.
 */
export async function queryConversationAggregates({ interval, granularity, groupBy, filter }) {
  const body = {
    interval,
    granularity,
    groupBy,
    filter,
    metrics: API_QUERY_METRICS,
  };

  return gcFetch('/api/v2/analytics/conversations/aggregates/query', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Get all queues (paginated).
 */
export async function getQueues() {
  const entities = await gcFetchAll('/api/v2/routing/queues');
  return { entities };
}

/**
 * Get all divisions (paginated).
 */
export async function getDivisions() {
  const entities = await gcFetchAll('/api/v2/authorization/divisions');
  return { entities };
}

/**
 * Get all routing skills (paginated).
 */
export async function getSkills() {
  const entities = await gcFetchAll('/api/v2/routing/skills');
  return { entities };
}

/**
 * Get all wrap-up codes (paginated).
 */
export async function getWrapUpCodes() {
  const entities = await gcFetchAll('/api/v2/routing/wrapupcodes');
  return { entities };
}

/**
 * Get all users (paginated).
 */
export async function getUsers() {
  const entities = await gcFetchAll('/api/v2/users');
  return { entities };
}

/**
 * Build a filter object for the aggregates query from the UI filter state.
 * Uses the dimension mapping from FILTER_TYPES.
 */
export function buildAggregateFilter(filterValues) {
  const predicates = [];

  for (const ft of FILTER_TYPES) {
    const values = filterValues[ft.id];
    if (values && values.length > 0) {
      predicates.push({
        dimension: ft.dimension,
        operator: 'matches',
        value: values.join(','),
      });
    }
  }

  if (predicates.length === 0) return undefined;

  return {
    type: 'and',
    predicates,
  };
}
