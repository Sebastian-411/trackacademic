# Trackademic - Sistema de Gestión Académica

**Sistema completo de gestión de notas y planes de evaluación académicos con enfoque estudiantil**
aaaaaaaaaaaaaaaaaaaaaaaaaaaa
## 🚀 Características Principales

### ✨ Nuevas Funcionalidades Implementadas

- **🎨 Tema Claro Forzado** - Interfaz optimizada exclusivamente en modo claro
- **📚 Documentación API Completa** - Swagger UI integrado con todos los endpoints
- **👨‍🎓 Sistema Orientado a Estudiantes** - Funcionalidades diseñadas para el rol estudiantil
- **🔄 Calculadora de Notas Inteligente** - Proyecciones automáticas y seguimiento en tiempo real
- **📊 Gestión de Planes Personales** - Guardar y gestionar planes de evaluación propios

### 🎓 Funcionalidades Académicas

- **Autenticación Segura** con Supabase Auth
- **Gestión de Planes de Evaluación** (visualización y uso)
- **Sistema de Calificaciones Personal** con proyecciones automáticas
- **Búsqueda Avanzada de Cursos** con filtros múltiples
- **Reportes Académicos** personalizados para estudiantes
- **Sistema de Comentarios** en planes de evaluación
- **Dashboard Estudiantil** con estadísticas y progreso

## 🛠️ Tecnologías

- **Node.js** + **Express.js** - Servidor backend
- **Supabase** - Base de datos SQL y autenticación
- **MongoDB** - Base de datos NoSQL para planes y calificaciones
- **Swagger/OpenAPI 3.0** - Documentación automática de API
- **EJS** - Motor de plantillas
- **Bootstrap 5** - Framework CSS (tema claro forzado)
- **Winston** - Sistema de logging avanzado

## 📋 Prerrequisitos

- Node.js (v18 o superior)
- MongoDB (v6 o superior)
- Cuenta de Supabase activa
- npm o yarn

## ⚡ Instalación

### 1. Clonar y preparar
```bash
git clone <repository-url>
cd trackademic
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```

**Configuración esencial en `.env`:**
```env
# Servidor
PORT=3000
NODE_ENV=development

# Supabase (requerido)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MongoDB (requerido)
MONGODB_URI=mongodb://localhost:27017/trackademic

# Sesiones
SESSION_SECRET=your-super-secure-session-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Configurar Supabase
1. Ejecuta el schema SQL en tu proyecto de Supabase
2. Configura autenticación en Authentication > Settings
3. Habilita registro de usuarios

### 4. Iniciar aplicación
```bash
# Desarrollo con auto-restart
npm run dev

# Producción
npm start
```

**🌐 URLs de acceso:**
- **Aplicación**: `http://localhost:3000`
- **Documentación API**: `http://localhost:3000/api-docs`
- **Especificación OpenAPI**: `http://localhost:3000/api-docs.json`
- **Info API**: `http://localhost:3000/api-info`

## 📚 Documentación API Completa

### 🎯 Swagger UI Interactivo
Accede a la documentación completa e interactiva en:
```
http://localhost:3000/api-docs
```

**Características de la documentación:**
- ✅ **Todos los controladores documentados**
- ✅ **Esquemas de datos detallados**
- ✅ **Ejemplos realistas** en cada endpoint
- ✅ **Códigos de estado HTTP** precisos
- ✅ **Autenticación basada en sesiones**
- ✅ **Interfaz moderna** con tema Trackademic

### 🔗 Endpoints Principales Documentados

#### 🔐 **Autenticación**
```
POST /login          # Iniciar sesión
POST /register       # Registro de estudiantes
POST /logout         # Cerrar sesión
GET  /dashboard      # Panel principal
```

#### 📋 **Planes de Evaluación**
```
GET  /evaluation-plans/{id}       # Ver plan específico
GET  /evaluation-plans/{id}/edit  # Formulario de edición
PUT  /api/evaluation-plans/{id}   # Actualizar plan
GET  /api/evaluation-plans/{id}/stats # Estadísticas del plan
```

#### 👨‍🎓 **Planes de Estudiantes** (Nuevos)
```
GET    /api/my-plans                    # Mis planes guardados
POST   /api/evaluation-plans/{id}/save # Guardar plan personal
PUT    /api/student-plans/{id}/grades  # Actualizar calificaciones
DELETE /api/my-plans/{id}              # Eliminar plan personal
GET    /api/student-plans/{id}         # Detalles con plan original
```

## 🎨 Tema Claro Forzado

### ✨ Implementación Completa
La aplicación funciona **exclusivamente en modo claro** con:

**🔧 Componentes implementados:**
- **CSS forzado** con `!important` para tema claro
- **JavaScript enforcer** que intercepta cambios de tema
- **Meta tags** con `color-scheme: light only`
- **Templates actualizados** con `data-bs-theme="light"`
- **Observadores DOM** para prevenir cambios automáticos
- **Soporte CSP** para Swagger UI

