import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TransportService } from './transport.service';
import { TransportProblemDto } from '../dto';

describe('TransportService', () => {
  let service: TransportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransportService],
    }).compile();

    service = module.get<TransportService>(TransportService);
  });

  // Verificar que el servicio se crea correctamente
  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('solve - Problemas balanceados y desbalanceados', () => {
    /**
     * Test: Problema balanceado (oferta = demanda)
     * Un problema está balanceado cuando la suma total de ofertas
     * es igual a la suma total de demandas
     */
    it('should solve a balanced transport problem (supply = demand)', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 100 },
          { name: 'Origen B', supply: 150 },
        ],
        destinations: [
          { name: 'Destino X', demand: 80 },
          { name: 'Destino Y', demand: 170 },
        ],
        costs: [
          [10, 20],
          [15, 10],
        ],
      };

      const result = service.solve(problem);

      // Verificar que el problema está balanceado
      expect(result.isBalanced).toBe(true);
      // El costo total debe ser no negativo
      expect(result.totalCost).toBeGreaterThanOrEqual(0);
      // Debe tener asignaciones
      expect(result.allocationDetails.length).toBeGreaterThan(0);
      // Verificar el método utilizado
      expect(result.method).toContain('Vogel');

      // Verificar que las asignaciones respetan las restricciones
      const totalAllocated = result.allocationDetails.reduce(
        (sum, detail) => sum + detail.quantity,
        0,
      );
      expect(totalAllocated).toBe(250); // 100 + 150 = 80 + 170 = 250
    });

    /**
     * Test: Problema desbalanceado (oferta > demanda)
     * Se debe agregar un destino ficticio para absorber el exceso de oferta
     */
    it('should solve an unbalanced problem (supply > demand)', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 200 },
          { name: 'Origen B', supply: 150 },
        ],
        destinations: [
          { name: 'Destino X', demand: 100 },
          { name: 'Destino Y', demand: 100 },
        ],
        costs: [
          [10, 20],
          [15, 10],
        ],
      };

      const result = service.solve(problem);

      // El problema no está balanceado
      expect(result.isBalanced).toBe(false);
      // El costo debe ser calculado correctamente
      expect(result.totalCost).toBeGreaterThanOrEqual(0);
      // Las asignaciones a destinos ficticios tienen costo 0
      // por lo que el costo total puede incluir algunas asignaciones ficticias
    });

    /**
     * Test: Problema desbalanceado (oferta < demanda)
     * Se debe agregar un origen ficticio para cubrir la demanda faltante
     */
    it('should solve an unbalanced problem (supply < demand)', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 50 },
          { name: 'Origen B', supply: 50 },
        ],
        destinations: [
          { name: 'Destino X', demand: 100 },
          { name: 'Destino Y', demand: 100 },
        ],
        costs: [
          [10, 20],
          [15, 10],
        ],
      };

      const result = service.solve(problem);

      // El problema no está balanceado
      expect(result.isBalanced).toBe(false);
      // Debe tener asignaciones
      expect(result.allocationDetails.length).toBeGreaterThan(0);
    });
  });

  describe('solve - Casos límite de matrices', () => {
    /**
     * Test: Matriz de costos 1x1 (caso mínimo)
     * El caso más simple: un origen y un destino
     */
    it('should solve a 1x1 cost matrix (minimum case)', () => {
      const problem: TransportProblemDto = {
        origins: [{ name: 'Único Origen', supply: 100 }],
        destinations: [{ name: 'Único Destino', demand: 100 }],
        costs: [[50]],
      };

      const result = service.solve(problem);

      expect(result.isBalanced).toBe(true);
      // El costo debe ser 100 * 50 = 5000
      expect(result.totalCost).toBe(5000);
      expect(result.allocationDetails.length).toBe(1);
      expect(result.allocationDetails[0].quantity).toBe(100);
      expect(result.allocationDetails[0].unitCost).toBe(50);
    });

    /**
     * Test: Matriz de costos con todos los valores iguales
     * El algoritmo debe funcionar cuando todos los costos son idénticos
     */
    it('should solve when all costs are equal', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 50 },
          { name: 'Origen B', supply: 50 },
        ],
        destinations: [
          { name: 'Destino X', demand: 50 },
          { name: 'Destino Y', demand: 50 },
        ],
        costs: [
          [10, 10],
          [10, 10],
        ],
      };

      const result = service.solve(problem);

      expect(result.isBalanced).toBe(true);
      // El costo total debe ser 100 * 10 = 1000
      expect(result.totalCost).toBe(1000);
    });

    /**
     * Test: Costos con valor 0 en algunas rutas
     * Las rutas con costo 0 deben ser preferidas
     */
    it('should prioritize routes with zero cost', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 100 },
          { name: 'Origen B', supply: 100 },
        ],
        destinations: [
          { name: 'Destino X', demand: 100 },
          { name: 'Destino Y', demand: 100 },
        ],
        costs: [
          [0, 100],
          [100, 0],
        ],
      };

      const result = service.solve(problem);

      expect(result.isBalanced).toBe(true);
      // El algoritmo VAM debería preferir las rutas con costo 0
      // El costo óptimo es 0 (A->X: 100, B->Y: 100)
      expect(result.totalCost).toBe(0);
    });

    /**
     * Test: Matriz de costos grande (3x4)
     * Verificar que funciona con matrices más grandes
     */
    it('should solve a larger cost matrix (3x4)', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 100 },
          { name: 'Origen B', supply: 200 },
          { name: 'Origen C', supply: 100 },
        ],
        destinations: [
          { name: 'Destino W', demand: 50 },
          { name: 'Destino X', demand: 150 },
          { name: 'Destino Y', demand: 100 },
          { name: 'Destino Z', demand: 100 },
        ],
        costs: [
          [10, 20, 30, 40],
          [15, 25, 35, 45],
          [20, 30, 40, 50],
        ],
      };

      const result = service.solve(problem);

      expect(result.isBalanced).toBe(true);
      expect(result.totalCost).toBeGreaterThan(0);

      // Verificar que la suma de asignaciones es correcta
      const totalAllocated = result.allocationDetails.reduce(
        (sum, detail) => sum + detail.quantity,
        0,
      );
      expect(totalAllocated).toBe(400); // 100 + 200 + 100 = 400
    });
  });

  describe('solve - Verificación de cálculos', () => {
    /**
     * Test: Verificar que el costo total calculado es correcto
     * El costo total debe ser la suma de (cantidad * costo unitario)
     */
    it('should calculate total cost correctly', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 30 },
          { name: 'Origen B', supply: 70 },
        ],
        destinations: [
          { name: 'Destino X', demand: 40 },
          { name: 'Destino Y', demand: 60 },
        ],
        costs: [
          [8, 6],
          [10, 4],
        ],
      };

      const result = service.solve(problem);

      // Verificar que el costo total es la suma de los costos individuales
      const calculatedCost = result.allocationDetails.reduce(
        (sum, detail) => sum + detail.totalCost,
        0,
      );
      expect(result.totalCost).toBe(calculatedCost);

      // Verificar que cada detalle tiene el costo correcto
      result.allocationDetails.forEach((detail) => {
        expect(detail.totalCost).toBe(detail.quantity * detail.unitCost);
      });
    });

    /**
     * Test: Verificar que las asignaciones respetan las restricciones de oferta
     * La suma de asignaciones desde cada origen no debe exceder su oferta
     */
    it('should respect supply constraints', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 100 },
          { name: 'Origen B', supply: 200 },
        ],
        destinations: [
          { name: 'Destino X', demand: 150 },
          { name: 'Destino Y', demand: 150 },
        ],
        costs: [
          [5, 10],
          [8, 3],
        ],
      };

      const result = service.solve(problem);

      // Agrupar asignaciones por origen
      const allocationsByOrigin: { [key: string]: number } = {};
      result.allocationDetails.forEach((detail) => {
        allocationsByOrigin[detail.origin] =
          (allocationsByOrigin[detail.origin] || 0) + detail.quantity;
      });

      // La suma desde Origen A no debe exceder 100
      expect(allocationsByOrigin['Origen A'] || 0).toBeLessThanOrEqual(100);
      // La suma desde Origen B no debe exceder 200
      expect(allocationsByOrigin['Origen B'] || 0).toBeLessThanOrEqual(200);
    });

    /**
     * Test: Verificar que las asignaciones respetan las restricciones de demanda
     * La suma de asignaciones hacia cada destino no debe exceder su demanda
     */
    it('should respect demand constraints', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 150 },
          { name: 'Origen B', supply: 150 },
        ],
        destinations: [
          { name: 'Destino X', demand: 100 },
          { name: 'Destino Y', demand: 200 },
        ],
        costs: [
          [5, 10],
          [8, 3],
        ],
      };

      const result = service.solve(problem);

      // Agrupar asignaciones por destino
      const allocationsByDest: { [key: string]: number } = {};
      result.allocationDetails.forEach((detail) => {
        allocationsByDest[detail.destination] =
          (allocationsByDest[detail.destination] || 0) + detail.quantity;
      });

      // La suma hacia Destino X no debe exceder 100
      expect(allocationsByDest['Destino X'] || 0).toBeLessThanOrEqual(100);
      // La suma hacia Destino Y no debe exceder 200
      expect(allocationsByDest['Destino Y'] || 0).toBeLessThanOrEqual(200);
    });
  });

  describe('validation - Validación de entrada', () => {
    /**
     * Test: Validación - arrays vacíos de orígenes
     * Debe rechazar problemas sin orígenes
     */
    it('should throw error for empty origins array', () => {
      const problem: TransportProblemDto = {
        origins: [],
        destinations: [{ name: 'Destino X', demand: 100 }],
        costs: [],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'Debe haber al menos un origen',
      );
    });

    /**
     * Test: Validación - arrays vacíos de destinos
     * Debe rechazar problemas sin destinos
     */
    it('should throw error for empty destinations array', () => {
      const problem: TransportProblemDto = {
        origins: [{ name: 'Origen A', supply: 100 }],
        destinations: [],
        costs: [[10]],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'Debe haber al menos un destino',
      );
    });

    /**
     * Test: Validación - origen sin oferta (supply = 0 para todos)
     * Debe rechazar problemas donde no hay oferta total
     */
    it('should throw error when all origins have zero supply', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 0 },
          { name: 'Origen B', supply: 0 },
        ],
        destinations: [{ name: 'Destino X', demand: 100 }],
        costs: [[10], [20]],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'La oferta total debe ser mayor a cero',
      );
    });

    /**
     * Test: Validación - destino sin demanda (demand = 0 para todos)
     * Debe rechazar problemas donde no hay demanda total
     */
    it('should throw error when all destinations have zero demand', () => {
      const problem: TransportProblemDto = {
        origins: [{ name: 'Origen A', supply: 100 }],
        destinations: [
          { name: 'Destino X', demand: 0 },
          { name: 'Destino Y', demand: 0 },
        ],
        costs: [[10, 20]],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'La demanda total debe ser mayor a cero',
      );
    });

    /**
     * Test: Validación - costos negativos
     * Debe rechazar problemas con costos negativos
     */
    it('should throw error for negative costs', () => {
      const problem: TransportProblemDto = {
        origins: [{ name: 'Origen A', supply: 100 }],
        destinations: [{ name: 'Destino X', demand: 100 }],
        costs: [[-10]],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow('no puede ser negativo');
    });

    /**
     * Test: Validación - matriz de costos con dimensiones incorrectas (filas)
     * Debe rechazar cuando el número de filas no coincide con orígenes
     */
    it('should throw error for cost matrix with wrong number of rows', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 100 },
          { name: 'Origen B', supply: 100 },
        ],
        destinations: [{ name: 'Destino X', demand: 200 }],
        costs: [[10]], // Solo 1 fila cuando debería haber 2
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'La matriz de costos debe tener una fila por cada origen',
      );
    });

    /**
     * Test: Validación - matriz de costos con dimensiones incorrectas (columnas)
     * Debe rechazar cuando el número de columnas no coincide con destinos
     */
    it('should throw error for cost matrix with wrong number of columns', () => {
      const problem: TransportProblemDto = {
        origins: [{ name: 'Origen A', supply: 100 }],
        destinations: [
          { name: 'Destino X', demand: 50 },
          { name: 'Destino Y', demand: 50 },
        ],
        costs: [[10]], // Solo 1 columna cuando debería haber 2
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'debe tener una columna por cada destino',
      );
    });

    /**
     * Test: Validación - oferta negativa
     * Debe rechazar orígenes con oferta negativa
     */
    it('should throw error for negative supply', () => {
      const problem: TransportProblemDto = {
        origins: [{ name: 'Origen A', supply: -50 }],
        destinations: [{ name: 'Destino X', demand: 100 }],
        costs: [[10]],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'La oferta del origen 0 no puede ser negativa',
      );
    });

    /**
     * Test: Validación - demanda negativa
     * Debe rechazar destinos con demanda negativa
     */
    it('should throw error for negative demand', () => {
      const problem: TransportProblemDto = {
        origins: [{ name: 'Origen A', supply: 100 }],
        destinations: [{ name: 'Destino X', demand: -50 }],
        costs: [[10]],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'La demanda del destino 0 no puede ser negativa',
      );
    });

    /**
     * Test: Validación - oferta y demanda ambos cero
     * Debe rechazar cuando tanto oferta como demanda totales son cero
     */
    it('should throw error when both supply and demand are zero', () => {
      const problem: TransportProblemDto = {
        origins: [{ name: 'Origen A', supply: 0 }],
        destinations: [{ name: 'Destino X', demand: 0 }],
        costs: [[10]],
      };

      expect(() => service.solve(problem)).toThrow(BadRequestException);
      expect(() => service.solve(problem)).toThrow(
        'La oferta total y la demanda total no pueden ser ambas cero',
      );
    });
  });

  describe('solve - Casos especiales del algoritmo VAM', () => {
    /**
     * Test: Verificar que la solución es factible
     * Todas las asignaciones deben satisfacer oferta y demanda
     */
    it('should produce a feasible solution', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'A', supply: 250 },
          { name: 'B', supply: 350 },
          { name: 'C', supply: 400 },
        ],
        destinations: [
          { name: 'X', demand: 200 },
          { name: 'Y', demand: 300 },
          { name: 'Z', demand: 350 },
          { name: 'W', demand: 150 },
        ],
        costs: [
          [3, 1, 7, 4],
          [2, 6, 5, 9],
          [8, 3, 3, 2],
        ],
      };

      const result = service.solve(problem);

      expect(result.isBalanced).toBe(true);
      expect(result.totalCost).toBeGreaterThan(0);

      // La suma total de asignaciones debe ser igual a la oferta/demanda total
      const totalQuantity = result.allocationDetails.reduce(
        (sum, detail) => sum + detail.quantity,
        0,
      );
      expect(totalQuantity).toBe(1000); // 250 + 350 + 400
    });

    /**
     * Test: Problema con un único origen activo
     * Cuando solo hay un origen con oferta positiva
     */
    it('should handle single active origin', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 100 },
          { name: 'Origen B', supply: 0 },
        ],
        destinations: [
          { name: 'Destino X', demand: 50 },
          { name: 'Destino Y', demand: 50 },
        ],
        costs: [
          [10, 20],
          [5, 5],
        ],
      };

      const result = service.solve(problem);

      // Debe ser balanceado (100 oferta, 100 demanda)
      expect(result.isBalanced).toBe(true);

      // Todas las asignaciones deben venir del Origen A
      result.allocationDetails.forEach((detail) => {
        expect(detail.origin).toBe('Origen A');
      });
    });

    /**
     * Test: Problema con un único destino activo
     * Cuando solo hay un destino con demanda positiva
     */
    it('should handle single active destination', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 50 },
          { name: 'Origen B', supply: 50 },
        ],
        destinations: [
          { name: 'Destino X', demand: 100 },
          { name: 'Destino Y', demand: 0 },
        ],
        costs: [
          [10, 20],
          [5, 15],
        ],
      };

      const result = service.solve(problem);

      expect(result.isBalanced).toBe(true);

      // Todas las asignaciones deben ir al Destino X
      result.allocationDetails.forEach((detail) => {
        expect(detail.destination).toBe('Destino X');
      });
    });

    /**
     * Test: Matriz con valores muy diferentes
     * Verificar que el algoritmo maneja correctamente grandes diferencias en costos
     */
    it('should handle large cost differences', () => {
      const problem: TransportProblemDto = {
        origins: [
          { name: 'Origen A', supply: 100 },
          { name: 'Origen B', supply: 100 },
        ],
        destinations: [
          { name: 'Destino X', demand: 100 },
          { name: 'Destino Y', demand: 100 },
        ],
        costs: [
          [1, 1000],
          [1000, 1],
        ],
      };

      const result = service.solve(problem);

      // El algoritmo debe preferir las rutas de bajo costo
      // Solución óptima: A->X (100*1) y B->Y (100*1) = 200
      expect(result.totalCost).toBeLessThanOrEqual(200);
    });
  });
});
