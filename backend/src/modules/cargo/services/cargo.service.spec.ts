import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CargoService } from './cargo.service';
import { KnapsackProblemDto } from '../dto';

describe('CargoService', () => {
  let service: CargoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CargoService],
    }).compile();

    service = module.get<CargoService>(CargoService);
  });

  // Verificar que el servicio se crea correctamente
  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('solve - Problemas básicos de mochila', () => {
    /**
     * Test: Problema básico de mochila
     * Verifica que el algoritmo encuentra la solución óptima
     */
    it('should solve a basic knapsack problem', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [
          { id: '1', name: 'Item A', weight: 10, profit: 60 },
          { id: '2', name: 'Item B', weight: 20, profit: 100 },
          { id: '3', name: 'Item C', weight: 30, profit: 120 },
        ],
      };

      const result = service.solve(problem);

      expect(result.totalWeight).toBeLessThanOrEqual(50);
      expect(result.totalProfit).toBeGreaterThan(0);
      expect(result.selectedItemIds.length).toBeGreaterThan(0);
      expect(result.method).toContain('Programación Dinámica');
      // El óptimo es Item B (20, 100) + Item C (30, 120) = 220
      expect(result.totalProfit).toBe(220);
    });

    /**
     * Test: Capacidad exactamente igual al peso de un item
     * Verifica el caso donde la capacidad coincide exactamente
     */
    it('should handle capacity equal to item weight exactly', () => {
      const problem: KnapsackProblemDto = {
        capacity: 10,
        items: [
          { id: '1', name: 'Item A', weight: 10, profit: 100 },
          { id: '2', name: 'Item B', weight: 5, profit: 40 },
          { id: '3', name: 'Item C', weight: 5, profit: 40 },
        ],
      };

      const result = service.solve(problem);

      expect(result.totalWeight).toBeLessThanOrEqual(10);
      // Puede ser Item A (100) o Item B + Item C (80)
      // El algoritmo debe elegir el óptimo: Item A = 100
      expect(result.totalProfit).toBe(100);
    });

    /**
     * Test: Capacidad menor que el peso del item más pequeño
     * Debe lanzar un error porque ningún item cabe
     */
    it('should throw error when capacity is less than smallest item weight', () => {
      const problem: KnapsackProblemDto = {
        capacity: 5,
        items: [
          { id: '1', name: 'Item A', weight: 10, profit: 60 },
          { id: '2', name: 'Item B', weight: 20, profit: 100 },
        ],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'Ningún item cabe en la capacidad disponible',
      );
    });

    /**
     * Test: Items con peso 0 y beneficio positivo
     * Items con peso 0 siempre deben incluirse si tienen beneficio positivo
     */
    it('should always include items with zero weight and positive profit', () => {
      const problem: KnapsackProblemDto = {
        capacity: 10,
        items: [
          { id: '1', name: 'Item Gratis', weight: 0, profit: 50 },
          { id: '2', name: 'Item Normal', weight: 10, profit: 100 },
        ],
      };

      const result = service.solve(problem);

      // Ambos items deben ser seleccionados
      expect(result.selectedItemIds).toContain('1');
      expect(result.selectedItemIds).toContain('2');
      // Beneficio total: 50 + 100 = 150
      expect(result.totalProfit).toBe(150);
      // Peso total: 0 + 10 = 10
      expect(result.totalWeight).toBe(10);
    });

    /**
     * Test: Items con beneficio 0
     * Items con beneficio 0 no deberían seleccionarse (no aportan valor)
     */
    it('should not select items with zero profit', () => {
      const problem: KnapsackProblemDto = {
        capacity: 20,
        items: [
          { id: '1', name: 'Item Sin Valor', weight: 5, profit: 0 },
          { id: '2', name: 'Item Valioso', weight: 10, profit: 100 },
        ],
      };

      const result = service.solve(problem);

      // El item con beneficio 0 no debe ser seleccionado
      expect(result.selectedItemIds).not.toContain('1');
      expect(result.selectedItemIds).toContain('2');
      expect(result.totalProfit).toBe(100);
    });

    /**
     * Test: Un solo item que cabe perfectamente
     * Caso simple con un único item
     */
    it('should select single item that fits perfectly', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [{ id: '1', name: 'Único Item', weight: 50, profit: 200 }],
      };

      const result = service.solve(problem);

      expect(result.selectedItemIds).toEqual(['1']);
      expect(result.totalWeight).toBe(50);
      expect(result.totalProfit).toBe(200);
      expect(result.remainingCapacity).toBe(0);
      expect(result.utilizationPercentage).toBe(100);
    });

    /**
     * Test: Todos los items caben en la mochila
     * Cuando la capacidad es suficiente para todos
     */
    it('should select all items when they all fit', () => {
      const problem: KnapsackProblemDto = {
        capacity: 100,
        items: [
          { id: '1', name: 'Item A', weight: 10, profit: 50 },
          { id: '2', name: 'Item B', weight: 20, profit: 100 },
          { id: '3', name: 'Item C', weight: 30, profit: 150 },
        ],
      };

      const result = service.solve(problem);

      // Todos los items deben ser seleccionados
      expect(result.selectedItemIds.sort()).toEqual(['1', '2', '3'].sort());
      expect(result.totalWeight).toBe(60);
      expect(result.totalProfit).toBe(300);
      expect(result.remainingCapacity).toBe(40);
    });

    /**
     * Test: Solo items con peso 0
     * Caso especial donde todos los items tienen peso 0
     */
    it('should handle only zero-weight items with positive profit', () => {
      const problem: KnapsackProblemDto = {
        capacity: 10,
        items: [
          { id: '1', name: 'Item A', weight: 0, profit: 50 },
          { id: '2', name: 'Item B', weight: 0, profit: 75 },
        ],
      };

      const result = service.solve(problem);

      // Todos los items de peso 0 con beneficio positivo deben incluirse
      expect(result.selectedItemIds.sort()).toEqual(['1', '2'].sort());
      expect(result.totalProfit).toBe(125);
      expect(result.totalWeight).toBe(0);
    });
  });

  describe('solve - Verificación de optimalidad', () => {
    /**
     * Test: Verificar que el beneficio total es óptimo
     * Comparar con una solución conocida
     */
    it('should find optimal solution for known problem', () => {
      // Problema clásico de mochila con solución conocida
      const problem: KnapsackProblemDto = {
        capacity: 7,
        items: [
          { id: '1', name: 'A', weight: 1, profit: 1 },
          { id: '2', name: 'B', weight: 3, profit: 4 },
          { id: '3', name: 'C', weight: 4, profit: 5 },
          { id: '4', name: 'D', weight: 5, profit: 7 },
        ],
      };

      const result = service.solve(problem);

      // Solución óptima: Item B (3,4) + Item C (4,5) = (7, 9)
      // o Item A (1,1) + Item B (3,4) + Item C (4,5) excede capacidad
      // La solución óptima conocida es 9
      expect(result.totalProfit).toBe(9);
      expect(result.totalWeight).toBe(7);
    });

    /**
     * Test: Problema de mochila con múltiples soluciones óptimas
     * Verificar que encuentra alguna de las soluciones óptimas
     */
    it('should find an optimal solution when multiple exist', () => {
      const problem: KnapsackProblemDto = {
        capacity: 20,
        items: [
          { id: '1', name: 'A', weight: 10, profit: 100 },
          { id: '2', name: 'B', weight: 10, profit: 100 },
          { id: '3', name: 'C', weight: 10, profit: 100 },
        ],
      };

      const result = service.solve(problem);

      // El óptimo es seleccionar 2 items cualesquiera
      expect(result.selectedItemIds.length).toBe(2);
      expect(result.totalProfit).toBe(200);
      expect(result.totalWeight).toBe(20);
    });
  });

  describe('validation - Validación de entrada', () => {
    /**
     * Test: Validación - capacidad = 0
     * Debe rechazar capacidades iguales a cero
     */
    it('should throw error for zero capacity', () => {
      const problem: KnapsackProblemDto = {
        capacity: 0,
        items: [{ id: '1', name: 'Item A', weight: 10, profit: 100 }],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'La capacidad debe ser mayor a cero',
      );
    });

    /**
     * Test: Validación - capacidad muy grande (límite MAX_CAPACITY)
     * Debe rechazar capacidades que excedan el límite para prevenir OOM
     */
    it('should throw error for capacity exceeding MAX_CAPACITY', () => {
      const problem: KnapsackProblemDto = {
        capacity: 100001, // MAX_CAPACITY es 100000
        items: [{ id: '1', name: 'Item A', weight: 10, profit: 100 }],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'La capacidad máxima permitida es',
      );
    });

    /**
     * Test: Validación - pesos negativos
     * Debe rechazar items con pesos negativos
     */
    it('should throw error for negative weight', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [{ id: '1', name: 'Item A', weight: -10, profit: 100 }],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'El peso del item 0 no puede ser negativo',
      );
    });

    /**
     * Test: Validación - beneficios negativos
     * Debe rechazar items con beneficios negativos
     */
    it('should throw error for negative profit', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [{ id: '1', name: 'Item A', weight: 10, profit: -100 }],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'El beneficio del item 0 no puede ser negativo',
      );
    });

    /**
     * Test: Validación - IDs duplicados
     * Debe rechazar items con IDs repetidos
     */
    it('should throw error for duplicate IDs', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [
          { id: '1', name: 'Item A', weight: 10, profit: 100 },
          { id: '1', name: 'Item B', weight: 20, profit: 200 }, // ID duplicado
        ],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'Los IDs de los items deben ser únicos',
      );
    });

    /**
     * Test: Validación - lista de items vacía
     * Debe rechazar problemas sin items
     */
    it('should throw error for empty items array', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'Debe haber al menos un item disponible',
      );
    });
  });

  describe('solveWithItemLimit - Mochila con límite de items', () => {
    /**
     * Test: Resolver con límite de items = 1
     * Debe seleccionar como máximo 1 item
     * Nota: El algoritmo limita la cantidad de items a considerar (n = min(items.length, maxItems))
     */
    it('should select at most one item when maxItems is 1', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [
          { id: '1', name: 'Item A', weight: 10, profit: 60 },
          { id: '2', name: 'Item B', weight: 20, profit: 100 },
          { id: '3', name: 'Item C', weight: 30, profit: 120 },
        ],
      };

      const result = service.solveWithItemLimit(problem, 1);

      // Con maxItems = 1, solo considera el primer item (Item A)
      expect(result.selectedItemIds.length).toBeLessThanOrEqual(1);
      expect(result.totalProfit).toBe(60); // Solo Item A que es el primero
    });

    /**
     * Test: Resolver con límite de items = 2
     * Debe encontrar la mejor combinación de hasta 2 items de los primeros 2
     * Nota: El algoritmo limita la cantidad de items a considerar (n = min(items.length, maxItems))
     */
    it('should find best combination with maxItems = 2', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [
          { id: '1', name: 'Item A', weight: 10, profit: 60 },
          { id: '2', name: 'Item B', weight: 20, profit: 100 },
          { id: '3', name: 'Item C', weight: 30, profit: 120 },
        ],
      };

      const result = service.solveWithItemLimit(problem, 2);

      // Con maxItems = 2, solo considera los primeros 2 items (A y B)
      // Mejor combinación: A + B = 160 (peso 30)
      expect(result.selectedItemIds.length).toBeLessThanOrEqual(2);
      expect(result.totalProfit).toBe(160); // A (60) + B (100)
    });

    /**
     * Test: Límite de items mayor que items disponibles
     * Debe comportarse como la mochila normal
     */
    it('should work normally when maxItems exceeds available items', () => {
      const problem: KnapsackProblemDto = {
        capacity: 100,
        items: [
          { id: '1', name: 'Item A', weight: 10, profit: 50 },
          { id: '2', name: 'Item B', weight: 20, profit: 100 },
        ],
      };

      const result = service.solveWithItemLimit(problem, 10);

      // Debe seleccionar ambos items
      expect(result.selectedItemIds.sort()).toEqual(['1', '2'].sort());
      expect(result.totalProfit).toBe(150);
    });

    /**
     * Test: Validación - límite de items <= 0
     * Debe rechazar límites inválidos
     */
    it('should throw error for maxItems <= 0', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [{ id: '1', name: 'Item A', weight: 10, profit: 100 }],
      };

      expect(() => service.solveWithItemLimit(problem, 0)).toThrow(
        BadRequestException,
      );
      expect(() => service.solveWithItemLimit(problem, 0)).toThrow(
        'El límite de items debe ser mayor a cero',
      );
    });

    /**
     * Test: Método indica el límite de items
     * El método debe incluir la información del límite
     */
    it('should include item limit in method description', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [{ id: '1', name: 'Item A', weight: 10, profit: 100 }],
      };

      const result = service.solveWithItemLimit(problem, 3);

      expect(result.method).toContain('máx 3 items');
    });
  });

  describe('calculateEfficiency - Cálculo de eficiencia', () => {
    /**
     * Test: Calcular eficiencia de items
     * La eficiencia es beneficio/peso
     */
    it('should calculate efficiency correctly', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [
          { id: '1', name: 'Item A', weight: 10, profit: 100 }, // efficiency: 10
          { id: '2', name: 'Item B', weight: 20, profit: 100 }, // efficiency: 5
          { id: '3', name: 'Item C', weight: 5, profit: 100 }, // efficiency: 20
        ],
      };

      const result = service.calculateEfficiency(problem) as Array<{
        id: string;
        efficiency: number;
      }>;

      // Debe estar ordenado por eficiencia descendente
      expect(result[0].id).toBe('3'); // efficiency: 20
      expect(result[1].id).toBe('1'); // efficiency: 10
      expect(result[2].id).toBe('2'); // efficiency: 5

      // Verificar valores de eficiencia
      expect(result[0].efficiency).toBe(20);
      expect(result[1].efficiency).toBe(10);
      expect(result[2].efficiency).toBe(5);
    });

    /**
     * Test: Eficiencia con pesos muy pequeños
     * Items con bajo peso tienen alta eficiencia
     */
    it('should handle items with very small weights', () => {
      const problem: KnapsackProblemDto = {
        capacity: 50,
        items: [
          { id: '1', name: 'Pequeño', weight: 1, profit: 100 },
          { id: '2', name: 'Grande', weight: 100, profit: 100 },
        ],
      };

      const result = service.calculateEfficiency(problem) as Array<{
        id: string;
        efficiency: number;
      }>;

      expect(result[0].id).toBe('1');
      expect(result[0].efficiency).toBe(100);
    });
  });

  describe('optimizeMultipleScenarios - Optimización múltiple', () => {
    /**
     * Test: Optimizar múltiples escenarios
     * Debe resolver cada problema independientemente
     */
    it('should solve multiple problems independently', () => {
      const problems: KnapsackProblemDto[] = [
        {
          capacity: 10,
          items: [{ id: '1', name: 'A', weight: 5, profit: 50 }],
        },
        {
          capacity: 20,
          items: [{ id: '2', name: 'B', weight: 10, profit: 100 }],
        },
      ];

      const results = service.optimizeMultipleScenarios(problems);

      expect(results.length).toBe(2);
      expect(results[0].totalProfit).toBe(50);
      expect(results[1].totalProfit).toBe(100);
    });
  });

  describe('solve - Casos especiales', () => {
    /**
     * Test: Capacidad en el límite permitido
     * Verificar que funciona con la capacidad máxima
     */
    it('should work with capacity at MAX_CAPACITY limit', () => {
      const problem: KnapsackProblemDto = {
        capacity: 100000, // MAX_CAPACITY
        items: [{ id: '1', name: 'Item Grande', weight: 50000, profit: 1000 }],
      };

      const result = service.solve(problem);

      expect(result.selectedItemIds).toContain('1');
      expect(result.totalProfit).toBe(1000);
    });

    /**
     * Test: Utilización del porcentaje
     * Verificar cálculo correcto del porcentaje de utilización
     */
    it('should calculate utilization percentage correctly', () => {
      const problem: KnapsackProblemDto = {
        capacity: 100,
        items: [
          { id: '1', name: 'Item A', weight: 25, profit: 50 },
          { id: '2', name: 'Item B', weight: 25, profit: 50 },
        ],
      };

      const result = service.solve(problem);

      expect(result.totalWeight).toBe(50);
      expect(result.remainingCapacity).toBe(50);
      expect(result.utilizationPercentage).toBe(50);
    });

    /**
     * Test: Items con valores decimales de peso (se truncan a enteros)
     * Los pesos decimales se convierten a enteros
     */
    it('should handle decimal weights by flooring', () => {
      const problem: KnapsackProblemDto = {
        capacity: 10,
        items: [
          { id: '1', name: 'Item A', weight: 5.9, profit: 100 },
          { id: '2', name: 'Item B', weight: 4.1, profit: 80 },
        ],
      };

      const result = service.solve(problem);

      // 5.9 -> 5, 4.1 -> 4, ambos caben (5 + 4 = 9 <= 10)
      expect(result.selectedItemIds.sort()).toEqual(['1', '2'].sort());
      expect(result.totalProfit).toBe(180);
    });

    /**
     * Test: Múltiples items con peso 0
     * Todos deben ser incluidos si tienen beneficio positivo
     */
    it('should include all zero-weight items with positive profit', () => {
      const problem: KnapsackProblemDto = {
        capacity: 10,
        items: [
          { id: '1', name: 'Free A', weight: 0, profit: 10 },
          { id: '2', name: 'Free B', weight: 0, profit: 20 },
          { id: '3', name: 'Free C', weight: 0, profit: 30 },
          { id: '4', name: 'Regular', weight: 10, profit: 100 },
        ],
      };

      const result = service.solve(problem);

      // Todos deben ser seleccionados
      expect(result.selectedItemIds.sort()).toEqual(
        ['1', '2', '3', '4'].sort(),
      );
      expect(result.totalProfit).toBe(160);
    });
  });
});
