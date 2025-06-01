document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('templateForm');
    const activitiesList = document.getElementById('activitiesList');
    const addActivityBtn = document.getElementById('addActivityBtn');
    let hasUnsavedChanges = false;

    // Cargar datos de la plantilla y estadísticas
    async function loadTemplateData() {
        try {
            const planId = document.getElementById('templateContainer').dataset.planId;
            const response = await fetch(`/api/plans/${planId}/stats`);
            const data = await response.json();

            if (data.success) {
                // Rellenar datos básicos
                document.getElementById('subjectCode').value = data.plan.subjectCode;
                document.getElementById('semester').value = data.plan.semester;
                document.getElementById('groupNumber').value = data.plan.groupNumber;

                // Rellenar actividades
                data.plan.activities.forEach(activity => {
                    addActivityToList(activity);
                });

                // Mostrar estadísticas
                updateStats(data.stats);
            }
        } catch (error) {
            console.error('Error al cargar plantilla:', error);
            showToast('Error al cargar la plantilla', 'error');
        }
    }

    // Agregar actividad a la lista
    function addActivityToList(activity = {}) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-item mb-3 border rounded p-3';
        activityDiv.dataset.activityId = activity._id || '';

        activityDiv.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Nombre de la Actividad</label>
                        <input type="text" class="form-control activity-name" 
                            value="${activity.name || ''}" required>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label>Descripción</label>
                        <input type="text" class="form-control activity-description" 
                            value="${activity.description || ''}">
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="form-group">
                        <label>Porcentaje</label>
                        <input type="number" class="form-control activity-percentage" 
                            value="${activity.percentage || ''}" min="0" max="100" required>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="form-group">
                        <label>Fecha Límite</label>
                        <input type="date" class="form-control activity-due-date" 
                            value="${activity.dueDate ? activity.dueDate.split('T')[0] : ''}">
                    </div>
                </div>
            </div>
            <div class="text-end mt-2">
                <button type="button" class="btn btn-danger btn-sm delete-activity">
                    <i class="bi bi-trash"></i> Eliminar
                </button>
            </div>
        `;

        // Agregar event listeners
        const deleteBtn = activityDiv.querySelector('.delete-activity');
        deleteBtn.addEventListener('click', function() {
            if (confirm('¿Estás seguro de que deseas eliminar esta actividad?')) {
                activityDiv.remove();
                hasUnsavedChanges = true;
                updateTotalPercentage();
            }
        });

        const inputs = activityDiv.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', function() {
                hasUnsavedChanges = true;
                if (input.classList.contains('activity-percentage')) {
                    updateTotalPercentage();
                }
            });
        });

        activitiesList.appendChild(activityDiv);
        updateTotalPercentage();
    }

    // Actualizar porcentaje total
    function updateTotalPercentage() {
        const percentages = Array.from(document.querySelectorAll('.activity-percentage'))
            .map(input => parseFloat(input.value) || 0);
        
        const total = percentages.reduce((sum, val) => sum + val, 0);
        
        document.getElementById('totalPercentage').textContent = total.toFixed(1);
        
        if (total !== 100) {
            document.getElementById('percentageWarning').style.display = 'block';
        } else {
            document.getElementById('percentageWarning').style.display = 'none';
        }
    }

    // Mostrar estadísticas
    function updateStats(stats) {
        document.getElementById('totalStudents').textContent = stats.totalStudents;
        document.getElementById('averageGrade').textContent = stats.averageGrade.toFixed(1);
        if (document.getElementById('completedPlans')) {
            document.getElementById('completedPlans').textContent = stats.completedPlans;
        }
    }

    // Event Listeners
    addActivityBtn.addEventListener('click', () => {
        addActivityToList();
        hasUnsavedChanges = true;
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!hasUnsavedChanges) {
            showToast('No hay cambios para guardar', 'info');
            return;
        }

        const totalPercentage = parseFloat(document.getElementById('totalPercentage').textContent);
        if (totalPercentage !== 100) {
            showToast('El porcentaje total debe ser 100%', 'error');
            return;
        }

        const activities = Array.from(activitiesList.children).map(activityDiv => ({
            _id: activityDiv.dataset.activityId,
            name: activityDiv.querySelector('.activity-name').value,
            description: activityDiv.querySelector('.activity-description').value,
            percentage: parseFloat(activityDiv.querySelector('.activity-percentage').value),
            dueDate: activityDiv.querySelector('.activity-due-date').value
        }));

        try {
            const planId = document.getElementById('templateContainer').dataset.planId;
            const response = await fetch(`/api/plans/${planId}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subjectCode: document.getElementById('subjectCode').value,
                    semester: document.getElementById('semester').value,
                    groupNumber: document.getElementById('groupNumber').value,
                    activities: activities
                })
            });

            const data = await response.json();

            if (data.success) {
                showToast('Plan actualizado correctamente', 'success');
                hasUnsavedChanges = false;
                
                if (data.affectedStudents > 0) {
                    showToast(`${data.affectedStudents} estudiantes tienen este plan`, 'info');
                }

                // Redirigir al dashboard después de un breve delay
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                throw new Error(data.message || 'Error al actualizar el plan');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al guardar los cambios', 'error');
        }
    });

    // Cargar datos al inicio
    loadTemplateData();

    // Confirmar antes de salir si hay cambios sin guardar
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Función para mostrar toasts
    function showToast(message, type) {
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: type === 'success' ? "#16a34a" : type === 'error' ? "#dc2626" : "#3b82f6",
            },
            close: true
        }).showToast();
    }
}); 