import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { LIMIT_MAXIMO_LISTADO } from '../constants/paginacion.constants';

export class ListarVentasDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @IsPositive({ message: 'page debe ser un número positivo' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @IsPositive({ message: 'limit debe ser un número positivo' })
  @Max(LIMIT_MAXIMO_LISTADO, {
    message: `limit no puede superar los ${LIMIT_MAXIMO_LISTADO} elementos`,
  })
  limit: number = 20;
}
