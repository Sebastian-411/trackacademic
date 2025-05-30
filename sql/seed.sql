-- step 1
ALTER TABLE EMPLOYEES ALTER COLUMN faculty_code DROP NOT NULL;

-- step 2
ALTER TABLE FACULTIES DROP CONSTRAINT FACULTIES_EMPLOYEES_FK;
ALTER TABLE FACULTIES ADD CONSTRAINT FACULTIES_EMPLOYEES_FK
    FOREIGN KEY (dean_id)
    REFERENCES EMPLOYEES(id)
    DEFERRABLE INITIALLY DEFERRED;

-- step 3
BEGIN;

-- Insert Countries
INSERT INTO COUNTRIES (code, name) VALUES (1, 'Colombia');

-- Insert Departments
INSERT INTO DEPARTMENTS (code, name, country_code) VALUES
(1, 'Valle del Cauca', 1),
(2, 'Cundinamarca', 1),
(5, 'Antioquia', 1),
(8, 'Atlántico', 1),
(11, 'Bogotá D.C.', 1);

-- Insert Cities
INSERT INTO CITIES (code, name, dept_code) VALUES
(101, 'Cali', 1),
(102, 'Bogotá', 11),
(103, 'Medellín', 5),
(104, 'Barranquilla', 8),
(105, 'Barranquilla', 8);

-- Insert Campuses
INSERT INTO CAMPUSES (code, name, city_code) VALUES
(1, 'Campus Cali', 101),
(2, 'Campus Bogotá', 102),
(3, 'Campus Medellín', 103),
(4, 'Campus Barranquilla', 104);

-- Insert Employee Types
INSERT INTO EMPLOYEE_TYPES (name) VALUES
('Docente'),
('Administrativo');

-- Insert Contract Types
INSERT INTO CONTRACT_TYPES (name) VALUES
('Planta'),
('Cátedra');

-- Insert Employees SIN faculty_code
INSERT INTO EMPLOYEES (id, first_name, last_name, email, contract_type, employee_type, faculty_code, campus_code, birth_place_code) VALUES
('1001', 'Juan', 'Pérez', 'juan.perez@univcali.edu.co', 'Planta', 'Docente', NULL, 1, 101),
('1002', 'María', 'Gómez', 'maria.gomez@univcali.edu.co', 'Planta', 'Administrativo', NULL, 2, 102),
('1003', 'Carlos', 'López', 'carlos.lopez@univcali.edu.co', 'Cátedra', 'Docente', NULL, 1, 103),
('1004', 'Carlos', 'Mejía', 'carlos.mejia@univcali.edu.co', 'Planta', 'Docente', NULL, 3, 103),
('1005', 'Sandra', 'Ortiz', 'sandra.ortiz@univcali.edu.co', 'Cátedra', 'Docente', NULL, 4, 104),
('1006', 'Julián', 'Reyes', 'julian.reyes@univcali.edu.co', 'Planta', 'Administrativo', NULL, 1, 105);
('1007', 'Ana', 'Torres', 'ana.torres@univcali.edu.co', 'Cátedra', 'Docente', NULL, 2, 102),
('1008', 'Luis', 'Ramírez', 'luis.ramirez@univcali.edu.co', 'Planta', 'Administrativo', NULL, 3, 103),
('1009', 'Laura', 'Hernández', 'laura.hernandez@univcali.edu.co', 'Cátedra', 'Docente', NULL, 4, 104),
('1010', 'Andrés', 'Castro', 'andres.castro@univcali.edu.co', 'Planta', 'Docente', NULL, 1, 101);
('1011', 'Patricia', 'Vargas', 'patricia.vargas@univcali.edu.co', 'Cátedra', 'Docente', NULL, 2, 102),
('1012', 'Sofía', 'García', 'sofia.garcia@univcali.edu.co', 'Planta', 'Administrativo', NULL, 3, 103),
('1013', 'Diego', 'Martínez', 'diego.martinez@univcali.edu.co', 'Cátedra', 'Docente', NULL, 4, 104),
('1014', 'Camila', 'Rojas', 'camilo.rojas@univcali.edu.co', 'Planta', 'Docente', NULL, 1, 101);
('1015', 'Felipe', 'Córdoba', 'felipe.cordoba@univcali.edu.co', 'Cátedra', 'Docente', NULL, 2, 102),
('1016', 'Valentina', 'Pineda', 'valentina.pineda@univaceli.edu.co', 'Planta', 'Administrativo', NULL, 3, 103),
('1017', 'Mateo', 'Sánchez', 'mateo.sanchez@univcali.edu.co', 'Cátedra', 'Docente', NULL, 4, 104),
('1018', 'Isabella', 'Castaño', 'isabella.castano@univcali.edu.co', 'Planta', 'Docente', NULL, 1, 101),
('1019', 'Sebastián', 'Gómez', 'sebastian.gomez@univcali.edu.co', 'Cátedra', 'Docente', NULL, 2, 102),
('1020', 'Gabriela', 'Mendoza', 'gabriela.mendoza@univcali.edu.co', 'Planta', 'Administrativo', NULL, 3, 103),
('1021', 'Alejandro', 'Suárez', 'alejandro.suarez@univcali.edu.co', 'Cátedra', 'Docente', NULL, 4, 104),
('1022', 'Natalia', 'Pérez', 'natalia.perez@univcali.edu.co', 'Planta', 'Docente', NULL, 1, 101);

