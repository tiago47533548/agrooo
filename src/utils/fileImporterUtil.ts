/**
 * SIP MISIONES - File Import & Parsing Utility
 * Ministerio del Agro y la Producción de Misiones
 *
 * Soporta importación instantánea de archivos Excel (.xlsx, .xls), CSV (.csv) y respaldos JSON (.json).
 * Inserción directa en IndexedDB (Dexie) y sincronización con Firebase Firestore.
 */

import * as XLSX from 'xlsx';
import { Producer, ProductiveActivity } from '../db/schema';
import { db } from '../db/dexieDb';
import { MISIONES_MUNICIPALITIES, PRODUCTIVE_ACTIVITIES_CATALOG } from '../db/misionesCatalog';
import { isCoordinateInMisionesRange } from './locationParser';
import { uploadProducerToCloud } from '../services/firestoreSync';

// Aliases para detección automática de columnas
const FIELD_ALIASES = {
  dni: ['dni', 'documento', 'doc', 'cuit', 'cuil', 'identificacion', 'cedula', 'id_productor'],
  fullName: ['nombre', 'apellido', 'nombre completo', 'productor', 'titular', 'responsable', 'nombre y apellido', 'apellidos'],
  phone: ['telefono', 'tel', 'celular', 'cel', 'contacto', 'movil', 'whatsapp'],
  email: ['email', 'correo', 'correo electronico', 'mail'],
  establishmentName: ['chacra', 'establecimiento', 'finca', 'campo', 'predio', 'lote', 'nombre chacra', 'nombre establecimiento'],
  municipality: ['municipio', 'localidad', 'ciudad', 'departamento', 'zona', 'comuna', 'pueblo'],
  colonyParaje: ['paraje', 'colonia', 'picada', 'seccion', 'paraje/colonia', 'direccion', 'camino'],
  surfaceHa: ['superficie', 'superficie ha', 'ha', 'hectareas', 'has', 'extension', 'area'],
  activityType: ['cultivo', 'actividad', 'produccion', 'rubro', 'cultivo principal', 'actividad productiva', 'rubro principal'],
  lat: ['lat', 'latitud', 'coord y', 'y', 'latitude', 'latitud gps'],
  lng: ['lng', 'longitud', 'long', 'coord x', 'x', 'longitude', 'longitud gps'],
  observations: ['observaciones', 'notas', 'comentarios', 'detalle', 'descripcion'],
  logoUrl: ['logo', 'logourl', 'marca', 'insignia', 'foto chacra', 'imagen', 'icono']
};

function matchHeader(headers: string[], aliases: string[]): string | undefined {
  return headers.find((h) => {
    const clean = h.toLowerCase().trim().replace(/[_.-]/g, ' ');
    return aliases.some((a) => clean === a || clean.includes(a));
  });
}

