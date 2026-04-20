const http = require('http');
function req(m,p,b,t){return new Promise((res,rej)=>{const o={hostname:'127.0.0.1',port:4000,path:p,method:m,headers:{'Content-Type':'application/json'}};if(t)o.headers['Authorization']='Bearer '+t;const r=http.request(o,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res({s:r.statusCode,b:JSON.parse(d)})}catch{res({s:r.statusCode,b:d})}});});r.setTimeout(15000,()=>{r.destroy()});r.on('error',rej);if(b)r.write(JSON.stringify(b));r.end()});}

async function main(){
  const dk=await req('POST','/api/auth/login',{email:'admin@darkhawlan.com',password:'P@ssw0rd123!',tenant_code:'DARKHAWLAN'});
  const t=dk.b?.data?.accessToken;
  console.log('DK login:', dk.s);

  const al=await req('POST','/api/auth/login',{email:'admin@alhajco.com',password:'Admin@123',tenant_code:'ALHCO'});
  console.log('ALHCO login:', al.s, al.b?.error || 'OK');
  if(al.b?.data?.accessToken){
    const r=await req('GET','/api/dashboard/overview',null,al.b.data.accessToken);
    console.log('ALHCO dashboard:', r.s, JSON.stringify(r.b).substring(0,100));
  }

  const m=await req('GET','/api/tenant/companies/modules',null,t);
  console.log('modules:', m.s, JSON.stringify(m.b).substring(0,200));

  const p=await req('GET','/api/tenant/companies/profile',null,t);
  console.log('profile:', p.s, JSON.stringify(p.b).substring(0,300));

  const s=await req('GET','/api/tenant/companies/subscription',null,t);
  console.log('subscription:', s.s, JSON.stringify(s.b).substring(0,200));

  const br=await req('POST','/api/branches',{company_id:13,code:'TEST01',name:'Test Branch',type:'branch'},t);
  console.log('branch create:', br.s, JSON.stringify(br.b).substring(0,300));

  const u=await req('GET','/api/users',null,t);
  console.log('users list:', u.s, 'count=', (u.b?.data||[]).length, JSON.stringify(u.b).substring(0,200));

  const mp=await req('GET','/api/tenant-roles/module-permissions',null,t);
  console.log('module-perms:', mp.s, JSON.stringify(mp.b).substring(0,400));
}
main().catch(e=>console.error(e));
