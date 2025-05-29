import { supabase } from '../config/supabase'
import type { 
  Program, 
  Area, 
  Faculty, 
  Employee, 
  SearchFilters, 
  CourseSearchResult,
  PaginatedSearchResult,
} from '../types/academic'

export class AcademicService {
  
  // Constantes
  static readonly ITEMS_PER_PAGE = 20
  static readonly CACHE_THRESHOLD = 20 // Si hay <= 20 resultados, usar cache en memoria

  // Contar total de cursos que coinciden con los filtros
  static async countCourses(filters: SearchFilters): Promise<number> {
    try {
      // Para un conteo preciso, necesitamos hacer una búsqueda similar pero solo contar
      // Esto es complejo debido a los joins, así que haremos una versión simplificada
      
      // Si hay filtros complejos que requieren joins, usar búsqueda completa
      if (filters.faculty_code || filters.area_code || filters.semester || filters.professor_id) {
        const results = await this.searchCoursesInternal(filters, false)
        return results.length
      }

      // Para filtros simples, usar conteo directo
      let query = supabase
        .from('subjects')
        .select('code', { count: 'exact', head: true })

      // Aplicar filtros directos de subjects
      if (filters.query) {
        query = query.or(`name.ilike.%${filters.query}%,code.ilike.%${filters.query}%`)
      }

      if (filters.program_code) {
        query = query.eq('program_code', filters.program_code)
      }

      const { count, error } = await query

      if (error) throw error
      return count || 0

    } catch (error) {
      console.error('Error counting courses:', error)
      return 0
    }
  }