**🛡️ Prevención automática de:**
- Cambios por preferencias del sistema
- Modificaciones de JavaScript externo
- Alteraciones dinámicas del DOM
- Detectores de modo oscuro

## 👨‍🎓 Sistema Orientado a Estudiantes

### 🎯 Funcionalidades Principales

#### **📊 Dashboard Estudiantil**
- Resumen de materias por semestre
- Promedio general y estadísticas
- Actividades pendientes
- Progreso visual por materia

#### **🔍 Búsqueda de Cursos**
- Filtros por materia, profesor, semestre
- Visualización de planes de evaluación
- Información detallada de grupos

#### **📝 Gestión de Notas Personal**
- Calculadora de notas inteligente
- Proyecciones automáticas
- Seguimiento de progreso
- Notas y comentarios personales

#### **💾 Mis Planes Guardados**
- Guardar planes de evaluación de interés
- Gestión personal de múltiples planes
- Calculadora integrada por plan
- Historial de calificaciones

#### **📈 Reportes Personalizados**
- Informe de rendimiento académico
- Reporte de calificaciones detallado
- Proyecciones de notas finales
- Análisis de tendencias

### 🔐 Roles del Sistema

#### 👨‍🎓 **Estudiante** (Rol Principal)
- ✅ Ver todos los planes de evaluación aprobados
- ✅ Guardar planes de evaluación personales
- ✅ Usar calculadora de notas integrada
- ✅ Gestionar calificaciones propias
- ✅ Comentar en planes de evaluación
- ✅ Generar reportes académicos personales
- ✅ Buscar cursos y profesores
- ✅ Ver dashboard con estadísticas

#### 👨‍🏫 **Profesor** (Soporte)
- Crear y gestionar planes de evaluación
- Ver estadísticas de uso de sus planes
- Responder comentarios de estudiantes

#### 👨‍💼 **Coordinador** (Administrativo)
- Aprobar planes de evaluación
- Ver reportes de facultad
- Gestionar profesores

#### 🔧 **Administrador** (Sistema)
- Acceso completo al sistema
- Gestión de usuarios y roles

## 📊 Arquitectura de Datos

### 🗄️ **MongoDB** (Datos Dinámicos)
```javascript
// Planes de Evaluación
{
  subjectCode: "MATH101",
  semester: "2024-1",
  groupNumber: 1,
  activities: [
    { name: "Parcial 1", percentage: 30 },
    { name: "Proyecto", percentage: 40 },
    { name: "Final", percentage: 30 }
  ],
  versionName: "Plan Principal",
  isMainVersion: true,
  usageCount: 15
}

// Planes de Estudiantes
{
  studentId: "user_123",
  evaluationPlanId: ObjectId,
  subjectCode: "MATH101",
  activities: [
    { name: "Parcial 1", percentage: 30, score: 4.2 },
    { name: "Proyecto", percentage: 40, score: null }
  ],
  currentGrade: 1.26,
  progress: 30
}
```

### 🏛️ **Supabase** (Datos Institucionales)
- Empleados (profesores, coordinadores)
- Materias y programas académicos
- Grupos y semestres
- Facultades y sedes

## 🔧 Funcionalidades Avanzadas

### 🧮 **Calculadora de Notas Inteligente**
```javascript
// Proyecciones automáticas
const calcularProyeccion = (notaObjetivo, actividadesCompletadas, actividadesPendientes) => {
  const contribucionActual = actividadesCompletadas.reduce((sum, act) => 
    sum + (act.score * act.percentage / 100), 0);
  
  const porcentajePendiente = actividadesPendientes.reduce((sum, act) => 
    sum + act.percentage, 0);
  
  const notaRequerida = (notaObjetivo - contribucionActual) * 100 / porcentajePendiente;
  
  return {
    esAlcanzable: notaRequerida <= 5.0,
    notaMinima: Math.max(0, notaRequerida),
    recomendacion: generarRecomendacion(notaRequerida)
  };
};
```

### 📱 **Interfaz Responsiva**
- **Móvil**: Navegación optimizada para pantallas pequeñas
- **Tablet**: Layout adaptativo con sidebars colapsables
- **Desktop**: Interfaz completa con múltiples paneles

### 🔒 **Seguridad Implementada**
- Autenticación con Supabase Auth
- Sesiones seguras con MongoDB Store
- Rate limiting (100 req/15min)
- Validación de entrada en todos los endpoints
- Headers de seguridad con Helmet
- CSP configurado para Swagger

## 🚀 Despliegue y Producción

### 📦 **Variables de Entorno de Producción**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/trackademic
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
SESSION_SECRET=super-secure-production-secret
```

### 🐳 **Docker Support**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📋 Scripts de Desarrollo

```bash
# Desarrollo con auto-restart
npm run dev

# Producción
npm start

# Tests (cuando estén implementados)
npm test

