# PRD — Herramienta de Revisión de FA Codes (YHat)

**Versión del artifact:** v5
**Autor:** MR (consultora BI) + Claude
**Última actualización:** 2026-08-26
**Estado:** En uso activo, iterando

---

## 1. Problema

MR gestiona altas de FA (Financial Advisor) Codes en la base SQL Server **YHat** para distribuidoras de fondos en LatAm y US Offshore (NinetyOne, Muzinich, Vontobel). Cada alta requiere:

- Resolver 8 campos por code (Office, Country, Region, IBD, NSCC, Dealer, Agente, Origin)
- Identificar el/los FA correspondientes (existentes o altas nuevas)
- Aplicar reglas de negocio específicas (formatos Pershing/UBS, regla "mismo Branch+Rep = mismo FA", genéricos "-Unidentified", detección de false-companies, etc.)
- Generar el script T-SQL transaccional para cargar en producción

Este proceso hoy depende de una skill de Claude (`gestion-fa-codes-sql`) que analiza lotes de codes contra una foto (snapshot) de la base YHat, pero **no existía una interfaz para revisar, editar y confirmar esas decisiones antes de generar el SQL**. Cada corrección de una sugerencia requería volver al chat.

## 2. Objetivo

Dar a MR una herramienta visual donde:
1. Pega el JSON de análisis que Claude genera en el chat.
2. Revisa cada campo de cada code con su evidencia y nivel de confianza.
3. Confirma, corrige o reemplaza sugerencias sin volver al chat para cada cambio.
4. Genera el script SQL transaccional final, listo para SSMS.

**No objetivo (por ahora):** que el artifact analice los codes por sí mismo. El análisis sigue haciéndolo Claude en el chat (skill `gestion-fa-codes-sql`); el artifact solo visualiza, edita y genera SQL sobre el resultado de ese análisis.

## 3. Usuario

Un solo usuario: MR. Uso personal, exclusivo de su conversación en Claude.ai. No hay multi-usuario ni backend compartido.

## 4. Arquitectura

**Tipo:** Artifact React (single-file), sin backend.

**Flujo de datos:**
```
Chat con Claude (skill gestion-fa-codes-sql)
   → analiza lote de codes contra foto YHat (CSVs locales)
   → devuelve JSON con formato estandarizado
        ↓ (copy-paste manual)
Artifact React (v5)
   → parsea el JSON
   → renderiza tabla + drawer de edición
   → aplica overrides en localStorage
   → genera SQL transaccional
        ↓ (copy o descarga .sql)
SSMS → revisión manual → COMMIT/ROLLBACK
```

**Por qué este diseño (Opción Y, decidida explícitamente):** evita tener que embeber toda la foto YHat (15K+ codes, 5.7K FAs) dentro del artifact y reimplementar la lógica de la skill en JavaScript. El análisis pesado sigue centralizado en el chat, donde la skill y sus reglas se mantienen actualizadas; el artifact es liviano (~200 KB) y se enfoca en la interacción.

**Catálogos embebidos en el artifact** (para autocompletar en el buscador del drawer):
- Countries (29), Regions (18), Agentes (74), Offices (831), IBD (1749), Origins (44)
- **FAs (5717) deliberadamente NO embebidos** — decisión explícita para mantener el peso bajo (~117 KB vs ~470 KB con FAs). El campo FA se resuelve por: sugerencias del JSON, alternativas del JSON, o input manual de Id + nombre.

## 5. Funcionalidad actual (v5)

### 5.1 Ingesta
- Modal "Cargar lote": pega JSON, valida estructura (`codes` como array), carga.
- Botón "Cargar ejemplo" con un lote de muestra para explorar sin datos reales.

### 5.2 Visualización
- Tabla con una fila por code: BranchRep, Rep Name, FA(s), y los 8 campos.
- **Estados por textura + color** (no solo color, para accesibilidad):
  - Verde sólido = Listo (`resolved`)
  - Ámbar = Revisar (`needs_confirm`)
  - Rojo punteado = Falta input (`needs_input`)
  - Gris rayado = Sin data (`no_data`)
