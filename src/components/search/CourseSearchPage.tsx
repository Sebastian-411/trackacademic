import { useCourseSearch } from '../../hooks/useCourseSearch'
import { CourseSearchForm } from './CourseSearchForm'
import { CourseSearchResults } from './CourseSearchResults'

export function CourseSearchPage() {
  const {
    results,
    pagination,
    loading,
    error,
    filters,
    filterOptions,
    fromCache,
    searchCourses,
    changePage,
    clearFilters
  } = useCourseSearch()

  // Determinar si hay filtros activos
  const hasFilters = Boolean(
    filters.query || filters.faculty_code || filters.area_code || 
    filters.program_code || filters.semester || filters.professor_id
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                TrackAcademic
              </h1>
              <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Búsqueda de Cursos
              </span>
            </div>
            
            {/* Indicador de rendimiento */}
            <div className="flex items-center space-x-2">
              {fromCache && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ⚡ Modo rápido
                </span>
              )}
              {pagination.totalItems > 0 && (
                <span className="text-sm text-gray-600">
                  {pagination.totalItems} resultados
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          
          {/* Introducción */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              🎓 Explorar Cursos Disponibles
            </h2>
            <p className="text-gray-600 text-sm">
              Sistema de búsqueda con paginación inteligente. Filtra por facultad, área, programa, 
              semestre o profesor. Los resultados pequeños (≤20) se filtran instantáneamente en memoria, 
              los grandes usan paginación eficiente de base de datos.
            </p>
            
            {/* Información de rendimiento */}
            <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
              <span>📄 {pagination.itemsPerPage} cursos por página</span>
              <span>🔄 Filtrado automático con debounce</span>
              <span>⚡ Optimización inteligente</span>
            </div>
          </div>

          {/* Formulario de búsqueda */}
          <CourseSearchForm
            onSearch={searchCourses}
            onClear={clearFilters}
            filterOptions={filterOptions}
            loading={loading}
          />

          {/* Resultados */}
          <CourseSearchResults
            results={results}
            pagination={pagination}
            loading={loading}
            error={error}
            hasFilters={hasFilters}
            fromCache={fromCache}
            onPageChange={changePage}
          />

        </div>
      </main>
    </div>
  )
} 