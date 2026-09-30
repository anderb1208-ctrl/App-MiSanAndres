import { MaterialIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';
import { colors, sizes } from '../theme';
import type { NombreIcono } from '../utils/categorias';

interface Props {
  name: NombreIcono;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** Iconos Material (equivalentes a los Material Symbols de la referencia). */
export function Icon({ name, size = sizes.icon, color = colors.secondary, style }: Props) {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
}
