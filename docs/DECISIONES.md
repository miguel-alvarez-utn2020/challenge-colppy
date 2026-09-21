# Decisiones técnicas, en detalle

Esto es el desarrollo largo de lo que el [README](../README.md) resume.
Cada sección cuenta qué se hizo, por qué, y qué alternativa se descartó.

- [Modelo de datos](#modelo-de-datos)
- [Idempotencia](#idempotencia)
- [Por qué 200 filas por lote](#por-qué-200-filas-por-lote)
- [Validación de filas](#validación-de-filas)
- [Manejo de errores](#manejo-de-errores)
- [Resiliencia: si se cae Postgres](#resiliencia-si-se-cae-postgres)
- [Paginación estable](#paginación-estable)
- [Frontend](#frontend)
- [Tests](#tests)
- [Riesgo de performance](#riesgo-de-performance)

## Modelo de datos

```sql
CREATE TABLE ventas (
    id VARCHAR(50) PRIMARY KEY,
    producto VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    cliente VARCHAR(150),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    importe NUMERIC(12, 2) NOT NULL CHECK (importe > 0),
    medio_pago VARCHAR(20) NOT NULL CHECK (medio_pago IN ('transferencia', 'tarjeta', 'efectivo'))
);

CREATE INDEX idx_ventas_fecha ON ventas (fecha);
```

**`importe NUMERIC(12,2)`, no `real` ni `double precision`.** `NUMERIC`
guarda el número exacto; los de punto flotante guardan el más cercano
que puedan representar. Para dinero eso no alcanza: la diferencia
aparece recién cuando sumás miles de importes y el total cierra por unos
centavos. Son más rápidos, sí, pero esa velocidad se paga en precisión,
y acá la precisión no es negociable.

**`medio_pago` como `VARCHAR` con `CHECK`, no como `ENUM` de Postgres.**
Un `ENUM` nativo ocupa menos (4 bytes fijos contra el largo del texto) y
valida contra un catálogo del sistema. Elegimos el `CHECK` porque el
cambio queda contenido en la tabla: agregar un medio de pago es un
`ALTER TABLE` sobre `ventas`, mientras que tocar un `ENUM` modifica un
tipo que puede estar compartido con otras tablas. Ninguna de las dos es
gratis —el `ADD CONSTRAINT` revalida las filas existentes salvo que se
use `NOT VALID`—, pero el radio de impacto del `CHECK` es más chico.

**`id VARCHAR(50)` como clave primaria, no `SERIAL`.** El id lo trae
quien manda la venta (el CSV, el cliente), no lo inventa la base. Es la
misma columna sobre la que se apoya toda la idempotencia por fila: sin
un id de negocio no habría contra qué chocar en el `ON CONFLICT`.

**`fecha DATE`, no `TIMESTAMP`.** El consolidado agrupa por día. La hora
no aporta nada a esa consulta y traería ambigüedad de zona horaria
gratis.

**`cliente` acepta `NULL`.** No toda venta tiene cliente. Se guarda como
`NULL` y no como texto vacío, que son cosas distintas: uno es "no hay
dato", el otro es "el dato es una cadena vacía".

**Los `CHECK` duplican lo que ya valida el DTO, a propósito.** Es
defensa en profundidad. La capa de aplicación se puede saltear —un
script de migración, una carga manual, un bug— y la integridad del dato
no debería depender de que nadie se equivoque nunca.

**Un solo índice, sobre `fecha`.** Es la única columna por la que hoy se
filtra y se agrupa. No agregamos índices por las dudas: cada índice se
paga en cada escritura.

## Idempotencia

Son dos problemas distintos, y se resuelven en capas distintas.

### Por fila

```sql
INSERT INTO ventas (...) VALUES (...)
ON CONFLICT (id) DO NOTHING
RETURNING id
```

Si el id ya existe, Postgres no hace nada y el `RETURNING` vuelve vacío.
Eso es lo que el código usa para distinguir "insertada" de "ya estaba".

Lo importante es que es **atómico**: no hay un momento entre "fijarse si
existe" y "escribirla" donde otra request pueda meterse. Con un `SELECT`
previo seguido de un `INSERT`, dos cargas simultáneas del mismo id
podrían pasar las dos por el `SELECT` antes de que cualquiera escriba.

Es `DO NOTHING` y no `DO UPDATE`: reenviar una venta ya cargada no pisa
lo que había. Si el id existe, gana el dato original.

### Por lote

El endpoint de importación exige un header `Idempotency-Key`. El guard
hace, contra Redis:

```
SET idempotency:importar:<key> procesando NX EX 600
```

`NX` significa "solo si no existe", y la operación es atómica. Si dos
requests con la misma clave llegan casi juntas, una la escribe y la otra
recibe `null`, que el guard traduce a `409`.

El interceptor cierra el ciclo: si el lote terminó bien, marca la clave
como `listo`; si falló, **la borra**. Ese borrado es deliberado. Si la
dejáramos vencer sola, un error transitorio —la base que parpadeó, un
timeout— dejaría la clave tomada diez minutos, y el reintento legítimo
del usuario rebotaría con `409` sin motivo.

### Cómo se arma la clave

No es un UUID suelto por request, sino `<uuid de la importación>-lote-N`.

El motivo: reintentar un lote que falló tiene que poder reproducir
*exactamente* la misma clave. Si se sorteara una nueva cada vez, el
backend no tendría forma de reconocer que es el mismo lote de antes.

### Dos rutas de reintento

**Si un lote falla por red o por 500**, la importación se corta y se
muestra hasta dónde se llegó. El reintento manda el mismo lote con la
**misma** clave, y no duplica nada porque el interceptor ya la borró.

**Si la request rebota con `409`**, se resuelve solo, sin que el usuario
se entere. Acá no se puede reutilizar la clave: desde el cliente es
imposible distinguir si el lote anterior llegó a insertarse y se perdió
la respuesta, o si el backend se cayó antes. Entonces se genera una
clave de importación nueva y se reintenta. Reenviar sigue sin duplicar,
porque abajo está el `ON CONFLICT`: lo que ya entró vuelve marcado como
duplicado y solo se inserta lo que faltaba.

## Por qué 200 filas por lote

El límite duro está en el protocolo de Postgres: el mensaje `Bind`
codifica la cantidad de parámetros en un entero de 16 bits, así que una
consulta no admite más de 65.535. Cada fila de `ventas` usa 7 columnas,
o sea que 200 filas son 1.400 parámetros — lejos del techo, con lugar de
sobra para crecer sin tocar nada.

**Se evaluó y se descartó** partir automáticamente en el backend un lote
que superara ese límite. El tope de 200 en el DTO ya previene el
problema de fondo, y trocear el insert traía complejidad de verdad:
reconciliar cuántas entraron y cuántas eran duplicadas entre sub-lotes,
y decidir qué hacer si falla el tercero de cinco. Si algún día hiciera
falta, la solución está acotada y es conocida.

## Validación de filas

Cada fila del lote se valida por separado con `class-validator`
(`plainToInstance` + `validate`).

Una fila inválida **no frena el lote**: se aparta en `detalleInvalidas`
junto con el motivo, y las válidas se insertan igual. El motivo es el
mensaje que está escrito en el decorator del DTO, en español, y viaja
tal cual hasta la pantalla. No se reescribe del lado del cliente, así
que no hay dos versiones del mismo mensaje que se puedan desincronizar.

El número de fila que se reporta arranca en `filaInicial`, un parámetro
que manda el front. Eso hace que el error apunte a la línea real del CSV
y no a la posición dentro del lote: para quien subió el archivo, "error
en la fila 412" es accionable; "error en la fila 12 del lote 3" no.

## Manejo de errores

Un solo `AllExceptionsFilter` global, escrito genérico a propósito.

Separa el `message` "para humanos" de cualquier otra propiedad que la
excepción quiera sumar al body —por ejemplo `loteMaximoPermitido` cuando
un lote se pasa de tamaño— y reenvía esos extras sin necesidad de
conocer cada caso puntual. Así, agregar un dato nuevo a un error no
implica tocar el filtro.

Loguea distinto según el tipo: `warn` sin stack para los 4xx, que son
errores esperados del cliente, y `error` con stack completo para todo lo
demás, que son bugs o problemas de infraestructura. Un 400 por un campo
mal cargado no debería ensuciar los logs igual que una caída.

**Se evaluó y se descartó** un `exceptionFactory` centralizado para
armar los mensajes de validación. Sumaba una capa de indirección —una
factory más un pipeline de transformación— que no se justificaba para la
cantidad de reglas que tiene este proyecto. Quedó reemplazado por algo
más directo de leer: el mensaje escrito en cada decorator del DTO, y un
`if` común en el controller para la regla del tamaño de lote.

## Resiliencia: si se cae Postgres

Este caso no es hipotético: se probó cortando la conexión con la base a
mitad de una importación.

Cuando la conexión se corta mientras el pool tiene un cliente ocioso
—el servidor se reinicia, hay un failover, la base cierra por timeout—,
`pg` emite un evento `'error'` sobre el `Pool`. Ese evento no pertenece
a ninguna consulta en curso, así que no hay ninguna promesa a la cual
rechazarle el error. Y en Node, un `EventEmitter` que emite `'error'`
sin nadie escuchando lo convierte en una excepción no capturada, que
**mata el proceso entero**, no un request.

Sin manejarlo, cortar la base a mitad de una importación tiraba abajo
todo el backend de golpe, sin un log intermedio, hasta reiniciarlo a
mano.

La solución, en `database.module.ts`, es una línea:

```ts
pool.on('error', (error) => {
  logger.error(`Conexión con Postgres perdida: ${error.message}`);
});
```

No hace falta nada más. El pool descarta ese cliente por su cuenta y
abre uno nuevo cuando lo necesite, y las consultas que sí estaban en
vuelo fallan por su lado y terminan como un 500 normal. Esa línea es la
diferencia entre "se cayó la base" y "se cayó el sistema entero".

## Paginación estable

El listado ordena por `fecha DESC, id DESC`, no solo por fecha.

El desempate por la clave primaria no es cosmético. Con varias ventas en
un mismo día —que es el caso normal— `ORDER BY fecha` a secas deja el
orden entre las empatadas librado al plan de ejecución, que puede
cambiar de una consulta a otra. Paginar sobre un orden que no es
determinista hace que al pasar de página una fila aparezca dos veces o
no aparezca nunca.

Ordenar al final por una columna única vuelve el orden total, y con eso
la paginación deja de depender de la suerte. Hay un test que lo cubre:
siembra 50 ventas en la misma fecha, recorre las 5 páginas y verifica
que salgan los 50 ids, sin repetidos.

## Frontend

Una sola pantalla, sin routing ni login: el consolidado arriba, el
detalle paginado abajo, y dos modales de carga.

**Sin librería de componentes.** SCSS propio con BEM, y el sistema de
diseño centralizado en `frontend/src/styles/`: `_variables.scss` para
los tokens de color, tipografía y espaciado, `_mixins.scss`, y
`_componentes.scss` para las piezas base (botones, campos, pills). Una
pantalla de este tamaño, con un sistema visual ya definido en
`design/`, no justificaba traerse una dependencia de diseño entera.

**Axios en lugar de `fetch`**, con una capa propia de error
(`ErrorDeApi`, en `src/api/httpClient.ts`) que conserva por separado el
código de estado, los mensajes de validación y cualquier dato extra que
mande el backend. Eso es lo que permite mostrar el error debajo del
campo que lo causó, en vez de un cartel genérico arriba del formulario.

**Un solo breakpoint, 720 px**, replicado en el hook `useEsMobile()`. Se
usa únicamente en los dos lugares donde el mobile cambia el marcado y no
solo el estilo: la tabla del detalle pasa a ser una lista de tarjetas, y
el desglose por día muestra menos filas. Todo lo demás se resuelve con
CSS.

**Parser de CSV propio** (`src/utils/csv.ts`). Acepta tanto el
encabezado en snake_case de los archivos del enunciado (`id_venta`,
`medio_pago`) como el camelCase que espera el backend. Respeta las comas
dentro de campos entrecomillados. Y manda un `cliente` vacío como campo
ausente, no como texto vacío, para que el backend lo trate igual que si
nunca hubiera venido.

**La paginación del detalle se apoya en el consolidado.** `GET /ventas`
devuelve la página sin un total de filas. En vez de sumar una segunda
consulta solo para contar, el total sale de `consolidado.totalVentas`,
un dato que la pantalla ya está pidiendo igual. Es una limitación de la
API que el cliente compensa reusando lo que tiene a mano.

**La importación es resiliente.** El archivo se parsea en el navegador y
se manda en lotes de hasta 200 filas, cada uno con su clave. Si el
backend responde con un `loteMaximoPermitido` distinto al asumido, el
cliente lo adopta y sigue desde la misma fila en la que estaba.

**Accesibilidad.** Foco atrapado dentro de los modales y cierre con
Escape, `aria-live` en los avisos y en el progreso de importación,
`aria-describedby` conectando cada campo con su mensaje de error. Y
skeletons en vez de ceros mientras cargan los datos: un cero es un dato,
y mostrarlo antes de tiempo es mentir.

## Tests

**Backend: 25 tests de integración** (Jest), contra el Postgres y el
Redis del compose.

Corren contra infra real y no contra un `Pool` simulado porque la lógica
que importa vive en el SQL. Con el pool mockeado, un test de
idempotencia verifica que se llamó a `pool.query` con cierto texto — no
que la segunda inserción efectivamente no duplique. Eso es probar el
andamio, no la casa.

Cubren:

- que `ON CONFLICT DO NOTHING` no duplique ni pise los datos anteriores;
- que paginar no repita ni pierda filas cuando todas comparten la fecha;
- que el consolidado sume, cuente y agrupe bien, incluida la base vacía;
- que un lote separe válidas, inválidas y duplicadas en una sola pasada,
  y que el número de fila apunte a la línea real del CSV;
- que de diez requests en paralelo con la misma clave pase exactamente
  una;
- que después de un fallo la clave se libere y el reintento funcione.

Usan una base propia (`colppy_ventas_test`, que se crea sola en el
primer `npm test`) y la base 1 de Redis, así que nunca tocan los datos
de la app. El schema lo levantan del mismo
`docker/init-db/001-create-ventas.sql` que usa el compose: no hay una
segunda definición de la tabla que se pueda desincronizar.

**Frontend: 33 tests unitarios** (Vitest) sobre funciones puras —
formato de números y fechas, parseo de CSV, armado de claves de
idempotencia, atribución de errores de validación. Corren en segundos
sin necesitar backend ni base.

**Manual:** `pruebas/README.md` tiene 7 grupos de casos y 6 CSV de
insumo, pensados para forzar cada resultado posible de una importación,
incluido cortar la red o el backend a mitad de un envío.

## Riesgo de performance

Con los datos de ejemplo (4386 ventas) no hay nada que optimizar: el
listado resuelve en 0,1 ms y el consolidado en 1,2 ms.

Para saber dónde se rompe, se cargó **1.000.000 de ventas sobre 1095
días** en una base aparte y se midió con `EXPLAIN (ANALYZE, BUFFERS)`.

### 1. El `OFFSET` del listado

| Página | `OFFSET` | Tiempo | Páginas leídas |
|---|---|---|---|
| 1 | 0 | 6 ms | 929 |
| 2.500 | 50.000 | 34 ms | 50.339 |
| 25.000 | 500.000 | 246 ms | 501.434 |
| 50.000 | 999.980 | **495 ms** | 1.002.202 |

Crece lineal, y el motivo es estructural: Postgres no puede saltar a la
fila 999.980, tiene que leer y descartar las 999.980 anteriores.
Devolver 20 filas le cuesta recorrer el millón entero.

Un índice no lo arregla, porque el problema no es encontrar las filas
sino contarlas para poder saltearlas. Lo que lo arregla es cambiar de
técnica: **paginación por keyset**, que pide "lo que viene después de
esta fila" en lugar de "saltá N filas".

```sql
WHERE (fecha, id) < ($1, $2)
ORDER BY fecha DESC, id DESC
LIMIT 20
```

Medido en la misma posición donde el `OFFSET` tarda 495 ms: **1,7 ms**.
Unas 290 veces más rápido, y constante en cualquier página, porque el
índice lleva directo al punto de corte. Se verificó además que devuelve
exactamente las mismas 20 filas.

El desempate por `id` que ya usa el `ORDER BY` es justamente lo que hace
posible ese cursor. No está implementado porque cambia el contrato de la
API (`?page` pasaría a ser `?despuesDe`) y, con 20 filas por página en
un back office, nadie llega a la página 25.000.

### 2. El consolidado, sin filtro

49 ms con 1M de filas contra 1,2 ms con 4386: crece lineal con el
histórico completo. Y el frontend lo pide en cada carga y después de
cada importación. A 10M de filas ya son segundos.

Como acepte un período, la primera medida es acotarlo a un rango y sumar
un índice que cubra `(fecha, importe)`. Si aun así pesa, es el caso de
libro para una vista materializada o una tabla de totales por día
actualizada en la escritura: el pasado no cambia, así que recalcular
todo el histórico en cada lectura es trabajo repetido.

### 3. La importación es secuencial

Los lotes se envían de a uno, esperando la respuesta del anterior: 5000
filas son 25 requests en serie. Es deliberado, porque permite mostrar
progreso real y reintentar exactamente el lote que falló, pero el tiempo
total crece lineal con el tamaño del archivo.

Paralelizar de a 3 o 4 lotes es posible —cada uno lleva su propia
clave, así que no se pisan—; lo que se pierde es la barra de progreso
que avanza de forma monótona.

### 4. El CSV se parsea entero en memoria

El archivo se carga completo antes de empezar a enviar. Con los archivos
de ejemplo (5000 filas, 400 KB) es instantáneo; con uno de cientos de
miles de filas la pestaña sufre.

El camino sería leerlo por chunks con `File.stream()` e ir mandando
lotes a medida que se parsean, en vez de esperar a tener el array
completo.

### Cómo se mediría en producción

Distinto de como se midió acá. `pg_stat_statements` para ver qué
consulta acumula más tiempo total — que no es la más lenta, sino la más
lenta que además corre seguido. Y latencia por endpoint en p95 y p99, no
promedio: el promedio esconde justo la cola que sufre el usuario.
