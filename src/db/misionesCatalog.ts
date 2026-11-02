import { MunicipalityInfo, ProductiveActivityType } from './schema';

export const MISIONES_MUNICIPALITIES: MunicipalityInfo[] = [
  { id: 'obera', name: 'Oberá', department: 'Oberá', lat: -27.4862, lng: -55.1205 },
  { id: 'san_vicente', name: 'San Vicente', department: 'Guaraní', lat: -26.9744, lng: -54.4984 },
  { id: 'leandro_n_alem', name: 'Leandro N. Alem', department: 'Leandro N. Alem', lat: -27.6033, lng: -55.3248 },
  { id: 'eldorado', name: 'Eldorado', department: 'Eldorado', lat: -26.4081, lng: -54.6294 },
  { id: 'aristobulo', name: 'Aristóbulo del Valle', department: 'Cainguás', lat: -27.0945, lng: -54.8967 },
  { id: 'montecarlo', name: 'Montecarlo', department: 'Montecarlo', lat: -26.5684, lng: -54.7578 },
  { id: 'san_pedro', name: 'San Pedro', department: 'San Pedro', lat: -26.6268, lng: -54.1084 },
  { id: 'apostoles', name: 'Apóstoles', department: 'Apóstoles', lat: -27.9134, lng: -55.7558 },
  { id: 'campo_viera', name: 'Campo Viera', department: 'Oberá', lat: -27.3512, lng: -55.0543 },
  { id: 'campo_grande', name: 'Campo Grande', department: 'Cainguás', lat: -27.2064, lng: -54.9812 },
  { id: 'jardin_america', name: 'Jardín América', department: 'San Ignacio', lat: -27.0423, lng: -55.2289 },
  { id: 'puerto_rico', name: 'Puerto Rico', department: 'Libertador Gral. San Martín', lat: -26.7972, lng: -55.0256 },
  { id: 'andresito', name: 'Comandante Andresito', department: 'Gral. Manuel Belgrano', lat: -25.6708, lng: -53.8653 },
  { id: 'san_ignacio', name: 'San Ignacio', department: 'San Ignacio', lat: -27.2568, lng: -55.5348 },
  { id: 'dos_de_mayo', name: 'Dos de Mayo', department: 'Cainguás', lat: -27.0234, lng: -54.6789 },
  { id: 'posadas', name: 'Posadas (Zona Rural / Periurbana)', department: 'Capital', lat: -27.3671, lng: -55.8961 },
  { id: 'wanda', name: 'Colonia Wanda', department: 'Iguazú', lat: -25.9687, lng: -54.5689 },
  { id: 'puerto_esperanza', name: 'Puerto Esperanza', department: 'Iguazú', lat: -26.0234, lng: -54.6543 },
  { id: 'alba_posse', name: 'Alba Posse', department: 'Veinticinco de Mayo', lat: -27.5689, lng: -54.6798 },
  { id: 'veinticinco_de_mayo', name: '25 de Mayo', department: 'Veinticinco de Mayo', lat: -27.3789, lng: -54.7432 },
  { id: 'el_soberbio', name: 'El Soberbio', department: 'Guaraní', lat: -27.2976, lng: -54.1987 },
  { id: 'concepcion_de_la_sierra', name: 'Concepción de la Sierra', department: 'Concepción', lat: -27.9823, lng: -55.5187 },
  { id: 'san_javier', name: 'San Javier', department: 'San Javier', lat: -27.8734, lng: -55.1324 },
  { id: 'bernardo_de_irigoyen', name: 'Bernardo de Irigoyen', department: 'Gral. Manuel Belgrano', lat: -26.2567, lng: -53.6456 }
];

export interface ActivityCatalogItem {
  type: ProductiveActivityType;
  name: string;
  category: string;
  unit: string;
  color: string;
  iconName: string;
  description: string;
  fields: {
    key: string;
    label: string;
    type: 'number' | 'text' | 'select';
    options?: string[];
    unit?: string;
    placeholder?: string;
    helpText?: string;
  }[];
}

