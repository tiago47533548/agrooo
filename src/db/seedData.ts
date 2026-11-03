import { db } from './dexieDb';
import { 
  Producer, 
  DynamicQuestionnaire, 
  Invitation, 
  UserProfile, 
  NotificationItem, 
  AuditLog 
} from './schema';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-admin-tiago',
    email: 'tiagorodirguez091@gmail.com',
    fullName: 'Tiago Rodríguez',
    role: 'ADMINISTRADOR',
    dni: '41205948',
    phone: '+54 376 450-8912',
    active: true,
    approvalStatus: 'approved',
    authProvider: 'google',
    emailVerified: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'user-admin-tiago-alt',
    email: 'tiagorodriguez091@gmail.com',
    fullName: 'Tiago Rodríguez',
    role: 'ADMINISTRADOR',
    dni: '41205948',
    phone: '+54 376 450-8912',
    active: true,
    approvalStatus: 'approved',
    authProvider: 'google',
    emailVerified: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'user-admin-magno',
    email: 'magnoleonrossi@gmail.com',
    fullName: 'Magno León Rossi',
    role: 'ADMINISTRADOR',
    dni: '39482104',
    phone: '+54 376 422-9014',
    active: true,
    approvalStatus: 'approved',
    authProvider: 'google',
    emailVerified: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'user-tecnico-acelerados',
    email: 'acelerados.misiones@gmail.com',
    fullName: 'Técnico Zonal Acelerados Misiones',
    role: 'TECNICO',
    dni: '35194820',
    phone: '+54 3755 49-3320',
    assignedMunicipalities: ['obera', 'campo_viera', 'leandro_n_alem', 'san_vicente', 'posadas'],
    active: true,
    approvalStatus: 'approved',
    authProvider: 'google',
    emailVerified: true,
    createdAt: '2026-01-12T08:00:00Z',
    updatedAt: '2026-01-12T08:00:00Z'
  },
  {
    id: 'user-tecnico-prueba',
    email: 'tecnico.prueba@agro.misiones.gob.ar',
    fullName: 'Técnico Zonal Acelerados Misiones',
    role: 'TECNICO',
    dni: '35194820',
    phone: '+54 3755 49-3320',
    assignedMunicipalities: ['obera', 'campo_viera', 'leandro_n_alem', 'san_vicente', 'posadas'],
    active: true,
    approvalStatus: 'approved',
    authProvider: 'password',
    emailVerified: true,
    createdAt: '2026-01-12T08:00:00Z',
    updatedAt: '2026-01-12T08:00:00Z'
  },
  {
    id: 'user-superadmin-1',
    email: 'admin@agro.misiones.gob.ar',
    fullName: 'Ing. Carlos Rovira (Superadmin)',
    role: 'SUPERADMIN',
    dni: '24185930',
    phone: '+54 376 444-7200',
    active: true,
    approvalStatus: 'approved',
    authProvider: 'google',
    emailVerified: true,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'user-admin-1',
    email: 'marina.santos@agro.misiones.gob.ar',
    fullName: 'Lic. Marina Santos',
    role: 'ADMINISTRADOR',
    dni: '29841203',
    phone: '+54 376 443-1890',
    active: true,
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-02-01T09:00:00Z'
  },
  {
    id: 'user-director-1',
    email: 'facundo.lopez@agro.misiones.gob.ar',
    fullName: 'Dr. Facundo López Sartori',
    role: 'DIRECTOR',
    dni: '22910482',
    phone: '+54 376 444-7210',
    active: true,
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-02-10T10:00:00Z'
  },
  {
    id: 'user-tecnico-1',
    email: 'juan.benitez@campo.misiones.gob.ar',
    fullName: 'Téc. Agrónomo Juan Benítez',
    role: 'TECNICO',
    dni: '34892110',
    phone: '+54 3755 62-1144',
    assignedMunicipalities: ['obera', 'campo_viera', 'leandro_n_alem'],
    active: true,
    createdAt: '2026-02-15T08:30:00Z',
    updatedAt: '2026-02-15T08:30:00Z'
  },
  {
    id: 'user-supervisor-1',
    email: 'maria.fontana@agro.misiones.gob.ar',
    fullName: 'Ing. María Fontana',
    role: 'SUPERVISOR',
    dni: '28441920',
    phone: '+54 3755 45-8820',
    assignedMunicipalities: ['obera', 'san_vicente', 'aristobulo', 'san_pedro'],
    active: true,
    createdAt: '2026-02-12T11:00:00Z',
    updatedAt: '2026-02-12T11:00:00Z'
  }
];

export const INITIAL_INVITATIONS: Invitation[] = [
  {
    id: 'inv-1',
    code: 'TECNICO-OBER-2026',
    role: 'TECNICO',
    maxUses: 15,
    usedCount: 3,
    expiresAt: '2027-12-31T23:59:59Z',
    status: 'activa',
    createdBy: 'user-admin-1',
    createdByName: 'Lic. Marina Santos',
    createdAt: '2026-02-20T10:00:00Z',
    notes: 'Convocatoria de técnicos territoriales cuenca centro Oberá / Campo Viera'
  },
  {
    id: 'inv-2',
    code: 'SUPERVISOR-URUGUAY',
    role: 'SUPERVISOR',
    maxUses: 3,
    usedCount: 1,
    expiresAt: '2027-06-30T23:59:59Z',
    status: 'activa',
    createdBy: 'user-superadmin-1',
    createdByName: 'Ing. Carlos Rovira',
    createdAt: '2026-03-01T11:00:00Z',
    notes: 'Supervisores para fiscalización del Alto Uruguay'
  },
  {
    id: 'inv-3',
    code: 'DIRECTOR-ESTADISTICA',
    role: 'DIRECTOR',
    maxUses: 1,
    usedCount: 0,
    expiresAt: '2027-04-30T23:59:59Z',
    status: 'activa',
    createdBy: 'user-superadmin-1',
    createdByName: 'Ing. Carlos Rovira',
    createdAt: '2026-03-10T14:30:00Z',
    notes: 'Acceso directivo para área de Bioeconomía y Mercados'
  }
];

