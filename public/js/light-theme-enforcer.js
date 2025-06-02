/**
 * TRACKADEMIC - FORZADOR DE TEMA CLARO
 * 
 * Este script se ejecuta lo más temprano posible para asegurar que
 * la aplicación funcione únicamente en modo claro sin ninguna 
 * posibilidad de cambio a modo oscuro.
 */

(function() {
    'use strict';
    
    console.log('🌟 Trackademic: Iniciando forzador de tema claro...');
    
    // Función principal para forzar tema claro
    function enforceLightTheme() {
        // 1. Configurar atributos HTML
        document.documentElement.setAttribute('data-bs-theme', 'light');
        document.documentElement.style.colorScheme = 'light';
        
        // 2. Configurar meta tags si no existen
        let colorSchemeMetaExists = document.querySelector('meta[name="color-scheme"]');
        if (!colorSchemeMetaExists) {
            const meta = document.createElement('meta');
            meta.name = 'color-scheme';
            meta.content = 'light only';
            document.head.appendChild(meta);
        } else {
            colorSchemeMetaExists.content = 'light only';
        }
        
        // 3. Asegurar que el body tenga el esquema correcto cuando esté disponible
        if (document.body) {
            document.body.style.colorScheme = 'light';
            document.body.setAttribute('data-theme', 'light');
        }
        
        // 4. Configurar variables CSS globales
        document.documentElement.style.setProperty('--bs-theme', 'light');
        
        console.log('✅ Tema claro aplicado correctamente');
    }
    
    // Función para bloquear intentos de cambio de tema
    function blockThemeChanges() {
        // Interceptar y bloquear cambios de atributos relacionados con temas
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            // Bloquear intentos de cambiar a tema oscuro
            if (name === 'data-bs-theme' && value !== 'light') {
                console.warn('🚫 Intento de cambiar tema bloqueado:', value, '-> light');
                return originalSetAttribute.call(this, name, 'light');
            }
            return originalSetAttribute.call(this, name, value);
        };
        
        // Observador para detectar y corregir cambios no autorizados
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    const attributeName = mutation.attributeName;
                    
                    // Corregir tema en el elemento html
                    if (target === document.documentElement && attributeName === 'data-bs-theme') {
                        const currentTheme = target.getAttribute('data-bs-theme');
                        if (currentTheme !== 'light') {
                            target.setAttribute('data-bs-theme', 'light');
                            console.warn('🔧 Tema corregido automáticamente:', currentTheme, '-> light');
                        }
                    }
                    
                    // Corregir color-scheme en cualquier elemento
                    if (attributeName === 'style' || attributeName === 'class') {
                        if (target.style && target.style.colorScheme !== 'light' && target.style.colorScheme !== '') {
                            target.style.colorScheme = 'light';
                        }
                    }
                }
            });
        });
        
        // Observar todo el documento
        observer.observe(document.documentElement, {
            attributes: true,
            subtree: true,
            attributeFilter: ['data-bs-theme', 'style', 'class', 'data-theme']
        });
        
        console.log('🛡️ Protección contra cambios de tema activada');
    }
    
    // Función para inyectar CSS crítico de tema claro
    function injectCriticalLightCSS() {
        const criticalCSS = `
            /* TRACKADEMIC - TEMA CLARO CRÍTICO */
            html, body, #root, #app {
                color-scheme: light !important;
                background-color: #ffffff !important;
                color: #212529 !important;
            }
            
            /* Forzar tema claro en Bootstrap */
            [data-bs-theme="light"] {
                color-scheme: light !important;
            }
            
            /* Anular preferencias del sistema */
            @media (prefers-color-scheme: dark) {
                html, body, * {
                    color-scheme: light !important;
                    background-color: inherit;
                    color: inherit;
                }
                
                /* Mantener colores específicos de la marca */
                .navbar-custom, .bg-primary {
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
                    color: white !important;
                }
            }
            
            /* Prevenir transiciones de color no deseadas */
            *, *::before, *::after {
                transition-property: none !important;
            }
            
            /* Restablecer transiciones después de un momento */
            .restore-transitions * {
                transition-property: all !important;
            }
        `;
        
        const style = document.createElement('style');
        style.id = 'trackademic-light-theme-critical';
        style.textContent = criticalCSS;
        
        // Insertar al inicio del head para máxima prioridad
        const firstChild = document.head.firstChild;
        if (firstChild) {
            document.head.insertBefore(style, firstChild);
        } else {
            document.head.appendChild(style);
        }
        
        // Restaurar transiciones después de 500ms
        setTimeout(() => {
            document.documentElement.classList.add('restore-transitions');
        }, 500);
        
        console.log('🎨 CSS crítico de tema claro inyectado');
    }
    
    // Función para manejar eventos especiales
    function handleSpecialEvents() {
        // Prevenir que las extensiones del navegador cambien el tema
        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.includes('theme') || e.key.includes('dark'))) {
                console.warn('🚫 Cambio de tema desde storage bloqueado');
                enforceLightTheme();
            }
        });
        
        // Manejar cambios de visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                enforceLightTheme();
            }
        });
        
        // Manejar focus de la ventana
        window.addEventListener('focus', () => {
            enforceLightTheme();
        });
        
        console.log('📡 Manejadores de eventos especiales configurados');
    }
    
    // EJECUCIÓN INMEDIATA
    // Aplicar tema claro inmediatamente
    enforceLightTheme();
    
    // Inyectar CSS crítico
    injectCriticalLightCSS();
    
    // Configurar protecciones
    blockThemeChanges();
    
    // Manejar eventos especiales
    handleSpecialEvents();
    
    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            enforceLightTheme();
            console.log('🎯 Tema claro re-aplicado en DOMContentLoaded');
        });
    }
    
    // Ejecutar cuando la ventana esté completamente cargada
    window.addEventListener('load', () => {
        enforceLightTheme();
        console.log('🏁 Tema claro confirmado en window.load');
    });
    
    // Hacer funciones disponibles globalmente para debugging
    window.TrackademicTheme = {
        enforce: enforceLightTheme,
        status: () => {
            console.log('📊 Estado del tema:');
            console.log('- data-bs-theme:', document.documentElement.getAttribute('data-bs-theme'));
            console.log('- color-scheme (html):', document.documentElement.style.colorScheme);
            console.log('- color-scheme (body):', document.body ? document.body.style.colorScheme : 'N/A');
            console.log('- prefers-color-scheme:', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
    };
    
    console.log('🎉 Trackademic: Forzador de tema claro inicializado completamente');
    
})(); 