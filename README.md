# Trackademic Backend

Backend completo para la aplicación Trackademic - Sistema de gestión de notas y planes de evaluación académicos.

## 🚀 Características

### Funcionalidades Principales

- **Autenticación y Autorización** con Supabase Auth
- **Gestión de Planes de Evaluación** (CRUD completo)
- **Sistema de Calificaciones** con proyecciones automáticas
- **Sistema Colaborativo** con comentarios y respuestas
- **Informes Avanzados** para estudiantes y coordinadores
- **API REST** completamente documentada con Swagger
- **Control de Roles** (estudiante, profesor, coordinador, admin)

### Tecnologías Utilizadas

- **Node.js** + **Express.js** - Servidor backend
- **Supabase** - Base de datos SQL y autenticación
- **MongoDB** - Base de datos NoSQL para planes y calificaciones
- **Mongoose** - ODM para MongoDB
- **Swagger** - Documentación automática de API
- **Winston** - Sistema de logging
- **JWT** - Tokens de autenticación

## 📋 Prerrequisitos

- Node.js (v18 o superior)
- MongoDB (v6 o superior)
- Cuenta de Supabase
- npm o yarn

## ⚡ Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd trackademic-backend
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/trackademic

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logs
LOG_LEVEL=info
```

### 4. Configurar Supabase

#### Ejecutar el schema SQL
En tu proyecto de Supabase, ejecuta el archivo `sql/schema.sql` para crear las tablas necesarias.

#### Configurar autenticación
1. Ve a Authentication > Settings en tu dashboard de Supabase
2. Configura los providers de autenticación que necesites
3. Asegúrate de que el registro de usuarios esté habilitado

### 5. Iniciar el servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📚 Documentación de la API

### Swagger UI
Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva en:
```
http://localhost:3000/api-docs
```

### Endpoints Principales

#### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrarse (solo estudiantes)
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/profile` - Obtener perfil del usuario

#### Planes de Evaluación
- `GET /api/evaluation-plans` - Listar planes
- `POST /api/evaluation-plans` - Crear plan
- `GET /api/evaluation-plans/:id` - Obtener plan específico
- `PUT /api/evaluation-plans/:id` - Actualizar plan
- `DELETE /api/evaluation-plans/:id` - Eliminar plan
- `POST /api/evaluation-plans/:id/approve` - Aprobar plan

#### Calificaciones
- `GET /api/grades` - Obtener calificaciones del usuario
- `POST /api/grades` - Crear registro de calificaciones
- `POST /api/grades/:id/activities` - Agregar calificación de actividad
- `GET /api/grades/:id/projections` - Obtener proyecciones
- `PUT /api/grades/:id/target` - Actualizar calificación objetivo

#### Comentarios
- `GET /api/comments/plan/:planId` - Comentarios de un plan
- `POST /api/comments` - Crear comentario
- `POST /api/comments/:id/like` - Dar/quitar like
- `POST /api/comments/:id/replies` - Agregar respuesta

#### Información Académica
- `GET /api/academic/faculties` - Listar facultades
- `GET /api/academic/subjects` - Listar materias
- `GET /api/academic/groups` - Listar grupos
- `GET /api/academic/professors` - Listar profesores

#### Reportes
- `GET /api/reports/student-performance/:userId` - Informe de rendimiento
- `GET /api/reports/subject-analytics/:subjectCode` - Analíticas de materia
- `GET /api/reports/faculty-dashboard/:facultyCode` - Dashboard de facultad
- `GET /api/reports/grade-projections` - Proyecciones de calificaciones

## 🔐 Sistema de Roles

### Estudiante (student)
- Ver planes de evaluación aprobados
- Gestionar sus propias calificaciones
- Comentar en planes aprobados
- Ver sus informes de rendimiento

### Profesor (professor)
- Crear y gestionar sus planes de evaluación
- Ver comentarios en sus planes
- Acceder a analíticas de sus materias

### Coordinador (coordinator)
- Aprobar planes de evaluación de su facultad
- Ver dashboard de la facultad
- Acceder a informes de profesores de su facultad
- Resolver comentarios

### Administrador (admin)
- Acceso completo a todas las funcionalidades
- Gestionar usuarios y roles
- Ver todos los reportes y analíticas

## 📊 Base de Datos

### SQL (Supabase)
Información académica institucional:
- Facultades, programas, materias
- Empleados (profesores, coordinadores)
- Grupos y semestres
- Sedes y ubicaciones

### MongoDB
Datos dinámicos de la aplicación:
- Planes de evaluación
- Calificaciones de estudiantes
- Comentarios y respuestas
- Metadatos y configuraciones

## 🔧 Configuración Avanzada

### Rate Limiting
El sistema incluye limitación de velocidad configurada por defecto:
- 100 requests por 15 minutos por IP
- Configurable a través de variables de entorno

### Logging
Sistema de logs con Winston:
- Logs de aplicación en `logs/combined.log`
- Logs de errores en `logs/error.log`
- Nivel de log configurable

### Validación
- Validación de entrada con Joi
- Middleware de validación personalizado
- Manejo de errores centralizado

## 🚀 Despliegue

### Variables de Entorno de Producción
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/trackademic
SUPABASE_URL=https://your-project.supabase.co
# ... resto de variables
```

### Docker (Opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📋 Scripts Disponibles

```bash
# Desarrollo con auto-restart
npm run dev

# Producción
npm start

# Tests (cuando estén implementados)
npm test

# Linting (cuando esté configurado)
npm run lint
```

## 🔍 Características Técnicas

### Arquitectura
- **Arquitectura REST** bien estructurada
- **Separación de responsabilidades** (routes, controllers, models)
- **Middleware** reutilizable para autenticación y autorización
- **Manejo de errores** centralizado y consistente

### Seguridad
- **Autenticación JWT** con Supabase
- **Validación de entrada** en todas las rutas
- **Rate limiting** para prevenir abuso
- **Sanitización** de datos de entrada
- **Headers de seguridad** con Helmet

### Performance
- **Índices optimizados** en MongoDB
- **Paginación** en endpoints de listado
- **Poblado selectivo** de datos relacionados
- **Caché** de consultas frecuentes (donde aplique)

## 🐛 Resolución de Problemas

### Errores Comunes

#### Error de conexión a MongoDB
```bash
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solución**: Asegúrate de que MongoDB esté corriendo localmente o verifica la URI de conexión.

#### Error de Supabase
```bash
Error: Invalid API key
```
**Solución**: Verifica que las variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` estén correctamente configuradas.

#### Error de permisos
```bash
403 Forbidden
```
**Solución**: Verifica que el usuario tenga el rol correcto para la operación solicitada.

### Logs de Debug
Para activar logs detallados:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Equipo

- **Backend Developer**: [Tu nombre]
- **Database Designer**: [Tu nombre]
- **API Designer**: [Tu nombre]

## 📞 Soporte

Para soporte técnico:
- Email: support@trackademic.com
- Issues: [GitHub Issues](repository-url/issues)
- Documentation: [Wiki](repository-url/wiki)

## 🔄 Changelog

### v1.0.0 (2024-01-01)
- ✨ Implementación inicial del backend completo
- 🔐 Sistema de autenticación con Supabase
- 📊 Gestión de planes de evaluación
- 📈 Sistema de calificaciones con proyecciones
- 💬 Sistema colaborativo de comentarios
- 📋 Informes y reportes avanzados
- 📚 Documentación completa con Swagger

---

¡Gracias por usar Trackademic! 🎓 