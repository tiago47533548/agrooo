import React, { useEffect, useRef, useState } from 'react';
import { Producer, ProductiveActivityType } from '../../db/schema';
import { PRODUCTIVE_ACTIVITIES_CATALOG, MISIONES_MUNICIPALITIES } from '../../db/misionesCatalog';
import { 
  MapPin, 
  Layers, 
  Filter, 
  Maximize2, 
  Minimize2, 
  Compass, 
  Search, 
  X, 
  Phone, 
  User, 
  ExternalLink,
  Flame,
  CheckCircle2,
  Clock,
  Calendar,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Info
} from 'lucide-react';
import L from 'leaflet';

interface MisionesMapProps {
  producers: Producer[];
  selectedProducerId?: string | null;
  onSelectProducer?: (producer: Producer) => void;
  // For field wizard mode:
  isPickerMode?: boolean;
  initialCoords?: { lat: number; lng: number };
  onLocationPicked?: (coords: { lat: number; lng: number }) => void;
  height?: string;
  showAdvancedFilters?: boolean;
}

export const MisionesMap: React.FC<MisionesMapProps> = ({
  producers,
  selectedProducerId,
  onSelectProducer,
  isPickerMode = false,
  initialCoords = { lat: -27.4862, lng: -55.1205 }, // Oberá default
  onLocationPicked,
  height = 'h-[500px]',
  showAdvancedFilters = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // View & Filter States
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [filterMunicipality, setFilterMunicipality] = useState<string>('all');
  const [filterActivity, setFilterActivity] = useState<string>('all');
  const [filterTechnician, setFilterTechnician] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7days' | '30days' | '90days'>('all');
  const [filterSyncState, setFilterSyncState] = useState<'all' | 'synced' | 'pending'>('all');
  const [showDensityHeatmap, setShowDensityHeatmap] = useState<boolean>(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProducer, setActiveProducer] = useState<Producer | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract list of technicians
  const techniciansList = Array.from(new Set(producers.map((p) => p.createdByName).filter(Boolean)));

  // Count un-geolocated producers
  const unlocCount = producers.filter((p) => p.lat === undefined || p.lng === undefined || p.lat === null).length;

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const centerLat = isPickerMode ? initialCoords.lat : -26.95;
      const centerLng = isPickerMode ? initialCoords.lng : -54.75;
      const zoomLevel = isPickerMode ? 13 : 8;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: zoomLevel,
        zoomControl: true,
        attributionControl: false
      });

      L.control.attribution({ position: 'bottomright', prefix: 'SIP Misiones · IGN / OSM' }).addTo(map);

      // Base tile layer
      const standardTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      });
      standardTile.addTo(map);
      tileLayerRef.current = standardTile;

      // Layers
      const heatmapGroup = L.layerGroup().addTo(map);
      heatmapLayerRef.current = heatmapGroup;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      mapInstanceRef.current = map;

      // In picker mode, allow clicking anywhere on map to reposition marker
      if (isPickerMode) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLatLng([lat, lng]);
          }
          onLocationPicked?.({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
        });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Tile layer switch
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let maxZoom = 19;

    if (mapType === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    } else if (mapType === 'terrain') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      maxZoom = 17;
    }

    const newLayer = L.tileLayer(url, { maxZoom });
    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // 3. Picker Marker update in Wizard mode
  useEffect(() => {
    if (!isPickerMode || !mapInstanceRef.current) return;

    if (!pickerMarkerRef.current) {
      const pinIcon = L.divIcon({
        className: 'custom-picker-pin',
        html: `
          <div style="background-color: #A33B20; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); border: 3px solid white;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      });

      const marker = L.marker([initialCoords.lat, initialCoords.lng], {
        icon: pinIcon,
        draggable: true
      }).addTo(mapInstanceRef.current);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onLocationPicked?.({ lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) });
      });

      pickerMarkerRef.current = marker;
    } else {
      pickerMarkerRef.current.setLatLng([initialCoords.lat, initialCoords.lng]);
    }
  }, [isPickerMode, initialCoords.lat, initialCoords.lng]);

  // 4. Filter and populate producer markers & heatmap
  useEffect(() => {
    if (isPickerMode || !mapInstanceRef.current || !markersLayerRef.current || !heatmapLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    heatmapLayerRef.current.clearLayers();

    const now = new Date().getTime();

    const filtered = producers.filter((p) => {
      // Must have valid lat/lng
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number' || isNaN(p.lat) || isNaN(p.lng)) {
        return false;
      }

      // Municipality filter
      if (filterMunicipality !== 'all' && p.municipality.toLowerCase() !== filterMunicipality.toLowerCase()) {
        return false;
      }

      // Activity filter
      if (filterActivity !== 'all') {
        const hasAct = p.activities?.some((a) => a.type === filterActivity);
        if (!hasAct) return false;
      }

      // Technician filter
      if (filterTechnician !== 'all' && p.createdByName !== filterTechnician) {
        return false;
      }

      // Sync state filter
      if (filterSyncState !== 'all') {
        if (filterSyncState === 'pending' && p.syncStatus !== 'pending') return false;
        if (filterSyncState === 'synced' && p.syncStatus === 'pending') return false;
      }

      // Period filter
      if (filterPeriod !== 'all') {
        const pDate = new Date(p.createdAt).getTime();
        const diffDays = (now - pDate) / (1000 * 60 * 60 * 24);
        if (filterPeriod === '7days' && diffDays > 7) return false;
        if (filterPeriod === '30days' && diffDays > 30) return false;
        if (filterPeriod === '90days' && diffDays > 90) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.fullName.toLowerCase().includes(q);
        const matchesDni = p.dni.includes(q);
        const matchesEst = p.establishmentName.toLowerCase().includes(q);
        if (!matchesName && !matchesDni && !matchesEst) return false;
      }

      return true;
    });

    // Draw Heatmap / Concentration buffers if enabled
    if (showDensityHeatmap) {
      filtered.forEach((p) => {
        if (typeof p.lat !== 'number' || !Number.isFinite(p.lat) || typeof p.lng !== 'number' || !Number.isFinite(p.lng)) return;
        const primaryAct = p.activities?.[0]?.type || 'yerba_mate';
        const cat = PRODUCTIVE_ACTIVITIES_CATALOG.find((c) => c.type === primaryAct);
        const heatColor = cat?.color || '#27865A';
        const radiusMeters = Math.min(Math.max((p.surfaceHa || 10) * 120, 1500), 7500);

        const circle = L.circle([p.lat, p.lng], {
          radius: radiusMeters,
          color: heatColor,
          fillColor: heatColor,
          fillOpacity: 0.18,
          weight: 1.5,
          opacity: 0.5
        });

        heatmapLayerRef.current?.addLayer(circle);
      });
    }

    // Draw Individual Markers
    filtered.forEach((producer) => {
      if (typeof producer.lat !== 'number' || !Number.isFinite(producer.lat) || typeof producer.lng !== 'number' || !Number.isFinite(producer.lng)) return;
      const primaryAct = producer.activities?.[0]?.type || 'yerba_mate';
      const cat = PRODUCTIVE_ACTIVITIES_CATALOG.find((c) => c.type === primaryAct);
      const pinColor = cat?.color || '#27865A';
      const isSelected = selectedProducerId === producer.id;
      const isPending = producer.syncStatus === 'pending';

      const size = isSelected ? 38 : 30;
      const innerSize = isSelected ? 30 : 24;

      // Pending markers get a dashed amber outer halo to indicate local unconfirmed status
      const borderStyle = isPending 
        ? 'border: 3px dashed #E9A23B; animation: pulse 2s infinite;' 
        : 'border: 2.5px solid white;';

      const customIcon = L.divIcon({
        className: 'custom-producer-pin',
        html: `
          <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
            ${isPending ? '<div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px dashed #E9A23B; opacity: 0.9;"></div>' : ''}
            <div style="background-color: ${pinColor}; color: white; width: ${innerSize}px; height: ${innerSize}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); ${borderStyle} transition: transform 0.2s;">
              <span style="font-size: 10px; font-weight: 800; font-family: monospace;">${producer.surfaceHa ? Math.round(producer.surfaceHa) : '•'}</span>
            </div>
            ${isPending ? '<div style="position: absolute; top: -2px; right: -2px; width: 9px; height: 9px; background-color: #E9A23B; border-radius: 50%; border: 1.5px solid white;"></div>' : ''}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([producer.lat, producer.lng], { icon: customIcon });

      marker.on('click', () => {
        setActiveProducer(producer);
        onSelectProducer?.(producer);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [
    producers,
    filterMunicipality,
    filterActivity,
    filterTechnician,
    filterPeriod,
    filterSyncState,
    showDensityHeatmap,
    searchQuery,
    selectedProducerId,
    isPickerMode
  ]);

  // Center map on selected producer if provided
  useEffect(() => {
    if (selectedProducerId && mapInstanceRef.current) {
      const found = producers.find((p) => p.id === selectedProducerId);
      if (found && typeof found.lat === 'number' && typeof found.lng === 'number') {
        mapInstanceRef.current.flyTo([found.lat, found.lng], 13, { duration: 1.2 });
        setActiveProducer(found);
      }
    }
  }, [selectedProducerId, producers]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white ${isExpanded ? 'fixed inset-4 z-50 h-auto' : height}`}>
      {/* Top Map Controls Bar */}
      {!isPickerMode && (
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Search & Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/80 shadow-md">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por DNI, nombre o chacra..."
                className="pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#27865A] w-40 sm:w-56 bg-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Municipality Select */}
            <select
              value={filterMunicipality}
              onChange={(e) => setFilterMunicipality(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#27865A]"
            >
              <option value="all">Municipios (Todos)</option>
              {MISIONES_MUNICIPALITIES.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Advanced Filters Toggle */}
            {showAdvancedFilters && (
              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  showFiltersPanel || filterActivity !== 'all' || filterSyncState !== 'all' || filterTechnician !== 'all'
                    ? 'bg-[#174C35] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="Abrir panel de filtros territoriales"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filtros</span>
              </button>
            )}

            {/* Heatmap Concentration Toggle */}
            <button
              onClick={() => setShowDensityHeatmap(!showDensityHeatmap)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                showDensityHeatmap ? 'bg-[#E9A23B] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="Activar/Desactivar mapa de calor de concentración productiva"
            >
              <Flame className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Concentración</span>
            </button>
          </div>

          {/* Right controls: Layers, Legend & Fullscreen */}
          <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-md">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                showLegend ? 'bg-[#174C35] text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Ver leyenda de cultivos y estados"
            >
              Leyenda
            </button>

            <button
              onClick={() => setMapType(mapType === 'standard' ? 'satellite' : mapType === 'satellite' ? 'terrain' : 'standard')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Cambiar vista de mapa (Calles / Satelital / Topográfico)"
            >
              <Layers className="w-3.5 h-3.5 text-[#27865A]" />
              <span className="capitalize">{mapType === 'standard' ? 'Calles' : mapType === 'satellite' ? 'Satelital' : 'Relieve'}</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              title={isExpanded ? 'Restaurar tamaño' : 'Pantalla completa'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filters Sliding Drawer / Panel */}
      {showFiltersPanel && !isPickerMode && (
        <div className="absolute top-14 left-3 z-30 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-4 space-y-3.5 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Filtros Geográficos Avanzados
            </span>
            <button
              onClick={() => setShowFiltersPanel(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Activity / Crop Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Actividad Productiva / Cultivo
            </label>
            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-[#27865A]"
            >
              <option value="all">Todas las Producciones</option>
              {PRODUCTIVE_ACTIVITIES_CATALOG.map((a) => (
                <option key={a.type} value={a.type}>
                  {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>

          {/* Technician Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Técnico de Campo Responsable
            </label>
            <select
              value={filterTechnician}
              onChange={(e) => setFilterTechnician(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-[#27865A]"
            >
              <option value="all">Todos los Técnicos</option>
              {techniciansList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Estado de Sincronización
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'synced', label: 'En Nube' },
                { id: 'pending', label: 'Pendientes' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFilterSyncState(s.id as any)}
                  className={`py-1 text-xs rounded-lg font-semibold border transition ${
                    filterSyncState === s.id
                      ? 'bg-[#174C35] text-white border-[#174C35]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Survey Period Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Período de Relevamiento
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: 'all', label: 'Todo el Histórico' },
                { id: '7days', label: 'Últimos 7 días' },
                { id: '30days', label: 'Últimos 30 días' },
                { id: '90days', label: 'Último trimestre' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setFilterPeriod(p.id as any)}
                  className={`py-1 px-2 rounded-lg text-[11px] font-semibold border transition text-center ${
                    filterPeriod === p.id
                      ? 'bg-[#27865A] text-white border-[#27865A]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => {
                setFilterMunicipality('all');
                setFilterActivity('all');
                setFilterTechnician('all');
                setFilterPeriod('all');
                setFilterSyncState('all');
                setSearchQuery('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Restablecer Filtros
            </button>
            <button
              onClick={() => setShowFiltersPanel(false)}
              className="px-3 py-1 bg-[#174C35] text-white rounded-lg text-xs font-bold"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}

      {/* Productive Legend Drawer */}
      {showLegend && !isPickerMode && (
        <div className="absolute top-14 right-3 z-30 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-4 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Leyenda Productiva
            </span>
            <button onClick={() => setShowLegend(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Activity categories list */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
            {PRODUCTIVE_ACTIVITIES_CATALOG.map((cat) => (
              <div key={cat.type} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-700 font-medium">{cat.name}</span>
                </span>
                <span className="text-[10px] text-slate-400">{cat.category}</span>
              </div>
            ))}
          </div>

          {/* Sync status legend */}
          <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-[#27865A] border-2 border-white shadow-xs" />
              <span className="text-slate-700">Confirmado en Nube</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-[#27865A] border-2 border-dashed border-[#E9A23B]" />
              <span className="text-slate-700">Pendiente Local (Sin Nube)</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Un-geolocated Notice Badge */}
      {unlocCount > 0 && !isPickerMode && (
        <div className="absolute bottom-3 right-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-300 shadow-md flex items-center gap-2 text-xs text-amber-900">
          <Info className="w-4 h-4 text-[#E9A23B]" />
          <span>
            <strong>{unlocCount}</strong> productor{unlocCount === 1 ? '' : 'es'} sin geolocalizar
          </span>
        </div>
      )}

      {/* Picker Coordinates Badge (in wizard mode) */}
      {isPickerMode && (
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-md flex items-center gap-2.5 text-xs">
          <Compass className="w-4 h-4 text-[#A33B20]" />
          <div>
            <div className="font-semibold text-slate-800">Ubicación Seleccionada</div>
            <div className="font-mono text-[11px] text-slate-600">
              Lat: {initialCoords.lat.toFixed(5)} · Lng: {initialCoords.lng.toFixed(5)}
            </div>
          </div>
        </div>
      )}

      {/* Selected Producer floating drawer / card */}
      {activeProducer && !isPickerMode && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-88 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#27865A]">
                  {activeProducer.municipality} · {activeProducer.colonyParaje}
                </span>
                {activeProducer.syncStatus === 'pending' && (
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                    Pendiente Local
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">{activeProducer.fullName}</h4>
              <p className="text-xs text-slate-500">{activeProducer.establishmentName}</p>
            </div>
            <button
              onClick={() => setActiveProducer(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">DNI</span>
              <span className="font-mono font-medium text-slate-800">{activeProducer.dni}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Superficie</span>
              <span className="font-medium text-slate-800">{activeProducer.surfaceHa} ha</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Técnico</span>
              <span className="text-slate-700 font-medium truncate block">{activeProducer.createdByName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Fecha Relevamiento</span>
              <span className="text-slate-700">{new Date(activeProducer.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Activities badges */}
          <div className="mt-2.5 flex flex-wrap gap-1">
            {activeProducer.activities?.map((act) => (
              <span
                key={act.id}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#E8F2EA] text-[#174C35]"
              >
                {act.title}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] font-mono text-slate-500">
              {Number.isFinite(activeProducer.lat) && Number.isFinite(activeProducer.lng) ? `${activeProducer.lat!.toFixed(4)}, ${activeProducer.lng!.toFixed(4)}` : 'Sin coordenadas registradas'}
            </span>
            <button
              onClick={() => onSelectProducer?.(activeProducer)}
              className="text-xs font-semibold text-[#174C35] hover:text-[#27865A] flex items-center gap-1"
            >
              <span>Ver ficha completa</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
