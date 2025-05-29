import { useState, useEffect, useCallback } from 'react'
import { AcademicService } from '../lib/academicService'
import type { SearchState, SearchFilters, Faculty, Area, Program, Employee, PaginationInfo } from '../types/academic'

export function useCourseSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: AcademicService.ITEMS_PER_PAGE,
      hasNext: false,
      hasPrev: false
    },
    loading: false,
    error: null,
    filters: {},
    allResults: [], // Cache para filtrado en memoria
    fromCache: false
  })

  const [filterOptions, setFilterOptions] = useState({
    faculties: [] as Faculty[],
    areas: [] as Area[],
    programs: [] as Program[],
    professors: [] as Employee[],
    semesters: [] as string[]
  })

  // Cargar opciones de filtros al inicio Y cargar primeros cursos
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      console.log('🚀 Cargando datos iniciales...')
      
      // Cargar todas las opciones de filtros en paralelo
      const [faculties, areas, programs, professors, semesters] = await Promise.all([
        AcademicService.getFaculties(),
        AcademicService.getAllAreas(),
        AcademicService.getAllPrograms(),
        AcademicService.getProfessors(),
        AcademicService.getSemesters()
      ])

      setFilterOptions({
        faculties,
        areas,
        programs,
        professors,
        semesters
      })

      console.log('📋 Opciones de filtros cargadas')

      // Cargar cursos iniciales (sin filtros para establecer cache)
      const result = await AcademicService.searchCoursesWithPagination({}, 1)
      
      console.log('📚 Cursos iniciales cargados:', result.results.length, 'fromCache:', result.fromCache)
      
      setState(prev => ({ 
        ...prev, 
        results: result.results,
        pagination: result.pagination,
        allResults: result.results, // SIEMPRE establecer cache inicial
        fromCache: true, // FORZAR cache inicial para filtrado rápido
        loading: false 
      }))
      
    } catch (error) {
      console.error('❌ Error en carga inicial:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al cargar datos',
        loading: false
      }))
    }
  }

  // Buscar cursos con paginación inteligente
  const searchCourses = useCallback(async (filters: SearchFilters, page: number = 1) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      console.log('🎯 useCourseSearch.searchCourses - filtros:', filters)
      console.log('📦 Cache disponible:', state.allResults.length, 'fromCache:', state.fromCache)
      
      // SIEMPRE usar filtrado en memoria si tenemos cache, independientemente de los filtros
      if (state.allResults.length > 0 && state.fromCache) {
        console.log('⚡ Usando filtrado rápido en memoria (cache disponible)')
        const result = AcademicService.filterResultsInMemory(state.allResults, filters, page)
        setState(prev => ({ 
          ...prev, 
          results: result.results,
          pagination: result.pagination,
          filters,
          loading: false 
        }))
        return
      }

      // Si no hay cache, hacer consulta a BD
      console.log('🔍 Sin cache disponible - consultando BD')
      const result = await AcademicService.searchCoursesWithPagination(filters, page)
      setState(prev => ({ 
        ...prev, 
        results: result.results,
        pagination: result.pagination,
        filters,
        allResults: result.fromCache ? result.results : prev.allResults,
        fromCache: result.fromCache || prev.fromCache,
        loading: false 
      }))
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al buscar cursos',
        loading: false
      }))
    }
  }, [state.allResults, state.fromCache])

  // Cambiar página - SIEMPRE usar memoria si está disponible
  const changePage = useCallback(async (page: number) => {
    if (page === state.pagination.currentPage) return
    
    console.log('📄 Cambio de página:', page)
    
    // Si tenemos cache, usar filtrado en memoria
    if (state.allResults.length > 0 && state.fromCache) {
      console.log('⚡ Paginación rápida en memoria')
      const result = AcademicService.filterResultsInMemory(state.allResults, state.filters, page)
      setState(prev => ({ 
        ...prev, 
        results: result.results,
        pagination: result.pagination
      }))
      return
    }

    // Sino, hacer nueva consulta a BD
    console.log('🔍 Paginación consultando BD')
    await searchCourses(state.filters, page)
  }, [state.pagination.currentPage, state.allResults, state.fromCache, state.filters, searchCourses])

  // Limpiar filtros y volver a cargar todos
  const clearFilters = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Recargar desde BD
      const result = await AcademicService.searchCoursesWithPagination({}, 1)
      setState(prev => ({ 
        ...prev, 
        results: result.results,
        pagination: result.pagination,
        filters: {},
        allResults: result.fromCache ? result.results : [],
        fromCache: result.fromCache,
        loading: false 
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al cargar cursos',
        loading: false
      }))
    }
  }, [])

  return {
    ...state,
    filterOptions,
    searchCourses,
    changePage,
    clearFilters
  }
} 