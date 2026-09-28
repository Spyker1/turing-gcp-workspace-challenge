#!/usr/bin/env bash
# Turing IA - Script Automatizado de Despliegue (Día 1)
# Candidato: Julián Alejandro Rodríguez López
set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
BUCKET_NAME="${PROJECT_ID}-storage-data"
SA_NAME="sa-storage-processor"

echo "=== [1/4] Habilitando APIs Nucleares ==="
gcloud services enable \
    storage.googleapis.com \
    cloudfunctions.googleapis.com \
    cloudbuild.googleapis.com \
    logging.googleapis.com \
    eventarc.googleapis.com \
    run.googleapis.com

echo "=== [2/4] Creando Bucket con UBLA y Ciclo de Vida ==="
gcloud storage buckets create "gs://${BUCKET_NAME}" --location="${REGION}" --uniform-bucket-level-access
gcloud storage buckets update "gs://${BUCKET_NAME}" --lifecycle-file=lifecycle.json

echo "=== [3/4] Configurando Service Account con Mínimo Privilegio ==="
gcloud iam service-accounts create "${SA_NAME}" --display-name="Storage Event Processor"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/logging.logWriter"
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
    --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

echo "=== [4/4] Desplegando Cloud Function Gen 2 ==="
gcloud functions deploy gcs-metadata-extractor \
    --gen2 \
    --runtime=python311 \
    --region="${REGION}" \
    --source=. \
    --entry-point=process_gcs_file \
    --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
    --trigger-event-filters="bucket=${BUCKET_NAME}" \
    --service-account="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Despliegue completado con éxito."