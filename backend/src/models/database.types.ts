// Tipos generados desde el esquema de Supabase (generate_typescript_types).
// Regenerar después de cada migración que cambie tablas, enums o funciones.

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.17';
  };
  public: {
    Tables: {
      destino: {
        Row: {
          capacidad: number;
          categoria: Database['public']['Enums']['categoria_destino'];
          como_llegar: string | null;
          descripcion: string | null;
          estado: Database['public']['Enums']['estado_destino'];
          horario_apertura: string | null;
          horario_cierre: string | null;
          id_destino: number;
          imagen_autor: string | null;
          imagen_fuente: string | null;
          imagen_licencia: string | null;
          imagen_url: string | null;
          latitud: number;
          longitud: number;
          nombre: string;
          rango_precio: Database['public']['Enums']['rango_precio'] | null;
          ubicacion_texto: string;
        };
        Insert: {
          capacidad: number;
          categoria: Database['public']['Enums']['categoria_destino'];
          como_llegar?: string | null;
          descripcion?: string | null;
          estado?: Database['public']['Enums']['estado_destino'];
          horario_apertura?: string | null;
          horario_cierre?: string | null;
          id_destino?: never;
          imagen_autor?: string | null;
          imagen_fuente?: string | null;
          imagen_licencia?: string | null;
          imagen_url?: string | null;
          latitud: number;
          longitud: number;
          nombre: string;
          rango_precio?: Database['public']['Enums']['rango_precio'] | null;
          ubicacion_texto: string;
        };
        Update: {
          capacidad?: number;
          categoria?: Database['public']['Enums']['categoria_destino'];
          como_llegar?: string | null;
          descripcion?: string | null;
          estado?: Database['public']['Enums']['estado_destino'];
          horario_apertura?: string | null;
          horario_cierre?: string | null;
          id_destino?: never;
          imagen_autor?: string | null;
          imagen_fuente?: string | null;
          imagen_licencia?: string | null;
          imagen_url?: string | null;
          latitud?: number;
          longitud?: number;
          nombre?: string;
          rango_precio?: Database['public']['Enums']['rango_precio'] | null;
          ubicacion_texto?: string;
        };
        Relationships: [];
      };
      destino_preferencia: {
        Row: {
          id_destino: number;
          id_preferencia: number;
        };
        Insert: {
          id_destino: number;
          id_preferencia: number;
        };
        Update: {
          id_destino?: number;
          id_preferencia?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'destino_preferencia_id_destino_fkey';
            columns: ['id_destino'];
            isOneToOne: false;
            referencedRelation: 'destino';
            referencedColumns: ['id_destino'];
          },
          {
            foreignKeyName: 'destino_preferencia_id_preferencia_fkey';
            columns: ['id_preferencia'];
            isOneToOne: false;
            referencedRelation: 'preferencia';
            referencedColumns: ['id_preferencia'];
          },
        ];
      };
      interaccion: {
        Row: {
          fecha_hora: string;
          id_destino: number;
          id_interaccion: number;
          id_usuario: string;
          tipo_interaccion: Database['public']['Enums']['tipo_interaccion'];
        };
        Insert: {
          fecha_hora?: string;
          id_destino: number;
          id_interaccion?: never;
          id_usuario: string;
          tipo_interaccion: Database['public']['Enums']['tipo_interaccion'];
        };
        Update: {
          fecha_hora?: string;
          id_destino?: number;
          id_interaccion?: never;
          id_usuario?: string;
          tipo_interaccion?: Database['public']['Enums']['tipo_interaccion'];
        };
        Relationships: [
          {
            foreignKeyName: 'interaccion_id_destino_fkey';
            columns: ['id_destino'];
            isOneToOne: false;
            referencedRelation: 'destino';
            referencedColumns: ['id_destino'];
          },
          {
            foreignKeyName: 'interaccion_id_usuario_fkey';
            columns: ['id_usuario'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id_usuario'];
          },
        ];
      };
      ocupacion: {
        Row: {
          cantidad_personas: number;
          fecha_hora: string;
          id_destino: number;
          id_ocupacion: number;
          porcentaje_ocupacion: number;
        };
        Insert: {
          cantidad_personas: number;
          fecha_hora: string;
          id_destino: number;
          id_ocupacion?: never;
          porcentaje_ocupacion: number;
        };
        Update: {
          cantidad_personas?: number;
          fecha_hora?: string;
          id_destino?: number;
          id_ocupacion?: never;
          porcentaje_ocupacion?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ocupacion_id_destino_fkey';
            columns: ['id_destino'];
            isOneToOne: false;
            referencedRelation: 'destino';
            referencedColumns: ['id_destino'];
          },
        ];
      };
      preferencia: {
        Row: {
          codigo: string;
          descripcion: string | null;
          id_preferencia: number;
          nombre: string;
          tipo: Database['public']['Enums']['tipo_preferencia'];
        };
        Insert: {
          codigo: string;
          descripcion?: string | null;
          id_preferencia?: never;
          nombre: string;
          tipo: Database['public']['Enums']['tipo_preferencia'];
        };
        Update: {
          codigo?: string;
          descripcion?: string | null;
          id_preferencia?: never;
          nombre?: string;
          tipo?: Database['public']['Enums']['tipo_preferencia'];
        };
        Relationships: [];
      };
      usuario: {
        Row: {
          fecha_registro: string;
          id_usuario: string;
          nivel_ocupacion_preferido: Database['public']['Enums']['nivel_ocupacion'] | null;
          nombre: string | null;
        };
        Insert: {
          fecha_registro?: string;
          id_usuario: string;
          nivel_ocupacion_preferido?: Database['public']['Enums']['nivel_ocupacion'] | null;
          nombre?: string | null;
        };
        Update: {
          fecha_registro?: string;
          id_usuario?: string;
          nivel_ocupacion_preferido?: Database['public']['Enums']['nivel_ocupacion'] | null;
          nombre?: string | null;
        };
        Relationships: [];
      };
      usuario_preferencia: {
        Row: {
          id_preferencia: number;
          id_usuario: string;
        };
        Insert: {
          id_preferencia: number;
          id_usuario: string;
        };
        Update: {
          id_preferencia?: number;
          id_usuario?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usuario_preferencia_id_preferencia_fkey';
            columns: ['id_preferencia'];
            isOneToOne: false;
            referencedRelation: 'preferencia';
            referencedColumns: ['id_preferencia'];
          },
          {
            foreignKeyName: 'usuario_preferencia_id_usuario_fkey';
            columns: ['id_usuario'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id_usuario'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      es_categoria_destino: { Args: { valor: string }; Returns: boolean };
      ocupacion_promedio_hora: {
        Args: {
          p_dia_semana?: number;
          p_fin_de_semana?: boolean;
          p_hora?: number;
          p_id_destino?: number;
        };
        Returns: {
          hora: number;
          id_destino: number;
          muestras: number;
          promedio: number;
        }[];
      };
    };
    Enums: {
      categoria_destino: 'playa' | 'cayo' | 'naturaleza' | 'buceo_snorkel' | 'cultura' | 'gastronomia' | 'actividad';
      estado_destino: 'abierto' | 'cerrado_temporal' | 'inactivo';
      nivel_ocupacion: 'Bajo' | 'Medio' | 'Alto';
      rango_precio: 'Gratis' | '$' | '$$' | '$$$';
      tipo_interaccion: 'vista' | 'favorito' | 'visita' | 'compartir';
      tipo_preferencia: 'categoria' | 'experiencia' | 'grupo';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type Enums = Database['public']['Enums'];

export type CategoriaDestino = Enums['categoria_destino'];
export type EstadoDestino = Enums['estado_destino'];
export type NivelOcupacion = Enums['nivel_ocupacion'];
export type RangoPrecio = Enums['rango_precio'];
export type TipoInteraccion = Enums['tipo_interaccion'];
export type TipoPreferencia = Enums['tipo_preferencia'];

export type DestinoRow = Database['public']['Tables']['destino']['Row'];
export type PreferenciaRow = Database['public']['Tables']['preferencia']['Row'];
export type UsuarioRow = Database['public']['Tables']['usuario']['Row'];
export type OcupacionRow = Database['public']['Tables']['ocupacion']['Row'];
export type InteraccionRow = Database['public']['Tables']['interaccion']['Row'];

export const Constants = {
  public: {
    Enums: {
      categoria_destino: ['playa', 'cayo', 'naturaleza', 'buceo_snorkel', 'cultura', 'gastronomia', 'actividad'],
      estado_destino: ['abierto', 'cerrado_temporal', 'inactivo'],
      nivel_ocupacion: ['Bajo', 'Medio', 'Alto'],
      rango_precio: ['Gratis', '$', '$$', '$$$'],
      tipo_interaccion: ['vista', 'favorito', 'visita', 'compartir'],
      tipo_preferencia: ['categoria', 'experiencia', 'grupo'],
    },
  },
} as const;