# Verificación de salud del servidor
curl http://localhost:3000/health
```

## 🔍 Monitoreo y Logs

### 📊 **Sistema de Logging**
```javascript
// Configuración Winston
{
  levels: { error: 0, warn: 1, info: 2, debug: 3 },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
}
```

### 🏥 **Health Check**
```bash
GET /health
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "environment": "production"
}
```

## 🐛 Resolución de Problemas

### ❌ **Errores Comunes**

#### **MongoDB Connection**
```bash
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solución**: Verificar que MongoDB esté ejecutándose:
```bash
# macOS/Linux
brew services start mongodb-community
# Windows
net start MongoDB
```

#### **Supabase Authentication**
```bash
Error: Invalid API key
```
**Solución**: Verificar variables en `.env`:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJ...tu-clave-completa
```

#### **Tema No Forzado**
Si aparece modo oscuro:
1. Verificar que `light-theme-enforcer.js` se carga
2. Revisar CSP en browser developer tools
3. Confirmar que CSS tiene `!important`

### 🔧 **Debug Mode**
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📈 Roadmap

### 🎯 **Próximas Funcionalidades**
- [ ] Sistema de notificaciones en tiempo real
- [ ] Integración con calendario académico
- [ ] Reportes avanzados con gráficos
- [ ] Sistema de backup automático
- [ ] API móvil nativa
- [ ] Integración con LMS externos

### 🔮 **Funcionalidades Avanzadas**
- [ ] Machine Learning para predicciones académicas
- [ ] Análisis de rendimiento comparativo
- [ ] Sistema de recomendaciones personalizado
- [ ] Integración con sistemas de videoconferencia

## 🤝 Contribución

### 📝 **Proceso de Contribución**
1. **Fork** el repositorio
2. **Crea** una rama: `git checkout -b feature/nueva-funcionalidad`
3. **Commit** cambios: `git commit -m 'Add: nueva funcionalidad'`
4. **Push** a la rama: `git push origin feature/nueva-funcionalidad`
5. **Abre** un Pull Request

### 🎨 **Estándares de Código**
- ESLint para JavaScript
- Prettier para formateo
- Comentarios JSDoc en funciones públicas
- Tests unitarios para nuevas funcionalidades

## 📞 Soporte y Contacto

### 🆘 **Soporte Técnico**
- **Email**: support@trackademic.com
- **GitHub Issues**: [Reportar problemas](repository-url/issues)
- **Documentación**: [Wiki completa](repository-url/wiki)

### 👥 **Equipo de Desarrollo**
- **Lead Developer**: [Tu nombre]
- **Backend Architect**: [Tu nombre]
- **UI/UX Designer**: [Tu nombre]
- **Database Designer**: [Tu nombre]

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Ver `LICENSE` para detalles completos.

## 🔄 Changelog Detallado

### 🆕 **v1.2.0** (Actual) - Funcionalidades Estudiantiles
- ✨ **Nuevo**: Tema claro forzado con enforcement automático
- ✨ **Nuevo**: Documentación Swagger completa e interactiva
- ✨ **Nuevo**: Sistema de planes personales para estudiantes
- ✨ **Nuevo**: Calculadora de notas con proyecciones inteligentes
- ✨ **Nuevo**: Dashboard estudiantil con estadísticas
- ✨ **Nuevo**: Búsqueda avanzada de cursos con filtros
- ✨ **Nuevo**: Reportes académicos personalizados
- 🔧 **Mejorado**: Arquitectura de controladores documentada
- 🔧 **Mejorado**: Sistema de roles enfocado en estudiantes
- 🐛 **Corregido**: Errores de YAML en documentación Swagger
- 🐛 **Corregido**: Problemas de configuración de servidor

### 📚 **v1.1.0** - API Foundation
- ✨ Sistema de autenticación con Supabase
- ✨ Gestión básica de planes de evaluación
- ✨ Sistema de calificaciones fundamental
- ✨ Base de datos dual (SQL + NoSQL)

### 🎯 **v1.0.0** - MVP Inicial
- ✨ Implementación inicial del backend
- ✨ Estructura básica de rutas y controladores
- ✨ Configuración de base de datos
- ✨ Sistema de logging básico

---

## 🎓 ¡Bienvenido a Trackademic!

**Sistema diseñado por estudiantes, para estudiantes**

*Gestiona tus notas académicas de forma inteligente y mantén el control total de tu rendimiento estudiantil.*

### 🌟 **Características Destacadas:**
- 🎨 **Interfaz Clara**: Modo claro forzado para mejor legibilidad
- 📊 **Inteligencia Académica**: Proyecciones automáticas de notas
- 🔧 **API Documentada**: Swagger UI completo para desarrolladores
- 👨‍🎓 **Enfoque Estudiantil**: Diseñado específicamente para estudiantes

**¡Comienza tu gestión académica inteligente hoy mismo!** 🚀 
