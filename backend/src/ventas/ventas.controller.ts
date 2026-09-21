import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { VentasService } from './ventas.service';
import { VentaDTO } from './dto/venta.dto';
import { ImportarLoteVentasDTO } from './dto/importar-lote-ventas.dto';
import { ListarVentasDTO } from './dto/listar-ventas.dto';
import { IdempotencyGuard } from '../common/guards/idempotency.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { LOTE_MAXIMO_IMPORTACION } from './constants/importacion.constants';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  async crear(@Body() venta: VentaDTO, @Res() response: Response) {
    const resultado = await this.ventasService.crear(venta);
    const status = resultado.insertado ? 201 : 200;
    response.status(status).json(resultado);
  }

  @Get()
  listar(@Query() query: ListarVentasDTO) {
    return this.ventasService.listar(query.page, query.limit);
  }

  @Get('consolidado')
  consolidado() {
    return this.ventasService.consolidado();
  }

  @Post('importar')
  @HttpCode(200)
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  importar(@Body() body: ImportarLoteVentasDTO) {
    if (body.filas.length > LOTE_MAXIMO_IMPORTACION) {
      throw new BadRequestException({
        message: `El lote no puede superar los ${LOTE_MAXIMO_IMPORTACION} elementos`,
        loteMaximoPermitido: LOTE_MAXIMO_IMPORTACION,
      });
    }
    return this.ventasService.importarLote(body.filas, body.filaInicial ?? 1);
  }

}
