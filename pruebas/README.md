# Casos de prueba — Pantalla de Ventas

Dos niveles: lo automático (`npm test`, las piezas puras) y lo manual (esta
lista, los flujos contra el backend real). Los archivos `.csv` de esta
carpeta son los insumos de los casos de importación. Todas las rutas de
este documento salen de la raíz del repo.

## Antes de empezar

1. Backend y base arriba: `docker compose up -d` en la raíz, backend en
   `http://localhost:3000`.
2. Front: `npm run dev` en `frontend/`.
3. Verificá que el backend responde: `curl -s localhost:3000/ventas/consolidado | head -c 120`

Todas las ventas de prueba usan ids con prefijo `TEST-`, para poder
borrarlas después sin tocar los datos reales:

```sql
DELETE FROM ventas WHERE id LIKE 'TEST-%';
```

## Pruebas automáticas

```bash
cd frontend
npm test          # una corrida
npm run test:watch
```

Cubren las piezas puras, que son las que tienen reglas fáciles de romper
en un refactor:

| Archivo | Qué asegura |
| --- | --- |
| `frontend/src/utils/formato.test.ts` | Moneda con punto de miles y coma decimal, dos decimales siempre; fechas sin correrse un día; `dd/mm` con dos dígitos; período del header (mismo mes, cruza mes, cruza año) |
| `frontend/src/utils/csv.test.ts` | Encabezado snake_case y camelCase, comas dentro de comillas, cliente vacío como ausente, BOM y CRLF, columna faltante, troceo en lotes de 200, CSV de inválidas con escapes |
| `frontend/src/utils/idempotencia.test.ts` | Clave por lote determinística (el reintento repite la misma), sin repetir entre lotes, y una clave distinta por importación |
| `frontend/src/utils/validacion.test.ts` | Reparto del 400 campo por campo, mensajes con coma adentro, dos errores del mismo campo, lo no atribuible al banner |

Lo que no cubren (y por eso está la lista de abajo): render, foco,
teclado, y todo lo que depende de respuestas reales del backend.

## Insumos de importación

| Archivo | Filas | Para qué |
| --- | --- | --- |
| `01-nuevas.csv` | 3 | Importación limpia: 3 insertadas, 0 duplicadas, 0 inválidas |
| `02-mezcla.csv` | 5 | Los tres resultados juntos: 1 nueva, 2 duplicadas (si ya corriste `01`), 2 inválidas |
| `03-multilote.csv` | 450 | Tres lotes de 200/200/50: barra de progreso, contadores en vivo, cancelación |
| `04-invalidas.csv` | 8 | Todas inválidas: bloque rojo con "Ver las 3 restantes" y descarga en CSV |
| `05-vacio.csv` | 0 | Archivo sin filas de datos |
| `06-comillas.csv` | 2 | Producto con coma, comillas dobles internas, cliente vacío |

## Casos manuales

### 1. Pantalla con datos

| # | Paso | Esperado |
| --- | --- | --- |
| 1.1 | Abrir la pantalla | Total en cifra grande, conteo de ventas a la derecha, últimos 7 días en dos columnas con la fila de total al final |
| 1.2 | Mirar la columna de importes | Todos en mono, alineados a la derecha, con `$ `, punto de miles y dos decimales |
| 1.3 | Mirar el header | Período informativo, botones Importar (secundario) y Nueva venta (primario) |
| 1.4 | Scrollear hasta el final de la tabla | El header queda pegado arriba con su sombra, siempre con las dos acciones a mano |
| 1.5 | Ver una venta sin cliente | Dice "Sin cliente" en gris, no vacío ni un guión |

### 2. Paginación

| # | Paso | Esperado |
| --- | --- | --- |
| 2.1 | Mirar el pie de la tabla | "Mostrando 1 — 20 de N ventas" y los controles a la derecha |
| 2.2 | Estar en la página 1 | El botón de anterior está deshabilitado |
| 2.3 | Ir a la página 2 | Cambian las filas, el número 2 queda en verde con `aria-current="page"` |
| 2.4 | Ir a la última página | La cantidad de filas coincide con lo que falta para llegar a N |