export const INITIAL_QUESTIONNAIRES: DynamicQuestionnaire[] = [
  {
    id: 'quest-yerba-1',
    code: 'RELEVAMIENTO-YERBA-V1',
    title: 'Censo Territorial de Yerba Mate y Manejo Agroecológico',
    description: 'Diagnóstico integral de plantaciones de Ilex paraguariensis, cubiertas verdes, curvas de nivel y destino de hoja verde.',
    category: 'yerba_mate',
    version: 1,
    status: 'published',
    publishedAt: '2026-01-20T10:00:00Z',
    createdAt: '2026-01-18T10:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z',
    questions: [
      {
        id: 'q1_variedad_yerba',
        label: 'Tipo de plantación de yerba mate',
        type: 'select',
        required: true,
        options: ['Material clonal seleccionado INTA', 'Planta tradicional de semilla', 'Mixto con reposición paulatina']
      },
      {
        id: 'q2_cubierta_verde',
        label: '¿Implementa cubiertas verdes de verano o invierno en los líneos?',
        type: 'select',
        required: true,
        options: ['Sí, leguminosas (Crotalaria / Mucuna)', 'Sí, gramíneas anuales', 'Sí, espontáneas manejadas con motoguadaña', 'No, suelo descubierto']
      },
      {
        id: 'q3_curvas_nivel',
        label: '¿La chacra posee curvas de nivel para control de erosión de tierra colorada?',
        type: 'boolean',
        required: true
      },
      {
        id: 'q4_rendimiento_promedio',
        label: 'Rendimiento promedio de la última zafra',
        type: 'number',
        required: true,
        unit: 'kg/ha'
      },
      {
        id: 'q5_foto_plantacion',
        label: 'Fotografía del estado del yerbal y copa de plantas',
        type: 'photo',
        required: false
      }
    ]
  },
  {
    id: 'quest-jengibre-1',
    code: 'PROGRAMA-JENGIBRE-2026',
    title: 'Relevamiento Productivo de Jengibre y Especias de Alto Valor',
    description: 'Relevamiento de productores de jengibre y cúrcuma orgánica para el plan de bioeconomía provincial.',
    category: 'cultivos_industriales',
    version: 1,
    status: 'published',
    publishedAt: '2026-02-15T12:00:00Z',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-02-15T12:00:00Z',
    questions: [
      {
        id: 'q_jengibre_superficie',
        label: 'Superficie cultivada con jengibre',
        type: 'number',
        required: true,
        unit: 'metros cuadrados'
      },
      {
        id: 'q_origen_rizoma',
        label: 'Procedencia del rizoma / semilla madre',
        type: 'select',
        required: true,
        options: ['Multiplicación propia seleccionada', 'Semilla fiscalizada provista por el Ministerio', 'Comprada en plaza local']
      },
      {
        id: 'q_riego_jengibre',
        label: 'Disponibilidad de riego complementario',
        type: 'select',
        required: true,
        options: ['Goteo con fertirriego orgánico', 'Microaspersión', 'Sin riego (dependiente de lluvias)']
      },
      {
        id: 'q_foto_bancal',
        label: 'Fotografía del bancal o lomo de plantación',
        type: 'photo',
        required: false
      }
    ]
  }
];

