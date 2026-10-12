// Ninguna prueba llama a la red: antes de cada una se instala el proveedor de clima falso
// con la caché vacía.
import { usarProveedorClima } from '../services/clima/climaService';
import { proveedorFalso } from './climaFalso';

beforeEach(() => {
  proveedorFalso.reiniciar();
  usarProveedorClima(proveedorFalso);
});
