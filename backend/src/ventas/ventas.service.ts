import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PG_POOL } from '../database/database.module';
import { VentaDTO } from './dto/venta.dto';
import { FilaInvalida } from './interfaces/fila-invalida.interface';
import { FilaCandidata } from './interfaces/fila-candidata.interface';

@Injectable()
export class VentasService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async crear(venta: VentaDTO) {
    const query = `
      INSERT INTO ventas (id, producto, fecha, cliente, cantidad, importe, medio_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    const values = [
      venta.id,
      venta.producto,
      venta.fecha,
      venta.cliente ?? null,
      venta.cantidad,
      venta.importe,
      venta.medioPago,
    ];

    const result = await this.pool.query(query, values);

    if (result.rowCount === 0) {
      return {
        insertado: false,
        mensaje: `La venta con id "${venta.id}" ya existe, se ignoró.`,
      };
    }

    return { insertado: true, id: venta.id };
  }

  async listar(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT id, producto, fecha, cliente, cantidad, importe, medio_pago AS "medioPago"
      FROM ventas
      ORDER BY fecha DESC, id DESC
      LIMIT $1
      OFFSET $2
    `;

    const result = await this.pool.query(query, [limit, offset]);

    return result.rows;
  }

  async consolidado() {
    const query = `
      SELECT fecha, COUNT(*) AS cantidad, SUM(importe) AS total
      FROM ventas
      GROUP BY fecha
      ORDER BY fecha
    `;

    const result = await this.pool.query(query);

    const porDia = result.rows.map((fila) => ({
      fecha: fila.fecha,
      total: Number(fila.total),
    }));

    const totalGeneral = porDia.reduce(
      (acumulado, dia) => acumulado + dia.total,
      0,
    );

    const totalVentas = result.rows.reduce(
      (acumulado, fila) => acumulado + Number(fila.cantidad),
      0,
    );

    return { totalGeneral, totalVentas, porDia };
  }

  async importarLote(filas: unknown[], filaInicial: number = 1) {
    const invalidas: FilaInvalida[] = [];
    const candidatas: FilaCandidata[] = [];

    for (const [indice, fila] of filas.entries()) {
      const venta = plainToInstance(VentaDTO, fila);
      const errores = await validate(venta);
      if (errores.length > 0) {
        invalidas.push({
          numeroFila: filaInicial + indice,
          fila,
          errores: errores.flatMap((errorDeCampo) =>
            Object.values(errorDeCampo.constraints ?? {}),
          ),
        });
        continue;
      }
      const candidata: FilaCandidata = {
        numeroFila: filaInicial + indice,
        venta
      }
      candidatas.push(candidata);
    }

    const { insertadas, duplicadas } = await this.insertarCandidatas(candidatas);

    return {
      totalRecibidas: filas.length,
      insertadas: insertadas.length,
      duplicadas: duplicadas.length,
      invalidas: invalidas.length,
      detalleDuplicadas: duplicadas,
      detalleInvalidas: invalidas,
    };
  }

  private async insertarCandidatas(candidatas: FilaCandidata[]) {
    if (candidatas.length === 0) {
      return { insertadas: [], duplicadas: [] };
    }

    const values: unknown[] = [];
    const placeholders = candidatas.map((candidata, i) => {
      const base = i * 7;
      values.push(
        candidata.venta.id,
        candidata.venta.producto,
        candidata.venta.fecha,
        candidata.venta.cliente ?? null,
        candidata.venta.cantidad,
        candidata.venta.importe,
        candidata.venta.medioPago,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
    });

    const query = `
      INSERT INTO ventas (id, producto, fecha, cliente, cantidad, importe, medio_pago)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;

    const result = await this.pool.query(query, values);
    const idsInsertados = new Set(result.rows.map((fila) => fila.id));

    const insertadas = candidatas.filter((c) => idsInsertados.has(c.venta.id));
    const duplicadas = candidatas.filter((c) => !idsInsertados.has(c.venta.id));

    return { insertadas, duplicadas };
  }
}
