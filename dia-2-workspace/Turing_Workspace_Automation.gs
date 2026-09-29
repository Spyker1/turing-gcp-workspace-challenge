/**
 * Turing IA - Periodo de Prueba GCP & Workspace
 * Reto Día 2: Automatización Avanzada con Google Apps Script
 * Integración: Google Sheets + Google Calendar + Gmail
 * 
 * Candidato: Julián Alejandro Rodríguez López
 */

const CONFIG = {
  SHEET_SOLICITUDES: 'Solicitudes',
  SHEET_LOGS: 'Logs_Sistema',
  COL_ID: 1,
  COL_SOLICITANTE: 3,
  COL_EMAIL: 4,
  COL_SERVICIO: 5,
  COL_DESCRIPCION: 6,
  COL_FECHA: 7,
  COL_HORA: 8,
  COL_DURACION: 9,
  COL_ESTADO: 10,
  COL_CALENDAR_ID: 11,
  COL_NOTIFICACION: 12,
  COL_ACTUALIZACION: 13
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Turing Automation')
    .addItem('Procesar Fila Actual (Aprobar y Agendar)', 'menuProcesarFila')
    .addItem('Enviar Resumen Diario de Sesiones', 'enviarResumenDiario')
    .addItem('Configurar Activadores Automáticos', 'instalarActivadores')
    .addToUi();
}

function onEditTrigger(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_SOLICITUDES) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();

  if (row > 1 && col === CONFIG.COL_ESTADO) {
    const nuevoEstado = e.value || sheet.getRange(row, col).getValue();
    if (nuevoEstado === 'Aprobado') {
      procesarSolicitudFila(sheet, row);
    }
  }
}

