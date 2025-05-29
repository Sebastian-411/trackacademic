// Trackademic App JavaScript
class TrackademicApp {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupUtils();
    }

    init() {
        // Initialize tooltips
        this.initTooltips();
        
        // Initialize charts if Chart.js is available
        if (typeof Chart !== 'undefined') {
            this.initCharts();
        }
        
        // Setup AJAX helpers
        this.setupAjax();
        
        // Initialize animations
        this.initAnimations();
        
        console.log('Trackademic App initialized');
    }

    initTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    initCharts() {
        // Default chart configuration
        Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        Chart.defaults.color = '#6c757d';
        Chart.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.05)';
    }

    setupAjax() {
        // CSRF token setup for AJAX requests
        const csrfToken = document.querySelector('meta[name="csrf-token"]');
        if (csrfToken) {
            window.csrfToken = csrfToken.getAttribute('content');
        }

        // Default AJAX settings
        this.defaultAjaxOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
    }

    initAnimations() {
        // Add fade-in animation to elements with .fade-in class
        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach(el => {
            this.observeElement(el, () => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        });
    }

    observeElement(element, callback) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback();
                    observer.unobserve(element);
                }
            });
        });
        observer.observe(element);
    }

    setupEventListeners() {
        // Global event listeners
        document.addEventListener('DOMContentLoaded', () => {
            this.setupFormValidation();
            this.setupDataTables();
            this.setupModals();
        });

        // Handle form submissions with loading states
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName === 'FORM') {
                this.handleFormSubmit(form);
            }
        });

        // Handle AJAX button clicks
        document.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-ajax-url')) {
                e.preventDefault();
                this.handleAjaxAction(e.target);
            }
        });
    }

    setupFormValidation() {
        // Bootstrap form validation
        const forms = document.querySelectorAll('.needs-validation');
        forms.forEach(form => {
            form.addEventListener('submit', (event) => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
    }

    setupDataTables() {
        // Initialize DataTables if available
        if (typeof $ !== 'undefined' && $.fn.DataTable) {
            $('.data-table').DataTable({
                responsive: true,
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json'
                }
            });
        }
    }

    setupModals() {
        // Auto-focus first input in modals
        document.addEventListener('shown.bs.modal', (e) => {
            const firstInput = e.target.querySelector('input:not([type="hidden"])');
            if (firstInput) {
                firstInput.focus();
            }
        });
    }

    setupUtils() {
        // Utility functions
        window.trackademic = {
            // Format numbers
            formatNumber: (num, decimals = 2) => {
                return parseFloat(num).toFixed(decimals);
            },

            // Format grade with color class
            formatGrade: (grade) => {
                const num = parseFloat(grade);
                let className = 'text-muted';
                
                if (num >= 4.5) className = 'text-success fw-bold';
                else if (num >= 3.5) className = 'text-info fw-bold';
                else if (num >= 3.0) className = 'text-warning fw-bold';
                else if (num > 0) className = 'text-danger fw-bold';
                
                return `<span class="${className}">${this.formatNumber(num)}</span>`;
            },

            // Show toast notification
            showToast: (message, type = 'info') => {
                this.showNotification(message, type);
            },

            // API calls
            api: {
                get: (url) => this.apiRequest('GET', url),
                post: (url, data) => this.apiRequest('POST', url, data),
                put: (url, data) => this.apiRequest('PUT', url, data),
                delete: (url) => this.apiRequest('DELETE', url)
            },

            // Chart helpers
            charts: {
                createGradeChart: (canvas, data) => this.createGradeChart(canvas, data),
                createProgressChart: (canvas, data) => this.createProgressChart(canvas, data),
                createComparisonChart: (canvas, data) => this.createComparisonChart(canvas, data)
            }
        };
    }

    handleFormSubmit(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Procesando...';
            submitBtn.disabled = true;

            // Re-enable after 10 seconds to prevent permanent lock
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 10000);
        }
    }

    async handleAjaxAction(element) {
        const url = element.getAttribute('data-ajax-url');
        const method = element.getAttribute('data-ajax-method') || 'GET';
        const confirm = element.getAttribute('data-confirm');

        if (confirm && !window.confirm(confirm)) {
            return;
        }

        element.classList.add('loading');
        
        try {
            const response = await this.apiRequest(method, url);
            
            if (response.success) {
                this.showNotification(response.message || 'Operación exitosa', 'success');
                
                // Refresh page if requested
                if (element.hasAttribute('data-refresh')) {
                    location.reload();
                }
            } else {
                this.showNotification(response.error || 'Error en la operación', 'error');
            }
        } catch (error) {
            this.showNotification('Error de conexión', 'error');
        } finally {
            element.classList.remove('loading');
        }
    }

    async apiRequest(method, url, data = null) {
        const options = {
            method,
            ...this.defaultAjaxOptions
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    showNotification(message, type = 'info') {
        // Create toast element
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${this.getBootstrapColor(type)} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi ${this.getIcon(type)} me-2"></i>${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '1050';
            document.body.appendChild(toastContainer);
        }

        // Add toast to container
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = toastContainer.lastElementChild;
        
        // Initialize and show toast
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Remove element after hide
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    getBootstrapColor(type) {
        const colors = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'info'
        };
        return colors[type] || 'info';
    }

    getIcon(type) {
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-exclamation-triangle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        return icons[type] || 'bi-info-circle-fill';
    }

    // Chart creation methods
    createGradeChart(canvas, data) {
        return new Chart(canvas, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Calificación',
                    data: data.grades,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 0.5
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    createProgressChart(canvas, data) {
        return new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Completado', 'Restante'],
                datasets: [{
                    data: [data.completed, data.remaining],
                    backgroundColor: ['#198754', '#e9ecef'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createComparisonChart(canvas, data) {
        return new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.subjects,
                datasets: [{
                    label: 'Calificación Actual',
                    data: data.currentGrades,
                    backgroundColor: '#0d6efd'
                }, {
                    label: 'Calificación Objetivo',
                    data: data.targetGrades,
                    backgroundColor: '#198754'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 0.5
                        }
                    }
                }
            }
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TrackademicApp();
});

// Utility functions for common operations
function refreshPage() {
    location.reload();
}

function goBack() {
    history.back();
}

function confirmAction(message = '¿Estás seguro?') {
    return confirm(message);
}

// Grade calculation helpers
function calculateWeightedGrade(activities) {
    let totalWeighted = 0;
    let totalPercentage = 0;
    
    activities.forEach(activity => {
        if (activity.grade !== null && activity.grade !== undefined) {
            totalWeighted += (activity.grade / activity.maxGrade * 5) * (activity.percentage / 100);
            totalPercentage += activity.percentage;
        }
    });
    
    return totalPercentage > 0 ? (totalWeighted / (totalPercentage / 100)) : 0;
}

function calculateRequiredGrade(currentGrade, completedPercentage, targetGrade) {
    const remainingPercentage = 100 - completedPercentage;
    if (remainingPercentage <= 0) return 0;
    
    const currentPoints = currentGrade * (completedPercentage / 100);
    const targetPoints = targetGrade;
    const remainingPoints = targetPoints - currentPoints;
    
    return Math.max(0, Math.min(5, remainingPoints / (remainingPercentage / 100)));
}

// Export for use in other scripts
window.TrackademicUtils = {
    calculateWeightedGrade,
    calculateRequiredGrade,
    refreshPage,
    goBack,
    confirmAction
}; 