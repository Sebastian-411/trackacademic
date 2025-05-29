import { useState, useEffect } from 'react'
import type { SearchFilters } from '../../types/academic'

interface CourseSearchFormProps {
  onSearch: (filters: SearchFilters, page?: number) => void
  onClear: () => void
  filterOptions: {
    faculties: any[]
    areas: any[]
    programs: any[]
    professors: any[]
    semesters: string[]
  }
  loading: boolean
}

export function CourseSearchForm({
  onSearch,
  onClear,
  filterOptions,
  loading
}: CourseSearchFormProps) {
  const [filters, setFilters] = useState<SearchFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Debounce para búsqueda de texto
  useEffect(() => {
    const timer = setTimeout(() => {
      // Siempre ejecutar búsqueda cuando hay cambios en filtros o texto
      handleSearch()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, filters])

  const handleSearch = () => {
    const searchFilters: SearchFilters = {
      ...filters,
      query: searchQuery.trim() || undefined
    }
    // Limpiar undefined para evitar problemas
    Object.keys(searchFilters).forEach(key => {
      if (searchFilters[key as keyof SearchFilters] === undefined) {
        delete searchFilters[key as keyof SearchFilters]
      }
    })
    onSearch(searchFilters, 1) // Siempre empezar en página 1 para nuevas búsquedas
  }

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    console.log('🔄 Cambio de filtro:', key, 'valor:', value)
    
    // Convertir valores numéricos apropiadamente y manejar valores vacíos
    let convertedValue = value || undefined
    
    // Si el valor está vacío o es "todas/todos", convertir a undefined
    if (!convertedValue || convertedValue === '' || convertedValue === '0') {
      convertedValue = undefined
      console.log('🔄 Reseteando filtro', key, 'a undefined')
    } else if (key === 'faculty_code' || key === 'area_code' || key === 'program_code') {
      convertedValue = parseInt(convertedValue, 10)
    }
    
    console.log('✅ Valor convertido:', convertedValue)
    
    // Crear nuevo objeto de filtros limpio
    const newFilters = { ...filters }
    
    if (convertedValue === undefined) {
      // Si el valor es undefined, eliminar la propiedad completamente
      delete newFilters[key]
    } else {
      // Si hay un valor válido, actualizarlo
      newFilters[key] = convertedValue
    }
    
    console.log('📋 Filtros finales:', newFilters)
    setFilters(newFilters)
  }

  const handleClear = () => {
    setFilters({})
    setSearchQuery('')
    onClear()
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        🔍 Buscar Cursos
      </h2>

      {/* Búsqueda por texto */}
      <div className="mb-4">
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
          Buscar por nombre o código
        </label>
        <input
          type="text"
          id="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ej: Matemáticas, CALC101, Programación..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filtros en grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        
        {/* Facultad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Facultad
          </label>
          <select
            value={filters.faculty_code || ''}
            onChange={(e) => handleFilterChange('faculty_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las facultades</option>
            {filterOptions.faculties.map((faculty) => (
              <option key={faculty.code} value={faculty.code}>
                {faculty.name}
              </option>
            ))}
          </select>
        </div>

        {/* Área */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Área
          </label>
          <select
            value={filters.area_code || ''}
            onChange={(e) => handleFilterChange('area_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las áreas</option>
            {filterOptions.areas.map((area) => (
              <option key={area.code} value={area.code}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        {/* Programa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Programa
          </label>
          <select
            value={filters.program_code || ''}
            onChange={(e) => handleFilterChange('program_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los programas</option>
            {filterOptions.programs.map((program) => (
              <option key={program.code} value={program.code}>
                {program.name}
              </option>
            ))}
          </select>
        </div>

        {/* Semestre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Semestre
          </label>
          <select
            value={filters.semester || ''}
            onChange={(e) => handleFilterChange('semester', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los semestres</option>
            {filterOptions.semesters.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>
        </div>

        {/* Profesor */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profesor
          </label>
          <select
            value={filters.professor_id || ''}
            onChange={(e) => handleFilterChange('professor_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los profesores</option>
            {filterOptions.professors.map((professor) => (
              <option key={professor.id} value={professor.id}>
                {professor.first_name} {professor.last_name} ({professor.employee_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleClear}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
        >
          Limpiar filtros
        </button>
        
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition duration-200"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* Ayuda actualizada */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-700">
          💡 <strong>Tip:</strong> Sistema optimizado con paginación inteligente. 
          Para ≤20 resultados usamos filtrado rápido en memoria. 
          Para más resultados, paginación eficiente desde base de datos.
        </p>
      </div>
    </div>
  )
} 