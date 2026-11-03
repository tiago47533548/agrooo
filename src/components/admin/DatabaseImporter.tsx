import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Producer, ProductiveActivity, ImportBatch, LocationCaptureMethod } from '../../db/schema';
import { MISIONES_MUNICIPALITIES, PRODUCTIVE_ACTIVITIES_CATALOG } from '../../db/misionesCatalog';
import { db } from '../../db/dexieDb';
import { syncEngine } from '../../services/syncEngine';
import { isCoordinateInMisionesRange, findNearestMisionesMunicipality } from '../../utils/locationParser';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  Trash2, 
  Search, 
  Eye, 
  Database,
  FileCheck,
  Table,
  Check,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';

interface DatabaseImporterProps {
  currentUserId: string;
  currentUserName: string;
  onImportComplete: () => void;
  onGoToProducers: () => void;
  onGoToMap: () => void;
}

import { parseAndImportProducerFile } from '../../utils/fileImporterUtil';

// SIP Misiones Target Field Definitions
export const SIP_SYSTEM_FIELDS = [
  { key: 'dni', label: 'DNI / Identificador', required: true, aliases: ['dni', 'documento', 'identificacion', 'cedula', 'doc', 'cuit', 'cuil'] },
  { key: 'fullName', label: 'Nombre y Apellido', required: true, aliases: ['nombre', 'apellido', 'nombre completo', 'productor', 'titular', 'nombre y apellido', 'responsable'] },
  { key: 'phone', label: 'Teléfono / Celular', required: false, aliases: ['telefono', 'celular', 'movil', 'contacto', 'tel', 'whatsapp'] },
  { key: 'email', label: 'Correo Electrónico', required: false, aliases: ['email', 'correo', 'correo electronico', 'mail'] },
  { key: 'establishmentName', label: 'Nombre de Chacra / Establecimiento', required: false, aliases: ['chacra', 'establecimiento', 'finca', 'campo', 'nombre chacra', 'predio', 'lote'] },
  { key: 'municipality', label: 'Municipio', required: true, aliases: ['municipio', 'localidad', 'ciudad', 'departamento', 'zona', 'comuna'] },
  { key: 'colonyParaje', label: 'Paraje / Colonia / Picada', required: false, aliases: ['paraje', 'colonia', 'picada', 'seccion', 'paraje/colonia', 'direccion'] },
  { key: 'surfaceHa', label: 'Superficie Total (ha)', required: false, aliases: ['superficie', 'hectareas', 'ha', 'sup', 'has', 'superficie ha', 'extension'] },
  { key: 'activityType', label: 'Cultivo / Actividad Principal', required: false, aliases: ['cultivo', 'actividad', 'produccion', 'rubro', 'cultivo principal', 'actividad productiva'] },
  { key: 'lat', label: 'Latitud GPS', required: false, aliases: ['latitud', 'lat', 'coord y', 'y', 'latitude'] },
  { key: 'lng', label: 'Longitud GPS', required: false, aliases: ['longitud', 'lng', 'long', 'coord x', 'x', 'longitude'] },
  { key: 'producerType', label: 'Tipo de Productor', required: false, aliases: ['tipo', 'tipo productor', 'categoria', 'tipo de productor'] },
  { key: 'observations', label: 'Observaciones', required: false, aliases: ['observaciones', 'notas', 'comentarios', 'detalle'] }
];

