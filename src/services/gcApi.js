import { getToken } from './gcAuth';

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
 * Query conversation aggregates.
 * @param {Object} params - { interval, granularity, groupBy, filter }
 */
export async function queryConversationAggregates({ interval, granularity, groupBy, filter }) {
  const body = {
    interval,
    granularity,
    groupBy,
    filter,
    metrics: [
      'nOffered', 'tAnswered', 'tTalk', 'tHold', 'tAcw',
      'nAbandoned', 'tWait', 'tHandle', 'nTransferred', 'tAlert',
    ],
  };

  return gcFetch('/api/v2/analytics/conversations/aggregates/query', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Get list of queues (for filter options).
 */
export async function getQueues(pageSize = 100) {
  return gcFetch(`/api/v2/routing/queues?pageSize=${pageSize}`);
}

/**
 * Get list of divisions (for filter options).
 */
export async function getDivisions(pageSize = 100) {
  return gcFetch(`/api/v2/authorization/divisions?pageSize=${pageSize}`);
}

/**
 * Build a filter object for the aggregates query from the UI filter state.
 */
export function buildAggregateFilter(filterValues) {
  const predicates = [];

  if (filterValues.queues?.length > 0) {
    predicates.push({
      dimension: 'queueId',
      operator: 'matches',
      value: filterValues.queues.join(','),
    });
  }

  if (filterValues.divisions?.length > 0) {
    predicates.push({
      dimension: 'divisionId',
      operator: 'matches',
      value: filterValues.divisions.join(','),
    });
  }

  if (filterValues.mediaTypes?.length > 0) {
    predicates.push({
      dimension: 'mediaType',
      operator: 'matches',
      value: filterValues.mediaTypes.join(','),
    });
  }

  if (predicates.length === 0) return undefined;

  return {
    type: 'and',
    predicates,
  };
}
