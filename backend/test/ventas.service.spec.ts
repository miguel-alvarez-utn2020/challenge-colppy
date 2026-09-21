import { Pool } from 'pg';
import { Test } from '@nestjs/testing';
import { VentasService } from '../src/ventas/ventas.service';
import { PG_POOL } from '../src/database/database.module';
import { crearBaseDeTest, vaciarVentas, ventaValida } from './base-de-test';

describe('VentasService (integración contra Postgres)', () => {
  let pool: Pool;
  let service: VentasService;

  beforeAll(async () => {
    pool = await crearBaseDeTest();

    const modulo = await Test.createTestingModule({
      providers: [VentasService, { provide: PG_POOL, useValue: pool }],
    }).compile();

    service = modulo.get(VentasService);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await vaciarVentas(pool);
  });

  const contarVentas = async () => {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM ventas');
    return rows[0].total as number;
  };

  describe('crear', () => {
    it('inserta una venta nueva y la deja en la base', async () => {
      const resultado = await service.crear(ventaValida() as never);

      expect(resultado).toEqual({ insertado: true, id: 'V-001' });
      expect(await contarVentas()).toBe(1);
    });

    it('no duplica cuando el id ya existe, y no pisa los datos anteriores', async () => {
      await service.crear(ventaValida({ producto: 'Original' }) as never);

      const segundo = await service.crear(
        ventaValida({ producto: 'Intento de sobreescritura' }) as never,
      );

      expect(segundo.insertado).toBe(false);
      expect(segundo.mensaje).toContain('V-001');
      expect(await contarVentas()).toBe(1);

      // El ON CONFLICT es DO NOTHING, no DO UPDATE: la fila original queda intacta.
      const { rows } = await pool.query('SELECT producto FROM ventas WHERE id = $1', ['V-001']);
      expect(rows[0].producto).toBe('Original');
    });

    it('guarda cliente ausente como NULL, no como string vacío', async () => {
      await service.crear(ventaValida({ cliente: undefined }) as never);

      const { rows } = await pool.query('SELECT cliente FROM ventas WHERE id = $1', ['V-001']);
      expect(rows[0].cliente).toBeNull();
    });
  });

  describe('listar', () => {
    // Todas el mismo día a propósito: es el escenario donde un ORDER BY sin
    // desempate deja el orden librado al plan de ejecución.
    const sembrarMismoDia = async (cantidad: number) => {
      for (let i = 1; i <= cantidad; i++) {
        await service.crear(
          ventaValida({ id: `V-${String(i).padStart(3, '0')}`, fecha: '2026-05-01' }) as never,
        );
      }
    };

    it('devuelve la página pedida con el tamaño pedido', async () => {
      await sembrarMismoDia(25);

      const primera = await service.listar(1, 10);
      const ultima = await service.listar(3, 10);

      expect(primera).toHaveLength(10);
      expect(ultima).toHaveLength(5);
    });

    it('ordena por fecha descendente', async () => {
      await service.crear(ventaValida({ id: 'V-vieja', fecha: '2026-01-01' }) as never);
      await service.crear(ventaValida({ id: 'V-nueva', fecha: '2026-09-01' }) as never);

      const filas = await service.listar(1, 10);

      expect(filas.map((f) => f.id)).toEqual(['V-nueva', 'V-vieja']);
    });

    it('expone medio_pago como medioPago', async () => {
      await service.crear(ventaValida({ medioPago: 'efectivo' }) as never);

      const [fila] = await service.listar(1, 10);

      expect(fila.medioPago).toBe('efectivo');
      expect(fila).not.toHaveProperty('medio_pago');
    });

    // Este es el test que justifica el desempate por id en el ORDER BY: sin él,
    // paginar sobre filas con la misma fecha puede repetir o saltear una venta.
    it('pagina sin repetir ni perder filas cuando todas comparten la fecha', async () => {
      await sembrarMismoDia(50);

      const vistos: string[] = [];
      for (let pagina = 1; pagina <= 5; pagina++) {
        const filas = await service.listar(pagina, 10);
        vistos.push(...filas.map((f) => f.id));
      }

      expect(vistos).toHaveLength(50);
      expect(new Set(vistos).size).toBe(50);
    });

    it('mantiene el mismo orden entre ejecuciones sucesivas', async () => {
      await sembrarMismoDia(30);

      const primera = (await service.listar(1, 30)).map((f) => f.id);
      const segunda = (await service.listar(1, 30)).map((f) => f.id);

      expect(segunda).toEqual(primera);
    });
  });

  describe('consolidado', () => {
    it('suma el total general, cuenta las ventas y agrupa por día', async () => {
      await service.crear(ventaValida({ id: 'A', fecha: '2026-05-01', importe: 100 }) as never);
      await service.crear(ventaValida({ id: 'B', fecha: '2026-05-01', importe: 50.25 }) as never);
      await service.crear(ventaValida({ id: 'C', fecha: '2026-05-02', importe: 10 }) as never);

      const resultado = await service.consolidado();

      expect(resultado.totalVentas).toBe(3);
      expect(resultado.totalGeneral).toBeCloseTo(160.25, 2);
      expect(resultado.porDia).toHaveLength(2);
      expect(resultado.porDia.map((d) => d.total)).toEqual([150.25, 10]);
    });

    it('sobre una base vacía devuelve ceros y ningún día', async () => {
      const resultado = await service.consolidado();

      expect(resultado).toEqual({ totalGeneral: 0, totalVentas: 0, porDia: [] });
    });

    it('cuenta ventas, no días: varias ventas en un mismo día suman al total', async () => {
      await service.crear(ventaValida({ id: 'A', fecha: '2026-05-01' }) as never);
      await service.crear(ventaValida({ id: 'B', fecha: '2026-05-01' }) as never);

      const resultado = await service.consolidado();

      expect(resultado.totalVentas).toBe(2);
      expect(resultado.porDia).toHaveLength(1);
    });
  });

  describe('importarLote', () => {
    it('separa válidas, inválidas y duplicadas en una sola pasada', async () => {
      await service.crear(ventaValida({ id: 'YA-EXISTE' }) as never);

      const resultado = await service.importarLote([
        ventaValida({ id: 'NUEVA-1' }),
        ventaValida({ id: 'YA-EXISTE' }),
        ventaValida({ id: 'ROTA', medioPago: 'cheque' }),
      ]);

      expect(resultado.totalRecibidas).toBe(3);
      expect(resultado.insertadas).toBe(1);
      expect(resultado.duplicadas).toBe(1);
      expect(resultado.invalidas).toBe(1);
      expect(await contarVentas()).toBe(2);
    });

    it('explica por qué una fila es inválida, con el mensaje del DTO', async () => {
      const resultado = await service.importarLote([
        ventaValida({ id: 'ROTA', medioPago: 'mercadopago' }),
      ]);

      expect(resultado.detalleInvalidas[0].errores).toContain(
        'medioPago debe ser uno de: transferencia, tarjeta, efectivo',
      );
    });

    it('una fila inválida no frena a las válidas que vienen después', async () => {
      const resultado = await service.importarLote([
        ventaValida({ id: 'ROTA', cantidad: -5 }),
        ventaValida({ id: 'BUENA' }),
      ]);

      expect(resultado.insertadas).toBe(1);
      expect(await contarVentas()).toBe(1);
    });

    // filaInicial es lo que permite que el número de fila del error apunte a la
    // línea del CSV original, y no a la posición dentro del lote.
    it('numera las filas desde filaInicial, para señalar la línea real del CSV', async () => {
      const resultado = await service.importarLote(
        [ventaValida({ id: 'ROTA', importe: 0 })],
        401,
      );

      expect(resultado.detalleInvalidas[0].numeroFila).toBe(401);
    });

    it('acepta un lote vacío sin tocar la base', async () => {
      const resultado = await service.importarLote([]);

      expect(resultado).toMatchObject({
        totalRecibidas: 0,
        insertadas: 0,
        duplicadas: 0,
        invalidas: 0,
      });
      expect(await contarVentas()).toBe(0);
    });

    it('es idempotente: reenviar el mismo lote no inserta de nuevo', async () => {
      const lote = [ventaValida({ id: 'A' }), ventaValida({ id: 'B' })];

      const primera = await service.importarLote(lote);
      const segunda = await service.importarLote(lote);

      expect(primera.insertadas).toBe(2);
      expect(segunda.insertadas).toBe(0);
      expect(segunda.duplicadas).toBe(2);
      expect(await contarVentas()).toBe(2);
    });
  });
});
