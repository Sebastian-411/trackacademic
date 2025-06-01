document.addEventListener('DOMContentLoaded', function() {
    const gradeInputs = document.querySelectorAll('.grade-input');
    const saveButton = document.getElementById('saveGradesBtn');
    let hasUnsavedChanges = false;
    let studentPlan = null;

    // Cargar el plan del estudiante si existe
    async function loadStudentPlan() {
        try {
            const templateId = document.getElementById('planContainer').dataset.planId;
            const response = await fetch(`/api/student/my-plans?templateId=${templateId}`);
            const data = await response.json();
            
            if (data.success && data.plan) {
                studentPlan = data.plan;
                // Rellenar las notas existentes
                studentPlan.activities.forEach(activity => {
                    const input = document.querySelector(`input[data-activity-id="${activity._id}"]`);
                    if (input && activity.grade !== null) {
                        input.value = activity.grade;
                        input.disabled = true; // Deshabilitar si ya tiene nota
                    }
                });
                updateTotalGrade();
            }
        } catch (error) {
            console.error('Error al cargar el plan:', error);
        }
    }

    // Manejar cambios en las notas
    gradeInputs.forEach(input => {
        input.addEventListener('input', function() {
            hasUnsavedChanges = true;
            updateTotalGrade();
        });
    });

    // Calcular y mostrar la nota total
    function updateTotalGrade() {
        let totalGrade = 0;
        let totalPercentage = 0;
        let completedPercentage = 0;

        gradeInputs.forEach(input => {
            const percentage = parseFloat(input.dataset.percentage);
            const grade = input.value ? parseFloat(input.value) : null;

            if (grade !== null && !isNaN(grade)) {
                totalGrade += (grade * percentage) / 100;
                completedPercentage += percentage;
            }
            totalPercentage += percentage;
        });

        const progress = (completedPercentage / totalPercentage) * 100;
        
        document.getElementById('totalGrade').textContent = totalGrade.toFixed(1);
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${progress.toFixed(0)}%`;
    }

    // Guardar las notas
    saveButton.addEventListener('click', async function() {
        if (!hasUnsavedChanges) {
            showToast('No hay cambios para guardar', 'info');
            return;
        }

        const activities = [];
        gradeInputs.forEach(input => {
            if (input.value) {
                activities.push({
                    _id: input.dataset.activityId,
                    grade: parseFloat(input.value)
                });
            }
        });

        try {
            let response;
            const templateId = document.getElementById('planContainer').dataset.planId;

            if (studentPlan) {
                // Actualizar plan existente
                response = await fetch(`/api/student/update-grades/${studentPlan._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ activities })
                });
            } else {
                // Preguntar si desea guardar un nuevo plan
                if (!confirm('¿Deseas guardar estas notas en tu plan personal?')) {
                    return;
                }

                // Crear nuevo plan
                response = await fetch(`/api/student/save-plan/${templateId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ activities })
                });
            }

            const data = await response.json();

            if (data.success) {
                showToast('Notas guardadas correctamente', 'success');
                hasUnsavedChanges = false;
                studentPlan = data.plan;
                
                // Deshabilitar inputs con notas guardadas
                activities.forEach(activity => {
                    const input = document.querySelector(`input[data-activity-id="${activity._id}"]`);
                    if (input) {
                        input.disabled = true;
                    }
                });
            } else {
                throw new Error(data.message || 'Error al guardar las notas');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al guardar las notas', 'error');
        }
    });

    // Cargar el plan al inicio
    loadStudentPlan();
}); 