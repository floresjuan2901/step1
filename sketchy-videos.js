/* Sketchy links are loaded only from the signed-in user's private Firestore document. */
(function(){
  "use strict";
  const topicIds=DATA.filter(it=>it.act==="sketchy").map(it=>it.id);
  const allowed=new Set(topicIds);
  let catalog=Object.create(null), owner=null, ref=null, unsubscribe=null, ready=false;
  let current=null, returnFocus=null, editing=null, writing=false;
  const el=id=>document.getElementById(id);
  const panel=document.createElement("div");
  panel.innerHTML=`
    <style>
      .sk-play{background:#174d3e;border:1px solid #45836d;color:#e4fff2}
      .sk-note{margin:.6rem 0}.sk-editor textarea,.sk-import textarea{width:100%;min-height:9rem;font:inherit;box-sizing:border-box;padding:.7rem;background:var(--panel,#18232c);color:inherit;border:1px solid #465865;border-radius:.5rem}
      .sk-import textarea{min-height:12rem}.sk-error{color:#ffb5ac;white-space:pre-wrap}
      #sk-parts{max-width:100%;font:inherit;margin:.5rem 0;padding:.5rem}
      #sk-screen iframe{width:100%;height:100%;border:0}
      #sk-catalog-account{margin-top:.7rem}#sk-catalog-account .tb{margin:.35rem 0}
    </style>
    <dialog id="sk-player" class="bb-dialog" aria-labelledby="sk-title">
      <header><h2 id="sk-title">Sketchy</h2><button type="button" class="bb-edit" id="sk-close">Cerrar video</button></header>
      <div id="sk-parts-wrap" hidden><label for="sk-parts">Videos de este tema</label><select id="sk-parts"></select></div>
      <div class="bb-screen" id="sk-screen"></div>
      <div class="bb-footer"><a id="sk-external" target="_blank" rel="noopener noreferrer">Abrir en Google Drive</a><button type="button" class="bb-edit" id="sk-edit-current">Editar enlaces de Sketchy</button></div>
      <p class="sub">Necesitas internet y acceso con tu cuenta de Google. Si el reproductor no carga, usa Abrir en Google Drive. Los videos permanecen agrupados en este tema; el progreso se marca con la casilla Sketchy.</p>
    </dialog>
    <dialog id="sk-editor" class="bb-dialog sk-editor" aria-labelledby="sk-edit-title">
      <form id="sk-edit-form"><header><h2 id="sk-edit-title">Enlaces de Sketchy</h2><button type="button" class="bb-edit" id="sk-edit-close">Cancelar</button></header>
      <p id="sk-edit-topic"></p><label for="sk-urls">Un enlace de Google Drive por línea, en orden de reproducción</label>
      <textarea id="sk-urls" spellcheck="false" autocomplete="off" aria-describedby="sk-edit-error"></textarea>
      <p class="sk-error" id="sk-edit-error" role="alert"></p><button class="btn" type="submit" id="sk-edit-save">Guardar enlaces privados</button></form>
    </dialog>
    <dialog id="sk-import" class="bb-dialog sk-import" aria-labelledby="sk-import-title">
      <form id="sk-import-form"><header><h2 id="sk-import-title">Importar enlaces privados de Sketchy</h2><button type="button" class="bb-edit" id="sk-import-close">Cancelar</button></header>
      <p class="sub">Selecciona tu catálogo JSON o pega su contenido. Se guarda únicamente en tu cuenta de Firebase.</p>
      <label for="sk-import-file">Archivo de enlaces de Sketchy</label><input id="sk-import-file" type="file" accept="application/json,.json">
      <label for="sk-import-json">Contenido del catálogo JSON</label><textarea id="sk-import-json" spellcheck="false" autocomplete="off"></textarea>
      <p class="sk-error" id="sk-import-error" role="alert"></p><button class="btn" type="submit" id="sk-import-save">Guardar catálogo privado</button></form>
    </dialog>`;
  document.body.appendChild(panel);
  const account=document.createElement("div");account.id="sk-catalog-account";
  account.innerHTML='<div class="sub" id="sk-catalog-status" role="status">Inicia sesión para cargar tus enlaces privados de Sketchy.</div><button type="button" class="tb" id="sk-import-open">Importar enlaces de Sketchy</button>';
  el("video-catalog-status").parentElement.appendChild(account);
  function clean(raw){return DriveVideo.catalog(raw,topicIds,80);}
  function signedIn(){return !!owner&&firebase.auth().currentUser?.uid===owner;}
  function linksFor(it){return signedIn()?(catalog[it.id]||[]):[];}
  function status(message){el("sk-catalog-status").textContent=message;}
  function updateStatus(){const count=Object.keys(catalog).length,total=Object.values(catalog).reduce((n,a)=>n+a.length,0);status(count?`${count} temas de Sketchy · ${total} videos privados en tu cuenta.`:"Aún no hay enlaces de Sketchy en esta cuenta.");}
  function clear(){catalog=Object.create(null);ref=null;owner=null;ready=false;writing=false;current=null;editing=null;el("sk-player").close();el("sk-editor").close();el("sk-import").close();el("sk-urls").value="";el("sk-import-json").value="";el("sk-import-file").value="";el("sk-parts").replaceChildren();el("sk-external").removeAttribute("href");status("Inicia sesión para cargar tus enlaces privados de Sketchy.");refreshRows();}
  async function save(raw){
    if(!signedIn()||!ref)throw Error("Inicia sesión para guardar tus enlaces privados.");
    if(writing)throw Error("Espera a que termine el guardado anterior.");
    if(!ready)throw Error("Espera a que se cargue tu catálogo privado antes de editarlo.");
    const value=clean(raw),json=JSON.stringify(value),uid=owner,target=ref;
    if(new Blob([json]).size>700000)throw Error("El catálogo es demasiado grande.");
    writing=true;
    try{await target.set({version:1,catalogJson:json,updated:new Date().toISOString()});if(owner===uid&&signedIn()){catalog=value;updateStatus();refreshRows();}}
    finally{if(owner===uid)writing=false;}
  }
  const originalButtons=videoButtons;
  videoButtons=function(it){
    const existing=originalButtons(it);if(!allowed.has(it.id)||!signedIn())return existing;
    const videos=linksFor(it),label=videos.length>1?`Ver videos Sketchy (${videos.length})`:"Ver video Sketchy";
    const action=videos.length?`<button type="button" class="bb-play sk-play" data-sketchy-open="${it.id}" aria-label="${label}: ${esc(it.name)}">${label}</button>`:`<button type="button" class="bb-edit" data-sketchy-edit="${it.id}" aria-label="Enlazar Sketchy: ${esc(it.name)}">Enlazar Sketchy</button>`;
    return action+existing;
  };
  function restoreFocus(){if(returnFocus?.isConnected)returnFocus.focus();}
  function showPart(index){
    const it=BYID[current],video=it&&linksFor(it)[index],urls=video&&DriveVideo.urls(video.id);if(!urls)return;
    el("sk-title").textContent=it.name+" · Sketchy";
    el("sk-external").href=urls.view;
    const frame=document.createElement("iframe");frame.title="Sketchy: "+video.title;frame.allow="fullscreen; autoplay; encrypted-media";frame.allowFullscreen=true;frame.src=urls.preview;
    el("sk-screen").replaceChildren(frame);
  }
  function open(it,trigger){
    const videos=linksFor(it);if(!videos.length)return;current=it.id;returnFocus=trigger||document.activeElement;
    el("sk-parts").replaceChildren(...videos.map((v,i)=>{const opt=document.createElement("option");opt.value=String(i);opt.textContent=`${i+1}. ${v.title}`;return opt;}));
    el("sk-parts-wrap").hidden=videos.length<2;showPart(0);el("sk-player").showModal();
  }
  function edit(it,trigger){
    if(!signedIn()||!ready||!allowed.has(it.id))return;editing=it.id;returnFocus=trigger||document.activeElement;
    el("sk-edit-topic").textContent=it.name;el("sk-urls").value=linksFor(it).map(v=>DriveVideo.urls(v.id).view).join("\n");el("sk-edit-error").textContent="";el("sk-editor").showModal();
  }
  el("list").addEventListener("click",event=>{const play=event.target.closest("[data-sketchy-open]"),change=event.target.closest("[data-sketchy-edit]");if(play&&BYID[play.dataset.sketchyOpen])open(BYID[play.dataset.sketchyOpen],play);if(change&&BYID[change.dataset.sketchyEdit])edit(BYID[change.dataset.sketchyEdit],change);});
  el("sk-close").onclick=()=>el("sk-player").close();
  el("sk-player").addEventListener("close",()=>{el("sk-screen").replaceChildren();el("sk-external").removeAttribute("href");restoreFocus();});
  el("sk-parts").onchange=()=>showPart(Number(el("sk-parts").value));
  el("sk-edit-current").onclick=()=>{const it=BYID[current];el("sk-player").close();if(it)edit(it,returnFocus);};
  el("sk-edit-close").onclick=()=>el("sk-editor").close();
  el("sk-editor").addEventListener("close",()=>{el("sk-urls").value="";restoreFocus();});
  el("sk-edit-form").onsubmit=async event=>{
    event.preventDefault();const id=editing;if(!id)return;el("sk-edit-error").textContent="";el("sk-edit-save").disabled=true;
    try{const old=catalog[id]||[],parts=[],seen=new Set();for(const line of el("sk-urls").value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)){const fileId=DriveVideo.driveId(line);if(!fileId)throw Error("Revisa los enlaces: solo se admiten videos de Google Drive.");if(seen.has(fileId))continue;seen.add(fileId);parts.push({id:fileId,title:old.find(v=>v.id===fileId)?.title||`${BYID[id].name} · Video ${parts.length+1}`});}const next={...catalog};if(parts.length)next[id]=parts;else delete next[id];await save(next);el("sk-editor").close();}
    catch(error){el("sk-edit-error").textContent=error.code==="permission-denied"?"Tu cuenta no tiene permiso para guardar estos enlaces.":error.message;}
    finally{el("sk-edit-save").disabled=false;}
  };
  el("sk-import-open").onclick=()=>{if(!signedIn()){status("Inicia sesión para importar enlaces de Sketchy.");return;}returnFocus=document.activeElement;el("sk-import-error").textContent="";el("sk-import").showModal();};
  el("sk-import-close").onclick=()=>el("sk-import").close();
  el("sk-import").addEventListener("close",()=>{el("sk-import-json").value="";el("sk-import-file").value="";restoreFocus();});
  el("sk-import-form").onsubmit=async event=>{
    event.preventDefault();el("sk-import-save").disabled=true;el("sk-import-error").textContent="";
    try{const file=el("sk-import-file").files[0];if(file&&file.size>1000000)throw Error("El archivo es demasiado grande.");const text=file?await file.text():el("sk-import-json").value;if(text.length>1000000)throw Error("El catálogo es demasiado grande.");const data=JSON.parse(text);if(data.app!=="step1-sketchy-video-catalog"||data.version!==1)throw Error("Selecciona un catálogo de Sketchy válido.");await save(data.videos);el("sk-import").close();}
    catch(error){el("sk-import-error").textContent=error.code==="permission-denied"?"Firebase no permite guardar el catálogo en esta cuenta.":error.message;}
    finally{el("sk-import-save").disabled=false;}
  };
  window.SketchyVideos={exportCatalog:()=>signedIn()?JSON.parse(JSON.stringify(catalog)):{},importCatalog:save};
  firebase.auth().onAuthStateChanged(user=>{
    if(unsubscribe){unsubscribe();unsubscribe=null;}clear();if(!user)return;
    owner=user.uid;ref=firebase.firestore().collection("users").doc(user.uid).collection("meta").doc("sketchy-videos");status("Cargando tus enlaces privados de Sketchy…");
    const uid=user.uid;
    unsubscribe=ref.onSnapshot(snapshot=>{
      if(owner!==uid||!signedIn()||writing)return;
      try{catalog=snapshot.exists?clean(JSON.parse(snapshot.data().catalogJson||"{}")):Object.create(null);ready=true;updateStatus();refreshRows();}
      catch(error){catalog=Object.create(null);ready=false;status("No se pudo leer el catálogo de Sketchy. Revisa tu respaldo privado.");refreshRows();}
    },()=>{if(owner!==uid)return;catalog=Object.create(null);ready=false;el("sk-player").close();status("No se pudieron cargar los enlaces de Sketchy. Revisa tu sesión y los permisos de Firebase.");refreshRows();});
    refreshRows();
  });
  refreshRows();
})();
