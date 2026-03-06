// ════════════════════════════════════════════════════════════
//  EnviroLog — Configuration & Default Parameters
// ════════════════════════════════════════════════════════════

export const OBSERVATION_TYPES = [
  {
    id: 'dust-air',
    label: 'Dust & Air Quality',
    color: '#f59e0b',
    description: 'Visible dust, PM levels, emission sources, suppression measures',
    prompts: ['Is dust suppression (water cart, screens) operating?', 'Visible dust leaving the site boundary?', 'Complaints received?'],
  },
  {
    id: 'stormwater',
    label: 'Stormwater & Erosion',
    color: '#3b82f6',
    description: 'BMPs, silt fencing, sediment basins, runoff control measures',
    prompts: ['All BMPs installed and in good condition?', 'Sediment leaving site or reaching waterways?', 'Dewatering discharge compliant?'],
  },
  {
    id: 'noise',
    label: 'Noise & Vibration',
    color: '#8b5cf6',
    description: 'Construction noise, vibration monitoring, hours compliance',
    prompts: ['Works within permitted hours?', 'Noisy plant fitted with silencers?', 'Complaints received from neighbours?'],
  },
  {
    id: 'waste',
    label: 'Waste Management',
    color: '#6b7280',
    description: 'Waste bins, recycling, illegal dumping, disposal compliance',
    prompts: ['Adequate bin capacity on site?', 'Segregation of waste streams correct?', 'Waste manifests up to date?'],
  },
  {
    id: 'vegetation',
    label: 'Vegetation & Trees',
    color: '#16a34a',
    description: 'Tree protection zones, clearing limits, revegetation',
    prompts: ['TPZ fencing intact and undamaged?', 'No clearing beyond approved limits?', 'Revegetation works progressing as scheduled?'],
  },
  {
    id: 'water',
    label: 'Water Bodies',
    color: '#0ea5e9',
    description: 'Turbidity, drainage, dewatering, waterway protection',
    prompts: ['No turbid discharge entering waterways?', 'Buffer zones maintained?', 'Dewatering pumps operating correctly?'],
  },
  {
    id: 'spill',
    label: 'Spill / Contamination',
    color: '#ef4444',
    description: 'Fuel, chemicals, concrete washout, spill kits',
    prompts: ['Spill kits accessible and stocked?', 'Fuelling and chemical storage bunded?', 'Concrete washout contained?'],
  },
  {
    id: 'wildlife',
    label: 'Wildlife & Habitat',
    color: '#84cc16',
    description: 'Fauna sightings, habitat impacts, nest protection, exclusion fencing',
    prompts: ['Any fauna sightings noted?', 'Exclusion fencing intact?', 'Clearing compliant with pre-clearance survey requirements?'],
  },
  {
    id: 'hazmat',
    label: 'Hazardous Materials',
    color: '#dc2626',
    description: 'Chemical storage, handling, SDS/MSDS compliance, labelling',
    prompts: ['All chemicals correctly labelled and stored?', 'SDS register current and accessible?', 'No unauthorised substances on site?'],
  },
  {
    id: 'traffic',
    label: 'Traffic & Site Safety',
    color: '#d97706',
    description: 'Site access, hoarding, pedestrian safety, signage, lighting',
    prompts: ['Hoarding/fencing in good condition?', 'Pedestrian pathways safe and unobstructed?', 'Traffic management plan being followed?'],
  },
  {
    id: 'heritage',
    label: 'Cultural Heritage',
    color: '#a855f7',
    description: 'Heritage items, unexpected finds, exclusion zones',
    prompts: ['Heritage exclusion zones maintained?', 'Any unexpected finds during excavation?', 'Heritage monitors on site as required?'],
  },
  {
    id: 'general',
    label: 'General Site Conditions',
    color: '#64748b',
    description: 'Overall compliance, site housekeeping, weather impacts',
    prompts: ['Site housekeeping satisfactory?', 'Safety signage visible and current?', 'Site supervisor available and responsive?'],
  },
];

export const STATUS_TYPES = [
  { id: 'compliant',     label: 'Compliant',     color: '#16a34a', bg: '#dcfce7', short: 'C' },
  { id: 'non-compliant', label: 'Non-Compliant',  color: '#dc2626', bg: '#fee2e2', short: 'NC' },
  { id: 'advisory',      label: 'Advisory',       color: '#d97706', bg: '#fef3c7', short: 'A' },
  { id: 'observation',   label: 'Observation',    color: '#2563eb', bg: '#dbeafe', short: 'O' },
];

export const WEATHER_OPTIONS = [
  'Clear / Sunny',
  'Partly Cloudy',
  'Overcast',
  'Light Rain',
  'Heavy Rain',
  'Thunderstorm',
  'Fog / Mist',
  'Strong Wind',
  'Hail',
  'Snow',
];

export const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'Variable', 'Calm'];

export function getType(id) {
  return OBSERVATION_TYPES.find(t => t.id === id) || OBSERVATION_TYPES[OBSERVATION_TYPES.length - 1];
}

export function getStatus(id) {
  return STATUS_TYPES.find(s => s.id === id) || STATUS_TYPES[0];
}

export const DEFAULT_PROJECT = {
  name: 'My Construction Project',
  number: '',
  address: '',
  contractor: '',
  client: '',
  inspector: '',
  approvalRef: '',
  logo: null,
};
