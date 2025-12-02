import { useState } from 'react';
import { optimizationApi } from '../api/optimization.api';
import { useOptimizationStore } from '../store/optimizationStore';
import { IntegratedProblemDto, IntegratedSolutionDto } from '../types/optimization.types';
import toast from 'react-hot-toast';

export const useOptimization = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSolution, clearSolution } = useOptimizationStore();

  const solveComplete = async (problem: IntegratedProblemDto): Promise<IntegratedSolutionDto | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await optimizationApi.solveComplete(problem);
      setSolution(result);
      toast.success('Optimización integrada completada exitosamente');
      return result;
    } catch (err: any) {
      const errorData = err.response?.data;
      let errorMessage = 'Error al resolver la optimización integrada';
      
      if (errorData?.message) {
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else {
          errorMessage = errorData.message;
        }
      }
      
      console.error('Optimization error details:', errorData);
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    clearSolution();
    setError(null);
  };

  return {
    solveComplete,
    reset,
    loading,
    error,
  };
};