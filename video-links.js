/* Drive links are validated before being used in an iframe or an external link. */
(function(root){
  function driveId(value){
    if(typeof value!=="string") return "";
    const text=value.trim();
    if(/^[A-Za-z0-9_-]{20,128}$/.test(text)) return text;
    let u; try{u=new URL(text);}catch(e){return "";}
    if(u.protocol!=="https:" || u.hostname!=="drive.google.com" || u.username || u.password || u.port) return "";
    const m=u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{20,128})(?:\/(?:view|preview|edit))?\/?$/);
    if(m) return m[1];
    if(["/open","/uc"].includes(u.pathname)){
      const id=u.searchParams.get("id")||"";
      return /^[A-Za-z0-9_-]{20,128}$/.test(id)?id:"";
    }
    return "";
  }
  function urls(value){const id=driveId(value);return id?{id,view:"https://drive.google.com/file/d/"+id+"/view",preview:"https://drive.google.com/file/d/"+id+"/preview"}:null;}
  function catalog(raw,knownIds){
    if(!raw || typeof raw!=="object" || Array.isArray(raw))throw Error("Catálogo inválido");
    const allowed=new Set(knownIds),out=Object.create(null);
    if(Object.keys(raw).length>allowed.size)throw Error("Demasiados temas en el catálogo");
    for(const [topic,value] of Object.entries(raw)){
      if(!allowed.has(topic))throw Error("El catálogo contiene un tema desconocido");
      const parts=Array.isArray(value)?value:[value];
      if(!parts.length || parts.length>12)throw Error("Cantidad de partes inválida");
      out[topic]=parts.map(v=>{
        const id=driveId(typeof v==="string"?v:v&&v.id);
        if(!id)throw Error("El catálogo contiene un enlace de Drive inválido");
        return {id,title:typeof v?.title==="string"?v.title.trim().slice(0,200):"Video B&B"};
      });
    }
    return out;
  }
  const api={driveId,urls,catalog};
  if(typeof module!=="undefined" && module.exports) module.exports=api;
  if(root) root.DriveVideo=api;
})(typeof window!=="undefined"?window:null);