### 3. Nueva venta

| # | Paso | Esperado |
| --- | --- | --- |
| 3.1 | Click en Nueva venta | Modal abierto, foco en el campo ID, fecha de hoy precargada |
| 3.2 | Guardar sin completar nada | El modal queda abierto, banner rojo con la cantidad de campos, cada campo marcado con el mensaje del backend y el foco en el primero |
| 3.3 | Cargar `TEST-M-0001` con todo válido | Modal se cierra, toast verde, y el total y la tabla se actualizan solos con la venta arriba |
| 3.4 | Volver a cargar el mismo id | Modal se cierra, toast azul avisando que ya estaba cargada, sin duplicar |
| 3.5 | Cargar con importe de 3 decimales | 400 con el campo Importe marcado, el resto de lo tipeado intacto |
| 3.6 | Abrir, escribir algo y hacer click en el fondo | Pide confirmación antes de descartar |
| 3.7 | Abrir sin tipear nada y hacer click en el fondo | Cierra sin preguntar |
| 3.8 | Abrir y apretar `Escape` | Cierra, y el foco vuelve al botón Nueva venta |
| 3.9 | Abrir y recorrer con `Tab` | El foco no se escapa del modal |

### 4. Importar CSV

| # | Paso | Esperado |
| --- | --- | --- |
| 4.1 | Click en Importar ventas | Modal abierto, foco en "Elegir archivo CSV", columnas esperadas a la vista |
| 4.2 | Elegir `01-nuevas.csv` | Fila con el nombre, "3 filas leídas · se enviarán en 1 lote", y el primario dice "Importar 3 filas" |
| 4.3 | Importar | Resultado: 3 insertadas, 0 duplicadas, 0 inválidas. El total y la tabla ya se refrescaron detrás |
| 4.4 | Importar `02-mezcla.csv` | 1 insertada, 2 duplicadas, 2 inválidas, cada inválida con su motivo y el número de fila real |
| 4.5 | Abrir el bloque de duplicadas | Lista los ids que devolvió el backend |
| 4.6 | Importar `04-invalidas.csv` | 0 insertadas, 8 inválidas, se ven 5 y el botón "Ver las 3 restantes" |
| 4.7 | Click en "Descargar las inválidas en CSV" | Baja un CSV con una fila por error y la columna motivo |
| 4.8 | Importar `03-multilote.csv` | "Lote 1 de 3" → "3 de 3", barra avanzando, contadores sumando, botón de cerrar deshabilitado y `Escape` sin efecto |
| 4.9 | Durante 4.8, click en Cancelar | Deja de mandar lo que falta, muestra el resultado parcial y aclara que lo insertado quedó |
| 4.10 | Reintentar 4.8 completo | Los lotes ya mandados no duplican nada: suben las duplicadas, no las insertadas |
| 4.10b | En DevTools → Network, mirar los headers de cada lote | `Idempotency-Key` con la forma `<uuid>-lote-1`, `-lote-2`, …: mismo uuid para toda la importación, número distinto por lote |
| 4.10c | Cortar la red del navegador (DevTools → Offline) durante 4.8 y volver a conectarla | La importación corta, muestra hasta dónde llegó y ofrece reintentar ese lote; al reintentar sigue desde ahí |
| 4.10d | Parar el backend durante 4.8 y volver a levantarlo | Igual que 4.10c. Si el lote quedó tomado en Redis, el reintento sale con una clave nueva y no se pierde ningún contador |
| 4.11 | Elegir `05-vacio.csv` | Avisa que el archivo no tiene filas de datos, el primario queda deshabilitado |
| 4.12 | Importar `06-comillas.csv` | El producto con coma entra entero; el que tiene comillas dobles también |
| 4.13 | Arrastrar un CSV sobre la zona de drop | La zona se resalta al pasar por encima y toma el archivo al soltar |
| 4.14 | Click en "Ver en el detalle" | Cierra el modal y el foco queda en el título del detalle |
| 4.15 | Click en "Importar otro archivo" | El modal vuelve al estado inicial, sin restos del anterior |

