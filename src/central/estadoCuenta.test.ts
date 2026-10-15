import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { abonosDesdeTabla, fecha, leerEstadoCuenta, monto } from './estadoCuenta'

describe('estado de cuenta', () => {
  it('lee montos venezolanos y gringos', () => {
    expect(monto('1.234,56')).toBe(1234.56)
    expect(monto('1,234.56')).toBe(1234.56)
    expect(monto('Bs. 395,00')).toBe(395)
    expect(monto('395.5')).toBe(395.5)
    expect(monto('-120,00')).toBe(-120)
    expect(monto(790)).toBe(790)
    expect(monto('')).toBeNaN()
  })

  it('lee fechas en varios formatos', () => {
    expect(fecha('05/10/2026')).toBe('2026-10-05')
    expect(fecha('2026-10-05')).toBe('2026-10-05')
    expect(fecha('5-10-26')).toBe('2026-10-05')
    expect(fecha(46300)).toBe('2026-10-05')
    expect(fecha(new Date(2026, 9, 5))).toBe('2026-10-05')
    expect(fecha('Saldo inicial')).toBe('')
  })

  it('encuentra los títulos y se queda solo con los abonos (formato BDV: cargo y abono)', () => {
    const filas = [
      ['BANCO DE VENEZUELA'],
      ['Cuenta: 0102-****-1234', '', '', '', '', ''],
      [],
      ['Fecha', 'Referencia', 'Concepto', 'Cargo', 'Abono', 'Saldo'],
      ['05/10/2026', '003418274651', 'PAGO MOVIL RECIBIDO 04121112233', '', '395,00', '1.395,00'],
      ['05/10/2026', '000000771122', 'COMISION', '2,50', '', '1.392,50'],
      ['06/10/2026', '88120034', 'PAGO MOVIL RECIBIDO', '', '790,00', '2.182,50'],
      ['', '', 'Total', '2,50', '1.185,00', ''],
    ]
    expect(abonosDesdeTabla(filas)).toEqual([
      { fecha: '2026-10-05', referencia: '003418274651', descripcion: 'PAGO MOVIL RECIBIDO 04121112233', monto: 395 },
      { fecha: '2026-10-06', referencia: '88120034', descripcion: 'PAGO MOVIL RECIBIDO', monto: 790 },
    ])
  })

  it('con una sola columna de monto ignora los negativos', () => {
    const filas = [
      ['Fecha Operación', 'Nro. Referencia', 'Descripción', 'Monto'],
      ['2026-10-05', 'Ref 5512 0987', 'PM recibido', '120.00'],
      ['2026-10-05', '99887766', 'Pago a proveedor', '-50.00'],
    ]
    expect(abonosDesdeTabla(filas)).toEqual([{ fecha: '2026-10-05', referencia: '55120987', descripcion: 'PM recibido', monto: 120 }])
  })

  it('avisa si el archivo no tiene las columnas', () => {
    expect(() => abonosDesdeTabla([['hola', 'mundo']])).toThrow(/columnas/)
  })

  it('lee un .xlsx y un .csv con punto y coma', async () => {
    const hoja = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Referencia', 'Descripción', 'Débito', 'Crédito'],
      [new Date(2026, 9, 7), '12345678', 'PAGO MOVIL', 0, 395],
    ])
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Movimientos')
    const bytes = XLSX.write(libro, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const xlsx = await leerEstadoCuenta(new File([bytes], 'estado.xlsx'))
    expect(xlsx).toEqual([{ fecha: '2026-10-07', referencia: '12345678', descripcion: 'PAGO MOVIL', monto: 395 }])

    const csv = await leerEstadoCuenta(new File(['Fecha;Referencia;Concepto;Abono\n07/10/2026;12345678;PAGO MOVIL;395,00\n'], 'estado.csv'))
    expect(csv).toEqual([{ fecha: '2026-10-07', referencia: '12345678', descripcion: 'PAGO MOVIL', monto: 395 }])

    await expect(leerEstadoCuenta(new File(['%PDF'], 'estado.pdf'))).rejects.toThrow(/PDF/)
  })
})
