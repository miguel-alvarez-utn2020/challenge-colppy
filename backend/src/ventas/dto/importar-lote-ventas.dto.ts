import { IsArray, IsNotEmpty, IsOptional, IsPositive, IsInt, ArrayNotEmpty } from "class-validator"

export class ImportarLoteVentasDTO {

    @IsNotEmpty({ message: 'filas es obligatorio' })
    @IsArray({ message: 'filas debe ser un array' })
    @ArrayNotEmpty({ message: 'filas no puede estar vacío' })
    filas!: unknown[]
    @IsInt({ message: 'filaInicial debe ser un número entero' })
    @IsPositive({ message: 'filaInicial debe ser un número positivo' })
    @IsOptional()
    filaInicial : number = 1
}
