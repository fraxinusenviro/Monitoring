// ════════════════════════════════════════════════════════════
//  EnviroLog — Configuration & Default Parameters
// ════════════════════════════════════════════════════════════

export const OBSERVATION_TYPES = [
  {
    id: 'dust-air',
    label: 'Dust & Air Quality',
    color: '#f59e0b',
    description: 'Visible dust, PM levels, emission sources, suppression measures',
    prompts: [
      'Is dust suppression (water cart, screens, covers) operating effectively?',
      'Visible dust leaving the site boundary or affecting sensitive receptors?',
      'Are all stockpiles and exposed surfaces adequately stabilised?',
      'Complaints received regarding dust or air quality?',
      'Is all plant and equipment fitted with required emission controls?',
    ],
  },
  {
    id: 'stormwater',
    label: 'Erosion & Sediment Control',
    color: '#3b82f6',
    description: 'Erosion & sediment controls, silt fencing, sediment basins, runoff management',
    prompts: [
      'All erosion and sediment control BMPs installed and in good condition?',
      'Sediment escaping site boundary or reaching waterways?',
      'Erosion protection on all disturbed areas (mulch, hydroseed, cover)?',
      'Dewatering discharge treated and compliant with discharge criteria?',
      'Sediment basin/trap capacity and condition adequate?',
    ],
  },
  {
    id: 'noise',
    label: 'Noise & Vibration',
    color: '#8b5cf6',
    description: 'Construction noise, vibration monitoring, hours compliance',
    prompts: [
      'Works within permitted construction hours?',
      'Noisy plant and equipment fitted with appropriate silencers?',
      'Vibration monitoring conducted where required?',
      'Complaints received from neighbours or sensitive receptors?',
      'Noise management plan being followed?',
    ],
  },
  {
    id: 'waste',
    label: 'Waste Management',
    color: '#6b7280',
    description: 'Waste bins, recycling, illegal dumping, disposal compliance',
    prompts: [
      'Adequate waste bin capacity on site?',
      'Correct segregation of waste streams (general, recyclable, hazardous)?',
      'Waste tracking and manifests up to date?',
      'No evidence of illegal dumping or burning?',
      'Waste disposed of at licensed/approved facilities?',
    ],
  },
  {
    id: 'vegetation',
    label: 'Vegetation & Habitat',
    color: '#16a34a',
    description: 'Tree protection zones, clearing limits, habitat protection, revegetation',
    prompts: [
      'Tree protection zone (TPZ) fencing intact and undamaged?',
      'No clearing beyond approved limits?',
      'Retained vegetation protected from soil compaction and mechanical damage?',
      'Revegetation and rehabilitation works progressing as scheduled?',
      'Weed management being undertaken in disturbed areas?',
    ],
  },
  {
    id: 'water',
    label: 'Watercourses & Waterbodies',
    color: '#0ea5e9',
    description: 'Waterway protection, turbidity, buffer zones, dewatering compliance',
    prompts: [
      'No turbid or polluted discharge entering watercourses or waterbodies?',
      'Riparian buffer zones maintained and respected?',
      'Works near or within watercourses compliant with approval conditions?',
      'Dewatering managed to prevent adverse impacts on waterways?',
      'Water quality monitoring conducted as required?',
    ],
  },
  {
    id: 'wetlands',
    label: 'Wetlands',
    color: '#0891b2',
    description: 'Wetland protection zones, hydrology, vegetation, buffer compliance',
    prompts: [
      'Wetland exclusion zones and buffer distances maintained?',
      'No disturbance to wetland vegetation or substrate?',
      'Wetland hydrology not altered (inflows/outflows unobstructed)?',
      'Sediment and stormwater runoff prevented from entering wetlands?',
      'All works within wetland buffer compliant with approval conditions?',
    ],
  },
  {
    id: 'spill',
    label: 'Spill / Contamination',
    color: '#ef4444',
    description: 'Fuel, chemicals, concrete washout, spill kits, containment',
    prompts: [
      'Spill kits accessible, stocked and staff trained in their use?',
      'Fuelling areas and chemical storage adequately bunded?',
      'Concrete washout contained and not discharged to environment?',
      'Any spill incidents occurred? Reported and remediated?',
      'Contaminated material managed and disposed of correctly?',
    ],
  },
  {
    id: 'wildlife',
    label: 'Wildlife',
    color: '#84cc16',
    description: 'Fauna sightings, exclusion fencing, pre-clearance, trench safety',
    prompts: [
      'Any fauna sightings noted during works?',
      'Exclusion and fauna-proof fencing intact and effective?',
      'Pre-clearance surveys completed prior to vegetation clearing?',
      'Open trenches and excavations covered or fenced overnight?',
      'Any fauna in distress or injured — wildlife rescue contact made?',
    ],
  },
  {
    id: 'species',
    label: 'Species of Concern',
    color: '#10b981',
    description: 'Threatened species, critical habitat, ecological monitors, unexpected finds',
    prompts: [
      'Any threatened species, individuals or critical habitat features observed?',
      'Species-specific management measures in place and being implemented?',
      'Ecologist on site as required by approval conditions?',
      'Works exclusion zones for sensitive species maintained and effective?',
      'Unexpected find protocol activated if required?',
    ],
  },
  {
    id: 'hazmat',
    label: 'Hazardous Materials',
    color: '#dc2626',
    description: 'Chemical storage, handling, SDS/MSDS compliance, labelling',
    prompts: [
      'All chemicals correctly labelled and stored in designated areas?',
      'Safety Data Sheet (SDS) register current and accessible?',
      'No unauthorised substances present on site?',
      'Hazardous materials handling compliant with approval conditions?',
      'Staff trained in safe handling of hazardous materials?',
    ],
  },
  {
    id: 'traffic',
    label: 'Traffic & Site Safety',
    color: '#d97706',
    description: 'Site access, hoarding, pedestrian safety, signage, lighting',
    prompts: [
      'Hoarding and perimeter fencing in good condition?',
      'Pedestrian pathways safe, signed and unobstructed?',
      'Traffic management plan being followed?',
      'Adequate signage, lighting and line marking in place?',
      'Site access and egress points controlled and safe?',
    ],
  },
  {
    id: 'heritage',
    label: 'Cultural Heritage',
    color: '#a855f7',
    description: 'Heritage items, unexpected finds, exclusion zones, monitors',
    prompts: [
      'Heritage exclusion zones maintained and clearly marked?',
      'Any unexpected heritage finds during excavation or earthworks?',
      'Heritage monitors on site as required by conditions?',
      'Works stop protocol ready to activate if find encountered?',
      'Heritage management plan available and followed?',
    ],
  },
  {
    id: 'general',
    label: 'General Site Conditions',
    color: '#64748b',
    description: 'Overall compliance, site housekeeping, weather impacts',
    prompts: [
      'Site housekeeping satisfactory?',
      'Safety signage visible, current and in good condition?',
      'Site supervisor available and responsive?',
      'Any weather events impacting compliance or site conditions?',
      'All approval conditions being met?',
    ],
  },
];

// Store default prompts for each type so custom settings can be reset
OBSERVATION_TYPES.forEach(t => { t._defaultPrompts = [...t.prompts]; });

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
