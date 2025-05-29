// Entidades principales del sistema académico

export interface Subject {
  code: string
  name: string
  program_code: number
  program?: Program
}

export interface Program {
  code: number
  name: string
  area_code: number
  area?: Area
}

export interface Area {
  code: number
  name: string
  faculty_code: number
  coordinator_id: string
  faculty?: Faculty
  coordinator?: Employee
}

export interface Faculty {
  code: number
  name: string
  location: string
  phone_number: string
  dean_id?: string
  dean?: Employee
}

export interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  contract_type: string
  employee_type: string
  faculty_code: number
  campus_code: number
  birth_place_code: number
  faculty?: Faculty
}

export interface Group {
  number: number
  semester: string
  subject_code: string
  professor_id: string
  subject?: Subject
  professor?: Employee
}

export interface Campus {
  code: number
  name: string
  city_code: number
}

export interface City {
  code: number
  name: string
  dept_code: number
}

export interface Department {
  code: number
  name: string
  country_code: number
}

export interface Country {
  code: number
  name: string
}

// Tipos para búsqueda y filtros

export interface SearchFilters {
  query?: string
  faculty_code?: number
  area_code?: number
  program_code?: number
  semester?: string
  professor_id?: string
}

export interface CourseSearchResult {
  subject: Subject
  program: Program
  area: Area
  faculty: Faculty
  groups: Group[]
  professors: Employee[]
}

// Tipos para paginación
export interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedSearchResult {
  results: CourseSearchResult[]
  pagination: PaginationInfo
  fromCache: boolean // Indica si los resultados vienen del cache en memoria
}

export interface SearchState {
  results: CourseSearchResult[]
  pagination: PaginationInfo
  loading: boolean
  error: string | null
  filters: SearchFilters
  allResults: CourseSearchResult[] // Cache de todos los resultados para filtrado en memoria
  fromCache: boolean
} 