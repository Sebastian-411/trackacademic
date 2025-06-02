document.addEventListener('DOMContentLoaded', function() {
    // Cargar planes al iniciar
    loadSavedPlans();

    // Configurar el botón de búsqueda
    const searchBtn = document.getElementById('searchPlansBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        });
    }
});

// Función para cargar los planes guardados
async function loadSavedPlans() {
    try {
        const response = await fetch('/api/my-plans');
        const data = await response.json();
        
        const plansContainer = document.getElementById('plansContainer');
        const emptyState = document.getElementById('emptyState');

        if (data.success && data.plans && data.plans.length > 0) {
            plansContainer.innerHTML = '';
            emptyState.style.display = 'none';
            plansContainer.style.display = 'block';

            data.plans.forEach(plan => {
                const planCard = createPlanCard(plan);
                plansContainer.appendChild(planCard);
            });
        } else {
            plansContainer.style.display = 'none';
            emptyState.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al cargar planes:', error);
        showToast('Error al cargar los planes guardados', 'error');
    }
}

// Función para crear la tarjeta de un plan
function createPlanCard(plan) {
    const card = document.createElement('div');
    card.className = 'plan-item mb-3';
    
    // Crear el título con código y nombre de materia
    const subjectTitle = plan.subjectName && plan.subjectName !== plan.subjectCode 
        ? `${plan.subjectCode} - ${plan.subjectName}`
        : plan.subjectCode;
    
    card.innerHTML = `
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title mb-1">${subjectTitle}</h5>
                        <p class="text-muted mb-2">
                            ${plan.semester} • Grupo ${plan.groupNumber}
                        </p>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary">
                                <i class="bi bi-graph-up me-1"></i>
                                Nota actual: ${plan.currentGrade?.toFixed(1) || 'N/A'}
                            </span>
                            <span class="badge bg-info">
                                <i class="bi bi-clock-history me-1"></i>
                                Progreso: ${plan.progress || 0}%
                            </span>
                        </div>
                    </div>
                    <div class="btn-group">
                        <a href="/evaluation-plans/${plan._id}" class="btn btn-outline-primary btn-sm">
                            <i class="bi bi-eye me-1"></i>Ver
                        </a>
                        <button type="button" class="btn btn-outline-danger btn-sm delete-plan" data-plan-id="${plan._id}">
                            <i class="bi bi-trash me-1"></i>Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Agregar event listener al botón de eliminar
    const deleteBtn = card.querySelector('.delete-plan');
    deleteBtn.addEventListener('click', function() {
        const planId = this.getAttribute('data-plan-id');
        deletePlan(planId);
    });

    return card;
}

// Función para eliminar un plan
async function deletePlan(planId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este plan de tus guardados?')) {
        return;
    }

    try {
        const response = await fetch(`/api/my-plans/${planId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Plan eliminado correctamente', 'success');
            loadSavedPlans(); // Recargar la lista
        } else {
            throw new Error(data.message || 'Error al eliminar el plan');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al eliminar el plan', 'error');
    }
}

// Función para mostrar toasts
function showToast(message, type) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
            background: type === 'success' ? "#16a34a" : "#dc2626",
        },
        close: true
    }).showToast();
} 