-- Insert Faculties
INSERT INTO FACULTIES (code, name, location, phone_number, dean_id) VALUES
(1, 'Facultad de Ciencias de la Salud', 'Cali', '555-1234', '1001'),
(2, 'Facultad de Negocios y Economía', 'Cali', '555-5678', '1005'),
(3, 'Facultad de Ingeniería, Diseño y Ciencias Aplicadas', 'Cali', '555-9012', '1010'),
(4, 'Facultad de Ciencias Humanas', 'Cali', '555-3456', '1019');

-- Actualizar faculty_code en EMPLOYEES
UPDATE EMPLOYEES SET faculty_code = 1 WHERE id IN ('1001', '1002', '1003', '1004'),
UPDATE EMPLOYEES SET faculty_code = 2 WHERE id IN ('1005', '1006', '1007', '1008', '1009'),
UPDATE EMPLOYEES SET faculty_code = 3 WHERE id IN ('1010', '1011', '1012', '1013', '1014', '1015', '1016', '1017', '1018');
UPDATE EMPLOYEES SET faculty_code = 4 WHERE id IN ('1019', '1020', '1021', '1022');

-- Insert Areas
INSERT INTO AREAS (code, name, faculty_code, coordinator_id) VALUES
(1, 'Área de Ciencias Básicas Médicas', 1, '1002'),
(2, 'Área de Ciencia Clínicas', 1, '1003'),
(3, 'Área de Salud Pública y Medicina Comunitaria', 1, '1004'),
(4, 'Área de Gestión Organizacional', 2, '1006'),
(5, 'Área de Mercadeo, Emprendimiento e Internacionalización', 2, '1007');
(6, 'Área de Estudios Contables y Financieros', 2, '1008'),
(7, 'Área de Economía', 2, '1009'),
(8, 'Área de Diseño e Innovación', 3, '1011'),
(9, 'Área de Ciencias Físicas y Exactas', 3, '1012'),
(10, 'Área de Ciencias Farmacéuticas y Químicas', 3, '1013'),
(11, 'Área de Ciencias Biológicas, Bioprocesos y Biotecnología', 3, '1014'),
(12, 'Área de Ciencias Aplicadas e Industria Sostenible', 3, '1015');
(13, 'Área de Tecnología, Diseño e Innovación', 3, '1016'),
(14, 'Área de Computación y Sistemas Inteligentes', 3, '1017');
(15, 'Área de Ingeniería Industrial y Sostenibilidad', 3, '1018');
(16, 'Área de Música', 4, '1019'),
(17, 'Área de Lenguaje', 4, '1020'),
(18, 'Área de Idiomas y Culturas del Mundo', 4, '1021'),
(19, 'Área de Pensamiento Lógico y Matemático', 4, '1022');

