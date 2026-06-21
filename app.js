/* ============================================================
   Gestor de Evidencias SPC · Lógica de la aplicación
   ============================================================ */

/* ============================================================
   CONFIGURACIÓN DE SECCIONES
   ============================================================ */
const SECCIONES = [
  { id:'fortalecimiento', slug:'FORTALECIMIENTO_CIUDADANA', titulo:'FORTALECIMIENTO NUEVAS EXPRESIONES CIUDADANAS' },
  { id:'gestion',         slug:'GESTION_PARTICIPATIVA',     titulo:'GESTIÓN PARTICIPATIVA EN EL DESARROLLO LOCAL' },
  { id:'movilizacion',    slug:'MOVILIZACION_SOCIAL',       titulo:'DINAMIZACIÓN Y MOVILIZACIÓN SOCIAL' }
];
const SUBCATS = [
  { id:'comunicacion', slug:'COMUNICACIONES', label:'Comunicación' },
  { id:'prensa',       slug:'PRENSA',         label:'Prensa'       },
  { id:'diseno',       slug:'DISENO',         label:'Diseño'       },
  { id:'audiovisual',  slug:'AUDIOVISUAL',    label:'Audiovisual'  }
];

/* Estado en memoria */
const estado = {};
SECCIONES.forEach(s => {
  estado[s.id] = {};
  SUBCATS.forEach(sc => estado[s.id][sc.id] = { texto:'', archivos:[] });
});

/* ============================================================
   NORMALIZACIÓN DE NOMBRES (≤ 20 caracteres)
   Patrón: [Vd_]DDMMAA_DescripCorta
   ============================================================ */
const SIGLAS = ['PPclic','SLPC','CDPC','PP','TRI','SPC','QR','NC','BoleC','BolC','BolTRI',
  'InfoC','InfoTRI','InfogTRI','KeyPP','EcardSLPC','ActuMicro','ActMujLider','BpSesCPDC',
  'BpSesExtr','BolePrens','TxtMitVer','TxtEsceInst','WhApCDPC','MitVerSLPC','EscInsPart',
  'AcompFunise','NcBlackTalent','NcFunice','VidPPclic','GuionVid','AficheQR','CamisasPP',
  'PiezaTRI','PiezasPPClic','CronTRI','InvitComuna','ProyecC','EfectSente','SesionDesc'];

const EXT_VIDEO = ['mp4','mov','avi','mkv','webm'];

function quitarTildes(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }

function fechaDDMMAA(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const aa = String(d.getFullYear()).slice(-2);
  return dd+mm+aa;
}