export const DatabaseImporter: React.FC<DatabaseImporterProps> = ({
  currentUserId,
  currentUserName,
  onImportComplete,
  onGoToProducers,
  onGoToMap
}) => {
  const [step, setStep] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File metadata
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Mapping state: SystemFieldKey -> OriginalColumnHeader
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Duplicate resolution strategy
  const [duplicateStrategy, setDuplicateStrategy] = useState<'create_only_new' | 'update_existing' | 'import_all_flag_review'>('create_only_new');

  // Transformed & Preview Rows
  const [processedRows, setProcessedRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Import Result Stats
  const [importResult, setImportResult] = useState<{
    batchId: string;
    importedCount: number;
    updatedCount: number;
    duplicateCount: number;
    errorCount: number;
    skippedCount: number;
    log: string[];
  } | null>(null);

  // 1. Handle Direct Fast Import (1-Click for JSON, XLSX, CSV)
  const handleDirectFastImport = async (uploadedFile: File) => {
    setIsProcessing(true);
    try {
      const result = await parseAndImportProducerFile(uploadedFile, currentUserName, currentUserId);
      if (result.success) {
        setImportResult({
          batchId: `batch_fast_${Date.now()}`,
          importedCount: result.importedCount,
          updatedCount: result.updatedCount,
          duplicateCount: 0,
          errorCount: 0,
          skippedCount: 0,
          log: [
            `Carga directa de "${uploadedFile.name}"`,
            `Productores procesados: ${result.totalParsed}`,
            `Nuevos incorporados: ${result.importedCount}`,
            `Actualizados: ${result.updatedCount}`
          ]
        });
        setStep(5);
        onImportComplete();
      } else {
        alert(`No se pudo procesar el archivo: ${result.error || 'Error desconocido'}`);
      }
    } catch (err: any) {
      alert(`Error al importar: ${err.message || 'Error inesperado'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Standard File Upload (XLSX, XLS, CSV, JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const uploadedFile = files[0];
    setFile(uploadedFile);

    if (uploadedFile.name.toLowerCase().endsWith('.json')) {
      handleDirectFastImport(uploadedFile);
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0];
        setSelectedSheet(firstSheet);
        loadSheetData(wb, firstSheet);
        setStep(2);
      } catch (err: any) {
        alert(`Error al procesar el archivo: ${err.message}`);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const data: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (data.length === 0) {
      alert('La hoja seleccionada está vacía.');
      return;
    }

    const headers = Object.keys(data[0] || {});
    setRawHeaders(headers);
    setRawRows(data);

    // Auto-suggest column mappings based on aliases
    const initialMapping: Record<string, string> = {};
    SIP_SYSTEM_FIELDS.forEach((sysField) => {
      const match = headers.find((h) => {
        const cleanHeader = h.toLowerCase().trim().replace(/[_.-]/g, ' ');
        return sysField.aliases.some((alias) => cleanHeader === alias || cleanHeader.includes(alias));
      });
      if (match) {
        initialMapping[sysField.key] = match;
      }
    });

    setColumnMapping(initialMapping);
  };

  // Switch sheet
  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return;
    setSelectedSheet(sheetName);
    loadSheetData(workbook, sheetName);
  };

  // 2. Download sample CSV/Excel template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'DNI': '14820194',
        'Nombre y Apellido': 'Casimiro Kowalski',
        'Telefono': '+54 3755 42-8910',
        'Correo': 'casimiro@agro.ar',
        'Municipio': 'Oberá',
        'Paraje o Colonia': 'Lote 45 Sección III',
        'Nombre Chacra': 'Chacra La Polaca',
        'Superficie Ha': 28.5,
        'Cultivo Principal': 'Yerba Mate',
        'Latitud': -27.4725,
        'Longitud': -55.1054,
        'Tipo Productor': 'Pequeño Familiar',
        'Observaciones': 'Manejo con cubiertas verdes'
      },
      {
        'DNI': '22874109',
        'Nombre y Apellido': 'Elena Silvero',
        'Telefono': '+54 3755 58-3321',
        'Correo': 'elena@agro.ar',
        'Municipio': 'San Vicente',
        'Paraje o Colonia': 'Paraje Km 48',
        'Nombre Chacra': 'Establecimiento Santa Elena',
        'Superficie Ha': 42.0,
        'Cultivo Principal': 'Ganadería Bovina',
        'Latitud': -26.9612,
        'Longitud': -54.4820,
        'Tipo Productor': 'Pequeño Familiar',
        'Observaciones': 'Silvopastoreo con Brangus'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productores_Plantilla');
    XLSX.writeFile(wb, 'SIP_Misiones_Plantilla_Productores.xlsx');
  };

  // 3. Process & Clean Data (Steps 4 & 5)
  const processAndPreviewData = async () => {
    setIsProcessing(true);
    setStep(4);

    try {
      // Fetch existing DNI set from Dexie
      const existingProducers = await db.producers.toArray();
      const existingDniMap = new Map<string, Producer>();
      existingProducers.forEach((p) => existingDniMap.set(p.dni, p));

      const fileDniSet = new Set<string>();
      const processed: any[] = [];

      rawRows.forEach((row, idx) => {
        const rawDni = String(row[columnMapping['dni']] || '').replace(/\D/g, '').trim();
        const rawFullName = String(row[columnMapping['fullName']] || '').trim();
        const rawMun = String(row[columnMapping['municipality']] || '').trim();
        const rawPhone = String(row[columnMapping['phone']] || '').trim();
        const rawEmail = String(row[columnMapping['email']] || '').trim();
        const rawEst = String(row[columnMapping['establishmentName']] || '').trim();
        const rawColony = String(row[columnMapping['colonyParaje']] || '').trim();
        const rawSurfaceText = String(row[columnMapping['surfaceHa']] ?? '').trim();
        const rawSurface = rawSurfaceText === '' ? Number.NaN : parseFloat(rawSurfaceText.replace(',', '.').replace(/[^0-9.]/g, ''));
        const rawAct = String(row[columnMapping['activityType']] || '').trim();
        const rawLat = parseFloat(String(row[columnMapping['lat']] || '').replace(',', '.'));
        const rawLng = parseFloat(String(row[columnMapping['lng']] || '').replace(',', '.'));
        const rawNotes = String(row[columnMapping['observations']] || '').trim();

        // Municipality normalization
        let normalizedMun = rawMun;
        const matchedMun = MISIONES_MUNICIPALITIES.find((m) =>
          m.name.toLowerCase() === rawMun.toLowerCase() ||
          rawMun.toLowerCase().includes(m.name.toLowerCase())
        );
        if (matchedMun) {
          normalizedMun = matchedMun.name;
        }

        // Coordinate validation
        const hasValidCoords = Number.isFinite(rawLat) && Number.isFinite(rawLng);
        const inMisiones = hasValidCoords && isCoordinateInMisionesRange(rawLat, rawLng);

        // Duplicate checks
        const existsInDb = rawDni && existingDniMap.has(rawDni);
        const duplicateInFile = rawDni && fileDniSet.has(rawDni);
        if (rawDni) fileDniSet.add(rawDni);

        // Validation status
        let status: 'valid' | 'duplicate_db' | 'duplicate_file' | 'incomplete' = 'valid';
        let errorMsg = '';

        if (!rawDni || !rawFullName) {
          status = 'incomplete';
          errorMsg = 'Falta DNI o Nombre del productor';
        } else if (existsInDb) {
          status = 'duplicate_db';
        } else if (duplicateInFile) {
          status = 'duplicate_file';
        }

        processed.push({
          rowNumber: idx + 2, // 1-indexed header + row
          dni: rawDni,
          fullName: rawFullName,
          phone: rawPhone,
          email: rawEmail,
          establishmentName: rawEst || 'Establecimiento sin nombre',
          municipality: normalizedMun,
          colonyParaje: rawColony || 'Zona rural',
          surfaceHa: Number.isFinite(rawSurface) && rawSurface >= 0 ? rawSurface : null,
          activityType: rawAct || 'Yerba Mate',
          lat: hasValidCoords ? rawLat : undefined,
          lng: hasValidCoords ? rawLng : undefined,
          isGeolocated: hasValidCoords,
          inMisiones,
          observations: rawNotes,
          status,
          errorMsg,
          existingProducer: existsInDb ? existingDniMap.get(rawDni) : null
        });
      });

      setProcessedRows(processed);
    } catch (err: any) {
      alert(`Error en el procesamiento: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Commit Import to Dexie DB (Step 7)
  const handleExecuteImport = async () => {
    setIsProcessing(true);
    const now = new Date().toISOString();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let importedCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    const log: string[] = [];

    try {
      for (const row of processedRows) {
        if (row.status === 'incomplete') {
          skippedCount++;
          log.push(`Fila ${row.rowNumber} omitida: ${row.errorMsg}`);
          continue;
        }

        // Handle duplicates
        if (row.status === 'duplicate_db') {
          duplicateCount++;
          if (duplicateStrategy === 'create_only_new') {
            skippedCount++;
            log.push(`Fila ${row.rowNumber} omitida: DNI ${row.dni} ya existe en el sistema`);
            continue;
          } else if (duplicateStrategy === 'update_existing') {
            // Update existing producer
            const existing = row.existingProducer;
            if (existing) {
              const updatedProd: Producer = {
                ...existing,
                fullName: row.fullName || existing.fullName,
                phone: row.phone || existing.phone,
                email: row.email || existing.email,
                establishmentName: row.establishmentName || existing.establishmentName,
                municipality: row.municipality || existing.municipality,
                surfaceHa: row.surfaceHa == null ? existing.surfaceHa : row.surfaceHa,
                lat: row.lat !== undefined ? row.lat : existing.lat,
                lng: row.lng !== undefined ? row.lng : existing.lng,
                isGeolocated: row.lat !== undefined ? true : existing.isGeolocated,
                version: existing.version + 1,
                updatedAt: now,
                syncStatus: 'pending',
                cloudRevision: existing.cloudRevision,
                importBatchId: batchId
              };

              await syncEngine.saveAndEnqueue('producers', updatedProd, 'update');
              updatedCount++;
              log.push(`Fila ${row.rowNumber}: Actualizado productor ${row.fullName} (DNI ${row.dni})`);
              continue;
            }
          }
        }

        // Normalize activity
        const actName = row.activityType || 'Yerba Mate';
        const catalogMatch = PRODUCTIVE_ACTIVITIES_CATALOG.find((c) =>
          c.name.toLowerCase().includes(actName.toLowerCase()) ||
          c.type.includes(actName.toLowerCase())
        );

        const newActivity: ProductiveActivity = {
          id: `act_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          producerId: '',
          type: catalogMatch?.type || 'yerba_mate',
          title: catalogMatch?.name || actName,
          surfaceHa: row.surfaceHa ?? null,
          specificData: {
            sistemaProductivo: 'Relevamiento importado de padrón externo'
          },
          createdAt: now
        };

        const producerId = `prod_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        newActivity.producerId = producerId;

        const newProducer: Producer = {
          id: producerId,
          dni: row.dni,
          fullName: row.fullName,
          phone: row.phone || '',
          email: row.email || '',
          isEstablishmentHead: true,
          producerType: 'pequeno_familiar',
          establishmentName: row.establishmentName || 'Establecimiento sin nombre',
          municipality: row.municipality || '',
          colonyParaje: row.colonyParaje || 'Zona rural',
          addressReference: row.observations || '',
          lat: row.lat ?? null,
          lng: row.lng ?? null,
          isGeolocated: Number.isFinite(row.lat) && Number.isFinite(row.lng),
          locationMethod: Number.isFinite(row.lat) && Number.isFinite(row.lng) ? 'manual_coords' : undefined,
          tenureType: null,
          surfaceHa: row.surfaceHa ?? null,
          activities: [newActivity],
          observations: `Importado desde archivo "${file?.name || 'Excel'}" (Fila ${row.rowNumber}). ${row.observations}`,
          syncStatus: 'pending',
          version: 1,
          createdAt: now,
          updatedAt: now,
          createdById: currentUserId,
          createdByName: currentUserName,
          verifiedBySupervisor: false,
          importBatchId: batchId,
          importSourceFileName: file?.name || 'archivo',
          importSheetName: selectedSheet,
          importRowNumber: row.rowNumber
        };

        await syncEngine.saveAndEnqueue('producers', newProducer, 'insert');
        importedCount++;
        log.push(`Fila ${row.rowNumber}: Creado productor ${row.fullName} (DNI ${row.dni})`);
      }

      // Record batch in db
      const importBatchRecord: ImportBatch = {
        id: batchId,
        fileName: file?.name || 'Archivo',
        fileSize: file?.size || 0,
        format: file?.name.split('.').pop()?.toUpperCase() || 'XLSX',
        sheetsCount: sheetNames.length,
        selectedSheet,
        totalRows: processedRows.length,
        validRows: processedRows.filter((r) => r.status === 'valid').length,
        duplicateRows: duplicateCount,
        errorRows: skippedCount,
        importedCount,
        updatedCount,
        skippedCount,
        duplicateStrategy,
        columnMapping,
        createdAt: now,
        createdById: currentUserId,
        createdByName: currentUserName,
        status: 'completed',
        reportLog: log
      };

      await db.importBatches.put(importBatchRecord);

      // Audit log
      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        userId: currentUserId,
        userName: currentUserName,
        userRole: 'ADMINISTRADOR',
        action: 'IMPORT_DATABASE',
        entity: 'producers',
        entityId: batchId,
        details: `Importación masiva: ${importedCount} productores nuevos, ${updatedCount} actualizados desde "${file?.name}"`,
        device: 'Web Admin / Database Importer',
        timestamp: now
      });

      // Notification
      await db.notifications.add({
        id: `notif_${Date.now()}`,
        title: 'Importación de Base de Datos Completada',
        message: `Se incorporaron ${importedCount} productores y actualizaron ${updatedCount} desde "${file?.name}".`,
        type: 'sync',
        targetRoles: ['SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR'],
        read: false,
        createdAt: now
      });

      setImportResult({
        batchId,
        importedCount,
        updatedCount,
        duplicateCount,
        errorCount: skippedCount,
        skippedCount,
        log
      });

      setStep(5); // Result step
      onImportComplete();
    } catch (err: any) {
      alert(`Error durante la importación: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Import Audit Report
  const handleDownloadReport = () => {
    if (!importResult) return;
    const reportText = [
      `INFORME DE IMPORTACIÓN - SIP MISIONES`,
      `Fecha: ${new Date().toLocaleString()}`,
      `Lote ID: ${importResult.batchId}`,
      `Archivo: ${file?.name || 'Excel'}`,
      `Hoja: ${selectedSheet}`,
      `Responsable: ${currentUserName}`,
      `----------------------------------------`,
      `Productores Creados: ${importResult.importedCount}`,
      `Productores Actualizados: ${importResult.updatedCount}`,
      `Duplicados Detectados: ${importResult.duplicateCount}`,
      `Filas Omitidas / Errores: ${importResult.errorCount}`,
      `----------------------------------------`,
      `DETALLE DE OPERACIONES:`,
      ...importResult.log
    ].join('\n');

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIP_Misiones_Reporte_Importacion_${importResult.batchId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-[#27865A]" />
            <span>Importar Base de Datos Externa</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Incorpore padrones históricos en XLSX, XLS o CSV mapeando columnas al modelo de SIP Misiones.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#27865A]" />
          <span>Descargar Plantilla Modelo (.xlsx)</span>
        </button>
      </div>

      {/* Progress Steps Header */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs font-semibold overflow-x-auto">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-xl whitespace-nowrap ${step === 1 ? 'bg-[#174C35] text-white' : 'text-slate-500'}`}>
          <span>1. Subir Archivo</span>
        </div>
        <span className="text-slate-300">→</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-xl whitespace-nowrap ${step === 2 || step === 3 ? 'bg-[#174C35] text-white' : 'text-slate-500'}`}>
          <span>2. Mapeo de Columnas</span>
        </div>
        <span className="text-slate-300">→</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-xl whitespace-nowrap ${step === 4 ? 'bg-[#174C35] text-white' : 'text-slate-500'}`}>
          <span>3. Vista Previa & Duplicados</span>
        </div>
        <span className="text-slate-300">→</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-xl whitespace-nowrap ${step === 5 ? 'bg-[#174C35] text-white' : 'text-slate-500'}`}>
          <span>4. Resultados</span>
        </div>
      </div>

      {/* STEP 1: Upload File */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#27865A] bg-[#F5F7F5]/50 hover:bg-[#E8F2EA]/20 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#E8F2EA] text-[#174C35] flex items-center justify-center shadow-xs">
              <Upload className="w-8 h-8 text-[#27865A]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                Arrastre su archivo de productores aquí o haga clic para seleccionar
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Formatos compatibles: Microsoft Excel (.xlsx, .xls), Valores Separados por Comas (.csv) y Respaldos JSON (.json).
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-4 py-2 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs rounded-xl transition shadow-xs">
                Examinar Archivos
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#27865A] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-800">Reconocimiento Inteligente</strong>
                <span>Detecta encabezados como DNI, Documento, Nombre, Municipio o Cultivo.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#27865A] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-800">Protección de Datos</strong>
                <span>Detección de duplicados para no sobrescribir información sin permiso.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#27865A] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-800">Trazabilidad Total</strong>
                <span>Guarda el archivo de origen, fila y fecha en el historial de cada productor.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: File Info & Column Mapping */}
      {step === 2 && file && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
          {/* File Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[#27865A]">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{file.name}</h4>
                <div className="text-slate-500 text-[11px] flex gap-3 mt-0.5">
                  <span>Tamaño: {(file.size / 1024).toFixed(1)} KB</span>
                  <span>·</span>
                  <span>Filas detectadas: <strong>{rawRows.length}</strong></span>
                  <span>·</span>
                  <span>Columnas: <strong>{rawHeaders.length}</strong></span>
                </div>
              </div>
            </div>

            {sheetNames.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Hoja a importar:</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                >
                  {sheetNames.map((sn) => (
                    <option key={sn} value={sn}>
                      {sn}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Mapping Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Asociación de Columnas de su Archivo con SIP Misiones
                </h3>
                <p className="text-xs text-slate-500">
                  Verifique que cada campo de su planilla corresponda al dato correcto del sistema.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-[#174C35] bg-[#E8F2EA] px-2.5 py-1 rounded-full">
                {Object.values(columnMapping).filter(Boolean).length} de {SIP_SYSTEM_FIELDS.length} mapeados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto p-1">
              {SIP_SYSTEM_FIELDS.map((field) => {
                const mappedVal = columnMapping[field.key] || '';
                const isMapped = Boolean(mappedVal);

                return (
                  <div
                    key={field.key}
                    className={`p-3.5 rounded-2xl border transition ${
                      isMapped ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </span>
                      {isMapped ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Asignado
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">Sin asignar</span>
                      )}
                    </div>

                    <select
                      value={mappedVal}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-1 focus:ring-[#27865A]"
                    >
                      <option value="">-- No incluir / Omitir --</option>
                      {rawHeaders.map((header) => (
                        <option key={header} value={header}>
                          Columna: "{header}"
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-700"
            >
              Cambiar Archivo
            </button>

            <button
              onClick={processAndPreviewData}
              disabled={!columnMapping['dni'] || !columnMapping['fullName']}
              className="px-6 py-2.5 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs rounded-xl flex items-center gap-2 transition disabled:opacity-40"
            >
              <span>Continuar a Vista Previa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Preview, Duplicates & Strategy */}
      {step === 4 && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total de Filas</span>
              <span className="text-xl font-bold font-mono text-slate-900">{processedRows.length}</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-bold block">Nuevos Válidos</span>
              <span className="text-xl font-bold font-mono text-emerald-800">
                {processedRows.filter((r) => r.status === 'valid').length}
              </span>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-amber-700 uppercase font-bold block">Ya Existen en Sistema</span>
              <span className="text-xl font-bold font-mono text-amber-800">
                {processedRows.filter((r) => r.status === 'duplicate_db').length}
              </span>
            </div>

            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-[10px] text-rose-700 uppercase font-bold block">Incompletos / Error</span>
              <span className="text-xl font-bold font-mono text-rose-800">
                {processedRows.filter((r) => r.status === 'incomplete').length}
              </span>
            </div>
          </div>

          {/* Duplicate Strategy Policy */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Estrategia ante Productores que ya existen por DNI:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'create_only_new', title: 'A. Solo Productores Nuevos', desc: 'Omite sin tocar los DNI que ya existen en la base.' },
                { id: 'update_existing', title: 'B. Actualizar Existentes', desc: 'Completa los campos con la información de la planilla.' },
                { id: 'import_all_flag_review', title: 'C. Importar y Mandar a Revisión', desc: 'Registra los datos marcándolos para supervisión.' }
              ].map((strat) => (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => setDuplicateStrategy(strat.id as any)}
                  className={`p-3 rounded-xl border text-left transition ${
                    duplicateStrategy === strat.id
                      ? 'border-[#27865A] bg-[#E8F2EA] text-[#174C35] font-semibold ring-1 ring-[#27865A]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs">{strat.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{strat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Table Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Vista Previa de Filas Interpretadas (Primeras 15 filas):
            </span>
            <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Fila</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">DNI</th>
                    <th className="px-3 py-2">Nombre y Apellido</th>
                    <th className="px-3 py-2">Municipio</th>
                    <th className="px-3 py-2">Establecimiento</th>
                    <th className="px-3 py-2">Superficie</th>
                    <th className="px-3 py-2">Cultivo</th>
                    <th className="px-3 py-2">GPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {processedRows.slice(0, 15).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono text-slate-400">{r.rowNumber}</td>
                      <td className="px-3 py-2">
                        {r.status === 'valid' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Nuevo
                          </span>
                        )}
                        {r.status === 'duplicate_db' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Existe en BD
                          </span>
                        )}
                        {r.status === 'incomplete' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Incompleto
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-900">{r.dni || '—'}</td>
                      <td className="px-3 py-2 text-slate-900">{r.fullName || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{r.municipality}</td>
                      <td className="px-3 py-2 text-slate-600">{r.establishmentName}</td>
                      <td className="px-3 py-2 font-mono">{r.surfaceHa} ha</td>
                      <td className="px-3 py-2 text-slate-700">{r.activityType}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-500">
                        {r.isGeolocated ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : 'Sin GPS'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-700"
            >
              Volver al Mapeo
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-[#E8F2EA]" />
              <span>{isProcessing ? 'Importando a Base de Datos...' : 'Confirmar e Importar Productores'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Results Screen */}
      {step === 5 && importResult && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">
              ¡Importación Territorial Completada Exitosamente!
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Los registros han sido procesados, validados e incorporados a la base de datos de SIP Misiones con trazabilidad de origen.
            </p>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-xs">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-bold block">Nuevos Creados</span>
              <span className="text-2xl font-bold font-mono text-emerald-800 mt-1 block">
                {importResult.importedCount}
              </span>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
              <span className="text-[10px] text-blue-700 uppercase font-bold block">Actualizados</span>
              <span className="text-2xl font-bold font-mono text-blue-800 mt-1 block">
                {importResult.updatedCount}
              </span>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-amber-700 uppercase font-bold block">Duplicados Omitidos</span>
              <span className="text-2xl font-bold font-mono text-amber-800 mt-1 block">
                {importResult.duplicateCount}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Lote ID</span>
              <span className="text-xs font-mono font-bold text-slate-800 mt-2 block truncate">
                {importResult.batchId}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4 text-[#27865A]" />
              <span>Descargar Informe de Importación (.txt)</span>
            </button>

            <button
              onClick={onGoToProducers}
              className="px-5 py-2.5 rounded-xl bg-[#27865A] hover:bg-[#174C35] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <span>Ver en Padrón de Productores</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onGoToMap}
              className="px-5 py-2.5 rounded-xl bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <span>Ver en el Mapa Productivo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
