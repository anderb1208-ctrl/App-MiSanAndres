-- Textos de ubicación que no coincidían con el punto de OpenStreetMap
-- (migración 20261014120200): Rocky Cay está en San Luis, junto a Cocoplum Bay,
-- y Sound Bay y Donde Francesca quedan al sur de San Luis.
-- Solo actualiza textos de filas existentes.

update public.destino
set ubicacion_texto = 'Costa oriental, sector San Luis, frente al cayo',
    como_llegar = 'Por la vía circunvalar hacia San Luis, unos 15 minutos desde el centro; la playa queda junto a Cocoplum Bay.'
where nombre = 'Rocky Cay';

update public.destino
set ubicacion_texto = 'Costa oriental, sector Sound Bay, al sur de San Luis',
    como_llegar = 'Por la vía circunvalar hacia el sur, pasando San Luis, unos 20 minutos desde el centro.'
where nombre = 'Playa de Sound Bay';

update public.destino
set como_llegar = 'Por la vía circunvalar hacia el sur, pasando San Luis, unos 20 minutos desde el centro.'
where nombre = 'Donde Francesca';
