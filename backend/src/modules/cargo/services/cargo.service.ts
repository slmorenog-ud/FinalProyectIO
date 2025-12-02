import { Injectable, BadRequestException } from '@nestjs/common';
import {
  KnapsackProblemDto,
  KnapsackSolutionDto,
  SelectedItemDetail,
} from '../dto';

/**
 * Servicio para resolver el problema de la mochila 0/1
 *
 * Implementa algoritmos de Programación Dinámica para maximizar el beneficio
 * de la carga sin exceder la capacidad del contenedor.
 *
 * @remarks
 * El problema de la mochila 0/1 es un problema clásico de optimización combinatoria
 * donde cada item puede ser seleccionado o no (decisión binaria).
 *
 * Complejidad temporal: O(n * W) donde n es el número de items y W la capacidad.
 *
 * @example
 * ```typescript
 * const problem = {
 *   capacity: 50,
 *   items: [
 *     { id: '1', name: 'A', weight: 10, profit: 100 },
 *     { id: '2', name: 'B', weight: 20, profit: 150 }
 *   ]
 * };
 * const solution = cargoService.solve(problem);
 * ```
 */
@Injectable()
export class CargoService {
  /**
   * Resuelve el problema de la mochila 0/1 usando Programación Dinámica
   */
  solve(problem: KnapsackProblemDto): KnapsackSolutionDto {
    this.validateProblem(problem);

    const { capacity, items } = problem;

    // CASO LÍMITE: Separar items con peso 0 (siempre se incluyen si tienen beneficio)
    const zeroWeightItems = items.filter((i) => i.weight === 0 && i.profit > 0);
    const regularItems = items.filter((i) => i.weight > 0);
    const n = regularItems.length;

    // Si solo hay items de peso 0, retornar directamente
    if (n === 0) {
      const totalProfit = zeroWeightItems.reduce((sum, i) => sum + i.profit, 0);
      return {
        selectedItemIds: zeroWeightItems.map((i) => i.id),
        selectedItems: zeroWeightItems.map((i) => ({
          id: i.id,
          name: i.name,
          weight: i.weight,
          profit: i.profit,
        })),
        totalProfit,
        totalWeight: 0,
        remainingCapacity: capacity,
        utilizationPercentage: 0,
        method: 'Programación Dinámica - Mochila 0/1',
      };
    }

    // Tabla de programación dinámica
    // dp[i][w] = máximo beneficio con los primeros i items y capacidad w
    const dp: number[][] = Array(n + 1)
      .fill(0)
      .map(() => Array(capacity + 1).fill(0));

    // Llenar la tabla de programación dinámica
    for (let i = 1; i <= n; i++) {
      const currentItem = regularItems[i - 1];
      const weight = Math.floor(currentItem.weight);
      const profit = currentItem.profit;

      for (let w = 0; w <= capacity; w++) {
        if (weight <= w) {
          // Podemos incluir el item
          dp[i][w] = Math.max(
            dp[i - 1][w], // No incluir el item
            dp[i - 1][w - weight] + profit, // Incluir el item
          );
        } else {
          // No podemos incluir el item
          dp[i][w] = dp[i - 1][w];
        }
      }
    }

    // Reconstruir la solución (backtracking)
    const selectedItemIds: string[] = [];
    const selectedItems: SelectedItemDetail[] = [];
    let w = capacity;
    let totalWeight = 0;

    for (let i = n; i > 0 && w > 0; i--) {
      // Si el valor cambió respecto a la fila anterior, el item fue incluido
      if (dp[i][w] !== dp[i - 1][w]) {
        const item = regularItems[i - 1];
        selectedItemIds.push(item.id);
        selectedItems.push({
          id: item.id,
          name: item.name,
          weight: item.weight,
          profit: item.profit,
        });
        totalWeight += item.weight;
        w -= Math.floor(item.weight);
      }
    }

    // CASO LÍMITE: Agregar items de peso 0 con beneficio positivo
    for (const item of zeroWeightItems) {
      selectedItemIds.push(item.id);
      selectedItems.push({
        id: item.id,
        name: item.name,
        weight: item.weight,
        profit: item.profit,
      });
    }

    const zeroWeightProfit = zeroWeightItems.reduce(
      (sum, i) => sum + i.profit,
      0,
    );
    const totalProfit = dp[n][capacity] + zeroWeightProfit;
    const remainingCapacity = capacity - totalWeight;
    const utilizationPercentage = (totalWeight / capacity) * 100;

    return {
      selectedItemIds,
      selectedItems,
      totalProfit,
      totalWeight,
      remainingCapacity,
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      method: 'Programación Dinámica - Mochila 0/1',
    };
  }

  /**
   * Optimiza múltiples escenarios de carga
   */
  optimizeMultipleScenarios(
    problems: KnapsackProblemDto[],
  ): KnapsackSolutionDto[] {
    return problems.map((problem) => this.solve(problem));
  }