-- Insert Programs
INSERT INTO PROGRAMS (code, name, area_code) VALUES
(1, 'Bacteriología y Laboratorio Clínico', 2),
(2, 'Medicina', 1),
(3, 'Salud Ocupacional', 3),
(4, 'Administración de Empresas', 4), 
(5, 'Economía y Negocios Internacionales', 5),
(6, 'Finanzas en Mercados Globales', 5),
(7, 'Mercadeo Internacional y Publicidad', 6),
(8, 'Negocios, Estrategia y Tecnología', 7),
(9, 'Biología', 11),
(10, 'Diseño de Medios Interactivos', 11),
(11, 'Diseño Industrial', 8),
(12, 'Ingeniería Bioquímica', 13),
(13, 'Ingeniería de Sistemas', 14),
(14, 'Ingeniería en Energías Inteligentes', 15),
(15, 'Ingeniería Industrial', 15),
(16, 'Ingeniería Telemática', 13),
(17, 'Medicina Veterinaria y Zootecnia', 12),
(18, 'Química', 9),
(19, 'Química Farmacéutica', 10),
(20, 'Música', 16),
(21, 'Licenciatura en Lengua Castellana', 17),
(22, 'Licenciatura en Idiomas Extranjeros', 18),
(23, 'Licenciatura en Matemáticas y Física', 19);

-- Insert Subjects
INSERT INTO SUBJECTS (code, name, program_code) VALUES
('S201', 'Microbiología General', 1),
('S202', 'Bioquímica Clínica', 1),
('S203', 'Parasitología', 1),
('S204', 'Anatomía Humana', 2),
('S205', 'Fisiología', 2),
('S206', 'Farmacología', 2),
('S207', 'Seguridad y Salud en el Trabajo', 3),
('S208', 'Ergonomía', 3),
('S209', 'Higiene Industrial', 3),
('S210', 'Gestión Empresarial', 4),
('S211', 'Contabilidad Financiera', 4),
('S212', 'Marketing Estratégico', 4),
('S213', 'Macroeconomía', 5),
('S214', 'Comercio Internacional', 5),
('S215', 'Economía del Desarrollo', 5),
('S216', 'Gestión Financiera', 6),
('S217', 'Mercados Financieros', 6),
('S218', 'Análisis de Inversiones', 6),
('S219', 'Publicidad Digital', 7),
('S220', 'Comportamiento del Consumidor', 7),
('S221', 'Estrategias de Comunicación', 7),
('S222', 'Innovación Empresarial', 8),
('S223', 'Gestión de Proyectos', 8),
('S224', 'Estrategias Competitivas', 8),
('S225', 'Genética Molecular', 9),
('S226', 'Ecología', 9),
('S227', 'Biotecnología', 9),
('S228', 'Diseño de Interfaces', 10),
('S229', 'Animación Digital', 10),
('S230', 'Narrativa Interactiva', 10),
('S231', 'Diseño de Productos', 11),
('S232', 'Sostenibilidad en el Diseño', 11),
('S233', 'Prototipado', 11),
('S234', 'Ingeniería de Bioprocesos', 12),
('S235', 'Biología Celular', 12),
('S236', 'Química Orgánica', 12),
('S237', 'Programación Avanzada', 13),
('S238', 'Inteligencia Artificial', 13),
('S239', 'Bases de Datos Avanzadas', 13),
('S240', 'Energías Renovables', 14),
('S241', 'Sistemas de Energía', 14),
('S242', 'Gestión Energética', 14),
('S243', 'Optimización de Procesos', 15),
('S244', 'Logística y Cadena de Suministro', 15),
('S245', 'Gestión de Calidad', 15),
('S246', 'Redes de Computadores', 16),
('S247', 'Seguridad Informática', 16),
('S248', 'Protocolos de Comunicación', 16),
('S249', 'Fisiología Animal', 17),
('S250', 'Nutrición Animal', 17),
('S251', 'Patología Veterinaria', 17),
('S252', 'Química Inorgánica', 18),
('S253', 'Química Analítica', 18),
('S254', 'Fisicoquímica', 18),
('S255', 'Farmacognosia', 19),
('S256', 'Tecnología Farmacéutica', 19),
('S257', 'Química Medicinal', 19),
('S258', 'Historia de la Música', 20),
('S259', 'Teoría Musical', 20),
('S260', 'Composición', 20),
('S261', 'Didáctica de la Lengua', 21),
('S262', 'Literatura Hispanoamericana', 21),
('S263', 'Gramática Avanzada', 21),
('S264', 'Lingüística Aplicada', 22),
('S265', 'Traducción e Interpretación', 22),
('S266', 'Cultura y Civilización', 22),
('S267', 'Álgebra Lineal', 23),
('S268', 'Cálculo Multivariable', 23),
('S269', 'Física Moderna', 23);

