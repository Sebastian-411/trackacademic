

## 🧠 Problemas detectados en el script original

1. ❌ **Orden incorrecto de inserts**: estabas insertando `DEPARTMENTS` antes de `COUNTRIES`, `FACULTIES` antes de `EMPLOYEES`, etc., violando claves foráneas.
2. ❌ **Restricción `NOT NULL` en `faculty_code`** te impedía insertar empleados si no sabías aún su facultad.
3. ❌ **Dependencia cruzada entre `EMPLOYEES` y `FACULTIES`**: ambos se necesitaban mutuamente, creando un deadlock lógico.
4. ❌ **Constraints no deferibles**: PostgreSQL validaba FKs al instante, no al final del `COMMIT`.

---

## ✅ Cambios aplicados (y por qué)

### 1. 🔄 **Reordenamos los inserts para respetar dependencias**

Se cambió el orden lógico para que las tablas padre se poblaran antes que las hijas:

**Antes**:

```sql
INSERT INTO DEPARTMENTS (...)  -- ❌ Falla porque depende de COUNTRIES que aún no existen
...
INSERT INTO EMPLOYEES (...)    -- ❌ Falla porque usa FACULTIES que aún no existen
...
INSERT INTO FACULTIES (...)    -- ❌ Falla porque usa EMPLOYEES que aún no existen
```

**Después**:

```sql
INSERT INTO COUNTRIES (...)
INSERT INTO DEPARTMENTS (...)
INSERT INTO EMPLOYEES (...)  -- (con faculty_code = NULL)
INSERT INTO FACULTIES (...)
UPDATE EMPLOYEES SET faculty_code = ...
```

---

### 2. 🧯 **Eliminamos temporalmente el `NOT NULL` de `faculty_code`**

Porque necesitábamos insertar empleados *antes* de que existieran las facultades, así:

```sql
ALTER TABLE EMPLOYEES ALTER COLUMN faculty_code DROP NOT NULL;
-- al final podés restaurarlo si querés:
ALTER TABLE EMPLOYEES ALTER COLUMN faculty_code SET NOT NULL;
```

---

### 3. 🔁 **Hicimos `dean_id` en `FACULTIES` deferrable**

Esto permitió que PostgreSQL espere al `COMMIT` para validar si el `dean_id` existe.

```sql
ALTER TABLE FACULTIES DROP CONSTRAINT FACULTIES_EMPLOYEES_FK;

ALTER TABLE FACULTIES ADD CONSTRAINT FACULTIES_EMPLOYEES_FK
  FOREIGN KEY (dean_id)
  REFERENCES EMPLOYEES(id)
  DEFERRABLE INITIALLY DEFERRED;
```

Esto resuelve el problema circular entre FACULTY ↔ EMPLOYEE.

---

### 4. 🧱 **Agrupamos todo dentro de una única transacción `BEGIN ... COMMIT`**

Esto fue **clave** para que las FK deferidas funcionaran bien.

```sql
BEGIN;

-- todos los inserts y updates

COMMIT;
```

---