export const PRODUCTIVE_ACTIVITIES_CATALOG: ActivityCatalogItem[] = [
  {
    type: 'yerba_mate',
    name: 'Yerba Mate',
    category: 'Cultivo Tradicional',
    unit: 'hectáreas',
    color: '#174C35',
    iconName: 'Leaf',
    description: 'Cultivo emblemático de Misiones. Relevamiento de superficie, rendimiento y manejo agroecológico.',
    fields: [
      { key: 'surfaceHa', label: 'Superficie cultivada (ha)', type: 'number', unit: 'ha', placeholder: 'Ej: 12.5' },
      { key: 'plantationAgeYears', label: 'Edad promedio de la plantación', type: 'number', unit: 'años', placeholder: 'Ej: 15' },
      { key: 'estimatedAnnualProductionKg', label: 'Producción anual estimada (kg hoja verde)', type: 'number', unit: 'kg/año', placeholder: 'Ej: 45000' },
      { 
        key: 'harvestFrequency', 
        label: 'Frecuencia de cosecha', 
        type: 'select', 
        options: ['Zafra gruesa (Abr-Sep)', 'Zafiriña (Dic-Feb)', 'Doble cosecha al año'] 
      },
      { 
        key: 'productiveSystem', 
        label: 'Sistema productivo', 
        type: 'select', 
        options: ['Tradicional a cielo abierto', 'Bajo cubiertas verdes / consociado', 'Agroecológico / Orgánico certificado', 'En curva de nivel'] 
      },
      { 
        key: 'cuttingMethod', 
        label: 'Técnica de corte', 
        type: 'select', 
        options: ['Tijera manual tradicional', 'Tijera eléctrica/neumática', 'Mecanizado autopropulsado'] 
      },
      { 
        key: 'destination', 
        label: 'Destino de la producción', 
        type: 'select', 
        options: ['Secadero cooperativo', 'Secadero privado', 'Molino propio / Marca propia', 'Intermediario / Acopiador'] 
      }
    ]
  },
  {
    type: 'te',
    name: 'Té',
    category: 'Cultivo Tradicional',
    unit: 'hectáreas',
    color: '#27865A',
    iconName: 'Coffee',
    description: 'Misiones concentra más del 90% del té argentino. Cosecha mecanizada y exportación.',
    fields: [
      { key: 'surfaceHa', label: 'Superficie cultivada (ha)', type: 'number', unit: 'ha', placeholder: 'Ej: 8' },
      { key: 'teaType', label: 'Tipo de plantación', type: 'select', options: ['Clonal mejorado', 'Semilla / Tradicional', 'Mixto'] },
      { key: 'estimatedHarvestKg', label: 'Rendimiento estimado (kg brote verde)', type: 'number', unit: 'kg/año', placeholder: 'Ej: 32000' },
      { key: 'harvestType', label: 'Tipo de cosecha', type: 'select', options: ['Cosechadora mecánica autopropulsada', 'Cosechadora de arrastre', 'Manual'] },
      { key: 'destination', label: 'Destino de entrega', type: 'select', options: ['Secadero elaborador de té negro', 'Té verde gourmet', 'Cooperativa local'] }
    ]
  },
  {
    type: 'tabaco',
    name: 'Tabaco',
    category: 'Cultivo Industrial',
    unit: 'hectáreas',
    color: '#E9A23B',
    iconName: 'Flame',
    description: 'Tradición de pequeños productores familiares, especialmente Burley y Criollo misionero.',
    fields: [
      { key: 'surfaceHa', label: 'Superficie cultivada (ha)', type: 'number', unit: 'ha', placeholder: 'Ej: 2.5' },
      { key: 'tobaccoVariety', label: 'Variedad', type: 'select', options: ['Burley', 'Criollo Misionero', 'Virginia'] },
      { key: 'plantsCount', label: 'Cantidad aproximada de plantas', type: 'number', unit: 'plantas', placeholder: 'Ej: 30000' },
      { key: 'guildAssociation', label: 'Gremio / Asociación', type: 'select', options: ['APTM', 'ACTIM', 'Cámara del Tabaco', 'Independiente'] },
      { key: 'curingBarnCondition', label: 'Estado del galpón de secado', type: 'select', options: ['Óptimo con ventilación', 'Regular', 'Requiere mejoras de estructura'] }
    ]
  },
  {
    type: 'horticultura',
    name: 'Horticultura & Verduras',
    category: 'Alimentos Frescos',
    unit: 'metros lineales / ha',
    color: '#10B981',
    iconName: 'Carrot',
    description: 'Abastecimiento de Ferias Francas y mercados concentradores zonales.',
    fields: [
      { key: 'surfaceM2', label: 'Superficie total hortícola (m² o ha)', type: 'number', unit: 'm²', placeholder: 'Ej: 5000' },
      { key: 'crops', label: 'Principales cultivos', type: 'text', placeholder: 'Ej: Lechuga, tomate, morrón, acelga, cebollita' },
      { key: 'productionMode', label: 'Modalidad de producción', type: 'select', options: ['Bajo invernadero / cubierta plástica', 'A campo abierto', 'Mixto (campo e invernáculo)', 'Hidroponía'] },
      { key: 'irrigationType', label: 'Sistema de riego instalado', type: 'select', options: ['Goteo automatizado', 'Goteo manual', 'Aspersión / Microaspersión', 'Manguera / Riego manual'] },
      { key: 'commercialization', label: 'Canal de venta principal', type: 'select', options: ['Feria Franca local', 'Mercado Concentrador Zonal', 'Venta en finca / Local', 'Verdulerías locales'] }
    ]
  },
  {
    type: 'ganaderia_bovina',
    name: 'Ganadería Bovina',
    category: 'Producción Pecuaria',
    unit: 'cabezas',
    color: '#854D0E',
    iconName: 'ShieldAlert',
    description: 'Bovinos adaptados al calor subtropical: Brangus, Braford, pasturas cultivadas y silvopastoreo.',
    fields: [
      { key: 'totalHeadCount', label: 'Cantidad total de animales (cabezas)', type: 'number', unit: 'cabezas', placeholder: 'Ej: 45' },
      { key: 'cattleCategory', label: 'Orientación productiva', type: 'select', options: ['Cría', 'Engorde / Invernada', 'Ciclo completo', 'Tambo / Producción de leche y quesos'] },
      { key: 'breeds', label: 'Razas predominantes', type: 'text', placeholder: 'Ej: Brangus, Braford, Nelore, Criollo' },
      { key: 'pastureSurfaceHa', label: 'Superficie de pasturas (ha)', type: 'number', unit: 'ha', placeholder: 'Ej: 20' },
      { key: 'silvopastoralSystem', label: '¿Integra sistema silvopastoril con árboles?', type: 'select', options: ['Sí, con pino o eucalipto', 'Sí, con monte nativo', 'No, potrero abierto tradicional'] },
      { key: 'sanitaryPlan', label: 'Plan sanitario al día (Fiebre aftosa/Brucelosis)', type: 'select', options: ['Al día con SENASA', 'Pendiente de vacunación', 'En trámite de regularización'] }
    ]
  },
  {
    type: 'piscicultura',
    name: 'Piscicultura',
    category: 'Acuicultura',
    unit: 'estanques',
    color: '#0284C7',
    iconName: 'Fish',
    description: 'Cultivo de peces en estanques excavados en tierra colorada con agua de vertiente.',
    fields: [
      { key: 'pondsCount', label: 'Cantidad de estanques activos', type: 'number', unit: 'estanques', placeholder: 'Ej: 3' },
      { key: 'waterSurfaceM2', label: 'Superficie de espejo de agua (m²)', type: 'number', unit: 'm²', placeholder: 'Ej: 2500' },
      { key: 'species', label: 'Especies cultivadas', type: 'text', placeholder: 'Ej: Pacú, Sábalo, Carpa común, Carpa herbívora, Tilapia' },
      { key: 'harvestEstimatedKg', label: 'Cosecha anual estimada (kg)', type: 'number', unit: 'kg/año', placeholder: 'Ej: 4000' },
      { key: 'waterSupply', label: 'Fuente de abastecimiento de agua', type: 'select', options: ['Vertiente natural protegida', 'Arroyo encauzado', 'Represa de retención pluvial'] }
    ]
  },
  {
    type: 'porcicultura',
    name: 'Porcicultura',
    category: 'Producción Pecuaria',
    unit: 'animales',
    color: '#D97706',
    iconName: 'PiggyBank',
    description: 'Producción de carne porcina, lechones y chacinados artesanales.',
    fields: [
      { key: 'totalSwineCount', label: 'Cantidad de madres y lechones', type: 'number', unit: 'animales', placeholder: 'Ej: 18' },
      { key: 'swineSystem', label: 'Sistema de crianza', type: 'select', options: ['A campo con piquetes', 'Confinado en tinglado', 'Mixto'] },
      { key: 'effluentTreatment', label: 'Tratamiento de efluentes', type: 'select', options: ['Biodigestor / Biogás', 'Laguna de decantación', 'Compostaje', 'Sin tratamiento específico'] }
    ]
  },
  {
    type: 'avicultura',
    name: 'Avicultura',
    category: 'Producción Pecuaria',
    unit: 'aves',
    color: '#CA8A04',
    iconName: 'Egg',
    description: 'Producción de huevos de campo, gallinas camperas y pollos parrilleros.',
    fields: [
      { key: 'birdsCount', label: 'Cantidad de aves', type: 'number', unit: 'aves', placeholder: 'Ej: 350' },
      { key: 'poultryType', label: 'Orientación', type: 'select', options: ['Huevos para consumo (Gallinas ponedoras)', 'Pollos parrilleros de carne', 'Aves camperas doble propósito'] },
      { key: 'housingSystem', label: 'Alojamiento', type: 'select', options: ['Galpón cerrado con comederos', 'Pastoreo diurno / Semipastoreo', 'Gallinero tradicional'] }
    ]
  },
  {
    type: 'forestacion',
    name: 'Forestación & Madera',
    category: 'Silvicultura',
    unit: 'hectáreas',
    color: '#065F46',
    iconName: 'Trees',
    description: 'Cultivo de especies leñosas comerciales y conservación de selva paranaense.',
    fields: [
      { key: 'forestSurfaceHa', label: 'Superficie forestada (ha)', type: 'number', unit: 'ha', placeholder: 'Ej: 25' },
      { key: 'species', label: 'Especies principales', type: 'select', options: ['Pino Taeda / Elliotti', 'Eucalipto Grandis', 'Araucaria / Pino Paraná (Nativo)', 'Paraíso / Kiri', 'Mixto'] },
      { key: 'standAgeYears', label: 'Edad promedio de la masa forestal', type: 'number', unit: 'años', placeholder: 'Ej: 8' },
      { key: 'fireDefensePlan', label: '¿Cuenta con cortafuegos limpios?', type: 'select', options: ['Sí, cortafuegos perimetrales mantenidos', 'Parcialmente', 'No cuenta'] }
    ]
  },
  {
    type: 'apicultura',
    name: 'Apicultura & Meliponicultura',
    category: 'Producción Agroecológica',
    unit: 'colmenas',
    color: '#B45309',
    iconName: 'Hexagon',
    description: 'Producción de miel de monte nativo y mieles de abejas nativas sin aguijón (Yateí).',
    fields: [
      { key: 'hivesCount', label: 'Cantidad de colmenas activas', type: 'number', unit: 'colmenas', placeholder: 'Ej: 25' },
      { key: 'beeType', label: 'Especie de abeja', type: 'select', options: ['Apis mellifera (Abeja común)', 'Meliponas nativas / Yateí (Tetragonisca fiebrigi)', 'Ambas especies'] },
      { key: 'honeyYieldKg', label: 'Producción anual estimada (kg de miel)', type: 'number', unit: 'kg/año', placeholder: 'Ej: 450' },
      { key: 'extractionRoom', label: 'Sala de extracción', type: 'select', options: ['Sala comunitaria habilitada', 'Sala propia habilitada', 'Extracción artesanal en finca'] }
    ]
  },
  {
    type: 'fruticultura',
    name: 'Fruticultura Tropical & Subtropical',
    category: 'Frutas',
    unit: 'hectáreas',
    color: '#EA580C',
    iconName: 'Apple',
    description: 'Mamón, maracuyá, bananas, cítricos, paltas y ananá.',
    fields: [
      { key: 'fruitSurfaceHa', label: 'Superficie destinada (ha)', type: 'number', unit: 'ha', placeholder: 'Ej: 3' },
      { key: 'fruitSpecies', label: 'Frutas cultivadas', type: 'text', placeholder: 'Ej: Mamón (para dulce), Maracuyá, Mandarinas, Banana, Palta' },
      { key: 'destination', label: 'Destino', type: 'select', options: ['Consumo fresco en ferias/mercados', 'Fábricas de dulces y confitados', 'Embalaje para exportación'] }
    ]
  },
  {
    type: 'cultivos_industriales',
    name: 'Cultivos Industriales (Jengibre, Cúrcuma, Mandioca)',
    category: 'Especialidades',
    unit: 'hectáreas',
    color: '#84CC16',
    iconName: 'Boxes',
    description: 'Especialidades misioneras de alto valor agregado y almidón de mandioca.',
    fields: [
      { key: 'industrialCrops', label: 'Cultivos sembrados', type: 'text', placeholder: 'Ej: Jengibre orgánico, Cúrcuma, Mandioca industrial' },
      { key: 'surfaceHa', label: 'Superficie (ha)', type: 'number', unit: 'ha', placeholder: 'Ej: 4' },
      { key: 'destination', label: 'Destino', type: 'select', options: ['Fábrica de fécula/almidón de mandioca', 'Mercado de especias deshidratadas', 'Venta en fresco mercado central'] }
    ]
  }
];