-- Insert Groups
INSERT INTO GROUPS (number, semester, subject_code, professor_id) VALUES
(1, '2023-2', 'S201', '1002'),
(2, '2023-2', 'S201', '1003'),
(1, '2023-2', 'S202', '1002'),
(2, '2023-2', 'S202', '1003'),
(1, '2023-2', 'S203', '1004'),
(2, '2023-2', 'S203', '1004'),
(1, '2023-2', 'S204', '1002'),
(2, '2023-2', 'S204', '1003'),
(1, '2023-2', 'S205', '1004'),
(2, '2023-2', 'S205', '1004'),
(1, '2023-2', 'S206', '1002'),
(2, '2023-2', 'S206', '1003'),
(1, '2023-2', 'S207', '1006'),
(2, '2023-2', 'S207', '1007'),
(1, '2023-2', 'S208', '1006'),
(2, '2023-2', 'S208', '1007'),
(1, '2023-2', 'S209', '1008'),
(2, '2023-2', 'S209', '1008'),
(1, '2023-2', 'S210', '1006'),
(2, '2023-2', 'S210', '1007'),
(1, '2023-2', 'S211', '1008'),
(2, '2023-2', 'S211', '1008'),
(1, '2023-2', 'S212', '1007'),
(2, '2023-2', 'S212', '1007'),
(1, '2023-2', 'S213', '1009'),
(2, '2023-2', 'S213', '1009'),
(1, '2023-2', 'S214', '1009'),
(2, '2023-2', 'S214', '1009'),
(1, '2023-2', 'S215', '1009'),
(2, '2023-2', 'S215', '1009'),
(1, '2023-2', 'S216', '1008'),
(2, '2023-2', 'S216', '1008'),
(1, '2023-2', 'S217', '1008'),
(2, '2023-2', 'S217', '1008'),
(1, '2023-2', 'S218', '1008'),
(2, '2023-2', 'S218', '1008'),
(1, '2023-2', 'S219', '1007'),
(2, '2023-2', 'S219', '1007'),
(1, '2023-2', 'S220', '1007'),
(2, '2023-2', 'S220', '1007'),
(1, '2023-2', 'S221', '1007'),
(2, '2023-2', 'S221', '1007'),
(1, '2023-2', 'S222', '1008'),
(2, '2023-2', 'S222', '1008'),
(1, '2023-2', 'S223', '1008'),
(2, '2023-2', 'S223', '1008'),
(1, '2023-2', 'S224', '1008'),
(2, '2023-2', 'S224', '1008'),
(1, '2023-2', 'S225', '1011'),
(2, '2023-2', 'S225', '1011'),
(1, '2023-2', 'S226', '1011'),
(2, '2023-2', 'S226', '1011'),
(1, '2023-2', 'S227', '1011'),
(2, '2023-2', 'S227', '1011'),
(1, '2023-2', 'S228', '1012'),
(2, '2023-2', 'S228', '1012'),
(1, '2023-2', 'S229', '1012'),
(2, '2023-2', 'S229', '1012'),
(1, '2023-2', 'S230', '1012'),
(2, '2023-2', 'S230', '1012'),
(1, '2023-2', 'S231', '1013'),
(2, '2023-2', 'S231', '1013'),
(1, '2023-2', 'S232', '1013'),
(2, '2023-2', 'S232', '1013'),
(1, '2023-2', 'S233', '1013'),
(2, '2023-2', 'S233', '1013'),
(1, '2023-2', 'S234', '1014'),
(2, '2023-2', 'S234', '1014'),
(1, '2023-2', 'S235', '1014'),
(2, '2023-2', 'S235', '1014'),
(1, '2023-2', 'S236', '1014'),
(2, '2023-2', 'S236', '1014'),
(1, '2023-2', 'S237', '1015'),
(2, '2023-2', 'S237', '1015'),
(1, '2023-2', 'S238', '1015'),
(2, '2023-2', 'S238', '1015'),
(1, '2023-2', 'S239', '1015'),
(2, '2023-2', 'S239', '1015'),
(1, '2023-2', 'S240', '1016'),
(2, '2023-2', 'S240', '1016'),
(1, '2023-2', 'S241', '1016'),
(2, '2023-2', 'S241', '1016'),
(1, '2023-2', 'S242', '1016'),
(2, '2023-2', 'S242', '1016'),
(1, '2023-2', 'S243', '1017'),
(2, '2023-2', 'S243', '1017'),
(1, '2023-2', 'S244', '1017'),
(2, '2023-2', 'S244', '1017'),
(1, '2023-2', 'S245', '1017'),
(2, '2023-2', 'S245', '1017'),
(1, '2023-2', 'S246', '1018'),
(2, '2023-2', 'S246', '1018'),
(1, '2023-2', 'S247', '1018'),
(2, '2023-2', 'S247', '1018'),
(1, '2023-2', 'S248', '1018'),
(2, '2023-2', 'S248', '1018'),
(1, '2023-2', 'S249', '1019'),
(2, '2023-2', 'S249', '1019'),
(1, '2023-2', 'S250', '1019'),
(2, '2023-2', 'S250', '1019'),
(1, '2023-2', 'S251', '1019'),
(2, '2023-2', 'S251', '1019'),
(1, '2023-2', 'S252', '1020'),
(2, '2023-2', 'S252', '1020'),
(1, '2023-2', 'S253', '1020'),
(2, '2023-2', 'S253', '1020'),
(1, '2023-2', 'S254', '1020'),
(2, '2023-2', 'S254', '1020'),
(1, '2023-2', 'S255', '1021'),
(2, '2023-2', 'S255', '1021'),
(1, '2023-2', 'S256', '1021'),
(2, '2023-2', 'S256', '1021'),
(1, '2023-2', 'S257', '1021'),
(2, '2023-2', 'S257', '1021'),
(1, '2023-2', 'S258', '1022'),
(2, '2023-2', 'S258', '1022'),
(1, '2023-2', 'S259', '1022'),
(2, '2023-2', 'S259', '1022'),
(1, '2023-2', 'S260', '1022'),
(2, '2023-2', 'S260', '1022');
(1, '2023-2', 'S261', '1022'),
(2, '2023-2', 'S261', '1022'),
(1, '2023-2', 'S262', '1022'),
(2, '2023-2', 'S262', '1022'),
(1, '2023-2', 'S263', '1022'),
(2, '2023-2', 'S263', '1022'),
(1, '2023-2', 'S264', '1021'),
(2, '2023-2', 'S264', '1021'),
(1, '2023-2', 'S265', '1021'),
(2, '2023-2', 'S265', '1021'),
(1, '2023-2', 'S266', '1021'),
(2, '2023-2', 'S266', '1021'),
(1, '2023-2', 'S267', '1021'),
(2, '2023-2', 'S267', '1022'),
(1, '2023-2', 'S268', '1021'),
(2, '2023-2', 'S268', '1022'),
(1, '2023-2', 'S269', '1021'),
(2, '2023-2', 'S269', '1022');
COMMIT;

-- step 4
ALTER TABLE EMPLOYEES ALTER COLUMN faculty_code SET NOT NULL;