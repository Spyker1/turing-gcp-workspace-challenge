/**
 * Webhook HTTPS para recibir metadatos desde Google Cloud Functions (Día 3).
 */
function doPost(e) {
  try {
    // 1. Validar autenticación con Token Secreto
    const SECRET_TOKEN = "TURING_WORKSPACE_2026_SECURE_TOKEN";
    let tokenRecibido = "";
    let metadata = {};

    if (e.postData && e.postData.contents) {
      const data = JSON.parse(e.postData.contents);
      tokenRecibido = data.token;
      metadata = data.metadata || data;
    }

    if (tokenRecibido !== SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "unauthorized",
        message: "Token inválido o ausente."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Extraer datos del archivo de GCP
    const bucket = metadata.bucket || "turing-gcp-challenge-storage-data";
    const name = metadata.name || "archivo_desconocido";
    const sizeKb = metadata.size_kb || 0;
    const contentType = metadata.content_type || "application/octet-stream";
    const md5Hash = metadata.md5_hash || "N/A";
    const timestampGcp = metadata.time_created || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    // 3. Registrar fila en la pestaña Ingesta_GCP
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetIngesta = ss.getSheetByName("Ingesta_GCP");
    if (!sheetIngesta) {
      sheetIngesta = ss.insertSheet("Ingesta_GCP");
    }

    const idIngesta = "GCP-" + new Date().getTime();
    sheetIngesta.appendRow([
      idIngesta, timestampGcp, bucket, name, sizeKb, contentType, md5Hash, "Notificado"
    ]);

    // 4. Enviar notificación por correo con GmailApp
    const userEmail = Session.getActiveUser().getEmail() || "alexrdz1221@gmail.com";
    const asunto = `[Turing IA Cloud] Nuevo Archivo Procesado en Storage: ${name}`;
    const cuerpo = `Se ha recibido y registrado un nuevo archivo desde Google Cloud Platform:\n\n` +
      `- Bucket: gs://${bucket}\n` +
      `- Archivo: ${name}\n` +
      `- Tamaño: ${sizeKb} KB\n` +
      `- Tipo MIME: ${contentType}\n` +
      `- Timestamp: ${timestampGcp}\n\n` +
      `Los metadatos han sido sincronizados en tu Google Sheet.`;
    
    GmailApp.sendEmail(userEmail, asunto, cuerpo);
    registrarLog("INFO", "Ingesta GCP Registrada", `Archivo ${name} sincronizado en Ingesta_GCP y notificado.`);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Metadatos registrados exitosamente en Google Sheets",
      id_ingesta: idIngesta
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    registrarLog("ERROR", "Fallo en Webhook doPost", err.message);
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}