# Turing IA - Periodo de Prueba GCP & Workspace
## Reto Día 1: Configuración Avanzada de Infraestructura en GCP

**Candidato:** Julián Alejandro Rodríguez López  
**Fecha:** 28 de Septiembre, 2026  
**Repositorio Oficial:** [github.com/Spyker1/turing-gcp-workspace-challenge](https://github.com/Spyker1/turing-gcp-workspace-challenge)

---

### 1. Resumen de la Solución
Se diseñó e implementó un pipeline serverless desacoplado y orientado a eventos en Google Cloud Platform (GCP). El sistema extrae metadatos de archivos depositados en Cloud Storage, emite logs estructurados en JSON hacia Cloud Logging y aplica el principio de mínimo privilegio en IAM.

> **Nota de Entorno:** Dado que el proceso se desarrolló en un entorno de pruebas sin cuenta de facturación corporativa asignada, la solución se estructuró bajo el paradigma de **Infraestructura como Código (IaC)** reproducible (`setup_infrastructure.sh`) y la lógica de negocio fue validada al 100% mediante emulación local con la suite de pruebas unitarias (`unittest`).

---

### 2. Diagrama de Arquitectura

```text
[Productor / Ingestor]
          │ (Upload: CSV / PDF / Datasets)
          ▼
[Cloud Storage Bucket: gs://turing-storage-data]
   ├── Reglas de Ciclo de Vida: Nearline (30d) -> Coldline (90d) -> Delete (365d)
   └── Seguridad: Uniform Bucket-Level Access (UBLA) + IAM Mínimo Privilegio
          │
          ▼ Evento GCS: google.cloud.storage.object.v1.finalized
[Eventarc / Trigger]
          │
          ▼ CloudEvent Payload (JSON)
[Cloud Function Gen 2: gcs-metadata-extractor (Python 3.11)]
   ├── Service Account: sa-storage-processor (roles/logging.logWriter, roles/storage.objectViewer)
   ├── Extracción: bucket, name, size (Bytes/KB/MB), contentType, md5, timestamps
   └── Manejo robusto de errores y fallbacks seguros
          │
          ▼ JSON Structured Payload
[Google Cloud Logging] ──► Logs Explorer & Auditoría