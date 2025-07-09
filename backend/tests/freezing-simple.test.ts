import { expect, it, describe } from 'bun:test'
import { calculateFreezingParams, ceilUp2 } from '@/utils/freezing'

describe('Модуль заморозки средств - Утилиты', () => {
  describe('ceilUp2', () => {
    it('правильно округляет до 2 знаков вверх', () => {
      expect(ceilUp2(1.234)).toBe(1.24)
      expect(ceilUp2(1.235)).toBe(1.24)
      expect(ceilUp2(1.231)).toBe(1.24)
      expect(ceilUp2(1.2)).toBe(1.2)
      expect(ceilUp2(1)).toBe(1)
      expect(ceilUp2(0)).toBe(0)
      expect(ceilUp2(99.999)).toBe(100)
    })
  })

  describe('calculateFreezingParams', () => {
    it('правильно рассчитывает параметры заморозки', () => {
      const params = calculateFreezingParams(10000, 100, 5, 2.5)
      
      // adjRate = 100 * (1 - 5/100) = 100 * 0.95 = 95
      expect(params.adjustedRate).toBe(95)
      
      // usdtFreeze = ceilUp2(10000 / 95) = ceilUp2(105.2631...) = 105.27
      expect(params.frozenUsdtAmount).toBe(105.27)
      
      // commission = ceilUp2(105.27 * 2.5/100) = ceilUp2(2.63175) = 2.64
      expect(params.calculatedCommission).toBe(2.64)
    })

    it('обрабатывает нулевые значения', () => {
      const params = calculateFreezingParams(10000, 100, 0, 0)
      
      expect(params.adjustedRate).toBe(100)
      expect(params.frozenUsdtAmount).toBe(100)
      expect(params.calculatedCommission).toBe(0)
    })

    it('обрабатывает различные процентные ставки', () => {
      // Тест с высоким ККК (10%)
      const params1 = calculateFreezingParams(10000, 100, 10, 3)
      expect(params1.adjustedRate).toBe(90) // 100 * (1 - 10/100) = 90
      expect(params1.frozenUsdtAmount).toBe(111.12) // ceilUp2(10000 / 90)
      expect(params1.calculatedCommission).toBe(3.34) // ceilUp2(111.12 * 3/100)

      // Тест с низким ККК (1%)
      const params2 = calculateFreezingParams(5000, 95, 1, 1.5)
      expect(params2.adjustedRate).toBe(94.05) // 95 * (1 - 1/100) = 94.05
      expect(params2.frozenUsdtAmount).toBe(53.17) // ceilUp2(5000 / 94.05)
      expect(params2.calculatedCommission).toBe(0.8) // ceilUp2(53.17 * 1.5/100)
    })

    it('обрабатывает большие суммы', () => {
      const params = calculateFreezingParams(1000000, 100, 5, 2.5)
      
      expect(params.adjustedRate).toBe(95)
      expect(params.frozenUsdtAmount).toBe(10526.32) // ceilUp2(1000000 / 95)
      expect(params.calculatedCommission).toBe(263.16) // ceilUp2(10526.32 * 2.5/100)
    })

    it('обрабатывает малые суммы', () => {
      const params = calculateFreezingParams(100, 100, 5, 2.5)
      
      expect(params.adjustedRate).toBe(95)
      expect(params.frozenUsdtAmount).toBe(1.06) // ceilUp2(100 / 95)
      expect(params.calculatedCommission).toBe(0.03) // ceilUp2(1.06 * 2.5/100)
    })
  })
})