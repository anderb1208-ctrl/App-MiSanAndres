-- Nueva categoría de destino para actividades guiadas o recreativas
-- (snorkel, buceo, kayak, paseos en lancha). Los restaurantes usan 'gastronomia'.
--
-- Aditiva: no quita ni renombra valores, así el backend desplegado sigue funcionando.
-- Va sola en su migración porque un valor nuevo de enum no se puede usar en la
-- misma transacción en que se crea.

alter type public.categoria_destino add value if not exists 'actividad';