### 5. Estados

| # | Cómo forzarlo | Esperado |
| --- | --- | --- |
| 5.1 | Recargar con la red lenta (DevTools → Network → Slow 3G) | Cifra en skeleton, nunca en `$ 0,00`; la tabla mantiene el alto del encabezado |
| 5.2 | Matar el proceso del backend y recargar | Cada bloque muestra su línea de error y su botón de reintentar; los botones de carga siguen funcionando |
| 5.2b | `docker compose stop postgres` y recargar | Lo mismo, pero con el `errorMessage` del 500 del backend. Al hacer `docker compose start postgres`, el backend se recupera solo: el pool abre conexiones nuevas, no hace falta reiniciarlo |
| 5.2c | Con todo arriba, agregar una constraint imposible y después importar (ver abajo) | El lote falla con 500 estando el server vivo: la importación corta y ofrece reintentar ese lote |
| 5.3 | Con el backend abajo, click en Reintentar y volver a levantarlo | El bloque se recupera sin recargar la página |
| 5.4 | Base vacía (`DELETE FROM ventas;` en una base de prueba) | Total en `$ 0,00` gris, texto explicativo en vez del desglose, y el detalle con sus dos CTA |

> 5.4 borra todo: hacelo solo en una base que puedas perder.

Para 5.2c, la constraint imposible. `NOT VALID` deja en paz a las filas que
ya están, pero se aplica a todo lo que se inserte desde ese momento, así
que el `INSERT` del lote falla con la base y el server en pie:

```bash
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "ALTER TABLE ventas ADD CONSTRAINT falla_a_proposito CHECK (false) NOT VALID;"

# y para volver atrás, antes de reintentar
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "ALTER TABLE ventas DROP CONSTRAINT falla_a_proposito;"
```

`REVOKE INSERT` no sirve para esto: el usuario del compose es superusuario
y los superusuarios saltean los chequeos de permisos.

### 6. Mobile (390 px)

| # | Paso | Esperado |
| --- | --- | --- |
| 6.1 | Achicar a 390 px | Header de 56 px con marca y período; las dos acciones en una fila propia debajo, mitad y mitad |
| 6.2 | Scrollear | La fila de acciones queda pegada bajo el header, con sombra de lado a lado |
| 6.3 | Mirar el consolidado | Cifra sin cortarse, conteo debajo, los 7 días en lista y la fila de total al final |
| 6.4 | Mirar el detalle | Tarjetas en vez de tabla, y "Cargar 20 más" en vez de paginación |
| 6.5 | Tocar "Cargar 20 más" dos veces | Se suman 20 filas por vez, sin repetir ninguna |
| 6.6 | Abrir Nueva venta y enfocar un campo | Los inputs tienen 46 px de alto y 16 px de texto: iOS no hace zoom |

### 7. Accesibilidad

| # | Paso | Esperado |
| --- | --- | --- |
| 7.1 | Recorrer toda la pantalla con `Tab` | Todo lo clickeable se alcanza y se ve el foco |
| 7.2 | Medir los botones de icono | 44 × 44 px: paginación, cerrar, quitar archivo |
| 7.3 | Revisar los botones sin texto | Tienen `aria-label` ("Página anterior", "Cerrar", "Quitar el archivo") |
| 7.4 | Provocar un 400 con un lector de pantalla | El banner se anuncia solo (`role="alert"`) |
| 7.5 | Importar con un lector de pantalla | El avance se anuncia (`role="status"`) |
| 7.6 | Mirar un campo con error | Hay icono y texto, no solo color |

## Al terminar

```sql
DELETE FROM ventas WHERE id LIKE 'TEST-%';
```