  // Buscar cursos con paginación inteligente
  static async searchCoursesWithPagination(
    filters: SearchFilters, 
    page: number = 1
  ): Promise<PaginatedSearchResult> {
    try {
      console.log('🎯 searchCoursesWithPagination - filtros:', filters)
      
      // Determinar si es una búsqueda sin filtros (carga inicial)
      const hasFilters = filters.query || filters.faculty_code || filters.area_code || 
                        filters.program_code || filters.semester || filters.professor_id
      
      // SIEMPRE usar datos base para cache - solo cambiar cuando NO hay filtros
      if (!hasFilters) {
        console.log('📥 Carga inicial - obteniendo cursos base para cache')
        const allResults = await this.searchCoursesInternal(filters, false)
        const limitedResults = allResults.slice(0, 100) // Aumentar cache a 100 para mejor cobertura
        
        return {
          results: limitedResults.slice(0, this.ITEMS_PER_PAGE), // Solo mostrar primera página
          pagination: {
            currentPage: 1,
            totalPages: Math.ceil(limitedResults.length / this.ITEMS_PER_PAGE),
            totalItems: limitedResults.length,
            itemsPerPage: this.ITEMS_PER_PAGE,
            hasNext: limitedResults.length > this.ITEMS_PER_PAGE,
            hasPrev: false
          },
          fromCache: true // Marcar como cache para usar en filtrado
        }
      }

      // NUNCA debería llegar aquí si tenemos cache funcionando bien
      console.log('⚠️ ADVERTENCIA: Llegamos a consulta BD con filtros - esto no debería pasar')
      const results = await this.searchCoursesPaginated(filters, page)
      
      return {
        results,
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalItems: results.length,
          itemsPerPage: this.ITEMS_PER_PAGE,
          hasNext: false,
          hasPrev: false
        },
        fromCache: false
      }

    } catch (error) {
      console.error('Error in paginated search:', error)
      throw error
    }
  }

  // Buscar todos los cursos (para cache en memoria)
  static async searchAllCourses(filters: SearchFilters): Promise<CourseSearchResult[]> {
    return this.searchCoursesInternal(filters, false)
  }

  // Buscar cursos con paginación real
  static async searchCoursesPaginated(filters: SearchFilters, page: number): Promise<CourseSearchResult[]> {
    return this.searchCoursesInternal(filters, true, page)
  }

  // Método interno unificado para búsqueda
  private static async searchCoursesInternal(
    filters: SearchFilters, 
    paginate: boolean = false, 
    page: number = 1
  ): Promise<CourseSearchResult[]> {
    try {
      console.log('🔍 Búsqueda con filtros:', filters)
      
      // 1. Obtener materias con filtros básicos
      let subjectsQuery = supabase
        .from('subjects')
        .select('*')
        .order('name')

      // Aplicar paginación si es necesario
      if (paginate) {
        const from = (page - 1) * this.ITEMS_PER_PAGE
        const to = from + this.ITEMS_PER_PAGE - 1
        subjectsQuery = subjectsQuery.range(from, to)
      }

      // Aplicar filtros directos de subjects
      if (filters.query) {
        subjectsQuery = subjectsQuery.or(`name.ilike.%${filters.query}%,code.ilike.%${filters.query}%`)
      }

      if (filters.program_code) {
        subjectsQuery = subjectsQuery.eq('program_code', filters.program_code)
      }

      const { data: subjects, error: subjectsError } = await subjectsQuery

      if (subjectsError) throw subjectsError

      console.log('📚 Materias encontradas:', subjects?.length || 0)

      if (!subjects || subjects.length === 0) {
        return []
      }

      // 2. Obtener programas para las materias encontradas
      const programCodes = [...new Set(subjects.map(s => s.program_code))]
      let programsQuery = supabase
        .from('programs')
        .select('*')
        .in('code', programCodes)

      if (filters.area_code) {
        programsQuery = programsQuery.eq('area_code', filters.area_code)
        console.log('🏢 Filtro de área aplicado:', filters.area_code)
      }

      const { data: programs, error: programsError } = await programsQuery

      if (programsError) throw programsError

      console.log('📋 Programas encontrados:', programs?.length || 0)

      // Filtrar subjects que tengan programas válidos
      const validPrograms = new Set(programs?.map(p => p.code) || [])
      const filteredSubjects = subjects.filter(s => validPrograms.has(s.program_code))

      console.log('📚 Materias después del filtro de programas:', filteredSubjects.length)

      if (filteredSubjects.length === 0) {
        return []
      }

      // 3. Obtener áreas para los programas
      const areaCodes = [...new Set(programs?.map(p => p.area_code) || [])]
      let areasQuery = supabase
        .from('areas')
        .select('*')
        .in('code', areaCodes)

      if (filters.faculty_code) {
        areasQuery = areasQuery.eq('faculty_code', filters.faculty_code)
        console.log('🏛️ Filtro de facultad aplicado:', filters.faculty_code)
      }

      const { data: areas, error: areasError } = await areasQuery

      if (areasError) throw areasError

      console.log('🏢 Áreas encontradas:', areas?.length || 0)

      // Filtrar programas que tengan áreas válidas
      const validAreas = new Set(areas?.map(a => a.code) || [])
      const filteredPrograms = programs?.filter(p => validAreas.has(p.area_code)) || []

      console.log('📋 Programas después del filtro de áreas:', filteredPrograms.length)

      if (filteredPrograms.length === 0) {
        return []
      }

      // 4. Obtener facultades para las áreas
      const facultyCodes = [...new Set(areas?.map(a => a.faculty_code) || [])]
      const { data: faculties, error: facultiesError } = await supabase
        .from('faculties')
        .select('*')
        .in('code', facultyCodes)

      if (facultiesError) throw facultiesError

      console.log('🏛️ Facultades encontradas:', faculties?.length || 0)

      // 5. Obtener grupos para las materias (con filtros de profesor y semestre)
      const subjectCodes = filteredSubjects.map(s => s.code)
      let groupsQuery = supabase
        .from('groups')
        .select('*')
        .in('subject_code', subjectCodes)

      if (filters.semester) {
        groupsQuery = groupsQuery.eq('semester', filters.semester)
        console.log('📅 Filtro de semestre aplicado:', filters.semester)
      }

      if (filters.professor_id) {
        groupsQuery = groupsQuery.eq('professor_id', filters.professor_id)
        console.log('👨‍🏫 Filtro de profesor aplicado:', filters.professor_id)
      }

      const { data: groups, error: groupsError } = await groupsQuery

      if (groupsError) throw groupsError

      console.log('👥 Grupos encontrados:', groups?.length || 0)

      // 6. Obtener empleados (profesores) para los grupos
      const professorIds = [...new Set(groups?.map(g => g.professor_id) || [])]
      let employeesData: any[] = []

      if (professorIds.length > 0) {
        const { data: employees, error: employeesError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, employee_type')
          .in('id', professorIds)

        if (employeesError) throw employeesError
        employeesData = employees || []
      }

      console.log('👨‍🏫 Profesores encontrados:', employeesData.length)

      // 7. Crear mapas para facilitar el lookup
      const programsMap = new Map(filteredPrograms.map(p => [p.code, p]))
      const areasMap = new Map(areas?.map(a => [a.code, a]) || [])
      const facultiesMap = new Map(faculties?.map(f => [f.code, f]) || [])
      const employeesMap = new Map(employeesData.map(e => [e.id, e]))
      
      // Agrupar grupos por materia
      const groupsBySubject = new Map<string, any[]>()
      groups?.forEach(group => {
        const subjectGroups = groupsBySubject.get(group.subject_code) || []
        groupsBySubject.set(group.subject_code, [...subjectGroups, {
          ...group,
          professor: employeesMap.get(group.professor_id)
        }])
      })

      // 8. Construir resultados finales
      const results: CourseSearchResult[] = []

      for (const subject of filteredSubjects) {
        const program = programsMap.get(subject.program_code)
        if (!program) continue

        const area = areasMap.get(program.area_code)
        if (!area) continue

        const faculty = facultiesMap.get(area.faculty_code)
        if (!faculty) continue

        const subjectGroups = groupsBySubject.get(subject.code) || []
        
        // Si hay filtros de profesor o semestre y no hay grupos que los cumplan, saltar
        if ((filters.professor_id || filters.semester) && subjectGroups.length === 0) {
          continue
        }

        // Extraer profesores únicos
        const professors: Employee[] = []
        const professorIds = new Set<string>()

        subjectGroups.forEach(group => {
          if (group.professor && !professorIds.has(group.professor.id)) {
            professors.push(group.professor)
            professorIds.add(group.professor.id)
          }
        })

        results.push({
          subject: {
            code: subject.code,
            name: subject.name,
            program_code: subject.program_code
          },
          program,
          area,
          faculty,
          groups: subjectGroups,
          professors
        })
      }

      console.log('✅ Resultados finales:', results.length)

      return results

    } catch (error) {
      console.error('❌ Error searching courses:', error)
      throw error
    }
  }

  // Método legacy mantenido para compatibilidad
  static async searchCourses(filters: SearchFilters): Promise<CourseSearchResult[]> {
    const result = await this.searchCoursesWithPagination(filters, 1)
    return result.results
  }

  // Filtrar resultados en memoria (para optimización local)
  static filterResultsInMemory(
    allResults: CourseSearchResult[], 
    filters: SearchFilters, 
    page: number = 1
  ): PaginatedSearchResult {
    console.log('⚡ FILTRADO EN MEMORIA - Partiendo del cache completo:', allResults.length)
    console.log('🔍 Filtros recibidos:', filters)
    
    // SIEMPRE partir del cache completo y aplicar todos los filtros desde cero
    let filtered = [...allResults] // Copia del cache completo
    
    // Contar cuántos filtros están activos
    let activeFiltersCount = 0

    // Aplicar cada filtro SOLO si tiene un valor definido
    if (filters.query?.trim()) {
      const query = filters.query.toLowerCase()
      filtered = filtered.filter(result => 
        result.subject.name.toLowerCase().includes(query) ||
        result.subject.code.toLowerCase().includes(query)
      )
      activeFiltersCount++
      console.log(`📝 Filtro texto "${query}" → ${filtered.length} resultados`)
    }

    if (filters.faculty_code !== undefined) {
      const facultyCode = Number(filters.faculty_code)
      filtered = filtered.filter(result => result.faculty.code === facultyCode)
      activeFiltersCount++
      console.log(`🏛️ Filtro facultad ${facultyCode} → ${filtered.length} resultados`)
    }

    if (filters.area_code !== undefined) {
      const areaCode = Number(filters.area_code)
      filtered = filtered.filter(result => result.area.code === areaCode)
      activeFiltersCount++
      console.log(`🏢 Filtro área ${areaCode} → ${filtered.length} resultados`)
    }

    if (filters.program_code !== undefined) {
      const programCode = Number(filters.program_code)
      filtered = filtered.filter(result => result.program.code === programCode)
      activeFiltersCount++
      console.log(`📋 Filtro programa ${programCode} → ${filtered.length} resultados`)
    }

    if (filters.semester?.trim()) {
      filtered = filtered.filter(result => 
        result.groups.some(group => group.semester === filters.semester)
      )
      activeFiltersCount++
      console.log(`📅 Filtro semestre "${filters.semester}" → ${filtered.length} resultados`)
    }

    if (filters.professor_id?.trim()) {
      filtered = filtered.filter(result => 
        result.professors.some(prof => prof.id === filters.professor_id)
      )
      activeFiltersCount++
      console.log(`👨‍🏫 Filtro profesor ${filters.professor_id} → ${filtered.length} resultados`)
    }

    // Log del resultado final
    if (activeFiltersCount === 0) {
      console.log('🆓 SIN FILTROS ACTIVOS - Mostrando cache completo')
    } else {
      console.log(`✅ ${activeFiltersCount} filtro(s) aplicado(s) - Resultado final: ${filtered.length}`)
    }

    // Aplicar paginación
    const totalItems = filtered.length
    const totalPages = Math.ceil(totalItems / this.ITEMS_PER_PAGE)
    const startIndex = (page - 1) * this.ITEMS_PER_PAGE
    const endIndex = startIndex + this.ITEMS_PER_PAGE
    const paginatedResults = filtered.slice(startIndex, endIndex)

    console.log(`📄 Página ${page}/${totalPages} - Mostrando ${paginatedResults.length} de ${totalItems}`)

    return {
      results: paginatedResults,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: this.ITEMS_PER_PAGE,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      fromCache: true
    }
  }

  // Obtener todas las facultades para filtros
  static async getFaculties(): Promise<Faculty[]> {
    try {
      const { data, error } = await supabase
        .from('faculties')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching faculties:', error)
      throw error
    }
  }

  // Obtener TODAS las áreas (para filtros independientes)
  static async getAllAreas(): Promise<Area[]> {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all areas:', error)
      throw error
    }
  }

  // Obtener TODOS los programas (para filtros independientes)
  static async getAllPrograms(): Promise<Program[]> {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all programs:', error)
      throw error
    }
  }

  // Obtener áreas por facultad (método legacy, mantenido para compatibilidad)
  static async getAreasByFaculty(facultyCode: number): Promise<Area[]> {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('faculty_code', facultyCode)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching areas:', error)
      throw error
    }
  }

  // Obtener programas por área (método legacy, mantenido para compatibilidad)
  static async getProgramsByArea(areaCode: number): Promise<Program[]> {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('area_code', areaCode)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching programs:', error)
      throw error
    }
  }

  // Obtener profesores
  static async getProfessors(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, employee_type')
        .order('last_name')

      if (error) throw error
      return data as Employee[] || []
    } catch (error) {
      console.error('Error fetching professors:', error)
      throw error
    }
  }

  // Obtener semestres únicos
  static async getSemesters(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('semester')
        .order('semester')

      if (error) throw error
      
      // Extraer semestres únicos
      const semesters = [...new Set(data?.map(g => g.semester) || [])]
      return semesters
    } catch (error) {
      console.error('Error fetching semesters:', error)
      throw error
    }
  }
} 