function aCamelCaseConSiglas(texto){
  let limpio = quitarTildes(texto).replace(/[^a-zA-Z0-9]+/g,' ').trim();
  if(!limpio) return 'Archivo';
  const palabras = limpio.split(/\s+/);
  return palabras.map(p => {
    // Verifica si la palabra coincide con alguna sigla (sin mayúsculas/minúsculas)
    const sigla = SIGLAS.find(s => s.toLowerCase() === p.toLowerCase());
    if(sigla) return sigla;
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join('');
}

function normalizarNombre(nombreOriginal, fecha, esVideo, usados){
  const sinExt = nombreOriginal.replace(/\.[^.]+$/,'');
  const ddmmaa = fechaDDMMAA(fecha);
  const prefijo = esVideo ? 'Vd_' : '';
  let descrip = aCamelCaseConSiglas(sinExt);

  // Sufijo numérico si hay colisión
  let baseSinSufijo = `${prefijo}${ddmmaa}_${descrip}`;
  let sufijo = '';
  let intento = baseSinSufijo;
  let n = 1;
  while(usados.has(intento)){
    n++;
    sufijo = String(n);
    intento = `${prefijo}${ddmmaa}_${descrip}${sufijo}`;
  }

  // Recortar si > 20 caracteres totales
  let nombre = intento;
  while(nombre.length > 20 && descrip.length > 1){
    descrip = descrip.slice(0, descrip.length-1);
    nombre = `${prefijo}${ddmmaa}_${descrip}${sufijo}`;
  }
  return nombre;
}

/* ============================================================
   RENDER DE LA UI POR SECCIÓN
   ============================================================ */
const cont = document.getElementById('seccionesContainer');
SECCIONES.forEach(sec => {
  const det = document.createElement('details');
  det.open = true;
  det.className = 'seccion';
  det.innerHTML = `
    <summary>
      <span class="seccion__titulo"><span class="seccion__dot">●</span><span>${sec.titulo}</span></span>
      <span class="seccion__meta">
        <span class="seccion__count" id="count_${sec.id}" data-empty="true">0</span>
        <span class="seccion__chevron">▼</span>
      </span>
    </summary>
    <div class="seccion__body" id="cont_${sec.id}">
      ${SUBCATS.map(sc => `
        <div class="subcat">
          <h3>${sc.label}</h3>
          <label class="etiqueta">Desarrollo de las acciones (una viñeta por línea)</label>
          <textarea data-sec="${sec.id}" data-sub="${sc.id}" data-campo="texto" rows="3"
            placeholder="Cada línea será una viñeta en el Word"></textarea>

          <label class="etiqueta">Evidencias</label>
          <div class="dropzone" data-sec="${sec.id}" data-sub="${sc.id}">
            <input type="file" multiple data-sec="${sec.id}" data-sub="${sc.id}" data-campo="archivos">
            <span class="dropzone__hint">📎 <b>Arrastra aquí</b> tus archivos o haz clic para seleccionarlos</span>
          </div>

          <table class="tabla-evid oculto" id="tabla_${sec.id}_${sc.id}">
            <thead>
              <tr>
                <th>Original</th>
                <th>Fecha</th>
                <th>Nombre normalizado (≤20)</th>
                <th class="centro">Largo</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbody_${sec.id}_${sc.id}"></tbody>
          </table>
        </div>`).join('')}
    </div>`;
  cont.appendChild(det);
});

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.querySelectorAll('textarea[data-campo="texto"]').forEach(t => {
  t.addEventListener('input', e => {
    estado[e.target.dataset.sec][e.target.dataset.sub].texto = e.target.value;
  });
});

function agregarArchivos(sec, sub, fileList){
  const usados = new Set(estado[sec][sub].archivos.map(a => a.nombreNormalizado));
  for(const file of fileList){
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const esVideo = EXT_VIDEO.includes(ext);
    const fecha = new Date();
    const nomNorm = normalizarNombre(file.name, fecha, esVideo, usados);
    usados.add(nomNorm);
    estado[sec][sub].archivos.push({
      nombreOriginal: file.name,
      nombreNormalizado: nomNorm,
      extension: ext,
      fecha: fecha,
      esVideo,
      file
    });
  }
  refrescarTabla(sec, sub);
}

document.querySelectorAll('input[type="file"]').forEach(inp => {
  inp.addEventListener('change', e => {
    agregarArchivos(e.target.dataset.sec, e.target.dataset.sub, e.target.files);
    e.target.value = '';
  });
});

/* Arrastrar y soltar archivos */
document.querySelectorAll('.dropzone').forEach(dz => {
  ['dragenter','dragover'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave','dragend','drop'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', e => {
    if(e.dataTransfer?.files?.length){
      agregarArchivos(dz.dataset.sec, dz.dataset.sub, e.dataTransfer.files);
    }
  });
});

function refrescarTabla(sec, sub){
  const tbody = document.getElementById(`tbody_${sec}_${sub}`);
  const tabla = document.getElementById(`tabla_${sec}_${sub}`);
  const arr = estado[sec][sub].archivos;
  tabla.classList.toggle('oculto', arr.length===0);
  tbody.innerHTML = arr.map((a,i) => {
    const len = a.nombreNormalizado.length;
    const claseBadge = len > 20 ? 'badge-rojo' : 'badge-ok';
    const fechaStr = a.fecha.toISOString().slice(0,10);
    return `<tr class="file-row">
      <td>${a.nombreOriginal}</td>
      <td><input type="date" value="${fechaStr}" onchange="cambiarFecha('${sec}','${sub}',${i},this.value)"></td>
      <td><input value="${a.nombreNormalizado}" onchange="cambiarNombre('${sec}','${sub}',${i},this.value)"></td>
      <td class="centro"><span class="badge ${claseBadge}">${len}</span></td>
      <td class="centro"><button class="btn-eliminar" onclick="eliminarArchivo('${sec}','${sub}',${i})">Eliminar</button></td>
    </tr>`;
  }).join('');
  actualizarMetricas();
}

/* ============================================================
   MÉTRICAS Y CONTADORES (barra superior + chips de sección)
   ============================================================ */
function actualizarMetricas(){
  let totalArchivos = 0, seccionesConEvid = 0, alertas = 0;
  SECCIONES.forEach(s => {
    let porSeccion = 0;
    SUBCATS.forEach(sc => {
      const arr = estado[s.id][sc.id].archivos;
      porSeccion += arr.length;
      arr.forEach(a => { if(a.nombreNormalizado.length > 20) alertas++; });
    });
    totalArchivos += porSeccion;
    if(porSeccion > 0) seccionesConEvid++;
    const chip = document.getElementById(`count_${s.id}`);
    if(chip){ chip.textContent = porSeccion; chip.dataset.empty = porSeccion === 0; }
  });
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('statArchivos', totalArchivos);
  set('statSecciones', `${seccionesConEvid}/${SECCIONES.length}`);
  set('statAlertas', alertas);
}

function cambiarFecha(sec,sub,i,val){
  const a = estado[sec][sub].archivos[i];
  a.fecha = new Date(val + 'T00:00:00');
  // Recalcular nombre conservando la edición manual si difiere mucho
  const usados = new Set(estado[sec][sub].archivos.filter((_,j)=>j!==i).map(x=>x.nombreNormalizado));
  a.nombreNormalizado = normalizarNombre(a.nombreOriginal, a.fecha, a.esVideo, usados);
  refrescarTabla(sec,sub);
}
function cambiarNombre(sec,sub,i,val){
  estado[sec][sub].archivos[i].nombreNormalizado = val.slice(0,20);
  refrescarTabla(sec,sub);
}
function eliminarArchivo(sec,sub,i){
  estado[sec][sub].archivos.splice(i,1);
  refrescarTabla(sec,sub);
}

/* ============================================================
   GUARDAR BORRADOR EN LOCALSTORAGE (sin los Files)
   ============================================================ */
document.getElementById('btnGuardar').onclick = () => {
  const snapshot = { encabezado:leerEncabezado(), textos:{} };
  SECCIONES.forEach(s => {
    snapshot.textos[s.id] = {};
    SUBCATS.forEach(sc => snapshot.textos[s.id][sc.id] = estado[s.id][sc.id].texto);
  });
  localStorage.setItem('borradorSPC', JSON.stringify(snapshot));
  toast('Borrador guardado en el navegador ✓');
};
function cargarBorrador(){
  const raw = localStorage.getItem('borradorSPC');
  if(!raw) return;
  try{
    const d = JSON.parse(raw);
    Object.entries(d.encabezado||{}).forEach(([k,v])=>{ const el=document.getElementById(k); if(el) el.value=v; });
    SECCIONES.forEach(s => SUBCATS.forEach(sc => {
      const t = d.textos?.[s.id]?.[sc.id] || '';
      estado[s.id][sc.id].texto = t;
      const ta = document.querySelector(`textarea[data-sec="${s.id}"][data-sub="${sc.id}"]`);
      if(ta) ta.value = t;
    }));
  }catch(e){ console.error(e); }
}
cargarBorrador();

function leerEncabezado(){
  return ['proyecto','entregable','indicador','periodo','presentacion','periodoCarpeta',
          'introduccion','proyNombre','proyCargo','revNombre','revCargo']
    .reduce((acc,id)=>{ acc[id]=document.getElementById(id).value; return acc; },{});
}

/* ============================================================
   ENVÍO A ONEDRIVE VÍA POWER AUTOMATE (un archivo por request)
   ============================================================ */
const LIMITE_AVISO_MB = 100; // aviso para archivos grandes (riesgo de memoria/timeout)
let enviando = false;        // bloquea cierre y doble clic durante el envío

/* Convierte un File a base64 (sin el prefijo data:...;base64,) */
function archivoABase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* Recuerda la URL del flujo */
const flowInput = document.getElementById('flowUrl');
flowInput.value = localStorage.getItem('flowUrlSPC') || '';
flowInput.addEventListener('change', () => localStorage.setItem('flowUrlSPC', flowInput.value.trim()));

/* Aviso del navegador si intentan cerrar/recargar durante el envío */
window.addEventListener('beforeunload', (e) => {
  if(enviando){ e.preventDefault(); e.returnValue = ''; }
});

/* --- Overlay --- */
function abrirOverlayEnviando(){
  document.getElementById('overlayEnviando').classList.remove('oculto');
  document.getElementById('overlayReporte').classList.add('oculto');
  document.getElementById('overlayEnvio').classList.remove('oculto');
}
function progresoOverlay(pct, texto){
  document.getElementById('ovRelleno').style.width = pct + '%';
  document.getElementById('ovTexto').textContent = texto;
}
function cerrarOverlay(){ document.getElementById('overlayEnvio').classList.add('oculto'); }
document.getElementById('btnCerrarReporte').onclick = cerrarOverlay;

/* Construye la lista plana de evidencias a enviar */
function recolectarEvidencias(carpetaRaiz){
  const lista = [];
  SECCIONES.forEach(s => SUBCATS.forEach(sc => {
    estado[s.id][sc.id].archivos.forEach(a => lista.push({
      ruta: `${s.slug}/${sc.slug}`,
      nombreArchivo: `${a.nombreNormalizado}.${a.extension}`,
      rutaCompleta: `${carpetaRaiz}/${s.slug}/${sc.slug}/${a.nombreNormalizado}.${a.extension}`,
      archivo: a.file
    }));
  }));
  return lista;
}

/* Envía una evidencia individual al flujo */
async function enviarUna(url, it, carpetaRaiz, indice, total){
  const contenidoBase64 = await archivoABase64(it.archivo);
  const payload = {
    carpetaRaiz,                       // EvidenciasSPC_2026-06
    ruta: it.ruta,                     // SECCION/SUBCATEGORIA
    nombreArchivo: it.nombreArchivo,   // nombre.ext (recortado a ≤20 + extensión)
    rutaCompleta: it.rutaCompleta,
    contenidoBase64,
    indice, total
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if(!resp.ok) throw new Error('HTTP ' + resp.status);
}

/* Recorre y envía una colección, devolviendo resultados por archivo */
async function enviarColeccion(url, items, carpetaRaiz){
  const resultados = [];
  for(let i = 0; i < items.length; i++){
    const it = items[i];
    progresoOverlay(Math.round(i / items.length * 100),
      `Enviando ${i + 1} de ${items.length}: ${it.nombreArchivo}`);
    try {
      await enviarUna(url, it, carpetaRaiz, i + 1, items.length);
      resultados.push({ ...it, ok: true });
    } catch(err){
      console.error('Error con', it.nombreArchivo, err);
      resultados.push({ ...it, ok: false, error: err.message });
    }
  }
  progresoOverlay(100, 'Finalizando…');
  return resultados;
}

/* Pinta el reporte final dentro del overlay */
function mostrarReporte(resultados, url, carpetaRaiz){
  const ok = resultados.filter(r => r.ok);
  const fail = resultados.filter(r => !r.ok);
  document.getElementById('reporteTitulo').textContent =
    fail.length ? 'Envío completado con errores' : '✅ Envío completado';
  document.getElementById('reporteResumen').innerHTML =
    `<span class="reporte__chip reporte__chip--ok">✓ ${ok.length} enviadas</span>` +
    (fail.length ? `<span class="reporte__chip reporte__chip--fail">✗ ${fail.length} fallidas</span>` : '');
  document.getElementById('reporteLista').innerHTML = resultados.map(r => `
    <div class="reporte__item ${r.ok ? '' : 'reporte__item--fail'}">
      <span class="estado">${r.ok ? '✅' : '❌'}</span>
      <span class="nombre" title="${r.rutaCompleta}">${r.nombreArchivo}</span>
      <span class="ruta">${r.ok ? r.ruta : (r.error || 'error')}</span>
    </div>`).join('');

  const btnRe = document.getElementById('btnReintentar');
  btnRe.classList.toggle('oculto', fail.length === 0);
  btnRe.onclick = async () => {
    enviando = true;
    abrirOverlayEnviando();
    const resReintento = await enviarColeccion(url, fail, carpetaRaiz);
    enviando = false;
    // Combina: los que ya estaban ok + el resultado del reintento
    mostrarReporte([...ok, ...resReintento], url, carpetaRaiz);
  };

  document.getElementById('overlayEnviando').classList.add('oculto');
  document.getElementById('overlayReporte').classList.remove('oculto');
  toast(fail.length ? `Enviadas ${ok.length}/${resultados.length}` : `✅ ${ok.length} evidencias enviadas`);
}

document.getElementById('btnOneDrive').onclick = async () => {
  if(enviando) return;
  const enc = leerEncabezado();
  const url = flowInput.value.trim();
  if(!url){ toast('Pega la URL del flujo de Power Automate'); return; }
  if(!/^https:\/\//i.test(url)){ toast('La URL del flujo debe empezar por https://'); return; }
  if(!enc.periodoCarpeta){ toast('Indica el mes/año de la carpeta (ej. 2026-06)'); return; }

  const carpetaRaiz = `EvidenciasSPC_${enc.periodoCarpeta}`;
  const lista = recolectarEvidencias(carpetaRaiz);
  if(lista.length === 0){ toast('No hay evidencias cargadas'); return; }

  const grandes = lista.filter(x => x.archivo.size > LIMITE_AVISO_MB * 1024 * 1024);
  if(grandes.length){
    const ok = confirm(`${grandes.length} archivo(s) superan ${LIMITE_AVISO_MB} MB. ` +
      `Power Automate puede rechazarlos o tardar mucho. ¿Continuar de todos modos?`);
    if(!ok) return;
  }

  enviando = true;
  document.getElementById('btnOneDrive').disabled = true;
  abrirOverlayEnviando();
  const resultados = await enviarColeccion(url, lista, carpetaRaiz);
  enviando = false;
  document.getElementById('btnOneDrive').disabled = false;
  mostrarReporte(resultados, url, carpetaRaiz);
};

/* ============================================================
   ENVÍO A ONEDRIVE VÍA POWER AUTOMATE (un archivo por request)
   ============================================================ */
const LIMITE_AVISO_MB = 100; // aviso para archivos grandes (riesgo de memoria/timeout)

/* Convierte un File a base64 (sin el prefijo data:...;base64,) */
function archivoABase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* Recuerda la URL del flujo */
const flowInput = document.getElementById('flowUrl');
flowInput.value = localStorage.getItem('flowUrlSPC') || '';
flowInput.addEventListener('change', () => localStorage.setItem('flowUrlSPC', flowInput.value.trim()));

function mostrarProgreso(pct, texto){
  document.getElementById('barraProgreso').classList.remove('oculto');
  document.getElementById('progresoRelleno').style.width = pct + '%';
  document.getElementById('progresoTexto').textContent = texto;
}

document.getElementById('btnOneDrive').onclick = async () => {
  const enc = leerEncabezado();
  const url = flowInput.value.trim();
  if(!url){ toast('Pega la URL del flujo de Power Automate'); return; }
  if(!/^https:\/\//i.test(url)){ toast('La URL del flujo debe empezar por https://'); return; }
  if(!enc.periodoCarpeta){ toast('Indica el mes/año de la carpeta (ej. 2026-06)'); return; }

  // Aplanar todos los archivos
  const lista = [];
  SECCIONES.forEach(s => SUBCATS.forEach(sc => {
    estado[s.id][sc.id].archivos.forEach(a => lista.push({
      ruta: `${s.slug}/${sc.slug}`,
      nombreArchivo: `${a.nombreNormalizado}.${a.extension}`,
      archivo: a.file
    }));
  }));
  if(lista.length === 0){ toast('No hay evidencias cargadas'); return; }

  const grandes = lista.filter(x => x.archivo.size > LIMITE_AVISO_MB * 1024 * 1024);
  if(grandes.length){
    const ok = confirm(`${grandes.length} archivo(s) superan ${LIMITE_AVISO_MB} MB. ` +
      `Power Automate puede rechazarlos o tardar mucho. ¿Continuar de todos modos?`);
    if(!ok) return;
  }

  const btn = document.getElementById('btnOneDrive');
  btn.disabled = true;
  const carpetaRaiz = `EvidenciasSPC_${enc.periodoCarpeta}`;
  let enviados = 0;
  const fallidos = [];

  for(let i = 0; i < lista.length; i++){
    const it = lista[i];
    mostrarProgreso(Math.round(i / lista.length * 100),
      `Enviando ${i + 1} de ${lista.length}: ${it.nombreArchivo}`);
    try {
      const contenidoBase64 = await archivoABase64(it.archivo);
      const payload = {
        carpetaRaiz,                       // EvidenciasSPC_2026-06
        ruta: it.ruta,                     // SECCION/SUBCATEGORIA
        nombreArchivo: it.nombreArchivo,   // nombre.ext
        rutaCompleta: `${carpetaRaiz}/${it.ruta}/${it.nombreArchivo}`,
        contenidoBase64,
        indice: i + 1,
        total: lista.length
      };
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if(!resp.ok) throw new Error('HTTP ' + resp.status);
      enviados++;
    } catch(err){
      console.error('Error con', it.nombreArchivo, err);
      fallidos.push(it.nombreArchivo);
    }
  }

  mostrarProgreso(100, fallidos.length
    ? `Completado con errores: ${enviados} ok, ${fallidos.length} fallidos`
    : `✅ ${enviados} evidencias enviadas a OneDrive`);
  btn.disabled = false;
  toast(fallidos.length
    ? `Enviados ${enviados}/${lista.length}. Fallaron: ${fallidos.join(', ')}`
    : `✅ ${enviados} evidencias enviadas a OneDrive`);
};

/* ============================================================
   GENERAR ENTREGABLE WORD CON FORMATO INSTITUCIONAL
   ============================================================ */
document.getElementById('btnGenerar').onclick = async () => {
  const enc = leerEncabezado();
  if(!enc.periodo || !enc.presentacion){ toast('Completa Periodo y Presentación'); return; }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, BorderStyle, ShadingType, AlignmentType, HeightRule, convertInchesToTwip } = docx;

  const FUENTE = 'Aptos';
  const COLOR_GRIS = 'D9D9D9';
  const bordeNeg = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
  const todosBordes = { top:bordeNeg, bottom:bordeNeg, left:bordeNeg, right:bordeNeg };
  const sinBordes = {
    top:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},
    bottom:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},
    left:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},
    right:{style:BorderStyle.NONE,size:0,color:'FFFFFF'}
  };

  function p(text, {bold=false, size=22, align=AlignmentType.JUSTIFIED, bullet=false, indent=null}={}){
    const opts = { children:[new TextRun({ text, bold, font:FUENTE, size })], alignment:align };
    if(bullet) opts.bullet = { level:0 };
    if(indent) opts.indent = indent;
    return new Paragraph(opts);
  }
  function celdaHeader(text){
    return new TableCell({
      shading:{ type:ShadingType.CLEAR, fill:COLOR_GRIS, color:'auto' },
      width:{ size:50, type:WidthType.PERCENTAGE },
      borders: todosBordes,
      children:[ new Paragraph({ alignment:AlignmentType.CENTER,
        children:[ new TextRun({ text, bold:true, font:FUENTE, size:22 }) ] }) ]
    });
  }
  function celda(parrafos, ancho=50){
    return new TableCell({
      width:{ size:ancho, type:WidthType.PERCENTAGE },
      borders: todosBordes,
      children: parrafos
    });
  }

  // ----- Encabezado -----
  const encTabla = new Table({
    width:{ size:100, type:WidthType.PERCENTAGE },
    rows:[
      ['Proyecto', enc.proyecto],
      ['Entregable', enc.entregable],
      ['Indicador', enc.indicador],
      ['Periodo', enc.periodo],
      ['Presentación', enc.presentacion]
    ].map(([k,v]) => new TableRow({ children:[
      new TableCell({ width:{size:20,type:WidthType.PERCENTAGE}, borders:todosBordes,
        children:[ new Paragraph({ children:[new TextRun({text:k,bold:true,font:FUENTE,size:22})] }) ] }),
      new TableCell({ width:{size:80,type:WidthType.PERCENTAGE}, borders:todosBordes,
        children:[ new Paragraph({ alignment:AlignmentType.JUSTIFIED,
          children:[new TextRun({text:v,font:FUENTE,size:22})] }) ] })
    ]}))
  });

  // ----- Función: tabla de acciones por sección -----
  function tablaSeccion(secId){
    const izq = [];
    const der = [];
    SUBCATS.forEach(sc => {
      const data = estado[secId][sc.id];
      const tieneTexto = (data.texto||'').trim().length>0;
      const tieneArch = data.archivos.length>0;
      if(!tieneTexto && !tieneArch) return;
      // Columna izquierda
      izq.push(p(sc.label+':', {bold:true}));
      if(tieneTexto){
        data.texto.split('\n').filter(x=>x.trim()).forEach(linea => {
          izq.push(p(linea.trim(), {bullet:true}));
        });
      }
      izq.push(p('', {}));
      // Columna derecha
      der.push(p(sc.label+':', {bold:true}));
      data.archivos.forEach(a => der.push(p(a.nombreNormalizado, {})));
      der.push(p('', {}));
    });
    if(izq.length===0) izq.push(p('Sin acciones registradas', {}));
    if(der.length===0) der.push(p('Sin evidencias', {}));
    return new Table({
      width:{ size:100, type:WidthType.PERCENTAGE },
      rows:[
        new TableRow({ children:[celdaHeader('DESARROLLO DE LAS ACCIONES'), celdaHeader('LISTADO DE ANEXOS')] }),
        new TableRow({ children:[celda(izq), celda(der)] })
      ]
    });
  }

  // ----- Firmas -----
  const firmas = new Table({
    width:{ size:100, type:WidthType.PERCENTAGE },
    rows:[ new TableRow({ children:[
      new TableCell({ width:{size:50,type:WidthType.PERCENTAGE}, borders:sinBordes, children:[
        new Paragraph({ children:[new TextRun({text:'Proyectó:',bold:true,font:FUENTE,size:22})] }),
        new Paragraph({}),new Paragraph({}),new Paragraph({}),
        new Paragraph({ children:[new TextRun({text:(enc.proyNombre||'').toUpperCase(),bold:true,font:FUENTE,size:22})] }),
        new Paragraph({ children:[new TextRun({text:enc.proyCargo||'',bold:true,font:FUENTE,size:22})] })
      ]}),
      new TableCell({ width:{size:50,type:WidthType.PERCENTAGE}, borders:sinBordes, children:[
        new Paragraph({ children:[new TextRun({text:'Revisó:',bold:true,font:FUENTE,size:22})] }),
        new Paragraph({}),new Paragraph({}),new Paragraph({}),
        new Paragraph({ children:[new TextRun({text:(enc.revNombre||'').toUpperCase(),bold:true,font:FUENTE,size:22})] }),
        new Paragraph({ children:[new TextRun({text:enc.revCargo||'',bold:true,font:FUENTE,size:22})] })
      ]})
    ]})]
  });

  // ----- Documento final -----
  const intro = (enc.introduccion||'').replace('[PERIODO]', enc.periodo);
  const doc = new Document({
    creator:'Gestor Evidencias SPC',
    styles:{ default:{ document:{ run:{ font:FUENTE, size:22 } } } },
    sections:[{
      children:[
        encTabla,
        p('', {}),
        p('1. INTRODUCCIÓN:', {bold:true, size:22}),
        p('', {}),
        p(intro, {}),
        p('', {}),
        p('A continuación, se desglosan las actividades, avances y resultados obtenidos.', {}),
        p('', {}),
        p('2. ACCIONES DESARROLLADAS EN EL PERIODO REPORTADO:', {bold:true}),
        p('', {}),
        p('● '+SECCIONES[0].titulo+':', {bold:true}),
        tablaSeccion('fortalecimiento'),
        p('', {}),
        p('● '+SECCIONES[1].titulo+':', {bold:true}),
        tablaSeccion('gestion'),
        p('', {}),
        p('● '+SECCIONES[2].titulo+':', {bold:true}),
        tablaSeccion('movilizacion'),
        p('', {}),
        p('Conclusiones:', {bold:true}),
        p('', {}),p('', {}),p('', {}),
        firmas
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const fecha = new Date().toISOString().slice(0,10).replace(/-/g,'');
  saveAs(blob, `Informe_Evidencias_${fecha}.docx`);
  toast('✅ Informe Word generado');
};

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('oculto');
  // Forzar reflujo para reiniciar la animación
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(window._tt);
  window._tt = setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=>t.classList.add('oculto'), 350);
  }, 3500);
}

/* ============================================================
   TEMA CLARO / OSCURO
   ============================================================ */
(function temaInit(){
  const btn = document.getElementById('btnTema');
  const guardado = localStorage.getItem('temaSPC');
  const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const tema = guardado || (prefiereOscuro ? 'dark' : 'light');
  aplicarTema(tema);
  btn.onclick = () => {
    const nuevo = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    aplicarTema(nuevo);
    localStorage.setItem('temaSPC', nuevo);
  };
  function aplicarTema(t){
    document.body.dataset.theme = t;
    btn.textContent = t === 'dark' ? '☀️' : '🌙';
    btn.title = t === 'dark' ? 'Tema claro' : 'Tema oscuro';
  }
})();

/* ============================================================
   BOTÓN VOLVER ARRIBA
   ============================================================ */
(function scrollTopInit(){
  const btn = document.getElementById('scrollTop');
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 400);
  }, { passive:true });
  btn.onclick = () => window.scrollTo({ top:0, behavior:'smooth' });
})();

/* ============================================================
   ANIMACIÓN DE ENTRADA AL HACER SCROLL
   ============================================================ */
(function revealInit(){
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if(en.isIntersecting){ en.target.classList.add('visible'); obs.unobserve(en.target); }
    });
  }, { threshold:0.08 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

/* Cálculo inicial de métricas (por si hay borrador cargado) */
actualizarMetricas();