- **"Huella" (fingerprint):** 9 tick-marks verticales junto al BranchRep (1 por FA + 8 campos), clickeables, resumen visual del estado completo de la fila.
- Leyenda de estados clickeable como filtro. Toggle "Sólo pendientes".
- Toggles de densidad (compacta/cómoda) y color de acento.

### 5.3 Edición (drawer)
- Click en cualquier celda o tick del fingerprint abre un drawer lateral.
- **Campos no-FA:** valor actual, evidencia, codes de referencia (tabla de precedentes), alternativas sugeridas, buscador contra catálogo embebido, alertas del code. Botones "Aceptar sugerencia" / "Marcar para revisar".
- **Campo FA:** cards por cada FA sugerido (navegables, click activa), con botón **"Cambiar FA"** que abre 3 modos:
  1. **Alternativas** — sugerencias del JSON o candidatos descartados reactivables.
  2. **Existente por Id** — input manual de FAId + nombre (dado que FAs no están embebidos).
  3. **Alta nueva** — nombre + tipo (Persona/Empresa/Sin identificar), genera `INSERT INTO [FA]` en el SQL final.
- Marca visual "✎ editado" en campos con override, con botón "Restaurar sugerencia".

### 5.4 Persistencia
- `localStorage`: el lote y los overrides sobreviven a un refresh del navegador.
- Botón "Ver JSON" (header): muestra el JSON completo del lote con todos los overrides aplicados — permite exportar/archivar el estado o reabrirlo después.

### 5.5 Generación de SQL
- Botón "Generar SQL" se habilita solo cuando **todos** los campos de **todos** los codes están en estado `resolved`.
- Genera un único script con:
  - Un `BEGIN TRAN` para todo el lote (decisión explícita: todo-o-nada sobre commit-por-code)
  - `INSERT INTO [Codes]` por cada code, con comentarios inline mostrando el nombre resuelto de cada Id
  - `INSERT INTO [FAxCodes]` por cada FA (existente) o `INSERT INTO [FA]` + `INSERT INTO [FAxCodes]` (nuevo)
  - `INSERT INTO [CodeOrigins]`
  - `SELECT` de verificación al final (join contra Offices/Countries/Origins)
  - `COMMIT`/`ROLLBACK` **comentados** — decisión defensiva: fuerza revisión manual antes de persistir en la base productiva.
- Modal con el script completo, botones "Copiar" y "Descargar .sql".

### 5.6 Robustez de copiado
- El botón "Copiar" (tanto en el modal SQL como en el modal JSON) tiene 3 niveles de fallback:
  1. `navigator.clipboard.writeText` (API moderna)
  2. `document.execCommand('copy')` (clásico, funciona en más sandboxes)
  3. Selección automática del texto + mensaje pidiendo Ctrl+C manual
- Motivo: el clipboard API a veces está bloqueado por el sandbox de artifacts en Claude.ai sin dar error visible.

## 6. Formato de contrato JSON (chat → artifact)

```json
{
  "batchNo": 5,
  "snapshot": "2026-08-23",
  "codes": [
    {
      "id": "c1",
      "branchRep": "string",
      "repName": "string",
      "dupcheck": "nuevo",
      "fields": {
        "office":  { "value": "...", "valueId": 123, "status": "resolved|needs_confirm|needs_input|no_data", "evidence": "...", "alternatives": [{ "label": "...", "hint": "..." }] },
        "country": { ... }, "region": { ... }, "ibd": { ... }, "nscc": { ... }, "origin": { ... }, "dealer": { ... }, "agente": { ... }
      },
      "fa": [
        { "id": 123, "name": "...", "state": "existente|nuevo", "status": "...", "evidence": "...", "tipo": "Persona|Empresa|Sin identificar", "alternatives": [{ "label": "...", "faId": 456, "faName": "...", "hint": "..." }] }
      ],
      "faDiscarded": [{ "id": 789, "name": "...", "reason": "..." }],
      "references": [{ "title": "...", "description": "...", "columns": [...], "rows": [{...}], "footnote": "..." }],
      "alerts": ["..."]
    }
  ]
}
```

