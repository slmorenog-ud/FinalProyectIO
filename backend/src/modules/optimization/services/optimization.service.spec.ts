import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OptimizationService } from './optimization.service';
import { TransportService } from '../../transport/services/transport.service';
import { CargoService } from '../../cargo/services/cargo.service';
import { IntegratedProblemDto } from '../dto';

// Interfaces for test type safety
interface OptimizationSummary {
  problemDimensions: {
    origins: number;
    destinations: number;
    totalSupply: number;
    totalDemand: number;
    isBalanced: boolean;
  };
  cargoInformation: {
    routesWithCargo: number;
    totalAvailableItems: number;
    totalPotentialProfit: number;
  };
  recommendation: string;
}

interface RouteEfficiencyAnalysis {
  origin: string;
  destination: string;
  transportCost: number;
  optimalCargoProfit: number;
  potentialCargoProfit: number;
  netProfit: number;
  efficiency: number;
  isProfit: boolean;
}

describe('OptimizationService', () => {
  let service: OptimizationService;
  let transportService: TransportService;
  let cargoService: CargoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OptimizationService, TransportService, CargoService],
    }).compile();

    service = module.get<OptimizationService>(OptimizationService);
    transportService = module.get<TransportService>(TransportService);
    cargoService = module.get<CargoService>(CargoService);
  });

  // Verificar que el servicio se crea correctamente
  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have transport service injected', () => {
      expect(transportService).toBeDefined();
    });

    it('should have cargo service injected', () => {
      expect(cargoService).toBeDefined();
    });
  });

  describe('solveIntegratedProblem - Integración completa', () => {
    /**
     * Test: Integración completa - problema de transporte + carga
     * Verifica que ambos problemas se resuelven correctamente
     */
    it('should solve integrated transport and cargo problem', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [
            { name: 'Centro A', supply: 100 },
            { name: 'Centro B', supply: 100 },
          ],
          destinations: [
            { name: 'Ciudad X', demand: 100 },
            { name: 'Ciudad Y', demand: 100 },
          ],
          costs: [
            [10, 20],
            [15, 5],
          ],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 50,
            availableItems: [
              { id: '1', name: 'Item A', weight: 20, profit: 100 },
              { id: '2', name: 'Item B', weight: 30, profit: 150 },
            ],
          },
          {
            origin: 'Centro B',
            destination: 'Ciudad Y',
            capacity: 50,
            availableItems: [
              { id: '3', name: 'Item C', weight: 25, profit: 200 },
              { id: '4', name: 'Item D', weight: 25, profit: 180 },
            ],
          },
        ],
      };

      const result = service.solveIntegratedProblem(problem);

      // Verificar estructura de la respuesta
      expect(result.transportSolution).toBeDefined();
      expect(result.routeOptimizations).toBeDefined();
      expect(result.totalTransportCost).toBeGreaterThanOrEqual(0);
      expect(result.totalCargoProfit).toBeGreaterThanOrEqual(0);
      expect(result.totalNetProfit).toBeDefined();
      expect(result.activeRoutes).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
    });

    /**
     * Test: Rutas sin configuración de carga
     * Las rutas que no tienen configuración de carga no generan beneficio de carga
     */
    it('should handle routes without cargo configuration', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [
            { name: 'Ciudad X', demand: 50 },
            { name: 'Ciudad Y', demand: 50 },
          ],
          costs: [[10, 20]],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad Y', // Solo configuración para Y, no para X
            capacity: 50,
            availableItems: [
              { id: '1', name: 'Item', weight: 20, profit: 100 },
            ],
          },
        ],
      };

      const result = service.solveIntegratedProblem(problem);

      // La ruta A->X no tiene configuración de carga, solo A->Y tiene
      // Pero el transporte irá principalmente a X (costo 10 vs 20)
      expect(result.totalCargoProfit).toBeGreaterThanOrEqual(0);
      expect(result.totalTransportCost).toBeGreaterThan(0);
    });

    /**
     * Test: Configuración de carga para rutas que no existen
     * Las configuraciones para rutas sin asignaciones no deben afectar
     */
    it('should ignore cargo configs for non-existent routes', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [
            { name: 'Centro A', supply: 100 },
            { name: 'Centro B', supply: 0 }, // Sin oferta
          ],
          destinations: [
            { name: 'Ciudad X', demand: 100 },
            { name: 'Ciudad Y', demand: 0 }, // Sin demanda
          ],
          costs: [
            [10, 20],
            [15, 5],
          ],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X', // Esta ruta existe
            capacity: 50,
            availableItems: [
              { id: '1', name: 'Item', weight: 20, profit: 100 },
            ],
          },
          {
            origin: 'Centro B',
            destination: 'Ciudad Y', // Esta ruta no tiene asignaciones
            capacity: 50,
            availableItems: [
              { id: '2', name: 'Item', weight: 20, profit: 200 },
            ],
          },
        ],
      };

      const result = service.solveIntegratedProblem(problem);

      // Solo la ruta A->X debe tener asignaciones
      expect(result.activeRoutes).toBe(1);
      expect(result.totalCargoProfit).toBe(100);
    });

    /**
     * Test: Cálculo correcto de beneficio neto
     * beneficio neto = cargo profit - transport cost
     */
    it('should calculate net profit correctly', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[5]], // Costo de transporte: 100 * 5 = 500
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 100,
            availableItems: [
              { id: '1', name: 'Item', weight: 100, profit: 800 },
            ],
          },
        ],
      };

      const result = service.solveIntegratedProblem(problem);

      expect(result.totalTransportCost).toBe(500);
      expect(result.totalCargoProfit).toBe(800);
      expect(result.totalNetProfit).toBe(300); // 800 - 500
    });

    /**
     * Test: Beneficio neto negativo
     * Cuando el costo de transporte excede el beneficio de carga
     */
    it('should handle negative net profit', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[50]], // Costo de transporte: 100 * 50 = 5000
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 100,
            availableItems: [
              { id: '1', name: 'Item', weight: 50, profit: 200 },
            ],
          },
        ],
      };

      const result = service.solveIntegratedProblem(problem);

      expect(result.totalTransportCost).toBe(5000);
      expect(result.totalCargoProfit).toBe(200);
      expect(result.totalNetProfit).toBeLessThan(0);
    });
  });

  describe('solveIntegratedProblem - Validación', () => {
    /**
     * Test: Validación - problema de transporte faltante
     * Debe rechazar si no hay problema de transporte
     */
    it('should throw error for missing transport problem', () => {
      const problem = {
        transportProblem: null,
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 50,
            availableItems: [],
          },
        ],
      } as unknown as IntegratedProblemDto;

      expect(() => service.solveIntegratedProblem(problem)).toThrow(
        BadRequestException,
      );
      expect(() => service.solveIntegratedProblem(problem)).toThrow(
        'Debe proporcionar un problema de transporte',
      );
    });

    /**
     * Test: Validación - configuraciones de carga vacías
     * Debe rechazar si no hay configuraciones de carga
     */
    it('should throw error for empty route cargo configs', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[10]],
        },
        routeCargoConfigs: [],
      };

      expect(() => service.solveIntegratedProblem(problem)).toThrow(
        BadRequestException,
      );
      expect(() => service.solveIntegratedProblem(problem)).toThrow(
        'Debe proporcionar al menos una configuración de carga',
      );
    });

    /**
     * Test: Validación - origen inválido en configuración de carga
     * Debe rechazar orígenes que no existen en el problema de transporte
     */
    it('should throw error for invalid origin in cargo config', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[10]],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro Z', // No existe
            destination: 'Ciudad X',
            capacity: 50,
            availableItems: [],
          },
        ],
      };

      expect(() => service.solveIntegratedProblem(problem)).toThrow(
        BadRequestException,
      );
      expect(() => service.solveIntegratedProblem(problem)).toThrow(
        'origen inválido',
      );
    });

    /**
     * Test: Validación - destino inválido en configuración de carga
     * Debe rechazar destinos que no existen en el problema de transporte
     */
    it('should throw error for invalid destination in cargo config', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[10]],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad Z', // No existe
            capacity: 50,
            availableItems: [],
          },
        ],
      };

      expect(() => service.solveIntegratedProblem(problem)).toThrow(
        BadRequestException,
      );
      expect(() => service.solveIntegratedProblem(problem)).toThrow(
        'destino inválido',
      );
    });
  });

  describe('getOptimizationSummary - Resumen de optimización', () => {
    /**
     * Test: Obtener resumen sin resolver
     * Debe proporcionar información del problema sin resolverlo
     */
    it('should return problem summary without solving', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [
            { name: 'Centro A', supply: 100 },
            { name: 'Centro B', supply: 150 },
          ],
          destinations: [
            { name: 'Ciudad X', demand: 125 },
            { name: 'Ciudad Y', demand: 125 },
          ],
          costs: [
            [10, 20],
            [15, 5],
          ],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 50,
            availableItems: [
              { id: '1', name: 'Item', weight: 20, profit: 100 },
              { id: '2', name: 'Item', weight: 30, profit: 200 },
            ],
          },
        ],
      };

      const summary = service.getOptimizationSummary(
        problem,
      ) as OptimizationSummary;

      expect(summary.problemDimensions).toBeDefined();
      expect(summary.problemDimensions.origins).toBe(2);
      expect(summary.problemDimensions.destinations).toBe(2);
      expect(summary.problemDimensions.totalSupply).toBe(250);
      expect(summary.problemDimensions.totalDemand).toBe(250);
      expect(summary.problemDimensions.isBalanced).toBe(true);

      expect(summary.cargoInformation).toBeDefined();
      expect(summary.cargoInformation.routesWithCargo).toBe(1);
      expect(summary.cargoInformation.totalAvailableItems).toBe(2);
      expect(summary.cargoInformation.totalPotentialProfit).toBe(300);

      expect(summary.recommendation).toBeDefined();
    });

    /**
     * Test: Resumen para problema desbalanceado
     * Debe indicar que el problema no está balanceado
     */
    it('should indicate unbalanced problem', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 200 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[10]],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 50,
            availableItems: [],
          },
        ],
      };

      const summary = service.getOptimizationSummary(
        problem,
      ) as OptimizationSummary;

      expect(summary.problemDimensions.isBalanced).toBe(false);
      expect(summary.problemDimensions.totalSupply).toBe(200);
      expect(summary.problemDimensions.totalDemand).toBe(100);
    });
  });

  describe('analyzeRouteEfficiency - Análisis de eficiencia', () => {
    /**
     * Test: Análisis de eficiencia de rutas
     * Debe calcular eficiencia para cada ruta activa
     */
    it('should analyze route efficiency', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[10]],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 100,
            availableItems: [
              { id: '1', name: 'Item', weight: 50, profit: 2000 },
            ],
          },
        ],
      };

      const analysis = service.analyzeRouteEfficiency(
        problem,
      ) as RouteEfficiencyAnalysis[];

      expect(analysis.length).toBeGreaterThan(0);
      expect(analysis[0].origin).toBe('Centro A');
      expect(analysis[0].destination).toBe('Ciudad X');
      expect(analysis[0].transportCost).toBeDefined();
      expect(analysis[0].optimalCargoProfit).toBeDefined();
      expect(analysis[0].netProfit).toBeDefined();
      expect(analysis[0].efficiency).toBeDefined();
      expect(analysis[0].isProfit).toBeDefined();
    });

    /**
     * Test: Ordenamiento por eficiencia
     * Las rutas deben estar ordenadas por eficiencia descendente
     */
    it('should sort routes by efficiency descending', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [
            { name: 'Centro A', supply: 100 },
            { name: 'Centro B', supply: 100 },
          ],
          destinations: [
            { name: 'Ciudad X', demand: 100 },
            { name: 'Ciudad Y', demand: 100 },
          ],
          costs: [
            [10, 1000], // A->X barato, A->Y caro
            [1000, 10], // B->X caro, B->Y barato
          ],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 100,
            availableItems: [
              { id: '1', name: 'Item', weight: 50, profit: 5000 },
            ],
          },
          {
            origin: 'Centro B',
            destination: 'Ciudad Y',
            capacity: 100,
            availableItems: [
              { id: '2', name: 'Item', weight: 50, profit: 5000 },
            ],
          },
        ],
      };

      const analysis = service.analyzeRouteEfficiency(
        problem,
      ) as RouteEfficiencyAnalysis[];

      // Las rutas deben estar ordenadas por eficiencia descendente
      for (let i = 0; i < analysis.length - 1; i++) {
        expect(analysis[i].efficiency).toBeGreaterThanOrEqual(
          analysis[i + 1].efficiency,
        );
      }
    });

    /**
     * Test: Ruta sin configuración de carga en análisis
     * Las rutas sin cargo config tienen potentialProfit = 0
     */
    it('should handle routes without cargo config in analysis', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[10]],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro B', // Diferente origen
            destination: 'Ciudad Y', // Diferente destino
            capacity: 100,
            availableItems: [
              { id: '1', name: 'Item', weight: 50, profit: 100 },
            ],
          },
        ],
      };

      const analysis = service.analyzeRouteEfficiency(
        problem,
      ) as RouteEfficiencyAnalysis[];

      expect(analysis[0].potentialCargoProfit).toBe(0);
      expect(analysis[0].optimalCargoProfit).toBe(0);
    });
  });

  describe('solveIntegratedProblem - Route optimizations', () => {
    /**
     * Test: Verificar estructura de RouteOptimization
     * Cada optimización de ruta debe tener la estructura correcta
     */
    it('should include cargo optimization in route optimizations', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[10]],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 50,
            availableItems: [
              { id: '1', name: 'Item A', weight: 20, profit: 100 },
              { id: '2', name: 'Item B', weight: 30, profit: 200 },
            ],
          },
        ],
      };

      const result = service.solveIntegratedProblem(problem);

      expect(result.routeOptimizations.length).toBeGreaterThan(0);

      const routeOpt = result.routeOptimizations[0];
      expect(routeOpt.origin).toBe('Centro A');
      expect(routeOpt.destination).toBe('Ciudad X');
      expect(routeOpt.quantity).toBeGreaterThan(0);
      expect(routeOpt.transportCost).toBeGreaterThanOrEqual(0);
      expect(routeOpt.cargoOptimization).toBeDefined();
      expect(routeOpt.netProfit).toBeDefined();
    });

    /**
     * Test: Ruta con items vacíos no tiene cargo optimization
     * Si availableItems está vacío, cargoOptimization debe ser undefined
     */
    it('should not include cargo optimization when no items available', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[10]],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 50,
            availableItems: [], // Sin items
          },
        ],
      };

      const result = service.solveIntegratedProblem(problem);

      // La ruta debe existir pero sin cargo optimization
      expect(result.routeOptimizations.length).toBeGreaterThan(0);
      expect(result.routeOptimizations[0].cargoOptimization).toBeUndefined();
      expect(result.routeOptimizations[0].netProfit).toBeLessThan(0); // Solo costo
    });
  });

  describe('generateSummary - Generación de resumen', () => {
    /**
     * Test: Verificar formato del resumen
     * El resumen debe incluir información clave
     */
    it('should generate descriptive summary', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [{ name: 'Centro A', supply: 100 }],
          destinations: [{ name: 'Ciudad X', demand: 100 }],
          costs: [[10]],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 100,
            availableItems: [
              { id: '1', name: 'Item', weight: 50, profit: 2000 },
            ],
          },
        ],
      };

      const result = service.solveIntegratedProblem(problem);

      expect(result.summary).toContain('rutas activas');
      expect(result.summary).toContain('Costo de transporte');
      expect(result.summary).toContain('Beneficio de carga');
      expect(result.summary).toContain('Beneficio neto');
      expect(result.summary).toContain('Margen');
    });
  });

  describe('solveIntegratedProblem - Multiple routes', () => {
    /**
     * Test: Múltiples rutas activas con diferentes configuraciones
     * Verifica que cada ruta se optimiza independientemente
     */
    it('should optimize multiple routes independently', () => {
      const problem: IntegratedProblemDto = {
        transportProblem: {
          origins: [
            { name: 'Centro A', supply: 100 },
            { name: 'Centro B', supply: 100 },
          ],
          destinations: [
            { name: 'Ciudad X', demand: 100 },
            { name: 'Ciudad Y', demand: 100 },
          ],
          costs: [
            [5, 100],
            [100, 5],
          ],
        },
        routeCargoConfigs: [
          {
            origin: 'Centro A',
            destination: 'Ciudad X',
            capacity: 50,
            availableItems: [
              { id: '1', name: 'Item', weight: 50, profit: 1000 },
            ],
          },
          {
            origin: 'Centro B',
            destination: 'Ciudad Y',
            capacity: 50,
            availableItems: [
              { id: '2', name: 'Item', weight: 50, profit: 2000 },
            ],
          },
        ],
      };

      const result = service.solveIntegratedProblem(problem);

      // Ambas rutas deben estar activas
      expect(result.activeRoutes).toBe(2);

      // Beneficio total debe ser la suma de ambos
      expect(result.totalCargoProfit).toBe(3000);

      // Costo de transporte: A->X (100*5) + B->Y (100*5) = 1000
      expect(result.totalTransportCost).toBe(1000);
    });
  });
});
