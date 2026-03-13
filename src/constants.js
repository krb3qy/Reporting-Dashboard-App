// UVA Health Official Brand Colors
export const UVA_COLORS = {
  // Primary
  blue: '#232D4B',
  orange: '#E57200',
  gray: '#4D4D4F',
  white: '#FFFFFF',

  // Secondary
  cyan: '#009FDF',
  cyan75: '#40B7E7',
  cyan50: '#7FCFEF',
  cyan25: '#BFE7F7',
  turquoise: '#25CAD3',
  turquoise75: '#5CD7DE',
  yellow: '#FDDA24',
  yellow75: '#FEE35B',
  red: '#EF3F6B',
  red75: '#F36F90',
  green: '#62BB46',
  green75: '#89CC74',
};

// Chart color sequence — UVA brand compliant, high contrast
export const CHART_COLORS = [
  UVA_COLORS.blue,
  UVA_COLORS.orange,
  UVA_COLORS.cyan,
  UVA_COLORS.turquoise,
  UVA_COLORS.green,
  UVA_COLORS.red,
  UVA_COLORS.yellow,
  UVA_COLORS.cyan75,
  UVA_COLORS.turquoise75,
  UVA_COLORS.green75,
  UVA_COLORS.red75,
  UVA_COLORS.yellow75,
];

// Full list of valid conversation aggregate metrics from the GC Analytics API
// Source: API error response listing all valid ConversationAggregateMetric values
export const AVAILABLE_RAW_METRICS = [
  'nBlindTransferred',
  'nBotInteractions',
  'nCobrowseSessions',
  'nConnected',
  'nConsult',
  'nConsultTransferred',
  'nConversations',
  'nError',
  'nOffered',
  'nOutbound',
  'nOutboundAbandoned',
  'nOutboundAttempted',
  'nOutboundConnected',
  'nOverSla',
  'nStateTransitionError',
  'nTransferred',
  'oAudioMessageCount',
  'oExternalAudioMessageCount',
  'oExternalMediaCount',
  'oMediaCount',
  'oMessageCount',
  'oMessageSegmentCount',
  'oMessageTurn',
  'oServiceLevel',
  'oServiceTarget',
  'tAbandon',
  'tAcd',
  'tActiveCallback',
  'tActiveCallbackComplete',
  'tAcw',
  'tAgentResponseTime',
  'tAgentVideoConnected',
  'tAlert',
  'tAnswered',
  'tAverageAgentResponseTime',
  'tAverageCustomerResponseTime',
  'tBarging',
  'tCoaching',
  'tCoachingComplete',
  'tConnected',
  'tContacting',
  'tDialing',
  'tFirstConnect',
  'tFirstDial',
  'tFirstEngagement',
  'tFirstResponse',
  'tFlowOut',
  'tHandle',
  'tHeld',
  'tHeldComplete',
  'tIvr',
  'tMonitoring',
  'tMonitoringComplete',
  'tNotResponding',
  'tPark',
  'tParkComplete',
  'tScreenMonitoring',
  'tShortAbandon',
  'tSnippetRecord',
  'tTalk',
  'tTalkComplete',
  'tUserResponseTime',
  'tVoicemail',
  'tWait',
];

// Metrics sent in the API query body — core set for dashboard use
// All names validated against GC ConversationAggregateMetric enum
export const API_QUERY_METRICS = [
  'nOffered', 'nConnected', 'nConversations', 'nTransferred',
  'nBlindTransferred', 'nConsultTransferred', 'nConsult',
  'nOutbound', 'nOutboundAttempted', 'nOutboundConnected', 'nOutboundAbandoned',
  'nError', 'nOverSla', 'nCobrowseSessions',
  'oServiceLevel', 'oServiceTarget',
  'tAbandon', 'tAcd', 'tAcw', 'tAlert', 'tAnswered',
  'tConnected', 'tContacting', 'tDialing',
  'tFirstConnect', 'tFlowOut', 'tHandle', 'tHeld', 'tHeldComplete',
  'tIvr', 'tNotResponding', 'tShortAbandon',
  'tTalk', 'tTalkComplete', 'tVoicemail', 'tWait',
  'tAgentResponseTime', 'tUserResponseTime',
];

// Filter definitions — maps UI filter IDs to GC Analytics API dimensions
// "searchable" filters get a typeahead search box; others get chip toggles
export const FILTER_TYPES = [
  { id: 'queues',         label: 'Queues',           dimension: 'queueId',                 searchable: true,  iconName: 'Headphones' },
  { id: 'divisions',      label: 'Divisions',        dimension: 'divisionId',              searchable: true,  iconName: 'Building2' },
  { id: 'mediaTypes',     label: 'Media Type',       dimension: 'mediaType',               searchable: false, iconName: 'Radio' },
  { id: 'direction',      label: 'Direction',        dimension: 'direction',               searchable: false, iconName: 'ArrowLeftRight' },
  { id: 'wrapUpCode',     label: 'Wrap-up Code',     dimension: 'wrapUpCode',              searchable: true,  iconName: 'Tag' },
  { id: 'skills',         label: 'Skills',           dimension: 'requestedRoutingSkillId', searchable: true,  iconName: 'Zap' },
  { id: 'users',          label: 'Agents',           dimension: 'userId',                  searchable: true,  iconName: 'User' },
  { id: 'dnis',           label: 'DNIS',             dimension: 'dnis',                    searchable: true,  iconName: 'Phone' },
  { id: 'ani',            label: 'ANI',              dimension: 'ani',                     searchable: true,  iconName: 'PhoneIncoming' },
  { id: 'disconnectType', label: 'Disconnect Type',  dimension: 'disconnectType',          searchable: false, iconName: 'PhoneOff' },
  { id: 'interactionType',label: 'Interaction Type', dimension: 'interactionType',         searchable: false, iconName: 'MessageSquare' },
  { id: 'usedRouting',    label: 'Routing Method',   dimension: 'usedRouting',             searchable: false, iconName: 'GitBranch' },
];

// Static option sets for non-searchable filters
export const STATIC_FILTER_OPTIONS = {
  mediaTypes: ['voice', 'callback', 'chat', 'email', 'message'],
  direction: ['inbound', 'outbound'],
  disconnectType: ['client', 'system', 'transfer', 'peer', 'endpoint', 'timeout', 'other'],
  interactionType: ['call', 'callback', 'chat', 'cobrowse', 'email', 'message', 'screenshare', 'video'],
  usedRouting: ['bullseye', 'conditional', 'direct', 'last', 'manual', 'predictive', 'preferred', 'standard', 'vip'],
};
