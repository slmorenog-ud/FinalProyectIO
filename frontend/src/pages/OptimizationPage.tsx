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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Divider,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOptimization } from '../hooks/useOptimization'
import { useOptimizationStore } from '../store/optimizationStore'
import { LoadingSpinner, ErrorMessage } from '../components/common'
import { IntegratedProblemDto } from '../types/optimization.types'

const optimizationSchema = z.object({
  transportProblem: z.object({
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
  }),
  routeCargoConfigs: z.array(
    z.object({
      origin: z.string().min(1, 'Origen requerido'),
      destination: z.string().min(1, 'Destino requerido'),
      capacity: z.number().min(1, 'Capacidad debe ser positiva'),
      availableItems: z.array(
        z.object({
          id: z.string().min(1, 'ID requerido'),
          name: z.string().min(1, 'Nombre requerido'),
          weight: z.number().min(0, 'Peso debe ser no negativo'),
          profit: z.number().min(0, 'Beneficio debe ser no negativo'),
        })
      ),
    })
  ),
})

type OptimizationForm = z.infer<typeof optimizationSchema>

// Component for managing items within a route
function ItemsFieldArray({ 
  control, 
  routeIndex, 
  errors 
}: { 
  control: any
  routeIndex: number
  errors: any 
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `routeCargoConfigs.${routeIndex}.availableItems`,
  })

  return (
    <Box>
      {fields.map((field, itemIndex) => (
        <Box key={field.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
          <TextField
            size="small"
            label="ID"
            sx={{ width: '80px' }}
            {...control.register(`routeCargoConfigs.${routeIndex}.availableItems.${itemIndex}.id`)}
            error={!!errors.routeCargoConfigs?.[routeIndex]?.availableItems?.[itemIndex]?.id}
          />
          <TextField
            size="small"
            label="Nombre"
            sx={{ flex: 1 }}
            {...control.register(`routeCargoConfigs.${routeIndex}.availableItems.${itemIndex}.name`)}
            error={!!errors.routeCargoConfigs?.[routeIndex]?.availableItems?.[itemIndex]?.name}
          />
          <TextField
            size="small"
            type="number"
            label="Peso"
            sx={{ width: '100px' }}
            {...control.register(`routeCargoConfigs.${routeIndex}.availableItems.${itemIndex}.weight`, {
              valueAsNumber: true,
            })}
            error={!!errors.routeCargoConfigs?.[routeIndex]?.availableItems?.[itemIndex]?.weight}
            inputProps={{ min: 0 }}
          />
          <TextField
            size="small"
            type="number"
            label="Beneficio"
            sx={{ width: '100px' }}
            {...control.register(`routeCargoConfigs.${routeIndex}.availableItems.${itemIndex}.profit`, {
              valueAsNumber: true,
            })}
            error={!!errors.routeCargoConfigs?.[routeIndex]?.availableItems?.[itemIndex]?.profit}
            inputProps={{ min: 0 }}
          />
          <IconButton
            size="small"
            color="error"
            onClick={() => remove(itemIndex)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => append({ id: `${Date.now()}`, name: '', weight: 0, profit: 0 })}
      >
        Agregar Artículo
      </Button>
    </Box>
  )
}

export default function OptimizationPage() {
  const { solveComplete, loading, error } = useOptimization()
  const { solution } = useOptimizationStore()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<OptimizationForm>({
    resolver: zodResolver(optimizationSchema),
    defaultValues: {
      transportProblem: {
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
      routeCargoConfigs: [
        {
          origin: 'Centro A',
          destination: 'Ciudad X',
          capacity: 50,
          availableItems: [
            { id: '1', name: 'Electrónicos', weight: 10, profit: 100 },
            { id: '2', name: 'Textiles', weight: 20, profit: 150 },
          ],
        },
      ],
    },
  })

  const {
    fields: originFields,
    append: appendOrigin,
    remove: removeOrigin,
  } = useFieldArray({
    control,
    name: 'transportProblem.origins',
  })

  const {
    fields: destinationFields,
    append: appendDestination,
    remove: removeDestination,
  } = useFieldArray({
    control,
    name: 'transportProblem.destinations',
  })

  const {
    fields: routeFields,
    append: appendRoute,
    remove: removeRoute,
  } = useFieldArray({
    control,
    name: 'routeCargoConfigs',
  })

  const watchedOrigins = watch('transportProblem.origins')
  const watchedDestinations = watch('transportProblem.destinations')

  // Ajustar la matriz de costos automáticamente cuando cambian orígenes/destinos
  useEffect(() => {
    const currentCosts = getValues('transportProblem.costs') || []
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
      setValue('transportProblem.costs', newCosts)
    }
  }, [watchedOrigins?.length, watchedDestinations?.length, setValue, getValues])

  const onSubmit = async (data: OptimizationForm) => {
    await solveComplete(data as IntegratedProblemDto)
  }

  if (loading) return <LoadingSpinner message="Resolviendo optimización integrada..." />
  if (error) return <ErrorMessage message={error} />

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Optimización Integrada
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Resuelve el problema dual combinando transporte y optimización de carga para maximizar el beneficio neto.
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Transport Problem */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Problema de Transporte</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Centros de Origen
                    </Typography>
                    {originFields.map((field, index) => (
                      <Box key={field.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          fullWidth
                          label="Nombre"
                          {...control.register(`transportProblem.origins.${index}.name`)}
                          error={!!errors.transportProblem?.origins?.[index]?.name}
                          helperText={errors.transportProblem?.origins?.[index]?.name?.message}
                        />
                        <TextField
                          type="number"
                          label="Suministro"
                          {...control.register(`transportProblem.origins.${index}.supply`, {
                            valueAsNumber: true,
                          })}
                          error={!!errors.transportProblem?.origins?.[index]?.supply}
                          helperText={errors.transportProblem?.origins?.[index]?.supply?.message}
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
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Destinos
                    </Typography>
                    {destinationFields.map((field, index) => (
                      <Box key={field.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          fullWidth
                          label="Nombre"
                          {...control.register(`transportProblem.destinations.${index}.name`)}
                          error={!!errors.transportProblem?.destinations?.[index]?.name}
                          helperText={errors.transportProblem?.destinations?.[index]?.name?.message}
                        />
                        <TextField
                          type="number"
                          label="Demanda"
                          {...control.register(`transportProblem.destinations.${index}.demand`, {
                            valueAsNumber: true,
                          })}
                          error={!!errors.transportProblem?.destinations?.[index]?.demand}
                          helperText={errors.transportProblem?.destinations?.[index]?.demand?.message}
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
                  </Grid>

                  {/* Cost Matrix */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Matriz de Costos de Transporte
                    </Typography>
                    {watchedOrigins.length > 0 && watchedDestinations.length > 0 && (
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                                Origen \ Destino
                              </TableCell>
                              {watchedDestinations.map((dest, colIndex) => (
                                <TableCell key={colIndex} align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                                  {dest.name || `D${colIndex + 1}`}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {watchedOrigins.map((origin, rowIndex) => (
                              <TableRow key={rowIndex}>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                                  {origin.name || `O${rowIndex + 1}`}
                                </TableCell>
                                {watchedDestinations.map((_, colIndex) => (
                                  <TableCell key={colIndex} align="center" sx={{ p: 0.5 }}>
                                    <TextField
                                      type="number"
                                      size="small"
                                      {...control.register(`transportProblem.costs.${rowIndex}.${colIndex}`, {
                                        valueAsNumber: true,
                                      })}
                                      inputProps={{ min: 0, style: { textAlign: 'center' } }}
                                      sx={{ width: '80px' }}
                                    />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Route Cargo Configurations */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Configuraciones de Carga por Ruta
            </Typography>
            {routeFields.map((field, index) => (
              <Accordion key={field.id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Typography>
                      Ruta {index + 1}: {watch(`routeCargoConfigs.${index}.origin`)} →{' '}
                      {watch(`routeCargoConfigs.${index}.destination`)}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); removeRoute(index); }}
                      disabled={routeFields.length <= 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Origen"
                        {...control.register(`routeCargoConfigs.${index}.origin`)}
                        error={!!errors.routeCargoConfigs?.[index]?.origin}
                        helperText={errors.routeCargoConfigs?.[index]?.origin?.message}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Destino"
                        {...control.register(`routeCargoConfigs.${index}.destination`)}
                        error={!!errors.routeCargoConfigs?.[index]?.destination}
                        helperText={errors.routeCargoConfigs?.[index]?.destination?.message}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Capacidad del Vehículo"
                        {...control.register(`routeCargoConfigs.${index}.capacity`, {
                          valueAsNumber: true,
                        })}
                        error={!!errors.routeCargoConfigs?.[index]?.capacity}
                        helperText={errors.routeCargoConfigs?.[index]?.capacity?.message}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Artículos Disponibles
                      </Typography>
                      <ItemsFieldArray control={control} routeIndex={index} errors={errors} />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
            <Button
              variant="outlined"
              onClick={() =>
                appendRoute({
                  origin: '',
                  destination: '',
                  capacity: 50,
                  availableItems: [],
                })
              }
              sx={{ mt: 1 }}
            >
              Agregar Ruta
            </Button>
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mr: 2 }}
            >
              {loading ? 'Resolviendo...' : 'Resolver Problema Completo'}
            </Button>
          </Grid>
        </Grid>
      </form>

      {/* Solution Display */}
      {solution && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resultado de Optimización Integrada
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Alert severity="info">
                Costo de Transporte: ${solution.totalTransportCost}
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Alert severity="success">
                Beneficio de Carga: ${solution.totalCargoProfit}
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Alert severity={solution.totalNetProfit >= 0 ? 'success' : 'warning'}>
                Beneficio Neto: ${solution.totalNetProfit}
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Alert severity="info">
                Rutas Activas: {solution.activeRoutes}
              </Alert>
            </Grid>
          </Grid>

          <Typography variant="body1" sx={{ mb: 2 }}>
            {solution.summary}
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Detalles de Solución de Transporte</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Origen</strong></TableCell>
                      <TableCell><strong>Destino</strong></TableCell>
                      <TableCell align="right"><strong>Cantidad</strong></TableCell>
                      <TableCell align="right"><strong>Costo Unitario</strong></TableCell>
                      <TableCell align="right"><strong>Costo Total</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {solution.transportSolution?.allocationDetails?.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell>{detail.origin}</TableCell>
                        <TableCell>{detail.destination}</TableCell>
                        <TableCell align="right">{detail.quantity}</TableCell>
                        <TableCell align="right">${detail.unitCost}</TableCell>
                        <TableCell align="right">${detail.totalCost}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Método: {solution.transportSolution?.method} | 
                  Problema balanceado: {solution.transportSolution?.isBalanced ? 'Sí' : 'No'}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Optimizaciones de Carga por Ruta</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {solution.routeOptimizations?.map((route, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: route.netProfit >= 0 ? 'success.light' : 'warning.light' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>{route.origin} → {route.destination}</strong>
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">Cantidad: {route.quantity}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">Costo Transporte: ${route.transportCost}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">
                        Beneficio Carga: ${route.cargoOptimization?.totalProfit || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" fontWeight="bold">
                        Beneficio Neto: ${route.netProfit}
                      </Typography>
                    </Grid>
                  </Grid>
                  {route.cargoOptimization && route.cargoOptimization.selectedItems.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Items seleccionados: {route.cargoOptimization.selectedItems.map(i => i.name).join(', ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Peso: {route.cargoOptimization.totalWeight} | 
                        Utilización: {route.cargoOptimization.utilizationPercentage}%
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))}
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}
    </Box>
  )
}