import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { FilterChip } from '../components/FilterChip';
import { PantallaApilada } from '../components/PantallaApilada';
import { Overline } from '../components/ScreenHeader';
import { EstadoCargando } from '../components/StateView';
import { TextField } from '../components/TextField';
import type { AppScreenProps } from '../navigation/types';
import { crearDestino, editarDestino, listarDestinosAdmin } from '../services/admin';
import { mensajeDeError } from '../services/api';
import type { CamposDestino, CategoriaDestino, RangoPrecio } from '../services/tipos';
import { spacing } from '../theme';
import { CATEGORIAS, LISTA_CATEGORIAS } from '../utils/categorias';

const RANGOS: RangoPrecio[] = ['Gratis', '$', '$$', '$$$'];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

type Formulario = Record<'nombre' | 'descripcion' | 'latitud' | 'longitud' | 'ubicacion' | 'capacidad' | 'apertura' | 'cierre' | 'comoLlegar', string>;

const VACIO: Formulario = { nombre: '', descripcion: '', latitud: '', longitud: '', ubicacion: '', capacidad: '', apertura: '', cierre: '', comoLlegar: '' };

function validar(f: Formulario): Partial<Formulario> {
  const e: Partial<Formulario> = {};
  if (f.nombre.trim().length < 2) e.nombre = 'Escribe el nombre.';
  if (f.ubicacion.trim().length < 2) e.ubicacion = 'Describe la ubicación.';
  const lat = Number(f.latitud.replace(',', '.'));
  const lon = Number(f.longitud.replace(',', '.'));
  if (!f.latitud.trim() || Number.isNaN(lat) || lat < -90 || lat > 90) e.latitud = 'Latitud entre -90 y 90 (p. ej. 12.5843).';
  if (!f.longitud.trim() || Number.isNaN(lon) || lon < -180 || lon > 180) e.longitud = 'Longitud entre -180 y 180 (p. ej. -81.6988).';
  if (!/^\d+$/.test(f.capacidad) || Number(f.capacidad) <= 0) e.capacidad = 'Número entero mayor que 0.';
  const conHorario = f.apertura.trim() || f.cierre.trim();
  if (conHorario) {
    if (!HORA.test(f.apertura)) e.apertura = 'Formato HH:MM.';
    if (!HORA.test(f.cierre)) e.cierre = 'Formato HH:MM.';
    if (!e.apertura && !e.cierre && f.apertura >= f.cierre) e.cierre = 'Debe ser posterior a la apertura.';
  }
  return e;
}

/** Crear o editar un destino (administrador). */
export function EditarDestinoScreen({ navigation, route }: AppScreenProps<'EditarDestino'>) {
  const id = route.params?.id;
  const [f, setF] = useState<Formulario>(VACIO);
  const [categoria, setCategoria] = useState<CategoriaDestino>('playa');
  const [rango, setRango] = useState<RangoPrecio | null>(null);
  const [errores, setErrores] = useState<Partial<Formulario>>({});
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) return;
    listarDestinosAdmin()
      .then((lista) => {
        const d = lista.find((x) => x.id === id);
        if (!d) return;
        setF({
          nombre: d.nombre,
          descripcion: d.descripcion ?? '',
          latitud: String(d.latitud),
          longitud: String(d.longitud),
          ubicacion: d.ubicacion,
          capacidad: String(d.capacidad),
          apertura: d.horario?.apertura ?? '',
          cierre: d.horario?.cierre ?? '',
          comoLlegar: d.comoLlegar ?? '',
        });
        setCategoria(d.categoria);
        setRango(d.rangoPrecio);
      })
      .catch((e: unknown) => Alert.alert('No se pudo cargar el destino', mensajeDeError(e)))
      .finally(() => setCargando(false));
  }, [id]);

  const campo = (clave: keyof Formulario) => ({
    value: f[clave],
    onChangeText: (v: string) => setF((anterior) => ({ ...anterior, [clave]: v })),
    error: errores[clave],
  });

  const guardar = async () => {
    const e = validar(f);
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    const campos: CamposDestino = {
      nombre: f.nombre.trim(),
      descripcion: f.descripcion.trim() || null,
      categoria,
      latitud: Number(f.latitud.replace(',', '.')),
      longitud: Number(f.longitud.replace(',', '.')),
      ubicacion: f.ubicacion.trim(),
      capacidad: Number(f.capacidad),
      horarioApertura: f.apertura.trim() || null,
      horarioCierre: f.cierre.trim() || null,
      rangoPrecio: rango,
      comoLlegar: f.comoLlegar.trim() || null,
    };
    setGuardando(true);
    try {
      if (id) await editarDestino(id, campos);
      else await crearDestino(campos);
      navigation.goBack();
    } catch (err) {
      Alert.alert('No se pudo guardar', mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PantallaApilada titulo={id ? 'Editar destino' : 'Nuevo destino'} conVolver>
      {cargando ? (
        <EstadoCargando />
      ) : (
        <>
          <TextField etiqueta="Nombre" {...campo('nombre')} maxLength={150} />
          <Overline>CATEGORÍA</Overline>
          <View style={styles.chips}>
            {LISTA_CATEGORIAS.map((c) => (
              <FilterChip key={c} compacto icono={CATEGORIAS[c].icono} activo={categoria === c} onPress={() => setCategoria(c)}>
                {CATEGORIAS[c].singular}
              </FilterChip>
            ))}
          </View>
          <TextField etiqueta="Descripción" {...campo('descripcion')} multiline maxLength={2000} />
          <TextField etiqueta="Ubicación (texto)" {...campo('ubicacion')} maxLength={255} />
          <View style={styles.fila}>
            <View style={styles.mitad}>
              <TextField etiqueta="Latitud" {...campo('latitud')} keyboardType="numbers-and-punctuation" />
            </View>
            <View style={styles.mitad}>
              <TextField etiqueta="Longitud" {...campo('longitud')} keyboardType="numbers-and-punctuation" />
            </View>
          </View>
          <TextField etiqueta="Capacidad (personas)" {...campo('capacidad')} keyboardType="number-pad" />
          <View style={styles.fila}>
            <View style={styles.mitad}>
              <TextField etiqueta="Abre (HH:MM)" {...campo('apertura')} placeholder="08:00" keyboardType="numbers-and-punctuation" />
            </View>
            <View style={styles.mitad}>
              <TextField etiqueta="Cierra (HH:MM)" {...campo('cierre')} placeholder="17:00" keyboardType="numbers-and-punctuation" />
            </View>
          </View>
          <Overline>RANGO DE PRECIO</Overline>
          <View style={styles.chips}>
            {RANGOS.map((r) => (
              <FilterChip key={r} compacto acento="turquoise" activo={rango === r} onPress={() => setRango(rango === r ? null : r)}>
                {r}
              </FilterChip>
            ))}
          </View>
          <TextField etiqueta="Cómo llegar" {...campo('comoLlegar')} multiline maxLength={1000} />
          <Button tamano="lg" anchoCompleto icono="save" cargando={guardando} onPress={() => void guardar()}>
            {id ? 'Guardar cambios' : 'Crear destino'}
          </Button>
        </>
      )}
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fila: { flexDirection: 'row', gap: spacing.sm },
  mitad: { flex: 1 },
});
