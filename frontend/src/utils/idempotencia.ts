export function armarClaveDeLote(claveDeImportacion: string, numeroDeLote: number): string {
  return `${claveDeImportacion}-lote-${numeroDeLote}`;
}

export function nuevaClaveDeImportacion(): string {
  return crypto.randomUUID();
}