function procesarSolicitudFila(sheet, row) {
  try {
    const data = sheet.getRange(row, 1, 1, 13).getValues()[0];
    const idSolicitud = data[CONFIG.COL_ID - 1];
    const solicitante = data[CONFIG.COL_SOLICITANTE - 1];
    const email = data[CONFIG.COL_EMAIL - 1];
    const servicio = data[CONFIG.COL_SERVICIO - 1];
    const descripcion = data[CONFIG.COL_DESCRIPCION - 1];
    const fechaSesion = data[CONFIG.COL_FECHA - 1];
    const horaInicio = data[CONFIG.COL_HORA - 1];
    const duracion = parseInt(data[CONFIG.COL_DURACION - 1]) || 60;
    const existingCalendarId = data[CONFIG.COL_CALENDAR_ID - 1];

    if (existingCalendarId && existingCalendarId !== '-' && existingCalendarId !== '') {
      registrarLog('WARNING', 'Sincronización Omitida', `La solicitud ${idSolicitud} ya tiene evento: ${existingCalendarId}`);
      return;
    }

    // --- PARSEO ROBUSTO DE FECHA Y HORA ---
    let year = 2026, month = 9, day = 1; // 9 = Octubre (0-indexed)
    if (fechaSesion instanceof Date && !isNaN(fechaSesion.getTime())) {
      year = fechaSesion.getFullYear();
      month = fechaSesion.getMonth();
      day = fechaSesion.getDate();
    } else {
      const dParts = String(fechaSesion).split('-');
      if (dParts.length >= 3) {
        year = parseInt(dParts[0], 10);
        month = parseInt(dParts, 10) - 1;
        day = parseInt(dParts, 10);
      }
    }

    let hours = 11, minutes = 30;
    if (horaInicio instanceof Date && !isNaN(horaInicio.getTime())) {
      hours = horaInicio.getHours();
      minutes = horaInicio.getMinutes();
    } else {
      const hParts = String(horaInicio).split(':');
      if (hParts.length >= 2) {
        hours = parseInt(hParts[0], 10);
        minutes = parseInt(hParts, 10);
      }
    }

    const startTime = new Date(year, month, day, hours, minutes, 0);
    const endTime = new Date(startTime.getTime() + duracion * 60000);

    // 2. Crear Evento en Google Calendar
    const tituloEvento = `[Turing IA] Sesión Técnica: ${servicio} - ${solicitante}`;
    const descEvento = `ID Solicitud: ${idSolicitud}\nServicio: ${servicio}\nDetalles: ${descripcion}\n\nGenerado automáticamente por Turing Automation Workspace.`;
    
    const calendar = CalendarApp.getDefaultCalendar();
    const evento = calendar.createEvent(tituloEvento, startTime, endTime, {
      description: descEvento,
      guests: email,
      sendInvites: true
    });
    
    const calendarId = evento.getId();

    // 3. Enviar Correo con Formato HTML Corporativo
    const asuntoCorreo = `Confirmación de Sesión Técnica - ${servicio} | Turing IA`;
    const cuerpoHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 20px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0; color: #38bdf8;">TURING INTELIGENCIA ARTIFICIAL</h2>
          <p style="margin: 5px 0 0; font-size: 13px; color: #94a3b8;">Sistema de Automatización Google Workspace</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.5;">
          <p>Estimado/a <b>${solicitante}</b>,</p>
          <p>Le confirmamos que su solicitud ha sido <b>aprobada y agendada con éxito</b> en nuestro calendario corporativo.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 6px;">
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><b>ID de Solicitud:</b></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${idSolicitud}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><b>Servicio:</b></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${servicio}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><b>Fecha y Hora:</b></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${startTime.toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><b>Duración:</b></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${duracion} minutos</td></tr>
            <tr><td style="padding: 10px;"><b>ID Evento Calendar:</b></td><td style="padding: 10px; font-family: monospace; font-size: 11px;">${calendarId}</td></tr>
          </table>

          <p style="font-size: 13px; color: #64748b;">La invitación ha sido vinculada a su Google Calendar.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
          Turing Inteligencia Artificial S.A.S. • Área de GCP & Google Workspace
        </div>
      </div>
    `;

    GmailApp.sendEmail(email, asuntoCorreo, `Hola ${solicitante}, su sesión ha sido agendada para ${startTime.toLocaleString()}.`, {
      htmlBody: cuerpoHtml,
      name: 'Turing Automation Bot'
    });

    // 4. Actualizar Hoja de Cálculo
    const nowTimestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.getRange(row, CONFIG.COL_CALENDAR_ID).setValue(calendarId);
    sheet.getRange(row, CONFIG.COL_NOTIFICACION).setValue('Enviada');
    sheet.getRange(row, CONFIG.COL_ACTUALIZACION).setValue(nowTimestamp);

    registrarLog('INFO', 'Evento Creado y Notificado', `Solicitud ${idSolicitud} agendada para ${startTime.toISOString()} (${calendarId})`);

  } catch (error) {
    registrarLog('ERROR', 'Fallo en Procesamiento', `Fila ${row}: ${error.message}`);
    sheet.getRange(row, CONFIG.COL_NOTIFICACION).setValue('Error');
  }
}

function menuProcesarFila() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SOLICITUDES);
  const row = sheet.getActiveCell().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Selecciona una fila de datos (a partir de la fila 2).');
    return;
  }
  sheet.getRange(row, CONFIG.COL_ESTADO).setValue('Aprobado');
  procesarSolicitudFila(sheet, row);
}

function enviarResumenDiario() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SOLICITUDES);
  const data = sheet.getDataRange().getValues();
  let aprobadas = 0, pendientes = 0, completadas = 0;
  for (let i = 1; i < data.length; i++) {
    const estado = data[i][CONFIG.COL_ESTADO - 1];
    if (estado === 'Aprobado') aprobadas++;
    else if (estado === 'Pendiente') pendientes++;
    else if (estado === 'Completado') completadas++;
  }
  const userEmail = Session.getActiveUser().getEmail();
  const asunto = `[Turing IA] Resumen Diario de Solicitudes y Automatizaciones Workspace`;
  const mensaje = `Resumen operativo al día de hoy:\n\n- Solicitudes Pendientes: ${pendientes}\n- Sesiones Aprobadas/Agendadas: ${aprobadas}\n- Completadas: ${completadas}\n\nAcceso a la hoja: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`;
  GmailApp.sendEmail(userEmail, asunto, mensaje);
  registrarLog('INFO', 'Resumen Diario Enviado', `Reporte enviado a ${userEmail}`);
}

function registrarLog(nivel, accion, detalles) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(CONFIG.SHEET_LOGS);
  if (!logSheet) return;
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const usuario = Session.getActiveUser().getEmail() || 'Sistema Automation';
  logSheet.appendRow([timestamp, nivel, accion, detalles, usuario]);
}

function instalarActivadores() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('onEditTrigger')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  ScriptApp.newTrigger('enviarResumenDiario')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
}

function ejecutarPruebaDirecta() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Solicitudes');
  sheet.getRange(3, 10).setValue('Aprobado');
  procesarSolicitudFila(sheet, 3);
  instalarActivadores();
}