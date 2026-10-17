// Tipos generados desde el esquema de Supabase (generate_typescript_types).
// Regenerar después de cada migración que cambie tablas, enums o funciones.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.17';
  };
  public: {
    Tables: {
      destino: {
        Row: {
          capacidad: number;
          cierre_hasta: string | null;
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
          motivo_cierre: string | null;
          nombre: string;
          precio_es_estimado: boolean;
          precio_max_cop: number | null;
          precio_min_cop: number | null;
          rango_precio: Database['public']['Enums']['rango_precio'] | null;
          ubicacion_fuente: Database['public']['Enums']['ubicacion_fuente'];
          ubicacion_texto: string;
          ubicacion_verificada: boolean;
        };
        Insert: {
          capacidad: number;
          cierre_hasta?: string | null;
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
          motivo_cierre?: string | null;
          nombre: string;
          precio_es_estimado?: boolean;
          precio_max_cop?: number | null;
          precio_min_cop?: number | null;
          rango_precio?: Database['public']['Enums']['rango_precio'] | null;
          ubicacion_fuente?: Database['public']['Enums']['ubicacion_fuente'];
          ubicacion_texto: string;
          ubicacion_verificada?: boolean;
        };
        Update: {
          capacidad?: number;
          cierre_hasta?: string | null;
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
          motivo_cierre?: string | null;
          nombre?: string;
          precio_es_estimado?: boolean;
          precio_max_cop?: number | null;
          precio_min_cop?: number | null;
          rango_precio?: Database['public']['Enums']['rango_precio'] | null;
          ubicacion_fuente?: Database['public']['Enums']['ubicacion_fuente'];
          ubicacion_texto?: string;
          ubicacion_verificada?: boolean;
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
      dispositivo_push: {
        Row: {
          activo: boolean;
          fecha_actualizacion: string;
          fecha_registro: string;
          id_dispositivo: number;
          id_usuario: string;
          plataforma: Database['public']['Enums']['plataforma_dispositivo'];
          token: string;
        };
        Insert: {
          activo?: boolean;
          fecha_actualizacion?: string;
          fecha_registro?: string;
          id_dispositivo?: never;
          id_usuario: string;
          plataforma: Database['public']['Enums']['plataforma_dispositivo'];
          token: string;
        };
        Update: {
          activo?: boolean;
          fecha_actualizacion?: string;
          fecha_registro?: string;
          id_dispositivo?: never;
          id_usuario?: string;
          plataforma?: Database['public']['Enums']['plataforma_dispositivo'];
          token?: string;
        };
        Relationships: [];
      };
      favorito: {
        Row: {
          avisar_apertura: boolean;
          avisar_cierre: boolean;
          fecha_creacion: string;
          id_destino: number;
          id_usuario: string;
        };
        Insert: {
          avisar_apertura?: boolean;
          avisar_cierre?: boolean;
          fecha_creacion?: string;
          id_destino: number;
          id_usuario: string;
        };
        Update: {
          avisar_apertura?: boolean;
          avisar_cierre?: boolean;
          fecha_creacion?: string;
          id_destino?: number;
          id_usuario?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorito_id_destino_fkey';
            columns: ['id_destino'];
            isOneToOne: false;
            referencedRelation: 'destino';
            referencedColumns: ['id_destino'];
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
          origen: Database['public']['Enums']['origen_ocupacion'];
          porcentaje_ocupacion: number;
        };
        Insert: {
          cantidad_personas: number;
          fecha_hora: string;
          id_destino: number;
          id_ocupacion?: never;
          origen?: Database['public']['Enums']['origen_ocupacion'];
          porcentaje_ocupacion: number;
        };
        Update: {
          cantidad_personas?: number;
          fecha_hora?: string;
          id_destino?: number;
          id_ocupacion?: never;
          origen?: Database['public']['Enums']['origen_ocupacion'];
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
      resena: {
        Row: {
          comentario: string | null;
          estrellas: number;
          fecha_actualizacion: string;
          fecha_creacion: string;
          id_destino: number;
          id_resena: number;
          id_usuario: string;
          oculta: boolean;
        };
        Insert: {
          comentario?: string | null;
          estrellas: number;
          fecha_actualizacion?: string;
          fecha_creacion?: string;
          id_destino: number;
          id_resena?: never;
          id_usuario: string;
          oculta?: boolean;
        };
        Update: {
          comentario?: string | null;
          estrellas?: number;
          fecha_actualizacion?: string;
          fecha_creacion?: string;
          id_destino?: number;
          id_resena?: never;
          id_usuario?: string;
          oculta?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'resena_id_destino_fkey';
            columns: ['id_destino'];
            isOneToOne: false;
            referencedRelation: 'destino';
            referencedColumns: ['id_destino'];
          },
          {
            foreignKeyName: 'resena_id_usuario_fkey';
            columns: ['id_usuario'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id_usuario'];
          },
        ];
      };
      ticket: {
        Row: {
          asunto: string;
          categoria: Database['public']['Enums']['categoria_ticket'];
          descripcion: string;
          estado: Database['public']['Enums']['estado_ticket'];
          fecha_actualizacion: string;
          fecha_cierre: string | null;
          fecha_creacion: string;
          id_destino: number | null;
          id_tecnico: string | null;
          id_ticket: number;
          id_usuario: string;
          prioridad: Database['public']['Enums']['prioridad_ticket'];
        };
        Insert: {
          asunto: string;
          categoria: Database['public']['Enums']['categoria_ticket'];
          descripcion: string;
          estado?: Database['public']['Enums']['estado_ticket'];
          fecha_actualizacion?: string;
          fecha_cierre?: string | null;
          fecha_creacion?: string;
          id_destino?: number | null;
          id_tecnico?: string | null;
          id_ticket?: never;
          id_usuario: string;
          prioridad?: Database['public']['Enums']['prioridad_ticket'];
        };
        Update: {
          asunto?: string;
          categoria?: Database['public']['Enums']['categoria_ticket'];
          descripcion?: string;
          estado?: Database['public']['Enums']['estado_ticket'];
          fecha_actualizacion?: string;
          fecha_cierre?: string | null;
          fecha_creacion?: string;
          id_destino?: number | null;
          id_tecnico?: string | null;
          id_ticket?: never;
          id_usuario?: string;
          prioridad?: Database['public']['Enums']['prioridad_ticket'];
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_id_destino_fkey';
            columns: ['id_destino'];
            isOneToOne: false;
            referencedRelation: 'destino';
            referencedColumns: ['id_destino'];
          },
          {
            foreignKeyName: 'ticket_id_tecnico_fkey';
            columns: ['id_tecnico'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id_usuario'];
          },
          {
            foreignKeyName: 'ticket_id_usuario_fkey';
            columns: ['id_usuario'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id_usuario'];
          },
        ];
      };
      ticket_comentario: {
        Row: {
          comentario: string;
          fecha: string;
          id_comentario: number;
          id_ticket: number;
          id_usuario: string;
        };
        Insert: {
          comentario: string;
          fecha?: string;
          id_comentario?: never;
          id_ticket: number;
          id_usuario: string;
        };
        Update: {
          comentario?: string;
          fecha?: string;
          id_comentario?: never;
          id_ticket?: number;
          id_usuario?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_comentario_id_ticket_fkey';
            columns: ['id_ticket'];
            isOneToOne: false;
            referencedRelation: 'ticket';
            referencedColumns: ['id_ticket'];
          },
          {
            foreignKeyName: 'ticket_comentario_id_usuario_fkey';
            columns: ['id_usuario'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id_usuario'];
          },
        ];
      };
      usuario: {
        Row: {
          fecha_registro: string;
          id_usuario: string;
          nivel_ocupacion_preferido: Database['public']['Enums']['nivel_ocupacion'] | null;
          nombre: string | null;
          presupuesto_max_cop: number | null;
          presupuesto_min_cop: number | null;
          rol: Database['public']['Enums']['rol_usuario'];
        };
        Insert: {
          fecha_registro?: string;
          id_usuario: string;
          nivel_ocupacion_preferido?: Database['public']['Enums']['nivel_ocupacion'] | null;
          nombre?: string | null;
          presupuesto_max_cop?: number | null;
          presupuesto_min_cop?: number | null;
          rol?: Database['public']['Enums']['rol_usuario'];
        };
        Update: {
          fecha_registro?: string;
          id_usuario?: string;
          nivel_ocupacion_preferido?: Database['public']['Enums']['nivel_ocupacion'] | null;
          nombre?: string | null;
          presupuesto_max_cop?: number | null;
          presupuesto_min_cop?: number | null;
          rol?: Database['public']['Enums']['rol_usuario'];
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
      ocultar_resena: {
        Args: { p_id_resena: number; p_oculta: boolean };
        Returns: Database['public']['Tables']['resena']['Row'];
      };
      desactivar_tokens_push: { Args: { p_tokens: string[] }; Returns: number };
      quitar_dispositivo_push: { Args: { p_token: string }; Returns: undefined };
      registrar_dispositivo_push: {
        Args: { p_token: string; p_plataforma: Database['public']['Enums']['plataforma_dispositivo'] };
        Returns: undefined;
      };
      tokens_para_aviso: { Args: { p_id_destino: number; p_tipo: string }; Returns: { token: string }[] };
      cambiar_rol_usuario: {
        Args: { p_id_usuario: string; p_rol: Database['public']['Enums']['rol_usuario'] };
        Returns: Database['public']['Tables']['usuario']['Row'];
      };
      es_administrador: { Args: never; Returns: boolean };
      es_personal: { Args: never; Returns: boolean };
      listar_usuarios_admin: {
        Args: never;
        Returns: {
          correo: string | null;
          fecha_registro: string;
          id_usuario: string;
          nombre: string | null;
          rol: Database['public']['Enums']['rol_usuario'];
        }[];
      };
      metricas_admin: { Args: never; Returns: Json };
      rol_actual: { Args: never; Returns: Database['public']['Enums']['rol_usuario'] };
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
      plataforma_dispositivo: 'ios' | 'android' | 'web';
      categoria_ticket: 'informacion_incorrecta' | 'destino' | 'app' | 'sugerencia' | 'otro';
      estado_ticket: 'abierto' | 'en_revision' | 'resuelto' | 'cerrado';
      prioridad_ticket: 'baja' | 'media' | 'alta';
      rol_usuario: 'turista' | 'tecnico' | 'administrador';
      categoria_destino: 'playa' | 'cayo' | 'naturaleza' | 'buceo_snorkel' | 'cultura' | 'gastronomia' | 'actividad';
      estado_destino: 'abierto' | 'cerrado_temporal' | 'inactivo';
      nivel_ocupacion: 'Bajo' | 'Medio' | 'Alto';
      origen_ocupacion: 'sintetico' | 'real';
      rango_precio: 'Gratis' | '$' | '$$' | '$$$';
      tipo_interaccion: 'vista' | 'favorito' | 'visita' | 'compartir';
      tipo_preferencia: 'categoria' | 'experiencia' | 'grupo';
      ubicacion_fuente: 'osm' | 'manual' | 'aproximada';
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
export type OrigenOcupacion = Enums['origen_ocupacion'];
export type RangoPrecio = Enums['rango_precio'];
export type TipoInteraccion = Enums['tipo_interaccion'];
export type TipoPreferencia = Enums['tipo_preferencia'];
export type UbicacionFuente = Enums['ubicacion_fuente'];
export type RolUsuario = Enums['rol_usuario'];
export type PlataformaDispositivo = Enums['plataforma_dispositivo'];
export type CategoriaTicket = Enums['categoria_ticket'];
export type PrioridadTicket = Enums['prioridad_ticket'];
export type EstadoTicket = Enums['estado_ticket'];

export type DestinoRow = Database['public']['Tables']['destino']['Row'];
export type PreferenciaRow = Database['public']['Tables']['preferencia']['Row'];
export type UsuarioRow = Database['public']['Tables']['usuario']['Row'];
export type OcupacionRow = Database['public']['Tables']['ocupacion']['Row'];
export type InteraccionRow = Database['public']['Tables']['interaccion']['Row'];
export type FavoritoRow = Database['public']['Tables']['favorito']['Row'];
export type ResenaRow = Database['public']['Tables']['resena']['Row'];
export type TicketRow = Database['public']['Tables']['ticket']['Row'];
export type TicketComentarioRow = Database['public']['Tables']['ticket_comentario']['Row'];

export const Constants = {
  public: {
    Enums: {
      plataforma_dispositivo: ['ios', 'android', 'web'],
      categoria_ticket: ['informacion_incorrecta', 'destino', 'app', 'sugerencia', 'otro'],
      estado_ticket: ['abierto', 'en_revision', 'resuelto', 'cerrado'],
      prioridad_ticket: ['baja', 'media', 'alta'],
      rol_usuario: ['turista', 'tecnico', 'administrador'],
      categoria_destino: ['playa', 'cayo', 'naturaleza', 'buceo_snorkel', 'cultura', 'gastronomia', 'actividad'],
      estado_destino: ['abierto', 'cerrado_temporal', 'inactivo'],
      nivel_ocupacion: ['Bajo', 'Medio', 'Alto'],
      origen_ocupacion: ['sintetico', 'real'],
      rango_precio: ['Gratis', '$', '$$', '$$$'],
      tipo_interaccion: ['vista', 'favorito', 'visita', 'compartir'],
      tipo_preferencia: ['categoria', 'experiencia', 'grupo'],
      ubicacion_fuente: ['osm', 'manual', 'aproximada'],
    },
  },
} as const;
