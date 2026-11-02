/**
 * PostgreSQL + PostGIS Schema and Row Level Security (RLS) Policies
 * for SIP MISIONES - Ministerio del Agro y la Producción de Misiones
 */

export const SIP_MISIONES_POSTGRES_SCHEMA = `-- ==============================================================================
-- SIP MISIONES: SISTEMA DE INFORMACIÓN PRODUCTIVA TERRITORIAL
-- Ministerio del Agro y la Producción de Misiones, Argentina
-- Base de Datos: PostgreSQL 15+ con extensión geoespacial PostGIS
-- ==============================================================================

-- 1. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. ENUMS DE DOMINIO PRODUCTIVO Y ROLES
CREATE TYPE user_role_type AS ENUM (
  'SUPERADMIN',
  'ADMINISTRADOR',
  'DIRECTOR',
  'TECNICO',
  'SUPERVISOR'
);

CREATE TYPE producer_type AS ENUM (
  'pequeno_familiar',
  'mediano_comercial',
  'cooperativista',
  'empresa_agropecuaria',
  'comunidad_originaria'
);

CREATE TYPE tenure_type AS ENUM (
  'propiedad_con_titulo',
  'ocupacion_con_permiso',
  'arrendamiento',
  'fiscal_en_tramite',
  'comunitaria'
);

CREATE TYPE invitation_status_type AS ENUM (
  'activa',
  'utilizada',
  'vencida',
  'revocada'
);

-- 3. TABLA DE PERFILES DE USUARIO (Vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dni VARCHAR(15) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  role user_role_type NOT NULL DEFAULT 'TECNICO',
  assigned_municipalities TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA DE INVITACIONES
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  role user_role_type NOT NULL,
  email_allowed VARCHAR(255),
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  status invitation_status_type NOT NULL DEFAULT 'activa',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA DE PRODUCTORES
CREATE TABLE IF NOT EXISTS public.producers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dni VARCHAR(15) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  is_establishment_head BOOLEAN NOT NULL DEFAULT true,
  producer_type producer_type NOT NULL,
  establishment_name VARCHAR(255) NOT NULL,
  municipality VARCHAR(100) NOT NULL,
  colony_paraje VARCHAR(255) NOT NULL,
  address_reference TEXT,
  
  -- Campos Geoespaciales con PostGIS
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) STORED,
  gps_accuracy_meters NUMERIC(6, 2),
  
  tenure_type tenure_type NOT NULL,
  surface_ha NUMERIC(10, 2) NOT NULL,
  observations TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  
  -- Versionado y Auditoría
  version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  created_by_name VARCHAR(255),
  verified_by_supervisor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices geoespaciales y de búsqueda
CREATE INDEX IF NOT EXISTS idx_producers_location ON public.producers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_producers_dni ON public.producers(dni);
CREATE INDEX IF NOT EXISTS idx_producers_municipality ON public.producers(municipality);

-- 6. TABLA DE ACTIVIDADES PRODUCTIVAS
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  surface_ha NUMERIC(10, 2) NOT NULL DEFAULT 0,
  specific_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activities_producer ON public.activities(producer_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(activity_type);

-- 7. TABLA DE INFRAESTRUCTURA Y CONDICIONES
CREATE TABLE IF NOT EXISTS public.infrastructures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_id UUID UNIQUE NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  water_source TEXT[] NOT NULL DEFAULT '{}',
  electricity VARCHAR(50) NOT NULL,
  road_access VARCHAR(50) NOT NULL,
  has_storage_facility BOOLEAN NOT NULL DEFAULT false,
  storage_description TEXT,
  sanitation VARCHAR(50) NOT NULL,
  machinery TEXT[] DEFAULT '{}',
  irrigation_system VARCHAR(50),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA DE CUESTIONARIOS DINÁMICOS
CREATE TABLE IF NOT EXISTS public.questionnaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. TABLA DE RESPUESTAS A CUESTIONARIOS (Preserva la versión histórica)
CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id),
  questionnaire_version INT NOT NULL,
  questionnaire_title VARCHAR(255) NOT NULL,
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  producer_dni VARCHAR(15) NOT NULL,
  producer_name VARCHAR(255) NOT NULL,
  technician_id UUID NOT NULL REFERENCES public.profiles(id),
  technician_name VARCHAR(255) NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. TABLA DE LOGS DE AUDITORÍA Y SINCRONIZACIÓN
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_name VARCHAR(255),
  user_role user_role_type,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  details TEXT,
  device TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) - POLÍTICAS DE ACCESO
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Funciones auxiliares de RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_type AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas para PROFILES
CREATE POLICY "Usuarios autenticados leen su propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.current_user_role() IN ('SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR', 'SUPERVISOR'));

CREATE POLICY "Solo Superadmin y Admin gestionan perfiles"
  ON public.profiles FOR ALL
  USING (public.current_user_role() IN ('SUPERADMIN', 'ADMINISTRADOR'));

-- Políticas para PRODUCTORES (Técnico crea y actualiza sus propios registros o consulta por DNI)
CREATE POLICY "Productores: Lectura por roles autorizados"
  ON public.producers FOR SELECT
  USING (
    public.current_user_role() IN ('SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR', 'SUPERVISOR')
    OR (public.current_user_role() = 'TECNICO')
  );

CREATE POLICY "Productores: Técnicos insertan sus relevamientos"
  ON public.producers FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('SUPERADMIN', 'ADMINISTRADOR', 'TECNICO')
  );

CREATE POLICY "Productores: Actualización por creador o administradores"
  ON public.producers FOR UPDATE
  USING (
    public.current_user_role() IN ('SUPERADMIN', 'ADMINISTRADOR', 'SUPERVISOR')
    OR (public.current_user_role() = 'TECNICO' AND created_by = auth.uid())
  );

-- Políticas para CUESTIONARIOS
CREATE POLICY "Todos los usuarios autenticados leen cuestionarios publicados"
  ON public.questionnaires FOR SELECT
  USING (status = 'published' OR public.current_user_role() IN ('SUPERADMIN', 'ADMINISTRADOR'));

CREATE POLICY "Solo Administradores modifican cuestionarios"
  ON public.questionnaires FOR ALL
  USING (public.current_user_role() IN ('SUPERADMIN', 'ADMINISTRADOR'));

-- Políticas para INVITACIONES
CREATE POLICY "Cualquiera puede validar una invitación activa por código"
  ON public.invitations FOR SELECT
  USING (status = 'activa' OR public.current_user_role() IN ('SUPERADMIN', 'ADMINISTRADOR'));

CREATE POLICY "Solo Administradores crean invitaciones"
  ON public.invitations FOR ALL
  USING (public.current_user_role() IN ('SUPERADMIN', 'ADMINISTRADOR'));
`;
