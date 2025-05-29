const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { supabase } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/academic/faculties - Obtener facultades
router.get('/faculties', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('faculties')
      .select(`
        code,
        name,
        location,
        phone_number,
        dean_id,
        employees:dean_id (
          first_name,
          last_name,
          email
        )
      `)
      .order('name');

    if (error) {
      logger.error('Error obteniendo facultades:', error);
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo facultades'
      });
    }

    const enrichedFaculties = data.map(faculty => ({
      ...faculty,
      dean: faculty.employees ? {
        name: `${faculty.employees.first_name} ${faculty.employees.last_name}`,
        email: faculty.employees.email
      } : null
    }));

    res.status(200).json({
      success: true,
      data: enrichedFaculties
    });
  } catch (error) {
    logger.error('Error en endpoint de facultades:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/academic/programs - Obtener programas académicos
router.get('/programs', optionalAuth, async (req, res) => {
  try {
    const { facultyCode, areaCode } = req.query;
    
    let query = supabase
      .from('programs')
      .select(`
        code,
        name,
        area_code,
        areas!inner (
          code,
          name,
          faculty_code,
          faculties (
            name
          )
        )
      `)
      .order('name');

    if (areaCode) {
      query = query.eq('area_code', areaCode);
    }

    if (facultyCode) {
      query = query.eq('areas.faculty_code', facultyCode);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error obteniendo programas:', error);
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo programas'
      });
    }

    const enrichedPrograms = data.map(program => ({
      code: program.code,
      name: program.name,
      areaCode: program.area_code,
      areaName: program.areas.name,
      facultyCode: program.areas.faculty_code,
      facultyName: program.areas.faculties?.name
    }));

    res.status(200).json({
      success: true,
      data: enrichedPrograms
    });
  } catch (error) {
    logger.error('Error en endpoint de programas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/academic/subjects - Obtener materias
router.get('/subjects', optionalAuth, async (req, res) => {
  try {
    const { programCode, search } = req.query;
    
    let query = supabase
      .from('subjects')
      .select(`
        code,
        name,
        program_code,
        programs (
          name,
          areas (
            name,
            faculties (
              name
            )
          )
        )
      `)
      .order('name');

    if (programCode) {
      query = query.eq('program_code', programCode);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error obteniendo materias:', error);
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo materias'
      });
    }

    const enrichedSubjects = data.map(subject => ({
      code: subject.code,
      name: subject.name,
      programCode: subject.program_code,
      programName: subject.programs?.name,
      areaName: subject.programs?.areas?.name,
      facultyName: subject.programs?.areas?.faculties?.name
    }));

    res.status(200).json({
      success: true,
      data: enrichedSubjects
    });
  } catch (error) {
    logger.error('Error en endpoint de materias:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/academic/groups - Obtener grupos de clases
router.get('/groups', authenticate, async (req, res) => {
  try {
    const { semester, subjectCode, professorId } = req.query;
    
    let query = supabase
      .from('groups')
      .select(`
        number,
        semester,
        subject_code,
        professor_id,
        subjects (
          name,
          programs (
            name
          )
        ),
        employees (
          first_name,
          last_name,
          email,
          faculties (
            name
          )
        )
      `)
      .order('semester', { ascending: false })
      .order('subject_code')
      .order('number');

    if (semester) {
      query = query.eq('semester', semester);
    }

    if (subjectCode) {
      query = query.eq('subject_code', subjectCode.toUpperCase());
    }

    if (professorId) {
      query = query.eq('professor_id', professorId);
    }

    // Filtro por rol
    if (req.user.role === 'professor') {
      query = query.eq('professor_id', req.user.id);
    } else if (req.user.role === 'coordinator') {
      // Coordinadores ven grupos de su facultad
      const { data: facultyProfessors } = await supabase
        .from('employees')
        .select('id')
        .eq('faculty_code', req.user.facultyCode)
        .eq('employee_type', 'Profesor');
      
      if (facultyProfessors && facultyProfessors.length > 0) {
        const professorIds = facultyProfessors.map(p => p.id);
        query = query.in('professor_id', professorIds);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error obteniendo grupos:', error);
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo grupos'
      });
    }

    const enrichedGroups = data.map(group => ({
      number: group.number,
      semester: group.semester,
      subjectCode: group.subject_code,
      subjectName: group.subjects?.name,
      programName: group.subjects?.programs?.name,
      professorId: group.professor_id,
      professorName: group.employees 
        ? `${group.employees.first_name} ${group.employees.last_name}`
        : 'Profesor no encontrado',
      professorEmail: group.employees?.email,
      facultyName: group.employees?.faculties?.name
    }));

    res.status(200).json({
      success: true,
      data: enrichedGroups
    });
  } catch (error) {
    logger.error('Error en endpoint de grupos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/academic/professors - Obtener profesores
router.get('/professors', authenticate, authorize('coordinator', 'admin'), async (req, res) => {
  try {
    const { facultyCode, search } = req.query;
    
    let query = supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        email,
        faculty_code,
        campus_code,
        faculties (
          name,
          location
        ),
        campuses (
          name
        )
      `)
      .eq('employee_type', 'Profesor')
      .order('first_name');

    if (facultyCode) {
      query = query.eq('faculty_code', facultyCode);
    } else if (req.user.role === 'coordinator') {
      // Coordinadores solo ven profesores de su facultad
      query = query.eq('faculty_code', req.user.facultyCode);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error obteniendo profesores:', error);
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo profesores'
      });
    }

    const enrichedProfessors = data.map(professor => ({
      id: professor.id,
      firstName: professor.first_name,
      lastName: professor.last_name,
      fullName: `${professor.first_name} ${professor.last_name}`,
      email: professor.email,
      facultyCode: professor.faculty_code,
      facultyName: professor.faculties?.name,
      facultyLocation: professor.faculties?.location,
      campusCode: professor.campus_code,
      campusName: professor.campuses?.name
    }));

    res.status(200).json({
      success: true,
      data: enrichedProfessors
    });
  } catch (error) {
    logger.error('Error en endpoint de profesores:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/academic/campuses - Obtener sedes
router.get('/campuses', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campuses')
      .select(`
        code,
        name,
        city_code,
        cities (
          name,
          departments (
            name,
            countries (
              name
            )
          )
        )
      `)
      .order('name');

    if (error) {
      logger.error('Error obteniendo sedes:', error);
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo sedes'
      });
    }

    const enrichedCampuses = data.map(campus => ({
      code: campus.code,
      name: campus.name,
      cityCode: campus.city_code,
      cityName: campus.cities?.name,
      departmentName: campus.cities?.departments?.name,
      countryName: campus.cities?.departments?.countries?.name
    }));

    res.status(200).json({
      success: true,
      data: enrichedCampuses
    });
  } catch (error) {
    logger.error('Error en endpoint de sedes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/academic/semesters - Obtener semestres disponibles
router.get('/semesters', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('semester')
      .order('semester', { ascending: false });

    if (error) {
      logger.error('Error obteniendo semestres:', error);
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo semestres'
      });
    }

    // Obtener semestres únicos
    const uniqueSemesters = [...new Set(data.map(item => item.semester))];
    
    res.status(200).json({
      success: true,
      data: uniqueSemesters
    });
  } catch (error) {
    logger.error('Error en endpoint de semestres:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/academic/areas - Obtener áreas de conocimiento
router.get('/areas', optionalAuth, async (req, res) => {
  try {
    const { facultyCode } = req.query;
    
    let query = supabase
      .from('areas')
      .select(`
        code,
        name,
        faculty_code,
        coordinator_id,
        faculties (
          name
        ),
        employees (
          first_name,
          last_name,
          email
        )
      `)
      .order('name');

    if (facultyCode) {
      query = query.eq('faculty_code', facultyCode);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error obteniendo áreas:', error);
      return res.status(500).json({
        success: false,
        error: 'Error obteniendo áreas'
      });
    }

    const enrichedAreas = data.map(area => ({
      code: area.code,
      name: area.name,
      facultyCode: area.faculty_code,
      facultyName: area.faculties?.name,
      coordinatorId: area.coordinator_id,
      coordinatorName: area.employees 
        ? `${area.employees.first_name} ${area.employees.last_name}`
        : 'Coordinador no encontrado',
      coordinatorEmail: area.employees?.email
    }));

    res.status(200).json({
      success: true,
      data: enrichedAreas
    });
  } catch (error) {
    logger.error('Error en endpoint de áreas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/academic/search - Búsqueda general
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q: searchTerm, type } = req.query;
    
    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }

    const results = {};

    // Buscar en materias si no se especifica tipo o se especifica 'subjects'
    if (!type || type === 'subjects') {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('code, name, program_code')
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
        .limit(10);
      
      results.subjects = subjects || [];
    }

    // Buscar en profesores si no se especifica tipo o se especifica 'professors'
    if (!type || type === 'professors') {
      const { data: professors } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('employee_type', 'Profesor')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);
      
      results.professors = professors?.map(p => ({
        ...p,
        fullName: `${p.first_name} ${p.last_name}`
      })) || [];
    }

    // Buscar en programas si no se especifica tipo o se especifica 'programs'
    if (!type || type === 'programs') {
      const { data: programs } = await supabase
        .from('programs')
        .select('code, name')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);
      
      results.programs = programs || [];
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error en búsqueda:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 