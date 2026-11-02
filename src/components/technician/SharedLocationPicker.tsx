import React, { useState, useEffect } from 'react';
import { LocationCaptureMethod } from '../../db/schema';
import { MISIONES_MUNICIPALITIES } from '../../db/misionesCatalog';
import { MisionesMap } from '../map/MisionesMap';
import { 
  parseLocationInput, 
  ParsedLocationResult, 
  findNearestMisionesMunicipality, 
  isCoordinateInMisionesRange 
} from '../../utils/locationParser';
import { 
  Compass, 
  Map as MapIcon, 
  Share2, 
  MapPin, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Edit3, 
  MessageSquare, 
  ExternalLink,
  CheckCircle2,
  Navigation,
  Globe
} from 'lucide-react';

interface SharedLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialMethod?: LocationCaptureMethod;
  initialAddressRef?: string;
  initialMunicipality?: string;
  currentUserName: string;
  onLocationConfirmed: (locationData: {
    lat: number;
    lng: number;
    municipality: string;
    addressReference: string;
    locationMethod: LocationCaptureMethod;
    gpsAccuracyMeters?: number;
    originalInput?: string;
    locationCapturedAt: string;
    locationCapturedBy: string;
  }) => void;
}

export const SharedLocationPicker: React.FC<SharedLocationPickerProps> = ({
  initialLat = -27.4862,
  initialLng = -55.1205,
  initialMethod = 'manual_map',
  initialAddressRef = '',
  initialMunicipality = 'Oberá',
  currentUserName,
  onLocationConfirmed
}) => {
  const [activeTab, setActiveTab] = useState<'gps' | 'map' | 'share'>('map');
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [municipality, setMunicipality] = useState<string>(initialMunicipality);
  const [addressRef, setAddressRef] = useState<string>(initialAddressRef);
  const [captureMethod, setCaptureMethod] = useState<LocationCaptureMethod>(initialMethod);
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>(undefined);
  const [originalInput, setOriginalInput] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(true);

  // GPS state
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Share / paste text state
  const [pastedText, setPastedText] = useState('');
  const [parseResult, setParseResult] = useState<ParsedLocationResult | null>(null);

  // Update nearest municipality when lat/lng changes
  const updateNearestMunicipality = (newLat: number, newLng: number) => {
    const nearest = findNearestMisionesMunicipality(newLat, newLng);
    if (nearest && nearest.distanceKm < 45) {
      setMunicipality(nearest.name);
    }
  };

  // 1. GPS Handler
  const handleGetDeviceGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('La geolocalización no está disponible en este navegador o dispositivo.');
      return;
    }

    setIsLocatingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const roundedLat = Number(latitude.toFixed(6));
        const roundedLng = Number(longitude.toFixed(6));
        setLat(roundedLat);
        setLng(roundedLng);
        setAccuracyMeters(Math.round(accuracy));
        setCaptureMethod('gps_auto');
        setOriginalInput(`GPS Nativo del Dispositivo (±${Math.round(accuracy)}m)`);
        updateNearestMunicipality(roundedLat, roundedLng);
        setIsLocatingGPS(false);
        setIsConfirmed(false); // prompt to confirm
      },
      (err) => {
        setIsLocatingGPS(false);
        setGpsError(`Error al obtener ubicación GPS: ${err.message}. Puede seleccionar en el mapa o pegar un enlace de WhatsApp.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  // 2. Map Picker Handler
  const handleMapLocationPicked = (coords: { lat: number; lng: number }) => {
    setLat(coords.lat);
    setLng(coords.lng);
    setCaptureMethod('manual_map');
    setAccuracyMeters(undefined);
    setOriginalInput(`Seleccionado manualmente en mapa (${coords.lat}, ${coords.lng})`);
    updateNearestMunicipality(coords.lat, coords.lng);
    setIsConfirmed(false);
  };

  // 3. Share / Paste Handler
  const handleParsePastedLocation = () => {
    if (!pastedText.trim()) return;
    const res = parseLocationInput(pastedText);
    setParseResult(res);

    if (res.success && res.lat !== null && res.lng !== null) {
      setLat(res.lat);
      setLng(res.lng);
      setOriginalInput(pastedText);
      const isWhatsApp = res.sourceType === 'whatsapp_location' || pastedText.toLowerCase().includes('wa.me');
      setCaptureMethod(isWhatsApp ? 'shared_link' : res.sourceType === 'google_maps_url' ? 'shared_link' : 'manual_coords');
      setAccuracyMeters(undefined);

      if (res.estimatedMunicipality) {
        setMunicipality(res.estimatedMunicipality);
      }
      setIsConfirmed(false);
    }
  };

  const handleConfirmLocation = () => {
    setIsConfirmed(true);
    onLocationConfirmed({
      lat,
      lng,
      municipality,
      addressReference: addressRef,
      locationMethod: captureMethod,
      gpsAccuracyMeters: accuracyMeters,
      originalInput,
      locationCapturedAt: new Date().toISOString(),
      locationCapturedBy: currentUserName
    });
  };

  const getMethodBadge = () => {
    switch (captureMethod) {
      case 'gps_auto':
        return { label: 'GPS Automático del Dispositivo', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'manual_map':
        return { label: 'Seleccionado en Mapa Interactivo', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'shared_link':
        return { label: 'Ubicación Compartida (WhatsApp / Maps)', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'manual_coords':
      default:
        return { label: 'Coordenadas Ingresadas Manualmente', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const methodBadge = getMethodBadge();
  const inMisiones = isCoordinateInMisionesRange(lat, lng);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-4 sm:p-5">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#27865A]" />
          <div>
            <h3 className="font-bold text-sm text-slate-900">Ubicación del Establecimiento</h3>
            <p className="text-[11px] text-slate-500">
              Elija el método para fijar la posición de la chacra en territorio.
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${methodBadge.color}`}>
          {methodBadge.label}
        </span>
      </div>

      {/* 3 Alternatives Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Alt 1: GPS Actual */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('gps');
            handleGetDeviceGPS();
          }}
          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
            activeTab === 'gps'
              ? 'border-[#27865A] bg-[#E8F2EA] text-[#174C35] font-semibold ring-1 ring-[#27865A]'
              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <Compass className={`w-4 h-4 shrink-0 ${isLocatingGPS ? 'animate-spin text-[#27865A]' : 'text-slate-500'}`} />
          <div className="leading-tight">
            <span className="text-xs font-bold block">1. Mi Ubicación Actual</span>
            <span className="text-[10px] text-slate-400">GPS del dispositivo</span>
          </div>
        </button>

        {/* Alt 2: Seleccionar en Mapa */}
        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
            activeTab === 'map'
              ? 'border-[#27865A] bg-[#E8F2EA] text-[#174C35] font-semibold ring-1 ring-[#27865A]'
              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <MapIcon className="w-4 h-4 shrink-0 text-[#27865A]" />
          <div className="leading-tight">
            <span className="text-xs font-bold block">2. Seleccionar en Mapa</span>
            <span className="text-[10px] text-slate-400">Tocar punto en el mapa</span>
          </div>
        </button>

        {/* Alt 3: Pegar WhatsApp / Compartir */}
        <button
          type="button"
          onClick={() => setActiveTab('share')}
          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
            activeTab === 'share'
              ? 'border-[#27865A] bg-[#E8F2EA] text-[#174C35] font-semibold ring-1 ring-[#27865A]'
              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <Share2 className="w-4 h-4 shrink-0 text-[#E9A23B]" />
          <div className="leading-tight">
            <span className="text-xs font-bold block">3. Pegar Ubicación</span>
            <span className="text-[10px] text-slate-400">Enlace WhatsApp / Coords</span>
          </div>
        </button>
      </div>

      {/* Tab 1 Content: GPS Status */}
      {activeTab === 'gps' && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Estado de antena GPS:</span>
            <button
              type="button"
              onClick={handleGetDeviceGPS}
              disabled={isLocatingGPS}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-[11px] hover:bg-slate-100 flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-3 h-3 ${isLocatingGPS ? 'animate-spin text-[#27865A]' : ''}`} />
              Reintentar GPS
            </button>
          </div>

          {isLocatingGPS && (
            <div className="text-[#27865A] font-medium animate-pulse flex items-center gap-1.5">
              <Compass className="w-4 h-4 animate-spin" />
              <span>Conectando con satélites GPS...</span>
            </div>
          )}

          {accuracyMeters !== undefined && (
            <div className="text-emerald-700 font-medium">
              Coordenadas fijadas con precisión estimada de <strong>{accuracyMeters} metros</strong>.
            </div>
          )}

          {gpsError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
              {gpsError}
            </div>
          )}
        </div>
      )}

      {/* Tab 2 Content: Interactive Map Picker */}
      {activeTab === 'map' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
            <span>Toque cualquier punto del mapa o arrastre el marcador para fijar la chacra:</span>
            <span className="font-mono text-slate-700 font-semibold">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>

          <MisionesMap
            producers={[]}
            isPickerMode={true}
            initialCoords={{ lat, lng }}
            onLocationPicked={handleMapLocationPicked}
            height="h-56 sm:h-64"
          />
        </div>
      )}

      {/* Tab 3 Content: Paste WhatsApp Link or Coordinates */}
      {activeTab === 'share' && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pegar enlace recibido por WhatsApp o coordenadas
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Ej: https://maps.google.com/?q=-27.486200,-55.120500 o -27.4862, -55.1205"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#27865A]"
              />
              <button
                type="button"
                onClick={handleParsePastedLocation}
                className="px-4 py-2 bg-[#174C35] hover:bg-[#27865A] text-white text-xs font-bold rounded-xl transition"
              >
                Interpretar
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Formatos admitidos: enlaces de WhatsApp, enlaces de Google Maps, OpenStreetMap, coordenadas decimales o formato grados/minutos/segundos.
            </p>
          </div>

          {parseResult && (
            <div className={`p-3 rounded-xl border text-xs ${
              parseResult.success ? 'bg-[#E8F2EA] border-[#27865A]/30 text-[#174C35]' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {parseResult.success ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#27865A]" />
                    <span>Ubicación interpretada correctamente</span>
                  </div>
                  <div className="font-mono text-[11px]">
                    Lat: {parseResult.lat} · Lng: {parseResult.lng}
                  </div>
                  {parseResult.estimatedMunicipality && (
                    <div className="text-[11px]">
                      Municipio más cercano: <strong>{parseResult.estimatedMunicipality}</strong> (a aprox. {parseResult.distanceKmToMunicipality} km)
                    </div>
                  )}
                  {!parseResult.isInMisionesRange && (
                    <div className="text-amber-800 text-[10px] font-semibold mt-1">
                      Nota: Las coordenadas no parecen pertenecer al territorio de Misiones. Verifique el punto.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{parseResult.errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Location Card & Confirmation */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
          <div>
            <span className="text-[10px] text-slate-400 block">Latitud</span>
            <span className="font-mono font-bold text-slate-900">{lat.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Longitud</span>
            <span className="font-mono font-bold text-slate-900">{lng.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Municipio Asignado</span>
            <span className="font-semibold text-slate-900">{municipality}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Territorio Misiones</span>
            <span className={`font-semibold ${inMisiones ? 'text-emerald-700' : 'text-amber-700'}`}>
              {inMisiones ? 'Verificado en Misiones' : 'Fuera de rango'}
            </span>
          </div>
        </div>

        {/* Reference notes input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Referencia o Acceso de la Ubicación
          </label>
          <input
            type="text"
            value={addressRef}
            onChange={(e) => setAddressRef(e.target.value)}
            placeholder="Ej: A 1.5 km del puente del Arroyo Garupá por camino terrado"
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#27865A]"
          />
        </div>

        {/* Confirmation buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <CheckCircle2 className={`w-4 h-4 ${isConfirmed ? 'text-[#27865A]' : 'text-slate-300'}`} />
            <span>{isConfirmed ? 'Ubicación confirmada para el relevamiento' : 'Pendiente de confirmación'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmed(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium"
            >
              Modificar
            </button>
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="px-4 py-1.5 rounded-lg bg-[#27865A] hover:bg-[#174C35] text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar Ubicación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
