import type { CourseSearchResult, PaginationInfo } from '../../types/academic'
import { Pagination } from './Pagination'

interface CourseSearchResultsProps {
  results: CourseSearchResult[]
  pagination: PaginationInfo
  loading: boolean
  error: string | null
  hasFilters: boolean
  fromCache: boolean
  onPageChange: (page: number) => void
}

export function CourseSearchResults({
  results,
  pagination,
  loading,
  error,
  hasFilters,
  fromCache,
  onPageChange
}: CourseSearchResultsProps) {

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            {fromCache ? 'Filtrando en memoria...' : 'Consultando base de datos...'}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">❌ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasFilters ? 'No se encontraron cursos' : 'No hay cursos disponibles'}
          </h3>
          <p className="text-gray-600">
            {hasFilters 
              ? 'Intenta ajustar los filtros para obtener más resultados.'
              : 'Actualmente no hay cursos cargados en el sistema.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      
      {/* Header con información */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            📚 Resultados de Búsqueda
          </h3>
          <div className="flex items-center space-x-3">
            {fromCache && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ⚡ Filtrado rápido
              </span>
            )}
            <span className="text-sm text-gray-600">
              {pagination.totalItems} curso{pagination.totalItems !== 1 ? 's' : ''} encontrado{pagination.totalItems !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de resultados */}
      <div className="divide-y divide-gray-200">
        {results.map((result, index) => (
          <div key={`${result.subject.code}-${index}`} className="p-6 hover:bg-gray-50 transition duration-150">
            
            {/* Información principal del curso */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {result.subject.name}
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Código:</span> {result.subject.code}
                </p>
                
                {/* Jerarquía académica */}
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">📋 Programa:</span> {result.program.name}
                  </div>
                  <div>
                    <span className="font-medium">🏢 Área:</span> {result.area.name}
                  </div>
                  <div>
                    <span className="font-medium">🏛️ Facultad:</span> {result.faculty.name}
                  </div>
                </div>
              </div>

              {/* Información de grupos y profesores */}
              <div className="ml-6 text-right">
                {result.groups.length > 0 && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">👥 Grupos:</span> {result.groups.length}
                  </div>
                )}
                
                {result.professors.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">👨‍🏫 Profesores:</span>
                    <div className="mt-1 space-y-1">
                      {result.professors.slice(0, 3).map((professor, idx) => (
                        <div key={professor.id} className="text-xs">
                          {professor.first_name} {professor.last_name}
                        </div>
                      ))}
                      {result.professors.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{result.professors.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Información adicional de grupos */}
            {result.groups.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Grupos disponibles:</h5>
                <div className="flex flex-wrap gap-2">
                  {result.groups.map((group, idx) => (
                    <span 
                      key={`${group.number}-${group.semester}-${idx}`}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      Grupo {group.number} - {group.semester}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Paginación */}
      <Pagination
        pagination={pagination}
        onPageChange={onPageChange}
        loading={loading}
        fromCache={fromCache}
      />
    </div>
  )
} 