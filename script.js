const SUPABASE_URL = 'https://jxjhjwsjmojldmavhdwi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bCkVo--88_1O5IZi__-2pw_jWZkYpPf';
let _supabase, temporizador;

function iniciarApp() {
    if (typeof supabase === 'undefined') return setTimeout(iniciarApp, 500);
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    mostrarFormularioRegistro();
}

// BUSCADOR (Mantenemos lo que ya te funciona)
async function buscarEnVivo(tipo) {
    clearTimeout(temporizador);
    const idInput = (tipo === 'placa') ? 'v_placa' : 'c_cedula';
    const inputElement = document.getElementById(idInput);
    const valor = inputElement.value.trim();
    if (valor.length < 4) return;

    temporizador = setTimeout(async () => {
        const tabla = (tipo === 'placa') ? 'vehiculos' : 'clientes';
        const columna = (tipo === 'placa') ? 'placa' : 'cedula_identidad';
        const { data } = await _supabase.from(tabla).select(tipo === 'placa' ? '*, clientes(*)' : '*').eq(columna, valor).maybeSingle();

        if (data) {
            inputElement.style.setProperty("background-color", "#d4edda", "important");
            if (tipo === 'placa') {
                document.getElementById('v_marca').value = data.marca || '';
                document.getElementById('v_modelo').value = data.modelo || '';
                if (data.clientes) rellenarCampos(data.clientes);
            } else {
                rellenarCampos(data);
            }
        }
    }, 500);
}

function rellenarCampos(c) {
    document.getElementById('c_nombre').value = c.nombre_apellido_rs || '';
    document.getElementById('c_direccion').value = c.direccion || '';
    document.getElementById('c_email').value = c.correo_electronico || '';
    document.getElementById('c_whatsapp').value = c.telefono_whatsapp || '';
}

// --- GUARDAR ORDEN (CORREGIDO PARA CODEPEN) ---
async function guardarOrden() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "⌛ Guardando...";

    try {
        // 1. Guardar/Actualizar Cliente
        const { data: cliente, error: errCli } = await _supabase.from('clientes').upsert({
            cedula_identidad: document.getElementById('c_cedula').value,
            nombre_apellido_rs: document.getElementById('c_nombre').value,
            telefono_whatsapp: document.getElementById('c_whatsapp').value,
            direccion: document.getElementById('c_direccion').value,
            correo_electronico: document.getElementById('c_email').value
        }, { onConflict: 'cedula_identidad' }).select().single();

        if (errCli) throw errCli;

        // 2. Guardar/Actualizar Vehículo
        const { data: vehiculo, error: errVeh } = await _supabase.from('vehiculos').upsert({
            placa: document.getElementById('v_placa').value.toUpperCase(),
            id_cliente: cliente.id_cliente,
            marca: document.getElementById('v_marca').value,
            modelo: document.getElementById('v_modelo').value
        }, { onConflict: 'placa' }).select().single();

        if (errVeh) throw errVeh;

        // 3. Crear la Orden de Servicio
        const { error: errOrd } = await _supabase.from('ordenes_servicio').insert([{
            id_vehiculo: vehiculo.id_vehiculo,
            falla_reportada: document.getElementById('falla').value || "Sin descripción"
        }]);

        if (errOrd) throw errOrd;

        alert("✅ ¡Orden guardada con éxito!");
        
        // En lugar de recargar, reiniciamos el formulario
        mostrarFormularioRegistro(); 

    } catch (error) {
        alert("❌ Error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "💾 GUARDAR ORDEN";
    }
}

function mostrarFormularioRegistro() {
    document.getElementById('pantalla-dinamica').innerHTML = `
        <div class="form-registro">
            <div class="section-blue">DATOS DEL CLIENTE</div>
            <div class="form-row">
                <div class="campo"><label>Cédula *</label><input type="text" id="c_cedula" oninput="buscarEnVivo('cedula')"></div>
                <div class="campo" style="flex:2"><label>Nombre / Razón Social</label><input type="text" id="c_nombre"></div>
            </div>
            <div class="form-row">
                <div class="campo"><label>WhatsApp</label><input type="text" id="c_whatsapp"></div>
                <div class="campo"><label>Email</label><input type="text" id="c_email"></div>
                <div class="campo"><label>Dirección</label><input type="text" id="c_direccion"></div>
            </div>
            <div class="section-blue">DATOS DEL VEHÍCULO</div>
            <div class="form-row">
                <div class="campo"><label>Placa *</label><input type="text" id="v_placa" oninput="buscarEnVivo('placa')"></div>
                <div class="campo"><label>Marca</label><input type="text" id="v_marca"></div>
                <div class="campo"><label>Modelo</label><input type="text" id="v_modelo"></div>
            </div>
            <div class="section-blue">REPORTE</div>
            <textarea id="falla" placeholder="Describa la falla aquí..." style="width:100%; height:80px;"></textarea>
            
            <button class="btn-action bg-green" onclick="guardarOrden()" style="margin-top:20px">💾 GUARDAR ORDEN</button>
        </div>`;
}

window.onload = iniciarApp;
