import * as XLSX from 'xlsx'
import { formatAmount, formatDate } from '@/lib/utils'

export interface ExportTransaction {
  id: string
  numericId: number
  type: 'IN' | 'OUT'
  status: string
  amount: number
  commission: number
  merchantRate: number | null
  effectiveRate: number | null
  isRecalculated: boolean
  rate: number | null
  method: {
    id: string
    code: string
    name: string
    type: string
    currency: string
    commissionPayin: number
    commissionPayout: number
  }
  createdAt: string
  updatedAt: string
  orderId: string
  trader?: {
    id: string
    name: string
  }
}

const statusLabels: Record<string, string> = {
  CREATED: 'Создана',
  IN_PROGRESS: 'В процессе',
  READY: 'Завершена',
  EXPIRED: 'Истекла',
  CANCELED: 'Отменена',
  DISPUTE: 'Спор',
}

export function exportTransactionsToExcel(
  transactions: ExportTransaction[],
  filename: string = 'transactions'
) {
  // Prepare data for Excel
  const excelData = transactions.map((transaction) => {
    // Calculate USDT amount
    let usdtAmount = null
    if (transaction.effectiveRate) {
      const usdtBeforeCommission = transaction.amount / transaction.effectiveRate
      const commissionPercent = transaction.type === 'IN' 
        ? transaction.method.commissionPayin 
        : transaction.method.commissionPayout
      usdtAmount = transaction.type === 'IN'
        ? usdtBeforeCommission * (1 - commissionPercent / 100)
        : usdtBeforeCommission * (1 + commissionPercent / 100)
    }

    return {
      'ID': `$${transaction.numericId}`,
      'Тип': transaction.type === 'IN' ? 'Входящая' : 'Исходящая',
      'Статус': statusLabels[transaction.status] || transaction.status,
      'Метод': transaction.method.name,
      'Код метода': transaction.method.code,
      'Сумма (RUB)': transaction.amount,
      'Комиссия (%)': transaction.type === 'IN' 
        ? transaction.method.commissionPayin 
        : transaction.method.commissionPayout,
      'Курс': transaction.effectiveRate || null,
      'Курс пересчитан': transaction.isRecalculated ? 'Да' : 'Нет',
      'Сумма (USDT)': usdtAmount ? parseFloat(formatAmount(usdtAmount)) : null,
      'Дата создания': formatDate(transaction.createdAt),
      'Дата обновления': formatDate(transaction.updatedAt),
      'Внешний ID': transaction.orderId || '',
      'Трейдер': transaction.trader?.name || ''
    }
  })

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(excelData)
  
  // Set column widths
  const columnWidths = [
    { wch: 12 }, // ID
    { wch: 12 }, // Тип
    { wch: 15 }, // Статус
    { wch: 20 }, // Метод
    { wch: 15 }, // Код метода
    { wch: 15 }, // Сумма (RUB)
    { wch: 12 }, // Комиссия (%)
    { wch: 10 }, // Курс
    { wch: 15 }, // Курс пересчитан
    { wch: 15 }, // Сумма (USDT)
    { wch: 20 }, // Дата создания
    { wch: 20 }, // Дата обновления
    { wch: 20 }, // Внешний ID
    { wch: 20 }, // Трейдер
  ]
  ws['!cols'] = columnWidths

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Транзакции')

  // Generate filename with current date
  const date = new Date()
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const timeStr = `${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`
  const fullFilename = `${filename}_${dateStr}_${timeStr}.xlsx`

  // Save file
  XLSX.writeFile(wb, fullFilename)
}