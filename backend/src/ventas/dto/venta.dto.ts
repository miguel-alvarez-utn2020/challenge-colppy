import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator'


enum MEDIO_PAGO {
    TRANSFERENCIA= 'transferencia',
    TARJETA = 'tarjeta',
    EFECTIVO = 'efectivo'  
}

export class VentaDTO{
    @IsNotEmpty({ message: 'id es obligatorio' })
    @IsString({ message: 'id debe ser un texto' })
    id !: string;
    @IsNotEmpty({ message: 'fecha es obligatoria' })
    @IsDateString({}, { message: 'fecha debe tener formato de fecha válido (ISO 8601)' })
    fecha!: string;
    @IsOptional()
    @IsString({ message: 'cliente debe ser un texto' })
    cliente?: string;
    @IsNotEmpty({ message: 'cantidad es obligatoria' })
    @IsPositive({ message: 'cantidad debe ser un número positivo' })
    @IsInt({ message: 'cantidad debe ser un número entero' })
    cantidad!: number;
    @IsNotEmpty({ message: 'importe es obligatorio' })
    @IsPositive({ message: 'importe debe ser un número positivo' })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'importe debe ser un número con hasta 2 decimales' })
    importe!: number;
    @IsNotEmpty({ message: 'medioPago es obligatorio' })
    @IsEnum(MEDIO_PAGO, { message: 'medioPago debe ser uno de: transferencia, tarjeta, efectivo' })
    medioPago!: MEDIO_PAGO;
    @IsNotEmpty({ message: 'producto es obligatorio' })
    @IsString({ message: 'producto debe ser un texto' })
    producto!: string;
}