Este contrato se mantiene estable entre iteraciones; Claude lo genera al procesar cada lote en el chat.

## 7. Decisiones de diseño registradas (y su porqué)

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Artifact sin análisis propio (Opción Y) | Embeber foto completa + reimplementar skill en JS (Opción X) | Evita reescribir la lógica de negocio en JS y mantiene la foto siempre actualizada vía el chat |
| FAs no embebidos | Embeber los 5717 FAs (~350 KB) | Prioriza peso liviano; el campo FA rara vez necesita búsqueda libre — casi siempre viene sugerido o alternativo en el JSON |
| `BEGIN TRAN` único con COMMIT/ROLLBACK comentados | Auto-commit, o transacción por code | Trabajo sobre base productiva: fuerza un paso de revisión manual antes de persistir |
| Estados por textura + color | Solo color | Accesibilidad — funciona en blanco y negro / daltonismo |
| localStorage para persistencia | Sin persistencia | Evitar perder trabajo de revisión ante un refresh accidental |
| Copy con triple fallback | Solo Clipboard API | El sandbox de artifacts bloquea la API sin avisar; hubo un incidente real donde MR no podía copiar el SQL |

## 8. Incidentes conocidos y su resolución

- **Transacción huérfana:** en un caso real, MR dejó una ventana de SSMS con `BEGIN TRAN` sin cerrar, trabando la tabla `Codes` para otras sesiones. Se documentaron queries de diagnóstico (`sys.dm_tran_session_transactions`, `sys.dm_exec_sql_text`) para identificar y, si corresponde, matar la sesión con `KILL`. **Pendiente de decisión:** si el generador de SQL debería entregar `COMMIT` ya descomentado por default para reducir este riesgo (alternativa "Opción B", discutida pero no implementada).
- **Botón Copiar no funcionaba:** causa raíz probable, bloqueo del Clipboard API en el sandbox de artifacts. Resuelto con el fallback triple (ver §5.6).

## 9. Fuera de alcance (explícitamente, por ahora)

- Alta de FA completamente nuevo *no sugerido* por el análisis previo, sin pasar por el chat — parcialmente cubierto (el modo "Alta nueva" del drawer FA cubre el caso donde el usuario ya sabe que necesita un FA nuevo, pero no hay validación de duplicados porque no hay catálogo de FAs embebido).
- Ingesta de Excel/CSV directa (solo paste de JSON funciona hoy).
- Ejecución de SQL directo contra YHat desde el artifact (no hay conexión a la base; el flujo termina en copiar/descargar el script).
- Multi-usuario o persistencia fuera de `localStorage` del navegador.
- App web standalone con URL propia (evaluada como opción B/C de deployment, no elegida).

## 10. Roadmap / mejoras candidatas (no comprometidas)

- Definir default de COMMIT vs COMMIT comentado en el SQL generado (pendiente de decisión del usuario, ver §8).
- Considerar embeber FAs si el uso real demuestra que la búsqueda libre se necesita seguido.
- Validación de duplicados al dar de alta un FA nuevo desde la UI.
- Ingesta de Excel/CSV.
- Exploración futura de migrar a app web propia con backend si el uso escala más allá de un artifact de Claude.ai.

## 11. Historial de versiones del artifact

| Versión | Cambios principales |
|---|---|
| v1 | Tabla básica + drawer, sin edición real |
| v2 | 4to estado visual ("sin data") para prefijos desconocidos |
| v3 | Sección "Codes de referencia" (tablas de precedentes) en el drawer |
| v4 | Funcional: ingesta JSON, catálogos embebidos (sin FAs), edición de campos, generación de SQL real, toggles de densidad/acento |
| **v5 (actual)** | Cambio de FA desde la UI (alternativa / Id manual / alta nueva), navegación entre FAs de un mismo code, persistencia en localStorage, botón "Ver JSON del lote", fix de robustez en el botón Copiar (fallback triple) |
