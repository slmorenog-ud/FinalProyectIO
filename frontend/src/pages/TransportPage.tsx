import { useEffect } from 'react'
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransport } from '../hooks/useTransport'
import { useTransportStore } from '../store/transportStore'
import { LoadingSpinner, ErrorMessage } from '../components/common'
import { TransportProblemDto } from '../types/transport.types'

const transportSchema = z.object({
  origins: z.array(
    z.object({
      name: z.string().min(1, 'Nombre requerido'),
      supply: z.number().min(0, 'Suministro debe ser positivo'),
    })
  ),
  destinations: z.array(
    z.object({
      name: z.string().min(1, 'Nombre requerido'),
      demand: z.number().min(0, 'Demanda debe ser positiva'),
    })
  ),
  costs: z.array(z.array(z.number().min(0, 'Costo debe ser no negativo'))),
})

type TransportForm = z.infer<typeof transportSchema>

export default function TransportPage() {
  const { solve, loading, error } = useTransport()
  const { solution } = useTransportStore()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<TransportForm>({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      origins: [
        { name: 'Centro A', supply: 100 },
        { name: 'Centro B', supply: 150 },
      ],
      destinations: [
        { name: 'Ciudad X', demand: 120 },
        { name: 'Ciudad Y', demand: 130 },
      ],
      costs: [
        [10, 20],
        [15, 10],
      ],
    },
  })

  const {
    fields: originFields,
    append: appendOrigin,
    remove: removeOrigin,
  } = useFieldArray({
    control,
    name: 'origins',
  })

  const {
    fields: destinationFields,
    append: appendDestination,
    remove: removeDestination,
  } = useFieldArray({
    control,
    name: 'destinations',
  })

  const watchedOrigins = watch('origins')
  const watchedDestinations = watch('destinations')

  // Ajustar la matriz de costos automáticamente cuando cambian orígenes/destinos
  useEffect(() => {
    const currentCosts = getValues('costs') || []
    const numOrigins = watchedOrigins?.length || 0
    const numDestinations = watchedDestinations?.length || 0
    
    if (numOrigins === 0 || numDestinations === 0) return

    // Crear nueva matriz con dimensiones correctas
    const newCosts: number[][] = []
    for (let i = 0; i < numOrigins; i++) {
      const row: number[] = []
      for (let j = 0; j < numDestinations; j++) {
        // Preservar valores existentes o usar 0 para nuevos
        row.push(currentCosts[i]?.[j] ?? 0)
      }
      newCosts.push(row)
    }

    // Solo actualizar si las dimensiones cambiaron
    if (currentCosts.length !== numOrigins || (currentCosts[0]?.length || 0) !== numDestinations) {
      setValue('costs', newCosts)
    }
  }, [watchedOrigins?.length, watchedDestinations?.length, setValue, getValues])

  const onSubmit = async (data: TransportForm) => {
    await solve(data as TransportProblemDto)
  }

  if (loading) return <LoadingSpinner message="Resolviendo problema de transporte..." />
  if (error) return <ErrorMessage message={error} />

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Problema de Transporte
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Optimiza la distribución de productos desde centros de origen hacia destinos usando el Método de Aproximación de Vogel (VAM).
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Origins */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Centros de Origen
              </Typography>
              {originFields.map((field, index) => (
                <Box key={field.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    {...control.register(`origins.${index}.name`)}
                    error={!!errors.origins?.[index]?.name}
                    helperText={errors.origins?.[index]?.name?.message}
                  />
                  <TextField
                    type="number"
                    label="Suministro"
                    {...control.register(`origins.${index}.supply`, {
                      valueAsNumber: true,
                    })}
                    error={!!errors.origins?.[index]?.supply}
                    helperText={errors.origins?.[index]?.supply?.message}
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => removeOrigin(index)}
                    disabled={originFields.length <= 1}
                  >
                    ×
                  </Button>
                </Box>
              ))}
              <Button
                variant="outlined"
                onClick={() => appendOrigin({ name: '', supply: 0 })}
                sx={{ mt: 1 }}
              >
                Agregar Origen
              </Button>
            </Paper>
          </Grid>

          {/* Destinations */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Destinos
              </Typography>
              {destinationFields.map((field, index) => (
                <Box key={field.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    {...control.register(`destinations.${index}.name`)}
                    error={!!errors.destinations?.[index]?.name}
                    helperText={errors.destinations?.[index]?.name?.message}
                  />
                  <TextField
                    type="number"
                    label="Demanda"
                    {...control.register(`destinations.${index}.demand`, {
                      valueAsNumber: true,
                    })}
                    error={!!errors.destinations?.[index]?.demand}
                    helperText={errors.destinations?.[index]?.demand?.message}
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => removeDestination(index)}
                    disabled={destinationFields.length <= 1}
                  >
                    ×
                  </Button>
                </Box>
              ))}
              <Button
                variant="outlined"
                onClick={() => appendDestination({ name: '', demand: 0 })}
                sx={{ mt: 1 }}
              >
                Agregar Destino
              </Button>
            </Paper>
          </Grid>

          {/* Cost Matrix */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Matriz de Costos
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Origen \ Destino</TableCell>
                      {watchedDestinations?.map((dest, colIndex) => (
                        <TableCell key={colIndex}>{dest.name || `Destino ${colIndex + 1}`}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {watchedOrigins?.map((origin, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell>{origin.name || `Origen ${rowIndex + 1}`}</TableCell>
                        {watchedDestinations?.map((_, colIndex) => (
                          <TableCell key={colIndex}>
                            <TextField
                              type="number"
                              size="small"
                              {...control.register(`costs.${rowIndex}.${colIndex}`, {
                                valueAsNumber: true,
                              })}
                              inputProps={{ min: 0 }}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mr: 2 }}
            >
              {loading ? 'Resolviendo...' : 'Resolver Problema'}
            </Button>
          </Grid>
        </Grid>
      </form>

      {/* Solution Display */}
      {solution && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Solución
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            Costo Total: ${solution.totalCost} | Método: {solution.method}
          </Alert>

          <Typography variant="h6" gutterBottom>
            Asignaciones
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Origen \ Destino</TableCell>
                  {watchedDestinations?.map((dest, index) => (
                    <TableCell key={index}>{dest.name}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {solution.allocations.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell>{watchedOrigins?.[rowIndex]?.name}</TableCell>
                    {row.map((allocation, colIndex) => (
                      <TableCell key={colIndex}>{allocation}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}