export const INITIAL_PRODUCERS: Producer[] = [
  {
    id: 'prod-001',
    dni: '14820194',
    fullName: 'Casimiro Kowalski',
    phone: '+54 3755 42-8910',
    email: 'casimiro.kowalski@agrocolonia.ar',
    isEstablishmentHead: true,
    producerType: 'pequeno_familiar',
    establishmentName: 'Chacra La Polaca',
    municipality: 'Oberá',
    colonyParaje: 'Lote 45, Sección III - Picada Guaraní',
    addressReference: 'A 2.5 km de Ruta Provincial 5, portón blanco de lapacho',
    lat: -27.4725,
    lng: -55.1054,
    gpsAccuracyMeters: 4.2,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 28.5,
    observations: 'Pionero en cubiertas verdes con Crotalaria. Excelente conservación de suelo.',
    activities: [
      {
        id: 'act-001-1',
        producerId: 'prod-001',
        type: 'yerba_mate',
        title: 'Yerba Mate Tradicional con Cubiertas',
        surfaceHa: 16.0,
        specificData: {
          plantationAgeYears: 18,
          estimatedAnnualProductionKg: 78000,
          productiveSystem: 'Bajo cubiertas verdes / consociado',
          harvestFrequency: 'Zafra gruesa (Abr-Sep)',
          cuttingMethod: 'Tijera eléctrica/neumática',
          destination: 'Secadero cooperativo'
        },
        createdAt: '2026-02-16T10:00:00Z'
      },
      {
        id: 'act-001-2',
        producerId: 'prod-001',
        type: 'piscicultura',
        title: 'Piscicultura en Estanques',
        surfaceHa: 1.2,
        specificData: {
          pondsCount: 3,
          waterSurfaceM2: 3500,
          species: 'Pacú, Sábalo y Carpa común',
          harvestEstimatedKg: 4200,
          waterSupply: 'Vertiente natural protegida'
        },
        createdAt: '2026-02-16T10:15:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-001',
      producerId: 'prod-001',
      waterSource: ['vertiente_protegida', 'pozo_perforado'],
      electricity: 'red_monofasica',
      roadAccess: 'entoscado_bueno',
      hasStorageFacility: true,
      storageDescription: 'Galpón de madera de pino de 12x8m con piso de cemento para insumos',
      sanitation: 'inodoro_con_camara',
      machinery: ['Tractor Massey Ferguson 265', 'Motoguadaña Stihl 450', 'Pulverizadora de mochila'],
      irrigationSystem: 'goteo',
      observations: 'Vertiente entubada con bomba solar complementaria.',
      createdAt: '2026-02-16T10:20:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-16T10:00:00Z',
    updatedAt: '2026-02-16T10:20:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-002',
    dni: '22874109',
    fullName: 'Elena Silvero de Dos Santos',
    phone: '+54 3755 58-3321',
    email: 'elena.silvero@chacra.ar',
    isEstablishmentHead: true,
    producerType: 'pequeno_familiar',
    establishmentName: 'Establecimiento Santa Elena',
    municipality: 'San Vicente',
    colonyParaje: 'Paraje Km 48 - Ruta Nacional 14',
    addressReference: 'Entrada frente a la escuela rural N° 340',
    lat: -26.9612,
    lng: -54.4820,
    gpsAccuracyMeters: 5.1,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 42.0,
    observations: 'Integración agrosilvopastoril con Brangus bajo pino y yerbal.',
    activities: [
      {
        id: 'act-002-1',
        producerId: 'prod-002',
        type: 'yerba_mate',
        title: 'Yerba Mate Zafra Gruesa',
        surfaceHa: 14.0,
        specificData: {
          plantationAgeYears: 12,
          estimatedAnnualProductionKg: 62000,
          productiveSystem: 'En curva de nivel',
          harvestFrequency: 'Zafra gruesa (Abr-Sep)',
          cuttingMethod: 'Tijera manual tradicional',
          destination: 'Secadero privado'
        },
        createdAt: '2026-02-18T11:00:00Z'
      },
      {
        id: 'act-002-2',
        producerId: 'prod-002',
        type: 'ganaderia_bovina',
        title: 'Ganadería Bovina Silvopastoril',
        surfaceHa: 22.0,
        specificData: {
          totalHeadCount: 38,
          cattleCategory: 'Cría',
          breeds: 'Brangus y Braford adaptados',
          pastureSurfaceHa: 18.0,
          silvopastoralSystem: 'Sí, con pino o eucalipto',
          sanitaryPlan: 'Al día con SENASA'
        },
        createdAt: '2026-02-18T11:30:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-002',
      producerId: 'prod-002',
      waterSource: ['vertiente_protegida', 'arroyo'],
      electricity: 'red_monofasica',
      roadAccess: 'tierra_colorada_transitable',
      hasStorageFacility: true,
      storageDescription: 'Galpón mixto para guardar forrajes y herramientas',
      sanitation: 'inodoro_con_camara',
      machinery: ['Tractor John Deere 5075', 'Acoplado volcador 4 tn', 'Balanza para ganado'],
      observations: 'Caminos transitables en buen tiempo; dificultad en temporales fuertes de lluvia.',
      createdAt: '2026-02-18T11:45:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-18T11:00:00Z',
    updatedAt: '2026-02-18T11:45:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-003',
    dni: '30491822',
    fullName: 'Carlos Da Silva',
    phone: '+54 3754 40-7719',
    isEstablishmentHead: true,
    producerType: 'cooperativista',
    establishmentName: 'Finca Picada Polaca',
    municipality: 'Leandro N. Alem',
    colonyParaje: 'Picada Polaca, Lote 12',
    addressReference: 'A 500m del destacamento policial',
    lat: -27.5891,
    lng: -55.3102,
    gpsAccuracyMeters: 3.8,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 18.0,
    observations: 'Producción diversificada de té negro de exportación y hortalizas de hoja.',
    activities: [
      {
        id: 'act-003-1',
        producerId: 'prod-003',
        type: 'te',
        title: 'Té Clonal Exportación',
        surfaceHa: 11.5,
        specificData: {
          teaType: 'Clonal mejorado',
          estimatedHarvestKg: 46000,
          harvestType: 'Cosechadora mecánica autopropulsada',
          destination: 'Secadero elaborador de té negro'
        },
        createdAt: '2026-02-21T09:00:00Z'
      },
      {
        id: 'act-003-2',
        producerId: 'prod-003',
        type: 'horticultura',
        title: 'Horticultura Bajo Cubierta',
        surfaceHa: 1.5,
        specificData: {
          surfaceM2: 15000,
          crops: 'Tomate platense, morrón rojo, lechuga mantecosa, rúcula',
          productionMode: 'Mixto (campo e invernáculo)',
          irrigationType: 'Goteo automatizado',
          commercialization: 'Mercado Concentrador Zonal'
        },
        createdAt: '2026-02-21T09:20:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-003',
      producerId: 'prod-003',
      waterSource: ['pozo_perforado', 'recoleccion_lluvia'],
      electricity: 'red_trifasica',
      roadAccess: 'asfalto',
      hasStorageFacility: true,
      storageDescription: 'Cámara de frío de 30m³ para hortalizas y galpón techado',
      sanitation: 'inodoro_con_camara',
      machinery: ['Tractor Kubota 4x4', 'Cosechadora de té de arrastre', 'Equipo fertirriego por pulsos'],
      irrigationSystem: 'goteo',
      createdAt: '2026-02-21T09:30:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-21T09:00:00Z',
    updatedAt: '2026-02-21T09:30:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-004',
    dni: '18992014',
    fullName: 'Ramón Alvez da Silva',
    phone: '+54 3751 51-2290',
    isEstablishmentHead: true,
    producerType: 'mediano_comercial',
    establishmentName: 'Forestal Línea Chica',
    municipality: 'Montecarlo',
    colonyParaje: 'Línea Chica s/n',
    addressReference: 'Camino vecinal hacia el Río Paraná, Km 7',
    lat: -26.5492,
    lng: -54.7410,
    gpsAccuracyMeters: 6.0,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 65.0,
    observations: 'Masa forestal madura con aprovechamiento apícola de monte y eucalipto.',
    activities: [
      {
        id: 'act-004-1',
        producerId: 'prod-004',
        type: 'forestacion',
        title: 'Masa Forestal Pino & Eucalipto',
        surfaceHa: 48.0,
        specificData: {
          species: 'Pino Taeda / Elliotti',
          standAgeYears: 14,
          fireDefensePlan: 'Sí, cortafuegos perimetrales mantenidos'
        },
        createdAt: '2026-02-24T14:00:00Z'
      },
      {
        id: 'act-004-2',
        producerId: 'prod-004',
        type: 'apicultura',
        title: 'Apicultura y Miel de Monte',
        surfaceHa: 5.0,
        specificData: {
          hivesCount: 45,
          beeType: 'Apis mellifera (Abeja común)',
          honeyYieldKg: 950,
          extractionRoom: 'Sala comunitaria habilitada'
        },
        createdAt: '2026-02-24T14:30:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-004',
      producerId: 'prod-004',
      waterSource: ['pozo_perforado', 'vertiente_protegida'],
      electricity: 'red_trifasica',
      roadAccess: 'entoscado_bueno',
      hasStorageFacility: true,
      storageDescription: 'Tinglado metálico de 20x15m para maquinaria pesada',
      sanitation: 'inodoro_con_camara',
      machinery: ['Tractor con pala frontal', 'Motosierras Husqvarna', 'Carro acoplado playo'],
      createdAt: '2026-02-24T14:45:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-24T14:00:00Z',
    updatedAt: '2026-02-24T14:45:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-005',
    dni: '32109445',
    fullName: 'Valdir González',
    phone: '+54 3755 33-8811',
    isEstablishmentHead: true,
    producerType: 'pequeno_familiar',
    establishmentName: 'Chacra El Remanso',
    municipality: 'Aristóbulo del Valle',
    colonyParaje: 'Paraje Cerro Moreno',
    addressReference: 'Subiendo la serranía, después del vado del arroyo',
    lat: -27.0815,
    lng: -54.8821,
    gpsAccuracyMeters: 4.8,
    tenureType: 'ocupacion_con_permiso',
    surfaceHa: 14.0,
    observations: 'Relevado recientemente en zona serrana. Carga offline realizada por técnico.',
    activities: [
      {
        id: 'act-005-1',
        producerId: 'prod-005',
        type: 'tabaco',
        title: 'Tabaco Burley Familiar',
        surfaceHa: 2.8,
        specificData: {
          tobaccoVariety: 'Burley',
          plantsCount: 32000,
          guildAssociation: 'APTM',
          curingBarnCondition: 'Óptimo con ventilación'
        },
        createdAt: '2026-02-26T15:00:00Z'
      },
      {
        id: 'act-005-2',
        producerId: 'prod-005',
        type: 'cultivos_industriales',
        title: 'Mandioca para Fécula y Jengibre',
        surfaceHa: 3.5,
        specificData: {
          industrialCrops: 'Mandioca rama blanca y jengibre',
          surfaceHa: 3.5,
          destination: 'Fábrica de fécula/almidón de mandioca'
        },
        createdAt: '2026-02-26T15:20:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-005',
      producerId: 'prod-005',
      waterSource: ['vertiente_protegida'],
      electricity: 'red_monofasica',
      roadAccess: 'tierra_colorada_transitable',
      hasStorageFacility: true,
      storageDescription: 'Galpón tabacalero tradicional de madera y techo de chapa de zinc',
      sanitation: 'letrina_sanitaria',
      machinery: ['Motocultivador', 'Mochila de fumigación'],
      createdAt: '2026-02-26T15:30:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-26T15:00:00Z',
    updatedAt: '2026-02-26T15:30:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: false
  },
  {
    id: 'prod-006',
    dni: '27654321',
    fullName: 'Aurelia Fernández',
    phone: '+54 3751 66-9901',
    email: 'aurelia.agroecologia@misiones.ar',
    isEstablishmentHead: true,
    producerType: 'pequeno_familiar',
    establishmentName: 'Agroecológica Paraíso',
    municipality: 'San Pedro',
    colonyParaje: 'Colonia Paraíso, Paraje Gentil',
    addressReference: 'A 15 km de San Pedro por ruta de tierra, cartel de madera "BioParaíso"',
    lat: -26.6045,
    lng: -54.0892,
    gpsAccuracyMeters: 5.5,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 19.0,
    observations: 'Referente provincial en producción de bioinsumos y conservación de vertientes nativas.',
    activities: [
      {
        id: 'act-006-1',
        producerId: 'prod-006',
        type: 'horticultura',
        title: 'Horticultura Agroecológica Certificada',
        surfaceHa: 3.0,
        specificData: {
          surfaceM2: 30000,
          crops: 'Cebolla de verdeo, acelga, remolacha, aromáticas, jengibre orgánico',
          productionMode: 'A campo abierto con mantillo de hojas de monte',
          irrigationType: 'Aspersión / Microaspersión',
          commercialization: 'Feria Franca local'
        },
        createdAt: '2026-02-27T10:00:00Z'
      },
      {
        id: 'act-006-2',
        producerId: 'prod-006',
        type: 'avicultura',
        title: 'Gallinas Camperas y Huevos de Pastoreo',
        surfaceHa: 1.0,
        specificData: {
          birdsCount: 420,
          poultryType: 'Huevos para consumo (Gallinas ponedoras)',
          housingSystem: 'Pastoreo diurno / Semipastoreo'
        },
        createdAt: '2026-02-27T10:30:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-006',
      producerId: 'prod-006',
      waterSource: ['vertiente_protegida'],
      electricity: 'panel_solar',
      roadAccess: 'tierra_colorada_transitable',
      hasStorageFacility: true,
      storageDescription: 'Sala de empaque y clasificación de huevos',
      sanitation: 'inodoro_con_camara',
      machinery: ['Motocultivador', 'Picadora de forraje eléctrica', 'Sistema de bombeo solar sumergible'],
      observations: 'Energía 100% solar fotovoltaica con banco de baterías de litio.',
      createdAt: '2026-02-27T10:45:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-27T10:00:00Z',
    updatedAt: '2026-02-27T10:45:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-007',
    dni: '475333548',
    fullName: 'Rodriguez',
    phone: '+54 376 498-3310',
    email: 'familia.rodriguez@agro.misiones.ar',
    isEstablishmentHead: true,
    producerType: 'pequeno_familiar',
    establishmentName: 'Los Rodríguez',
    municipality: 'Posadas',
    colonyParaje: 'Zona Rural / Periurbana - Nemesio Parma',
    addressReference: 'Acceso por Ruta Provincial 204 hacia el bañado, tranquera de quebracho colorado',
    lat: -27.4250,
    lng: -55.9850,
    gpsAccuracyMeters: 3.5,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 18.5,
    observations: 'Relevamiento territorial realizado por el Técnico Zonal Acelerados Misiones. Sistema productivo mixto tradicional.',
    activities: [
      {
        id: 'act-007-1',
        producerId: 'prod-007',
        type: 'yerba_mate',
        title: 'Yerba Mate Los Rodríguez',
        surfaceHa: 12.0,
        specificData: {
          plantationAgeYears: 9,
          estimatedAnnualProductionKg: 54000,
          productiveSystem: 'Consociado con curvas de nivel',
          harvestFrequency: 'Zafra gruesa (Abril a Septiembre)',
          cuttingMethod: 'Tijera neumática',
          destination: 'Secadero cooperativo de la cuenca'
        },
        createdAt: '2026-03-01T08:15:00Z'
      },
      {
        id: 'act-007-2',
        producerId: 'prod-007',
        type: 'tabaco',
        title: 'Tabaco Criollo y Burley Periurbano',
        surfaceHa: 4.5,
        specificData: {
          tobaccoVariety: 'Burley',
          plantsCount: 38000,
          guildAssociation: 'APTM',
          curingBarnCondition: 'Galpón aireado tradicional'
        },
        createdAt: '2026-03-01T08:30:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-007',
      producerId: 'prod-007',
      waterSource: ['pozo_perforado', 'vertiente_protegida'],
      electricity: 'red_monofasica',
      roadAccess: 'entoscado_bueno',
      hasStorageFacility: true,
      storageDescription: 'Galpón tabacalero y depósito techado de herramientas',
      sanitation: 'inodoro_con_camara',
      machinery: ['Tractor cortacésped', 'Motocultivador', 'Mochila de aspersión'],
      observations: 'Conexión vial transitable todo el año hacia el Mercado Central de Posadas.',
      createdAt: '2026-03-01T08:45:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-03-01T09:00:00Z',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T09:00:00Z',
    createdById: 'user-tecnico-acelerados',
    createdByName: 'Técnico Zonal Acelerados Misiones',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-008',
    dni: '17409210',
    fullName: 'Juan Carlos Schöller',
    phone: '+54 3755 47-1902',
    isEstablishmentHead: true,
    producerType: 'cooperativista',
    establishmentName: 'Establecimiento Don Juan',
    municipality: 'Campo Viera',
    colonyParaje: 'Sección IV, Lote 8 - Capital Nacional del Té',
    addressReference: 'A 1.200m del acceso a Campo Viera por RN 14',
    lat: -27.3241,
    lng: -55.0519,
    gpsAccuracyMeters: 4.0,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 36.0,
    observations: 'Referente de té clonal bajo certificación de buenas prácticas agrícolas.',
    activities: [
      {
        id: 'act-008-1',
        producerId: 'prod-008',
        type: 'te',
        title: 'Té Clonal Exportación Don Juan',
        surfaceHa: 22.0,
        specificData: {
          teaType: 'Clonal seleccionado',
          estimatedHarvestKg: 92000,
          harvestType: 'Mecánica autopropulsada',
          destination: 'Secadero cooperativo exportador'
        },
        createdAt: '2026-02-15T11:00:00Z'
      },
      {
        id: 'act-008-2',
        producerId: 'prod-008',
        type: 'yerba_mate',
        title: 'Yerba Mate de Alta Densidad',
        surfaceHa: 10.0,
        specificData: {
          plantationAgeYears: 14,
          estimatedAnnualProductionKg: 52000,
          productiveSystem: 'Bajo cubierta vegetal permanente'
        },
        createdAt: '2026-02-15T11:30:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-008',
      producerId: 'prod-008',
      waterSource: ['pozo_perforado'],
      electricity: 'red_trifasica',
      roadAccess: 'asfalto',
      hasStorageFacility: true,
      storageDescription: 'Galpón industrial de 300m² para acopio de té en verde',
      sanitation: 'inodoro_con_camara',
      machinery: ['Cosechadora de té 4x4', 'Tractor John Deere 5085E'],
      createdAt: '2026-02-15T11:45:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-15T11:00:00Z',
    updatedAt: '2026-02-15T11:45:00Z',
    createdById: 'user-tecnico-acelerados',
    createdByName: 'Técnico Zonal Acelerados Misiones',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-009',
    dni: '25890142',
    fullName: 'Silvina Krause',
    phone: '+54 3751 43-2219',
    isEstablishmentHead: true,
    producerType: 'mediano_comercial',
    establishmentName: 'Cabaña Las Araucarias',
    municipality: 'Eldorado',
    colonyParaje: 'Km 18 - Cuenca Alto Paraná',
    addressReference: 'Sobre Ruta Provincial 17 km 8',
    lat: -26.4021,
    lng: -54.5982,
    gpsAccuracyMeters: 5.2,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 85.0,
    observations: 'Modelo silvopastoril sustentable de pino resinoso y ganado Brangus colorado.',
    activities: [
      {
        id: 'act-009-1',
        producerId: 'prod-009',
        type: 'forestacion',
        title: 'Masa Forestal Pinus Taeda',
        surfaceHa: 50.0,
        specificData: {
          species: 'Pinus Taeda e híbridos',
          standAgeYears: 16,
          fireDefensePlan: 'Cortafuegos y reservorios de agua activos'
        },
        createdAt: '2026-02-10T10:00:00Z'
      },
      {
        id: 'act-009-2',
        producerId: 'prod-009',
        type: 'ganaderia_bovina',
        title: 'Ganadería Brangus Silvopastoril',
        surfaceHa: 30.0,
        specificData: {
          totalHeadCount: 65,
          cattleCategory: 'Cría e invernada',
          breeds: 'Brangus Colorado certificado'
        },
        createdAt: '2026-02-10T10:30:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-009',
      producerId: 'prod-009',
      waterSource: ['pozo_perforado', 'arroyo'],
      electricity: 'red_trifasica',
      roadAccess: 'entoscado_bueno',
      hasStorageFacility: true,
      storageDescription: 'Manga, corrales y balanza electrónica para hacienda',
      sanitation: 'inodoro_con_camara',
      machinery: ['Tractor con pala', 'Acoplado forrajero', 'Manga techada'],
      createdAt: '2026-02-10T10:45:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-02-10T10:45:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-010',
    dni: '38102944',
    fullName: 'Mateo Benítez',
    phone: '+54 3757 52-8190',
    isEstablishmentHead: true,
    producerType: 'pequeno_familiar',
    establishmentName: 'Chacra La Selva',
    municipality: 'Comandante Andresito',
    colonyParaje: 'Paraje Cabure-í - Corredor Biológico',
    addressReference: 'A 4 km del Parque Nacional Iguazú, entrada por guardaparques',
    lat: -25.6841,
    lng: -53.9820,
    gpsAccuracyMeters: 4.1,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 24.0,
    observations: 'Yerba mate bajo monte nativo con cortinas biológicas y fertilización orgánica.',
    activities: [
      {
        id: 'act-010-1',
        producerId: 'prod-010',
        type: 'yerba_mate',
        title: 'Yerba Mate Bajo Monte Nativo',
        surfaceHa: 14.0,
        specificData: {
          plantationAgeYears: 11,
          estimatedAnnualProductionKg: 68000,
          productiveSystem: 'Agroforestería con árboles nativos misioneros'
        },
        createdAt: '2026-02-12T09:00:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-010',
      producerId: 'prod-010',
      waterSource: ['vertiente_protegida'],
      electricity: 'panel_solar',
      roadAccess: 'tierra_colorada_transitable',
      hasStorageFacility: true,
      storageDescription: 'Galpón de acopio de hoja verde aireado',
      sanitation: 'inodoro_con_camara',
      machinery: ['Tijeras eléctricas con batería de mochila'],
      createdAt: '2026-02-12T09:30:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-12T09:00:00Z',
    updatedAt: '2026-02-12T09:30:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-011',
    dni: '21904588',
    fullName: 'Olga Neris',
    phone: '+54 376 439-0112',
    isEstablishmentHead: true,
    producerType: 'pequeno_familiar',
    establishmentName: 'Quinta San Jorge',
    municipality: 'Gobernador Roca',
    colonyParaje: 'Colonia Yacutinga',
    addressReference: 'Camino a Corpus, km 3',
    lat: -27.1852,
    lng: -55.4520,
    gpsAccuracyMeters: 3.2,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 12.0,
    observations: 'Principal abastecedora de melón, sandía y verduras de hoja al Mercado Concentrador.',
    activities: [
      {
        id: 'act-011-1',
        producerId: 'prod-011',
        type: 'horticultura',
        title: 'Hortalizas y Melón Misionero',
        surfaceHa: 6.5,
        specificData: {
          surfaceM2: 65000,
          crops: 'Melón Rocío de Miel, Sandía Crimson Sweet, Lechuga, Rúcula',
          irrigationType: 'Goteo con reservorio de lluvia'
        },
        createdAt: '2026-02-20T14:00:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-011',
      producerId: 'prod-011',
      waterSource: ['pozo_perforado', 'recoleccion_lluvia'],
      electricity: 'red_monofasica',
      roadAccess: 'entoscado_bueno',
      hasStorageFacility: true,
      storageDescription: 'Galpón de empaque y selección de frutas',
      sanitation: 'inodoro_con_camara',
      machinery: ['Motocultivador', 'Bomba de riego solar'],
      createdAt: '2026-02-20T14:20:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-20T14:00:00Z',
    updatedAt: '2026-02-20T14:20:00Z',
    createdById: 'user-tecnico-acelerados',
    createdByName: 'Técnico Zonal Acelerados Misiones',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-012',
    dni: '16789451',
    fullName: 'Adolfo Hillebrand',
    phone: '+54 3743 42-1980',
    isEstablishmentHead: true,
    producerType: 'cooperativista',
    establishmentName: 'Finca El Lapacho',
    municipality: 'Puerto Rico',
    colonyParaje: 'Línea Paraná, Paraje San Alberto',
    addressReference: 'A 2 km de Ruta Nacional 12 hacia la costa',
    lat: -26.7921,
    lng: -55.0210,
    gpsAccuracyMeters: 4.5,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 45.0,
    observations: 'Producción de mandioca de alta densidad para fécula y estanques de pacú.',
    activities: [
      {
        id: 'act-012-1',
        producerId: 'prod-012',
        type: 'cultivos_industriales',
        title: 'Mandioca para Fécula y Almidón',
        surfaceHa: 20.0,
        specificData: {
          destination: 'Cooperativa Agrícola de Puerto Rico (Fábrica de Fécula)',
          annualKg: 280000
        },
        createdAt: '2026-02-18T10:00:00Z'
      },
      {
        id: 'act-012-2',
        producerId: 'prod-012',
        type: 'piscicultura',
        title: 'Piscicultura Pacú y Sábalo',
        surfaceHa: 3.5,
        specificData: {
          pondsCount: 5,
          harvestEstimatedKg: 8500
        },
        createdAt: '2026-02-18T10:30:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-012',
      producerId: 'prod-012',
      waterSource: ['arroyo', 'vertiente_protegida'],
      electricity: 'red_trifasica',
      roadAccess: 'asfalto',
      hasStorageFacility: true,
      storageDescription: 'Silo para ración de peces y galpón para acopio de raíces',
      sanitation: 'inodoro_con_camara',
      machinery: ['Tractor New Holland 75HP', 'Arrancadora mecánica de mandioca'],
      createdAt: '2026-02-18T10:45:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-18T10:00:00Z',
    updatedAt: '2026-02-18T10:45:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-013',
    dni: '23561902',
    fullName: 'Jorge Somariva',
    phone: '+54 3755 49-8012',
    isEstablishmentHead: true,
    producerType: 'pequeno_familiar',
    establishmentName: 'Establecimiento Alto Uruguay',
    municipality: 'El Soberbio',
    colonyParaje: 'Paraje La Barra - Cuna de las Esencias',
    addressReference: 'Sobre Ruta Costera 2 camino a Moconá',
    lat: -27.2910,
    lng: -54.1980,
    gpsAccuracyMeters: 4.8,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 22.0,
    observations: 'Destilería de aceites esenciales de citronela, menta y lemon grass.',
    activities: [
      {
        id: 'act-013-1',
        producerId: 'prod-013',
        type: 'cultivos_industriales',
        title: 'Citronela y Esencias Aromáticas',
        surfaceHa: 10.0,
        specificData: {
          essentialOilKg: 340,
          distilleryType: 'Alambique tradicional de vapor'
        },
        createdAt: '2026-02-22T11:00:00Z'
      },
      {
        id: 'act-013-2',
        producerId: 'prod-013',
        type: 'tabaco',
        title: 'Tabaco Burley Costero',
        surfaceHa: 4.0,
        specificData: {
          plantsCount: 30000,
          guildAssociation: 'ACTIM'
        },
        createdAt: '2026-02-22T11:30:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-013',
      producerId: 'prod-013',
      waterSource: ['arroyo', 'vertiente_protegida'],
      electricity: 'red_monofasica',
      roadAccess: 'asfalto',
      hasStorageFacility: true,
      storageDescription: 'Alambique de destilación y galpón de curado de tabaco',
      sanitation: 'inodoro_con_camara',
      machinery: ['Caldera a biomasa', 'Destilador de acero inoxidable'],
      createdAt: '2026-02-22T11:45:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-22T11:00:00Z',
    updatedAt: '2026-02-22T11:45:00Z',
    createdById: 'user-tecnico-acelerados',
    createdByName: 'Técnico Zonal Acelerados Misiones',
    verifiedBySupervisor: true
  },
  {
    id: 'prod-014',
    dni: '28340192',
    fullName: 'Mirta Gladys Fontana',
    phone: '+54 3758 42-3301',
    isEstablishmentHead: true,
    producerType: 'pequeno_familiar',
    establishmentName: 'Chacra Las Vertientes',
    municipality: 'Apóstoles',
    colonyParaje: 'Lote 18 - Capital Nacional e Internacional de la Yerba Mate',
    addressReference: 'A 3 km de la Capilla San Juan, portón de hierro verde',
    lat: -27.9142,
    lng: -55.7540,
    gpsAccuracyMeters: 3.4,
    tenureType: 'propiedad_con_titulo',
    surfaceHa: 32.0,
    observations: 'Yerbal histórico en manejo regenerativo con cobertura de leguminosas de invierno.',
    activities: [
      {
        id: 'act-014-1',
        producerId: 'prod-014',
        type: 'yerba_mate',
        title: 'Yerbal Tradicional Apóstoles',
        surfaceHa: 20.0,
        specificData: {
          plantationAgeYears: 22,
          estimatedAnnualProductionKg: 95000,
          destination: 'Molino yerbatero tradicional de Apóstoles'
        },
        createdAt: '2026-02-25T09:00:00Z'
      },
      {
        id: 'act-014-2',
        producerId: 'prod-014',
        type: 'ganaderia_bovina',
        title: 'Ganadería Ovina y Bovina',
        surfaceHa: 8.0,
        specificData: {
          totalHeadCount: 25,
          pastureSurfaceHa: 8.0
        },
        createdAt: '2026-02-25T09:30:00Z'
      }
    ],
    infrastructure: {
      id: 'inf-014',
      producerId: 'prod-014',
      waterSource: ['pozo_perforado', 'vertiente_protegida'],
      electricity: 'red_trifasica',
      roadAccess: 'entoscado_bueno',
      hasStorageFacility: true,
      storageDescription: 'Galpón de implementos y tinglado de secado de leña',
      sanitation: 'inodoro_con_camara',
      machinery: ['Tractor Massey Ferguson 4275', 'Chipeadora de ramas de yerba'],
      createdAt: '2026-02-25T09:45:00Z'
    },
    syncStatus: 'synced',
    version: 1,
    lastSyncedAt: '2026-02-28T16:30:00Z',
    createdAt: '2026-02-25T09:00:00Z',
    updatedAt: '2026-02-25T09:45:00Z',
    createdById: 'user-tecnico-1',
    createdByName: 'Téc. Agrónomo Juan Benítez',
    verifiedBySupervisor: true
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Nuevo Cuestionario Publicado',
    message: 'Se ha publicado el relevamiento "Censo Territorial de Yerba Mate y Manejo Agroecológico v1". Disponible para descarga offline.',
    type: 'form',
    targetRoles: ['TECNICO', 'SUPERVISOR', 'ADMINISTRADOR'],
    read: false,
    createdAt: '2026-02-20T10:00:00Z'
  },
  {
    id: 'notif-2',
    title: 'Sincronización de Campo Completada',
    message: 'Técnico Zonal Acelerados Misiones completó la sincronización de relevamientos territoriales.',
    type: 'sync',
    targetRoles: ['SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR', 'SUPERVISOR'],
    read: true,
    createdAt: '2026-02-28T16:35:00Z'
  },
  {
    id: 'notif-3',
    title: 'Alerta Territorial: Aluvión de lluvias',
    message: 'Precaución en caminos terrados del Departamento Cainguás y San Pedro por anegamiento.',
    type: 'alert',
    targetRoles: ['TECNICO', 'SUPERVISOR'],
    read: false,
    createdAt: '2026-03-01T08:00:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    userId: 'user-superadmin-1',
    userName: 'Ing. Carlos Rovira',
    userRole: 'SUPERADMIN',
    action: 'INITIALIZE_SYSTEM',
    entity: 'SYSTEM',
    entityId: 'sip-misiones-core',
    details: 'Inicialización de la plataforma SIP Misiones y catálogos agronómicos provinciales.',
    device: 'Desktop / Chrome OS (Posadas)',
    timestamp: '2026-01-15T08:00:00Z'
  },
  {
    id: 'audit-2',
    userId: 'user-admin-1',
    userName: 'Lic. Marina Santos',
    userRole: 'ADMINISTRADOR',
    action: 'PUBLISH_QUESTIONNAIRE',
    entity: 'questionnaires',
    entityId: 'quest-yerba-1',
    details: 'Publicación del formulario dinámico Censo Yerba Mate v1.2',
    device: 'Web Admin / Safari Mac (Posadas)',
    timestamp: '2026-01-20T10:00:00Z'
  },
  {
    id: 'audit-3',
    userId: 'user-tecnico-acelerados',
    userName: 'Técnico Zonal Acelerados Misiones',
    userRole: 'TECNICO',
    action: 'CREATE_PRODUCER_FIELD',
    entity: 'producers',
    entityId: 'prod-007',
    details: 'Relevamiento territorial presencial de Los Rodríguez en Posadas Rural / Nemesio Parma.',
    device: 'Mobile PWA / Android 14 (Posadas)',
    timestamp: '2026-03-01T08:00:00Z'
  }
];

export async function seedInitialDatabaseIfEmpty(forceReload: boolean = false) {
  try {
    console.log('[SIP MISIONES] Verificando y cargando base de datos territorial provincial...');

    // 1. Asegurar usuarios y cuentas autorizadas
    for (const u of INITIAL_USERS) {
      await db.users.put(u);
    }

    // 2. Asegurar cuestionarios
    for (const q of INITIAL_QUESTIONNAIRES) {
      const exists = await db.questionnaires.get(q.id);
      if (!exists || forceReload) {
        await db.questionnaires.put(q);
      }
    }

    // 3. Asegurar invitaciones
    for (const inv of INITIAL_INVITATIONS) {
      const exists = await db.invitations.get(inv.id);
      if (!exists || forceReload) {
        await db.invitations.put(inv);
      }
    }

    // 4. Asegurar todos los productores territoriales y relevamientos
    for (const p of INITIAL_PRODUCERS) {
      const exists = await db.producers.get(p.id);
      if (!exists || forceReload) {
        await db.producers.put(p);
      }
    }

    // 5. Notificaciones y auditoría
    for (const n of INITIAL_NOTIFICATIONS) {
      const exists = await db.notifications.get(n.id);
      if (!exists || forceReload) {
        await db.notifications.put(n);
      }
    }

    for (const a of INITIAL_AUDIT_LOGS) {
      const exists = await db.auditLogs.get(a.id);
      if (!exists || forceReload) {
        await db.auditLogs.put(a);
      }
    }

    await db.appConfig.put({ 
      key: 'db_initialized_at', 
      value: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    });

    await db.appConfig.put({ 
      key: 'last_sync_timestamp', 
      value: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    });

    console.log('[SIP MISIONES] Base de datos territorial cargada exitosamente.');
  } catch (err) {
    console.error('[SIP MISIONES] Error al inicializar/sincronizar base de datos:', err);
  }
}
