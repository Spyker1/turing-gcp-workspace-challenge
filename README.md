# Turing IA - Periodo de Prueba GCP & Workspace
## Reto Día 1: Configuración Avanzada de Infraestructura en GCP

**Candidato:** Julián Alejandro Rodríguez López  
**Fecha:** 28 de Septiembre, 2026  

---

### 1. Arquitectura de la Solución

Pipeline serverless desacoplado y orientado a eventos:

```text
[Productor / Ingestor]
          │ (Upload: CSV / PDF / Datasets)
          ▼
[Cloud Storage Bucket: gs://turing-storage-data]
   ├── Reglas de Ciclo de Vida: Nearline (30d) -> Coldline (90d) -> Delete (365d)
   └── Acceso: Uniform Bucket-Level Access (UBLA) + IAM Mínimo Privilegio
          │
          ▼ (Evento GCS: google.cloud.storage.object.v1.finalized)
[Eventarc / Trigger]
          │
          ▼ CloudEvent (JSON)
[Cloud Function Gen 2: gcs-metadata-extractor (Python 3.11)]
   ├── Service Account: sa-storage-processor (roles/logging.logWriter, roles/storage.objectViewer)
   ├── Extracción y validación: bucket, name, size (B, KB, MB), contentType, md5, timestamps
   └── Manejo robusto de errores y fallbacks seguros
          │
          ▼ JSON Structured Payload
[Google Cloud Logging] ──► Logs Explorer & Auditoría