  /**
   * Resuelve el problema de la mochila con límite de items
   * (útil para cuando hay restricciones adicionales)
   */
  solveWithItemLimit(
    problem: KnapsackProblemDto,
    maxItems: number,
  ): KnapsackSolutionDto {
    this.validateProblem(problem);

    if (maxItems <= 0) {
      throw new BadRequestException('El límite de items debe ser mayor a cero');
    }

    const { capacity, items } = problem;
    const n = Math.min(items.length, maxItems);

    // Tabla de programación dinámica con límite de items
    // dp[i][w][k] = máximo beneficio con los primeros i items, capacidad w y usando k items
    const dp: number[][][] = Array(n + 1)
      .fill(0)
      .map(() =>
        Array(capacity + 1)
          .fill(0)
          .map(() => Array(maxItems + 1).fill(0)),
      );

    for (let i = 1; i <= n; i++) {
      const currentItem = items[i - 1];
      const weight = Math.floor(currentItem.weight);
      const profit = currentItem.profit;

      for (let w = 0; w <= capacity; w++) {
        for (let k = 0; k <= maxItems; k++) {
          if (weight <= w && k > 0) {
            dp[i][w][k] = Math.max(
              dp[i - 1][w][k],
              dp[i - 1][w - weight][k - 1] + profit,
            );
          } else {
            dp[i][w][k] = dp[i - 1][w][k];
          }
        }
      }
    }

    // Reconstruir la solución
    const selectedItemIds: string[] = [];
    const selectedItems: SelectedItemDetail[] = [];
    let w = capacity;
    let k = maxItems;
    let totalWeight = 0;

    for (let i = n; i > 0 && w > 0 && k > 0; i--) {
      if (dp[i][w][k] !== dp[i - 1][w][k]) {
        const item = items[i - 1];
        selectedItemIds.push(item.id);
        selectedItems.push({
          id: item.id,
          name: item.name,
          weight: item.weight,
          profit: item.profit,
        });
        totalWeight += item.weight;
        w -= Math.floor(item.weight);
        k--;
      }
    }

    const totalProfit = dp[n][capacity][maxItems];
    const remainingCapacity = capacity - totalWeight;
    const utilizationPercentage = (totalWeight / capacity) * 100;

    return {
      selectedItemIds,
      selectedItems,
      totalProfit,
      totalWeight,
      remainingCapacity,
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      method: `Programación Dinámica - Mochila 0/1 (máx ${maxItems} items)`,
    };
  }

  /**
   * Calcula la eficiencia de la carga (beneficio por unidad de peso)
   */
  calculateEfficiency(problem: KnapsackProblemDto): any[] {
    const itemsWithEfficiency = problem.items.map((item) => ({
      ...item,
      efficiency: item.profit / item.weight,
    }));

    return itemsWithEfficiency.sort((a, b) => b.efficiency - a.efficiency);
  }

  // CASO LÍMITE: Capacidad máxima para evitar Out of Memory
  private static readonly MAX_CAPACITY = 100000;

  /**
   * Valida que el problema esté bien formado
   */
  private validateProblem(problem: KnapsackProblemDto): void {
    const { capacity, items } = problem;

    if (capacity <= 0) {
      throw new BadRequestException('La capacidad debe ser mayor a cero');
    }

    // CASO LÍMITE: Prevenir Out of Memory con capacidades muy grandes
    if (capacity > CargoService.MAX_CAPACITY) {
      throw new BadRequestException(
        `La capacidad máxima permitida es ${CargoService.MAX_CAPACITY}. Para capacidades mayores, considere escalar los valores.`,
      );
    }

    if (items.length === 0) {
      throw new BadRequestException('Debe haber al menos un item disponible');
    }

    // CASO LÍMITE: Verificar si hay al menos un item que cabe
    const minWeight = Math.min(...items.map((i) => i.weight));
    if (minWeight > capacity) {
      throw new BadRequestException(
        `Ningún item cabe en la capacidad disponible. El item más liviano pesa ${minWeight} y la capacidad es ${capacity}.`,
      );
    }

    items.forEach((item, index) => {
      // CASO LÍMITE: Permitir peso 0 pero con advertencia implícita
      if (item.weight < 0) {
        throw new BadRequestException(
          `El peso del item ${index} no puede ser negativo`,
        );
      }

      if (item.weight === 0 && item.profit > 0) {
        // Item con peso 0 y beneficio positivo siempre se incluye
        // No es un error, pero el algoritmo lo manejará
      }

      if (item.profit < 0) {
        throw new BadRequestException(
          `El beneficio del item ${index} no puede ser negativo`,
        );
      }
    });

    // Verificar IDs únicos
    const ids = items.map((item) => item.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new BadRequestException('Los IDs de los items deben ser únicos');
    }
  }
}
