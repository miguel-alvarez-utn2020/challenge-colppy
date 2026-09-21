-- Semilla de la base: deja la pantalla con datos desde el primer arranque,
-- sin depender de que alguien corra un script después.
--
-- Corre una sola vez, cuando Postgres inicializa un volumen vacío (todo lo
-- que está en docker-entrypoint-initdb.d se ejecuta solo en ese momento).
-- Para volver a sembrar: docker compose down -v && docker compose up -d.
--
-- El archivo se lee del directorio ventas-csv-prueba/ del repo, montado en
-- /seed por el docker-compose.yml.

-- Tabla intermedia con todo en texto: el CSV de ejemplo trae filas
-- inválidas a propósito (medios de pago que el dominio no acepta, como
-- 'cheque' o 'mercadopago'), y si se copiaran directo a `ventas` el CHECK
-- abortaría la carga entera y la base quedaría vacía.
CREATE TEMP TABLE ventas_semilla (
    id_venta TEXT,
    fecha TEXT,
    cliente TEXT,
    producto TEXT,
    cantidad TEXT,
    importe TEXT,
    medio_pago TEXT
);

-- COPY entiende CRLF, que es como viene este archivo.
COPY ventas_semilla FROM '/seed/ventas_fake_5000.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO ventas (id, fecha, cliente, producto, cantidad, importe, medio_pago)
SELECT
    id_venta,
    fecha::date,
    -- Sin cliente se guarda como NULL, no como string vacío: es lo que la
    -- UI muestra como "Sin cliente".
    NULLIF(TRIM(cliente), ''),
    producto,
    cantidad::integer,
    importe::numeric,
    medio_pago
FROM ventas_semilla
WHERE id_venta <> ''
  AND producto <> ''
  AND fecha ~ '^\d{4}-\d{2}-\d{2}$'
  AND cantidad ~ '^\d+$' AND cantidad::integer > 0
  AND importe ~ '^\d+(\.\d+)?$' AND importe::numeric > 0
  AND medio_pago IN ('transferencia', 'tarjeta', 'efectivo')
ON CONFLICT (id) DO NOTHING;

DROP TABLE ventas_semilla;
