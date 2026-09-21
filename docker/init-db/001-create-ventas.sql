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