import json
import logging
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(message)s")
logger = logging.getLogger("gcs_metadata_processor")

# Inyección segura vía Variables de Entorno
WEBHOOK_URL = os.environ.get("WORKSPACE_WEBHOOK_URL")
SECRET_TOKEN = os.environ.get("WEBHOOK_SECRET_TOKEN")


def log_structured(severity: str, message: str, **kwargs) -> Dict[str, Any]:
  payload = {
      "timestamp": datetime.now(timezone.utc).isoformat(),
      "severity": severity.upper(),
      "message": message,
      "service": "gcs-metadata-extractor",
      **kwargs,
  }
  logger.info(json.dumps(payload))
  return payload


def extract_metadata(data: Dict[str, Any]) -> Dict[str, Any]:
  if not isinstance(data, dict):
    raise ValueError(f"Payload inválido: {type(data).__name__}")

  bucket_name = data.get("bucket")
  file_name = data.get("name")

  if not bucket_name or not file_name:
    raise ValueError("Metadatos incompletos: 'bucket' y 'name' requeridos.")

  try:
    raw_size = data.get("size", 0)
    size_bytes = int(raw_size) if raw_size is not None else 0
  except (ValueError, TypeError):
    size_bytes = 0

  return {
      "bucket": bucket_name,
      "name": file_name,
      "size_bytes": size_bytes,
      "size_kb": round(size_bytes / 1024, 2),
      "size_mb": round(size_bytes / (1024 * 1024), 4),
      "content_type": data.get("contentType") or "application/octet-stream",
      "storage_class": data.get("storageClass", "STANDARD"),
      "time_created": data.get("timeCreated")
      or datetime.now(timezone.utc).isoformat(),
      "updated": data.get("updated") or datetime.now(timezone.utc).isoformat(),
      "metageneration": data.get("metageneration", "1"),
      "md5_hash": data.get("md5Hash", "N/A"),
  }


def send_webhook(metadata: Dict[str, Any]) -> Dict[str, Any]:
  if not WEBHOOK_URL or not SECRET_TOKEN:
    log_structured(
        "WARNING",
        "Webhook omitido: Variables de entorno WORKSPACE_WEBHOOK_URL o"
        " WEBHOOK_SECRET_TOKEN no configuradas.",
    )
    return {
        "status": "skipped",
        "message": "Credenciales de webhook no configuradas",
    }

  payload = {
      "token": SECRET_TOKEN,
      "source": "gcp-cloud-functions",
      "metadata": metadata,
  }
  data_bytes = json.dumps(payload).encode("utf-8")
  req = urllib.request.Request(
      WEBHOOK_URL,
      data=data_bytes,
      headers={"Content-Type": "application/json"},
      method="POST",
  )

  try:
    with urllib.request.urlopen(req, timeout=15) as resp:
      resp_body = resp.read().decode("utf-8")
      log_structured(
          "INFO",
          "Webhook transmitido exitosamente a Google Apps Script",
          http_status=resp.status,
          response_snippet=resp_body[:100],
      )
      return {"status": "success", "response": resp_body}
  except Exception as exc:
    log_structured(
        "ERROR",
        f"Fallo al transmitir webhook: {str(exc)}",
        error_type=type(exc).__name__,
    )
    return {"status": "error", "error": str(exc)}


def process_gcs_file(
    event: Any, context: Optional[Any] = None
) -> Dict[str, Any]:
  log_structured("INFO", "Procesando evento de Cloud Storage")

  event_data = event.data if hasattr(event, "data") else event
  if not isinstance(event_data, dict):
    err_msg = f"Tipo de evento no soportado: {type(event).__name__}"
    log_structured("ERROR", err_msg)
    return {"status": "error", "error": err_msg}

  try:
    metadata = extract_metadata(event_data)
    log_structured(
        "INFO",
        f"Archivo procesado: gs://{metadata['bucket']}/{metadata['name']}",
        metadata=metadata,
    )

    webhook_result = send_webhook(metadata)

    return {
        "status": "success",
        "message": "Metadatos registrados y webhook procesado",
        "metadata": metadata,
        "webhook": webhook_result,
    }
  except ValueError as ve:
    err_msg = str(ve)
    log_structured("WARNING", err_msg)
    return {"status": "validation_error", "error": err_msg}
  except Exception as exc:
    err_msg = str(exc)
    log_structured("ERROR", err_msg)
    return {"status": "internal_error", "error": err_msg}