export async function parseAndImportProducerFile(
  file: File,
  currentUserName: string = 'Administrador Ministerial',
  currentUserId: string = 'user-admin'
): Promise<{
  success: boolean;
  importedCount: number;
  updatedCount: number;
  totalParsed: number;
  error?: string;
  producers: Producer[];
}> {
  const fileName = file.name.toLowerCase();
  const now = new Date().toISOString();
  const importedProducers: Producer[] = [];
  let importedCount = 0;
  let updatedCount = 0;

  try {
    let rows: Record<string, any>[] = [];

    // 1. Si es archivo JSON
    if (fileName.endsWith('.json')) {
      const text = await file.text();
      const parsedJson = JSON.parse(text);
      if (Array.isArray(parsedJson)) {
        rows = parsedJson;
      } else if (parsedJson.producers && Array.isArray(parsedJson.producers)) {
        rows = parsedJson.producers;
      } else if (parsedJson.data && Array.isArray(parsedJson.data)) {
        rows = parsedJson.data;
      } else {
        throw new Error('El archivo JSON no contiene una lista válida de productores.');
      }
    } else {
      // 2. Si es Excel (.xlsx, .xls) o CSV (.csv)
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('El archivo no contiene ninguna hoja de cálculo.');
      }
      const ws = wb.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    }

    if (rows.length === 0) {
      throw new Error('El archivo seleccionado no tiene filas de datos.');
    }

    // Identificar encabezados disponibles
    const headers = Object.keys(rows[0] || {});
    const mapDni = matchHeader(headers, FIELD_ALIASES.dni);
    const mapName = matchHeader(headers, FIELD_ALIASES.fullName);
    const mapPhone = matchHeader(headers, FIELD_ALIASES.phone);
    const mapEmail = matchHeader(headers, FIELD_ALIASES.email);
    const mapEst = matchHeader(headers, FIELD_ALIASES.establishmentName);
    const mapMun = matchHeader(headers, FIELD_ALIASES.municipality);
    const mapCol = matchHeader(headers, FIELD_ALIASES.colonyParaje);
    const mapSurface = matchHeader(headers, FIELD_ALIASES.surfaceHa);
    const mapAct = matchHeader(headers, FIELD_ALIASES.activityType);
    const mapLat = matchHeader(headers, FIELD_ALIASES.lat);
    const mapLng = matchHeader(headers, FIELD_ALIASES.lng);
    const mapNotes = matchHeader(headers, FIELD_ALIASES.observations);
    const mapLogo = matchHeader(headers, FIELD_ALIASES.logoUrl);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Si ya viene con estructura Producer de SIP Misiones (ej. exportación JSON)
      if (row.dni && row.fullName && row.establishmentName && row.municipality) {
        const prodId = row.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const producer: Producer = {
          id: prodId,
          dni: String(row.dni),
          fullName: String(row.fullName),
          phone: String(row.phone || ''),
          email: String(row.email || ''),
          isEstablishmentHead: row.isEstablishmentHead ?? true,
          producerType: row.producerType || 'pequeno_familiar',
          establishmentName: String(row.establishmentName),
          municipality: String(row.municipality),
          colonyParaje: String(row.colonyParaje || 'Zona rural'),
          addressReference: String(row.addressReference || ''),
          lat: Number(row.lat) || -27.4862,
          lng: Number(row.lng) || -55.1205,
          isGeolocated: row.isGeolocated ?? true,
          tenureType: row.tenureType || 'propiedad_con_titulo',
          surfaceHa: Number(row.surfaceHa) || 10,
          activities: Array.isArray(row.activities) ? row.activities : [],
          observations: String(row.observations || ''),
          version: Number(row.version) || 1,
          createdAt: row.createdAt || now,
          createdById: row.createdById || currentUserId,
          createdByName: row.createdByName || currentUserName,
          verifiedBySupervisor: Boolean(row.verifiedBySupervisor),
          ...row,
          syncStatus: 'pending',
          updatedAt: now
        };
        await uploadProducerToCloud(producer);
        importedProducers.push(producer);
        importedCount++;
        continue;
      }

      // Extracción de campos
      const rawDni = String(mapDni ? row[mapDni] : row.dni || '').replace(/\D/g, '').trim();
      const rawName = String(mapName ? row[mapName] : row.fullName || row.nombre || '').trim();

      // Si no tiene al menos DNI o Nombre, omitir fila vacía
      if (!rawDni && !rawName) continue;

      const dni = rawDni || `DNI-S-${Date.now().toString().slice(-6)}-${i}`;
      const fullName = rawName || `Productor ${dni}`;
      const phone = String(mapPhone ? row[mapPhone] : row.phone || '').trim();
      const email = String(mapEmail ? row[mapEmail] : row.email || '').trim();
      const establishmentName = String(mapEst ? row[mapEst] : row.establishmentName || `Chacra de ${fullName}`).trim();
      const rawMun = String(mapMun ? row[mapMun] : row.municipality || 'Oberá').trim();
      const colonyParaje = String(mapCol ? row[mapCol] : row.colonyParaje || 'Zona rural').trim();
      const rawSurface = parseFloat(String(mapSurface ? row[mapSurface] : row.surfaceHa || '10').replace(',', '.').replace(/[^0-9.]/g, ''));
      const surfaceHa = isNaN(rawSurface) || rawSurface <= 0 ? 12 : rawSurface;
      const rawAct = String(mapAct ? row[mapAct] : row.activityType || 'Yerba Mate').trim();
      const observations = String(mapNotes ? row[mapNotes] : row.observations || '').trim();
      const logoUrl = String(mapLogo ? row[mapLogo] : row.logoUrl || '').trim();

      // Normalizar municipio
      let municipality = rawMun;
      const matchedMun = MISIONES_MUNICIPALITIES.find((m) =>
        m.name.toLowerCase() === rawMun.toLowerCase() ||
        rawMun.toLowerCase().includes(m.name.toLowerCase())
      );
      if (matchedMun) municipality = matchedMun.name;

      // Coordenadas
      let lat = parseFloat(String(mapLat ? row[mapLat] : row.lat || '').replace(',', '.'));
      let lng = parseFloat(String(mapLng ? row[mapLng] : row.lng || '').replace(',', '.'));
      let isGeolocated = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && isCoordinateInMisionesRange(lat, lng);

      if (!isGeolocated) {
        // Asignar coordenadas del municipio o punto de referencia en Misiones
        lat = matchedMun?.lat || -27.4862;
        lng = matchedMun?.lng || -55.1205;
        isGeolocated = true;
      }

      // Normalizar actividad
      const catalogMatch = PRODUCTIVE_ACTIVITIES_CATALOG.find((c) =>
        c.name.toLowerCase().includes(rawAct.toLowerCase()) ||
        c.type.includes(rawAct.toLowerCase())
      );

      const activity: ProductiveActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        producerId: '',
        type: catalogMatch?.type || 'yerba_mate',
        title: catalogMatch?.name || rawAct || 'Yerba Mate',
        surfaceHa,
        specificData: { origen: 'Carga de archivo exterior' },
        createdAt: now
      };

      // Verificar si ya existe por DNI
      const existing = await db.producers.where('dni').equals(dni).first();
      const prodId = existing ? existing.id : `prod_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      activity.producerId = prodId;

      const producer: Producer = {
        id: prodId,
        dni,
        fullName,
        phone,
        email,
        isEstablishmentHead: true,
        producerType: 'pequeno_familiar',
        establishmentName,
        municipality,
        colonyParaje,
        addressReference: observations,
        lat,
        lng,
        isGeolocated: true,
        locationMethod: 'manual_coords',
        locationCapturedAt: now,
        locationCapturedBy: currentUserName,
        tenureType: 'propiedad_con_titulo',
        surfaceHa,
        activities: [activity],
        logoUrl: logoUrl || undefined,
        observations: `Cargado desde archivo "${file.name}". ${observations}`.trim(),
        syncStatus: 'synced',
        version: existing ? existing.version + 1 : 1,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
        createdById: currentUserId,
        createdByName: currentUserName,
        verifiedBySupervisor: false,
        importSourceFileName: file.name
      };

      await uploadProducerToCloud(producer);

      if (existing) {
        updatedCount++;
      } else {
        importedCount++;
      }
      importedProducers.push(producer);
    }

    // Registrar en auditoría
    await db.auditLogs.add({
      id: `audit_${Date.now()}`,
      userId: currentUserId,
      userName: currentUserName,
      userRole: 'ADMINISTRADOR',
      action: 'IMPORT_DATABASE',
      entity: 'producers',
      entityId: `import_${Date.now()}`,
      details: `Carga directa de archivo "${file.name}": ${importedCount} creados, ${updatedCount} actualizados.`,
      device: 'Web Admin / Direct File Loader',
      timestamp: now
    });

    return {
      success: true,
      importedCount,
      updatedCount,
      totalParsed: rows.length,
      producers: importedProducers
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      totalParsed: 0,
      error: err.message || 'Error al procesar el archivo',
      producers: []
    };
  }
}
