# Frontend Ventas (Colppy)

Una sola pantalla: consolidado arriba, detalle abajo, y dos modales de
carga (individual y CSV). Sin routing, sin login, sin edición ni borrado.

Backend esperado en `http://localhost:3000` (CORS ya habilitado ahí).
Diseño de referencia: `ventas/design/` y su guía de implementación.

## Mapa de archivos

```
src/
  styles/          tokens del diseño (_variables), mixins y clases base (_componentes)
  utils/           formato de números y fechas, parseo de CSV, atribución de errores
  api/             axios + tipos de error del backend
  hooks/           datos (consolidado, ventas, alta, importación) y breakpoint
  components/
    ui/            piezas base: Modal, Campo, Avisos, Iconos
    Header/        barra superior + botones de carga en mobile
    ConsolidadoResumen/  banda del total y desglose por día
    DetalleVentas/ card del detalle, tabla o lista, paginación
    TablaVentas/   la tabla (desktop) y la lista de tarjetas (390 px)
    ModalNuevaVenta/ POST /ventas
    ModalImportar/   POST /ventas/importar por lotes
```

## Sistema visual

Todos los colores, tipografías, espaciados y radios salen de
`src/styles/_variables.scss`, que transcribe la tabla de tokens de la
guía. No hay valores sueltos en los componentes: si algo no está en los
tokens, es que el diseño no lo define.

Las piezas base (`.boton`, `.boton-icono`, `.campo`, `.pill`, `.card`,
`.skeleton`, `.banner-error`) viven en `src/styles/_componentes.scss`
porque se usan en todas las vistas.

El único breakpoint es `$breakpoint-mobile` (720 px), replicado en
`useEsMobile()` para los dos casos en los que cambia el marcado y no
solo el estilo: la tabla del detalle pasa a lista de tarjetas y el
desglose muestra menos días.

## Tipos (`src/types/venta.ts`)

- `Venta` — lo que devuelve `GET /ventas`.
- `NuevaVenta` — lo que espera `POST /ventas`.
- `Consolidado` — `{ totalGeneral, totalVentas, porDia: [{fecha, total}] }`.
- `ResultadoCrearVenta`, `ResultadoImportacion`, `FilaInvalida`, `FilaDuplicada`.

**Ojo con `Venta.fecha`**: viaja como `'YYYY-MM-DD'` (columna `DATE` de
Postgres, sin hora). Todo el formateo de fechas pasa por
`src/utils/formato.ts`, que ya fuerza `timeZone: 'UTC'` — si no, en
horario de Argentina la fecha se corre un día para atrás.

## Errores del backend (`src/api/httpClient.ts`)

`ErrorDeApi` conserva las tres cosas que manda el backend: el
`statusCode`, `mensajes` (el `errorMessage`, siempre como array) y
`extra` (por ejemplo `loteMaximoPermitido`). Hace falta porque el 400 de
`POST /ventas` se reparte campo por campo en el modal, y juntar los
mensajes en un string los vuelve imposibles de separar (hay mensajes con
comas adentro). `extraerMensajeError(error)` sigue existiendo para
cuando solo hace falta el texto.

La atribución campo por campo la hace `atribuirErrores()` en
`src/utils/validacion.ts`, usando la primera palabra del mensaje de
class-validator. Lo que no se puede atribuir va al banner tal cual: nunca
se inventa un texto de validación del lado del cliente.

## Hooks (`src/hooks/`)

### `useConsolidado()`
```ts
const { consolidado, cargando, error, refrescar } = useConsolidado();
```

### `useVentas(paginaInicial?, limite?)`
```ts
const { ventas, pagina, setPagina, cargando, error, refrescar } = useVentas();
```
Cambiar `pagina` con `setPagina` dispara el refetch solo.

`GET /ventas` devuelve el array pelado, sin total: la cantidad de ventas
para la paginación sale de `consolidado.totalVentas`.

### `useCrearVenta()`
```ts
const { enviar, enviando, error } = useCrearVenta();
const resultado = await enviar(venta); // tira ErrorDeApi si falla
// resultado.insertado === false es el 200: el id ya existía
```

### `useImportarCSV()`
```ts
const {
  estado,      // 'inicial' | 'enviando' | 'cortado' | 'terminado'
  elegido,     // { archivo, filas, totalLotes } una vez parseado el CSV
  progreso,    // { loteActual, totalLotes, filasEnviadas, totalFilas }
  resumen,     // contadores y detalles acumulados, en vivo entre lotes
  error, cancelado,
  elegirArchivo, importar, reintentar, cancelar, reiniciar,
} = useImportarCSV();
```
El CSV se parsea al elegirlo (el modal necesita mostrar filas y lotes
antes de mandar nada) y se envía en lotes de hasta 200 filas, uno por vez.

**Idempotencia.** Cada request lleva el header `Idempotency-Key` con la
forma `<uuid de la importación>-lote-<n>` (ver `src/utils/idempotencia.ts`).
Del lado del backend, `IdempotencyGuard` hace `SET NX` en Redis con esa
key y TTL de 10 minutos:

- Si la key ya existe responde **409** y no procesa. No devuelve la
  respuesta anterior: es un candado, no un caché. Por eso cada lote
  necesita su propia key.
- Si el lote falla, el interceptor **borra** la key, así que el reintento
  del mismo lote con la misma key vuelve a entrar. Por eso la key se
  compone y no se sortea: el lote 4 siempre arma la misma.

Reglas que cubre el hook:

- Un lote que falla entero corta la importación (`estado: 'cortado'`) y
  `reintentar()` lo manda de nuevo con la misma clave.
- Un 409 significa que esa clave ya está tomada: o el lote se procesó y
  la respuesta se perdió, o el backend se cayó a mitad y la clave quedó
  colgada en `"procesando"` diez minutos. Desde el cliente los dos casos
  se ven igual, así que no se asume nada: se reintenta **el mismo lote
  con una clave de importación nueva**, que es lo que recomienda el
  mensaje del backend. Reenviar no duplica porque el `INSERT` usa
  `ON CONFLICT (id) DO NOTHING`: lo que ya estaba vuelve como duplicada.
  La regeneración es una sola vez por lote, para no entrar en bucle.
- Si el backend responde 400 con `loteMaximoPermitido`, se adopta ese
  tamaño, se genera una clave de importación nueva (cambian los cortes,
  y con ellos la numeración de lotes) y se sigue desde la misma fila.
- `cancelar()` deja de mandar lo que falta; lo ya insertado queda.

### `useEsMobile()`
`true` por debajo de 720 px de viewport.

## Pruebas

`npm test` corre las unitarias de las piezas puras (formato, CSV,
atribución de errores del 400). Los flujos contra el backend van a mano
con la lista de `pruebas/README.md`, en la raíz del repo, que además
trae los CSV de insumo para cada caso de importación.

## Notas generales

- Formato de números y fechas: siempre por `src/utils/formato.ts`.
  Importes con `$ `, miles con punto, dos decimales siempre.
- El parser de CSV (`src/utils/csv.ts`) acepta el encabezado snake_case
  de los archivos de `ventas/` (`id_venta`, `medio_pago`) y también el
  camelCase que espera el backend, respeta comillas dobles (hay productos
  con coma adentro) y manda `cliente` vacío como ausente.
