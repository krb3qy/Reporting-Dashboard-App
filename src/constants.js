export const UVA_COLORS = {
  blue: '#232D4B',
  orange: '#E57200',
  gray: '#4D4D4F',
  lightGray: '#F1F1F1',
  cyan: '#00B5E2',
  turquoise: '#009F89',
  yellow: '#F8B500',
  red: '#EF3F6B',
};

export const CHART_COLORS = [
  UVA_COLORS.blue,
  UVA_COLORS.orange,
  UVA_COLORS.cyan,
  UVA_COLORS.turquoise,
  UVA_COLORS.yellow,
  UVA_COLORS.red,
];

export const AVAILABLE_RAW_METRICS = [
  'nOffered', 'tAnswered', 'tTalk', 'tHold', 'tAcw', 'nAbandoned',
  'tWait', 'tHandle', 'nTransferred', 'tAlert',
];

export const FILTER_TYPES = [
  { id: 'queues', label: 'Queues', iconName: 'Activity' },
  { id: 'divisions', label: 'Divisions', iconName: 'Globe' },
  { id: 'mediaTypes', label: 'Media Type', iconName: 'Phone' },
];
