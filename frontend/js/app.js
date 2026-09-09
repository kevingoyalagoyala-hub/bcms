/* =========================================================================
   Brgy Capacuhan Management System (BCMS)  —  Frontend Application
   Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines
   Connected to the BCMS backend API (Node/Express + MySQL, or mock-server.js
   for zero-install local testing). See API_BASE below to point this at your
   backend. DB.* below is a client-side CACHE hydrated from the API — not
   hardcoded demo data. See backend/README.md for the full API reference.
   ========================================================================= */

/* ----------------------------- API CONFIG ----------------------------- */
// Change this if your backend runs somewhere else (e.g. your deployed API URL).
const API_BASE = (window.BCMS_API_BASE) || 'http://localhost:4000/api';
const SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
let AUTH_TOKEN = null;

async function api(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  if (AUTH_TOKEN) headers['Authorization'] = 'Bearer ' + AUTH_TOKEN;
  const isForm = (typeof FormData !== 'undefined') && opts.body instanceof FormData;
  if (!isForm && opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
  } catch (netErr) {
    const err = new Error('Could not reach the server. Is the backend running at ' + API_BASE + '?');
    err.network = true;
    throw err;
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function fileUrl(v) { return (v && typeof v === 'string' && v.startsWith('/')) ? SERVER_ORIGIN + v : v; }

/* ----------------------------- SERVER <-> UI FIELD MAPPING -----------------------------
   The API returns snake_case columns (matching MySQL); the UI throughout uses
   camelCase. These mappers convert at the fetch boundary so the rest of the
   app never has to think about it. */
function mapResident(r){
  if (!r) return r;
  return {
    id:r.id, username:r.username, firstName:r.first_name, middleName:r.middle_name||'', lastName:r.last_name, suffix:r.suffix||'',
    birthdate:r.birthdate, sex:r.sex, civilStatus:r.civil_status, purok:r.purok, address:r.address,
    contactNumber:r.contact_number, email:r.email||'', occupation:r.occupation||'', yearsOfResidency:r.years_of_residency||0,
    photoDataUrl: fileUrl(r.photo_path) || '', bio: r.bio||'', status:r.status, dateRegistered:r.date_registered,
  };
}
function mapAdmin(a){
  if (!a) return a;
  return { id:a.id, username:a.username, fullName:a.full_name, role:a.role };
}
function mapRequest(r){
  if (!r) return r;
  let formData = r.form_data;
  if (typeof formData === 'string') { try { formData = JSON.parse(formData); } catch(e){ formData = {}; } }
  return {
    id:r.id, refNo:r.ref_no, residentId:r.resident_id, docType:r.doc_key, formData: formData||{},
    status:r.status, remarks:r.remarks||'', dateRequested:r.date_requested, dateUpdated:r.date_updated,
  };
}
function mapAnnouncement(a){
  if (!a) return a;
  return { id:a.id, title:a.title, body:a.body, author:a.author, pinned: !!a.pinned, date:a.posted_date };
}

/** Fetches everything the current session needs right after login/register. */
async function loadInitialData(role){
  const anns = await api('/announcements');
  DB.announcements = anns.map(mapAnnouncement);
  if (role === 'resident'){
    const reqs = await api('/requests/mine');
    DB.requests = reqs.map(mapRequest);
  } else {
    const [residents, reqs] = await Promise.all([api('/residents'), api('/requests')]);
    DB.residents = residents.map(mapResident);
    DB.requests = reqs.map(mapRequest);
  }
}
async function refreshResidents(){ DB.residents = (await api('/residents')).map(mapResident); }
async function refreshAllRequests(){ DB.requests = (await api('/requests')).map(mapRequest); }
async function refreshMyRequests(){ DB.requests = (await api('/requests/mine')).map(mapRequest); }
async function refreshAnnouncements(){ DB.announcements = (await api('/announcements')).map(mapAnnouncement); }

/* ----------------------------- ICONS (inline SVG) ----------------------------- */
const ICONS = {
  dashboard:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  docs:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>`,
  requests:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/></svg>`,

  bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>`,
  logout:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  people:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="17.5" cy="8.5" r="3"/><path d="M15.5 14.3c2.9.4 5 2.6 5 5.7"/></svg>`,
  history:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l4 2"/></svg>`,
  menu:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
  close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  x:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  box:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>`,
  print:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="6" y="13" width="12" height="8"/><path d="M6 17H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2"/></svg>`,
  search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>`,
  heart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.9-10-9.3C.5 8.1 2.3 4.5 6 4.5c2.1 0 3.7 1.4 6 3.9 2.3-2.5 3.9-3.9 6-3.9 3.7 0 5.5 3.6 4 7.2C19.5 16.1 12 21 12 21Z"/></svg>`,
  briefcase:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 13h20"/></svg>`,
  coins:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="9" cy="7" rx="6" ry="3.5"/><path d="M3 7v5c0 1.9 2.7 3.5 6 3.5s6-1.6 6-3.5V7"/><path d="M15 10.2c3 .3 6 1.7 6 3.8s-3 3.5-6.5 3.5c-2.2 0-4.1-.6-5.2-1.5"/><path d="M3 12v5c0 1.9 2.7 3.5 6 3.5 2.3 0 4.3-.8 5.3-1.9"/></svg>`,
  walletOff:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9"/><path d="M17 9h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a2.5 2.5 0 0 1 0-5Z"/><path d="M3 8l15 12"/></svg>`,
  stamp:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3a2.5 2.5 0 0 0 0 5h8a2.5 2.5 0 0 0 0-5"/><path d="M8 8v3.5c0 1.5-1 2-1 4"/><path d="M16 8v3.5c0 1.5 1 2 1 4"/><rect x="4" y="17" width="16" height="4" rx="1"/></svg>`,
  familyPeople:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="3"/><path d="M2 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="18" cy="16" r="2"/><path d="M18 21c0-1.7-.8-3-2-3.7"/></svg>`,
  store:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z"/><path d="M9 20v-6h6v6"/></svg>`,
  idcard:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.2"/><path d="M5 17c.5-1.7 1.8-2.5 3-2.5s2.5.8 3 2.5"/><path d="M14 10h5M14 14h5"/></svg>`,
  upload:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M20 16.5v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2"/></svg>`,
  chevRight:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
  trend:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 6h6v6"/></svg>`,
};

function iconWrap(name, bg, fg){ return `<div class="icn" style="background:${bg};color:${fg}">${ICONS[name]}</div>`; }

/* ----------------------------- DOCUMENT TYPE DEFINITIONS ----------------------------- */
const DOC_TYPES = [
  {
    key:'clearance', name:'Barangay Clearance', icon:'docs', color:'#2F6FE4', bg:'#E8F0FE',
    desc:'General purpose clearance',
    fields:[
      {name:'purpose', label:'Purpose', type:'select', options:['Employment','Travel Requirement','Bank Transaction','School Requirement','Business Requirement','Other'], required:true},
      {name:'otherPurpose', label:'Please specify purpose', type:'text', showIf:{field:'purpose',value:'Other'}},
    ],
    certTitle:'Barangay Clearance',
    certBody:(r,res)=>`<p>This is to certify that <b>${fullName(res)}</b>, of legal age, ${res.civilStatus}, Filipino citizen, and a resident of ${residentAddress(res)}, is personally known to me to be a person of good moral character, peaceful, law-abiding, and has no derogatory record on file in this Barangay.</p>
    <p>This certification is being issued upon the request of the above-named person for <b>${(r.formData.purpose==='Other'?r.formData.otherPurpose:r.formData.purpose)||'whatever legal purpose it may serve'}</b>, and for whatever legal purpose it may serve.</p>
    <p>Given this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
  {
    key:'residency', name:'Certificate of Residency', icon:'home', color:'#E8862E', bg:'#FDECDC',
    desc:'Proof of residence in the barangay',
    fields:[
      {name:'yearsOfResidency', label:'Number of Years Residing in the Barangay', type:'number', prefillFromProfile:'yearsOfResidency', required:true},
      {name:'purpose', label:'Purpose', type:'select', options:['School Requirement','Employment','Government Transaction','Loan Application','Other'], required:true},
    ],
    certTitle:'Certificate of Residency',
    certBody:(r,res)=>`<p>This is to certify that <b>${fullName(res)}</b>, of legal age, ${res.civilStatus}, is a bonafide resident of ${residentAddress(res)}, for ${r.formData.yearsOfResidency || res.yearsOfResidency} year(s) up to the present.</p>
    <p>This certification is issued upon the request of the above-named person for <b>${r.formData.purpose}</b> purposes and for whatever legal intent it may serve.</p>
    <p>Issued this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
  {
    key:'indigency', name:'Certificate of Indigency', icon:'heart', color:'#8B5CF6', bg:'#F1EBFE',
    desc:'For residents belonging to the indigent sector',
    fields:[
      {name:'purpose', label:'Purpose', type:'select', options:['Medical Assistance','Educational Assistance','Legal Assistance','Burial Assistance','Financial Assistance','Other'], required:true},
    ],
    certTitle:'Certificate of Indigency',
    certBody:(r,res)=>`<p>This is to certify that <b>${fullName(res)}</b>, of legal age, ${res.civilStatus}, and a resident of ${residentAddress(res)}, belongs to an indigent family in this Barangay based on the records of this office.</p>
    <p>This certification is being issued upon the request of the above-named person to support an application for <b>${r.formData.purpose}</b>, and for whatever legal purpose it may serve.</p>
    <p>Issued this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
  {
    key:'jobseeker', name:'First-Time Job Seeker Certificate', icon:'briefcase', color:'#14B8A6', bg:'#DFF7F3',
    desc:'RA 11261 - Republic Act No. 11261',
    fields:[
      {name:'intendedEmployer', label:'Intended Employer / Company (optional)', type:'text'},
    ],
    certTitle:'First-Time Job Seeker Certificate',
    certBody:(r,res)=>`<p>This is to certify that <b>${fullName(res)}</b>, of legal age, ${res.civilStatus}, and a resident of ${residentAddress(res)}, is a <b>FIRST-TIME JOB SEEKER</b> as defined under Republic Act No. 11261, otherwise known as the "First-Time Jobseekers Assistance Act," and has not been previously employed at the time of this application.</p>
    <p>This certification is issued to avail of the benefits under the said Act${r.formData.intendedEmployer?` in relation to an application with <b>${r.formData.intendedEmployer}</b>`:''}, and for whatever legal purpose it may serve.</p>
    <p>Issued this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
  {
    key:'lowincome', name:'Certificate of Low Income', icon:'coins', color:'#D97706', bg:'#FCEEDC',
    desc:'For scholarship / subsidy applications',
    fields:[
      {name:'monthlyIncome', label:'Approximate Monthly Household Income (PHP)', type:'number', required:true},
      {name:'sourceOfIncome', label:'Source of Income', type:'text', required:true},
      {name:'purpose', label:'Purpose', type:'select', options:['Scholarship Application','Fee Subsidy / Discount','Government Assistance Program','Other'], required:true},
    ],
    certTitle:'Certificate of Low Income',
    certBody:(r,res)=>`<p>This is to certify that <b>${fullName(res)}</b>, of legal age, ${res.civilStatus}, and a resident of ${residentAddress(res)}, belongs to a household with an approximate monthly income of <b>₱${Number(r.formData.monthlyIncome||0).toLocaleString()}</b>, derived mainly from ${r.formData.sourceOfIncome}.</p>
    <p>This certification is issued upon the request of the above-named person for <b>${r.formData.purpose}</b>, and for whatever legal purpose it may serve.</p>
    <p>Issued this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
  {
    key:'noincome', name:'Certificate of No Income', icon:'walletOff', color:'#E11D6B', bg:'#FCE4EE',
    desc:'For residents with no source of income',
    fields:[
      {name:'reason', label:'Reason for No Income', type:'select', options:['Unemployed','Student','Housewife / Househusband','Senior Citizen','Person with Disability (PWD)','Other'], required:true},
      {name:'purpose', label:'Purpose', type:'select', options:['Government Assistance','Medical Assistance','Scholarship Application','Other'], required:true},
    ],
    certTitle:'Certificate of No Income',
    certBody:(r,res)=>`<p>This is to certify that <b>${fullName(res)}</b>, of legal age, ${res.civilStatus}, and a resident of ${residentAddress(res)}, has <b>NO SOURCE OF INCOME</b> at present, being ${r.formData.reason==='Other'?'unable to earn income':r.formData.reason.toLowerCase()}, based on the records and knowledge of this office.</p>
    <p>This certification is issued upon the request of the above-named person for <b>${r.formData.purpose}</b>, and for whatever legal purpose it may serve.</p>
    <p>Issued this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
  {
    key:'attestation', name:'Certificate of Attestation', icon:'stamp', color:'#4F46E5', bg:'#E7E6FC',
    desc:'Sworn statement / attestation of facts',
    fields:[
      {name:'statement', label:'What is being attested (details)', type:'textarea', required:true, placeholder:'e.g., Attestation of good conduct, cohabitation, or a specific incident/fact to be certified by the Barangay...'},
    ],
    certTitle:'Certificate of Attestation',
    certBody:(r,res)=>`<p>This is to attest and certify that <b>${fullName(res)}</b>, of legal age, ${res.civilStatus}, and a resident of ${residentAddress(res)}, is personally known to this office, and that the following statement is true and correct to the best knowledge of this Barangay:</p>
    <p style="padding:12px 16px;background:#f4f4f2;border-left:3px solid #163B24;">${escapeHtml(r.formData.statement||'')}</p>
    <p>This attestation is issued upon the request of the above-named person for whatever legal purpose it may serve.</p>
    <p>Issued this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
  {
    key:'soloparent', name:'Certificate of Solo Parent', icon:'familyPeople', color:'#DB2777', bg:'#FCE4F0',
    desc:'Supporting document for Solo Parent ID / benefits',
    fields:[
      {name:'numberOfChildren', label:'Number of Children Under Care', type:'number', required:true},
      {name:'purpose', label:'Purpose', type:'select', options:['Solo Parent ID Application','School Requirement','Government Assistance','Other'], required:true},
      {name:'soloParentIdUpload', label:'Solo Parent ID (if already issued, optional)', type:'file'},
    ],
    certTitle:'Certificate of Solo Parent',
    certBody:(r,res)=>`<p>This is to certify that <b>${fullName(res)}</b>, of legal age, ${res.civilStatus}, and a resident of ${residentAddress(res)}, is known to this office to be a <b>SOLO PARENT</b>, having sole responsibility for the care and support of ${r.formData.numberOfChildren} child(ren), consistent with the provisions of Republic Act No. 11861 (Expanded Solo Parents Welfare Act).</p>
    <p>This certification is issued upon the request of the above-named person for <b>${r.formData.purpose}</b>, and for whatever legal purpose it may serve.</p>
    <p>Issued this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
  {
    key:'business', name:'Barangay Business Clearance', icon:'store', color:'#C2410C', bg:'#FBE4D5',
    desc:'Clearance for business permit application',
    fields:[
      {name:'businessName', label:'Business Name', type:'text', required:true},
      {name:'businessAddress', label:'Business Address', type:'text', required:true, prefillFromProfile:'address'},
      {name:'businessType', label:'Business Type', type:'select', options:['Sari-sari Store','Food Stall / Carinderia','Retail','Services','Agriculture / Farming','Fishing','Other'], required:true},
      {name:'natureOfBusiness', label:'Nature of Business', type:'textarea', required:true},
      {name:'dtiUpload', label:'DTI Registration / Previous Permit (if renewal, optional)', type:'file'},
    ],
    certTitle:'Barangay Business Clearance',
    certBody:(r,res)=>`<p>This is to certify that the business named <b>"${r.formData.businessName}"</b>, owned and operated by <b>${fullName(res)}</b>, located at ${r.formData.businessAddress}, engaged in <b>${r.formData.businessType}</b> (${escapeHtml(r.formData.natureOfBusiness||'')}), is hereby granted clearance to operate within the jurisdiction of Barangay Capacuhan, subject to compliance with existing barangay ordinances and applicable laws.</p>
    <p>This clearance is issued for the purpose of securing a Business Permit from the City Government of Calbayog, and for whatever legal purpose it may serve.</p>
    <p>Issued this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
  {
    key:'brgyid', name:'Barangay ID', icon:'idcard', color:'#1E8449', bg:'#DFF3E7',
    desc:'Official Barangay identification card',
    fields:[
      {name:'contactNumber', label:'Contact Number', type:'tel', required:true, prefillFromProfile:'contactNumber'},
      {name:'emergencyName', label:'Emergency Contact Name', type:'text', required:true},
      {name:'emergencyNumber', label:'Emergency Contact Number', type:'tel', required:true},
      {name:'photoUpload', label:'Upload 2x2 ID Photo', type:'file', required:true},
      {name:'validIdUpload', label:'Upload Valid ID (for verification)', type:'file', required:true},
    ],
    certTitle:'Barangay Identification Card',
    certBody:(r,res)=>`<p>This is to certify that <b>${fullName(res)}</b> is a bonafide, registered resident of Barangay Capacuhan, Oquendo District, Calbayog City, Samar, and is hereby issued an official Barangay Identification Card for identification purposes within the community.</p>
    <p>Emergency Contact: <b>${r.formData.emergencyName}</b> — ${r.formData.emergencyNumber}</p>
    <p>Issued this ${certDateLine()} at Barangay Capacuhan, Oquendo District, Calbayog City, Samar, Philippines.</p>`
  },
];
function docType(key){ return DOC_TYPES.find(d=>d.key===key); }

/* ----------------------------- CLIENT-SIDE CACHE (hydrated from the API) ----------------------------- */
const DB = {
  puno_barangay: 'Leo M. Mag-Ampo',
  admins: [],       // populated on admin login
  residents: [],    // populated on login (own profile for residents, full list for admins)
  requests: [],     // populated on login / after mutations
  announcements: [],// populated on login / after mutations
};

/* ----------------------------- HELPERS ----------------------------- */
function fullName(res){ if(!res) return ''; return [res.firstName, res.middleName? res.middleName[0]+'.':'', res.lastName, res.suffix||''].filter(Boolean).join(' ').replace(/\s+/g,' '); }
function residentAddress(res){ return `${res.purok}, Barangay Capacuhan, Oquendo District, Calbayog City, Samar`; }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(iso){ const d=new Date(iso); return d.toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}); }
function fmtDateTime(iso){ const d=new Date(iso); return d.toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}); }
function initials(name){ return (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function ordinal(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
function certDateLine(){ const d=new Date(); const day=ordinal(d.getDate()); const month=d.toLocaleString('en-PH',{month:'long'}); const year=d.getFullYear(); return `${day} day of ${month}, ${year}`; }
function uid(prefix){ return prefix+Math.random().toString(36).slice(2,9); }
function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
function statusOrder(s){ return {Pending:0,Approved:1,'Ready for Pickup':2,Released:3,Rejected:4}[s] ?? 9; }

let TOAST_TIMER=null;
function toast(msg, isErr){
  let el=document.querySelector('.toast');
  if(el) el.remove();
  el=document.createElement('div');
  el.className='toast'+(isErr?' err':'');
  el.innerHTML=(isErr?ICONS.x:ICONS.check).replace('viewBox','width="16" height="16" viewBox')+`<span>${msg}</span>`;
  document.body.appendChild(el);
  clearTimeout(TOAST_TIMER);
  TOAST_TIMER=setTimeout(()=>el.remove(), 3200);
}

/* ----------------------------- SESSION / ROUTER ----------------------------- */
const SESSION = { role:null, userId:null }; // role: 'resident' | 'admin'
let MODAL_STACK = [];

function currentResident(){ return DB.residents.find(r=>r.id===SESSION.userId); }
function currentAdmin(){ return DB.admins.find(a=>a.id===SESSION.userId); }

function navigate(hash){ window.location.hash = hash; }
function logout(){ SESSION.role=null; SESSION.userId=null; AUTH_TOKEN=null; AUTH_MODE='login'; DB.residents=[]; DB.admins=[]; DB.requests=[]; DB.announcements=[]; navigate('#/login'); }

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', ()=>{ if(!window.location.hash) navigate('#/login'); else render(); });

function guard(){
  const hash = window.location.hash || '#/login';
  if(hash.startsWith('#/resident') && SESSION.role!=='resident'){ navigate('#/login'); return false; }
  if(hash.startsWith('#/admin') && SESSION.role!=='admin'){ navigate('#/login'); return false; }
  if(hash.startsWith('#/certificate') && !SESSION.role){ navigate('#/login'); return false; }
  return true;
}

async function render(){
  if(!guard()) return;
  const hash = window.location.hash || '#/login';
  const app = document.getElementById('app');
  closeAllModals(false);

  if(hash==='#/login' || hash==='' ){ app.innerHTML = renderLogin(); bindLogin(); return; }
  if(hash.startsWith('#/certificate/')){
    const id = hash.split('/')[2];
    app.innerHTML = `<div class="login-wrap"><div class="card card-pad">Loading certificate...</div></div>`;
    try {
      const data = await api('/certificates/'+id);
      const mappedReq = mapRequest(data.request);
      const mappedRes = mapResident(data.resident);
      const i1 = DB.requests.findIndex(x=>x.id===mappedReq.id); if (i1>=0) DB.requests[i1]=mappedReq; else DB.requests.push(mappedReq);
      const i2 = DB.residents.findIndex(x=>x.id===mappedRes.id); if (i2>=0) DB.residents[i2]=mappedRes; else DB.residents.push(mappedRes);
      app.innerHTML = renderCertificatePage(id);
      bindCertificatePage(id);
    } catch (err) {
      app.innerHTML = `<div class="login-wrap"><div class="card card-pad">${err.message || 'Could not load this certificate.'}</div></div>`;
    }
    return;
  }

  if(hash.startsWith('#/resident')){ renderResidentShell(hash); return; }
  if(hash.startsWith('#/admin')){ renderAdminShell(hash); return; }

  navigate('#/login');
}

/* ----------------------------- LOGIN ----------------------------- */
let LOGIN_ROLE = 'resident';
let AUTH_MODE = 'login'; // 'login' | 'register'
let LOGIN_ERROR = '';
let REGISTER_DRAFT = {};
const PUROK_OPTIONS = ['Purok 1','Purok 2','Purok 3','Purok 4','Purok 5'];

function renderLogin(){
  const showRegister = LOGIN_ROLE === 'resident' && AUTH_MODE === 'register';
  return `
  <div class="login-wrap">
    <div class="login-card ${showRegister ? 'modal-wide' : ''}" style="${showRegister ? 'max-width:960px;' : ''}">
      <div class="login-side">
        <div>
          <img class="seal" src="${SEAL_SRC}" alt="Barangay Capacuhan Seal">
          <h2>Brgy Capacuhan<br>Management System</h2>
          <p>A digital service portal for requesting official barangay documents and certificates online — fast, transparent, and paperless.</p>
        </div>
        <div class="addr">
          Republic of the Philippines · Province of Samar<br>
          City of Calbayog · Office of the Punong Barangay<br>
          <b>Barangay Capacuhan</b>, Oquendo District, Calbayog City
        </div>
      </div>
      <div class="login-form">
        <div class="role-toggle">
          <button data-role="resident" class="${LOGIN_ROLE==='resident'?'active':''}">Resident</button>
          <button data-role="admin" class="${LOGIN_ROLE==='admin'?'active':''}">Barangay Staff</button>
        </div>

        ${LOGIN_ROLE==='resident' ? `
        <div class="auth-toggle">
          <button data-mode="login" class="${AUTH_MODE==='login'?'active':''}">Login</button>
          <button data-mode="register" class="${AUTH_MODE==='register'?'active':''}">Create Account</button>
        </div>` : ''}

        ${LOGIN_ERROR? `<div class="login-error">${LOGIN_ERROR}</div>`:''}

        ${showRegister ? renderRegisterForm() : renderLoginForm()}
      </div>
    </div>
  </div>`;
}

function renderLoginForm(){
  return `
    <h1>Welcome back</h1>
    <p class="sub">Sign in to continue to BCMS.</p>
    <form id="loginForm">
      <div class="field">
        <label>Username</label>
        <input type="text" name="username" placeholder="Enter your username" required>
      </div>
      <div class="field">
        <label>Password</label>
        <input type="password" name="password" placeholder="Enter your password" required>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Sign In</button>
    </form>`;
}

function renderRegisterForm(){
  const d = REGISTER_DRAFT;
  const sel = (name, val) => d[name]===val ? 'selected' : '';
  return `
    <h1>Create your account</h1>
    <p class="sub">Fill in your details below, then set a username and password — you'll use those two to log in afterward.</p>
    <form id="registerForm">
      <div class="field-row">
        <div class="field"><label>First Name</label><input type="text" name="firstName" required placeholder="e.g., Juan" value="${d.firstName||''}"></div>
        <div class="field"><label>Last Name</label><input type="text" name="lastName" required placeholder="e.g., Dela Cruz" value="${d.lastName||''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Middle Name <span class="muted">(optional)</span></label><input type="text" name="middleName" placeholder="e.g., Santos" value="${d.middleName||''}"></div>
        <div class="field"><label>Suffix <span class="muted">(optional)</span></label><input type="text" name="suffix" placeholder="Jr., Sr., III" value="${d.suffix||''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Birthdate</label><input type="date" name="birthdate" required value="${d.birthdate||''}"><div class="hint">Tap the field to open the calendar</div></div>
        <div class="field"><label>Sex</label><select name="sex" required><option value="">Select</option><option ${sel('sex','Male')}>Male</option><option ${sel('sex','Female')}>Female</option></select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Civil Status</label><select name="civilStatus" required><option value="">Select</option>${['Single','Married','Widowed','Separated','Divorced'].map(o=>`<option ${sel('civilStatus',o)}>${o}</option>`).join('')}</select></div>
        <div class="field"><label>Purok</label><select name="purok" required><option value="">Select</option>${PUROK_OPTIONS.map(o=>`<option ${sel('purok',o)}>${o}</option>`).join('')}</select><div class="hint">The zone/sitio of Capacuhan where you live</div></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Contact Number</label><input type="tel" name="contactNumber" required placeholder="e.g., 0917-234-5678" value="${d.contactNumber||''}"></div>
        <div class="field"><label>Email <span class="muted">(optional)</span></label><input type="email" name="email" placeholder="e.g., juan@email.com" value="${d.email||''}"></div>
      </div>
      <div class="field">
        <label>Username</label>
        <input type="text" name="username" required placeholder="e.g., juan.delacruz" value="${d.username||''}">
        <div class="hint">Make this up — it's not your real name. You'll type it every time you log in.</div>
      </div>
      <div class="field-row">
        <div class="field"><label>Password</label><input type="password" name="password" required minlength="6" placeholder="At least 6 characters"></div>
        <div class="field"><label>Confirm Password</label><input type="password" name="confirmPassword" required minlength="6" placeholder="Retype the same password"></div>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Create Account</button>
    </form>`;
}

function bindLogin(){
  document.querySelectorAll('.role-toggle button').forEach(b=>b.addEventListener('click', ()=>{ LOGIN_ROLE=b.dataset.role; AUTH_MODE='login'; LOGIN_ERROR=''; render(); }));
  const authToggle = document.querySelectorAll('.auth-toggle button');
  authToggle.forEach(b=>b.addEventListener('click', ()=>{ AUTH_MODE=b.dataset.mode; LOGIN_ERROR=''; render(); }));

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const username = fd.get('username').trim();
    const password = fd.get('password');
    const submitBtn = loginForm.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = 'Signing in...';
    try {
      const data = await api('/auth/login', { method:'POST', body: JSON.stringify({ username, password, role: LOGIN_ROLE }) });
      AUTH_TOKEN = data.token;
      if (LOGIN_ROLE === 'resident') {
        const me = mapResident(data.user);
        DB.residents = [me];
        SESSION.role = 'resident'; SESSION.userId = me.id;
      } else {
        const me = mapAdmin(data.user);
        DB.admins = [me];
        SESSION.role = 'admin'; SESSION.userId = me.id;
      }
      LOGIN_ERROR = '';
      await loadInitialData(LOGIN_ROLE);
      navigate(LOGIN_ROLE === 'resident' ? '#/resident/dashboard' : '#/admin/dashboard');
    } catch (err) {
      LOGIN_ERROR = err.message || 'Login failed.';
      render();
    }
  });

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const b = Object.fromEntries(fd.entries());
    REGISTER_DRAFT = b; // preserve entries so a validation error doesn't force retyping

    if (b.password !== b.confirmPassword) { LOGIN_ERROR='Passwords do not match.'; render(); return; }
    if (b.password.length < 6) { LOGIN_ERROR='Password must be at least 6 characters.'; render(); return; }

    const submitBtn = registerForm.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = 'Creating account...';
    try {
      const data = await api('/auth/register', { method:'POST', body: JSON.stringify(b) });
      AUTH_TOKEN = data.token;
      const me = mapResident(data.user);
      DB.residents = [me];
      SESSION.role = 'resident'; SESSION.userId = me.id;
      REGISTER_DRAFT = {}; LOGIN_ERROR = '';
      await loadInitialData('resident');
      toast('Account created! Welcome, ' + me.firstName + '.');
      navigate('#/resident/dashboard');
    } catch (err) {
      LOGIN_ERROR = err.message || 'Registration failed.';
      render();
    }
  });
}

/* ----------------------------- RESIDENT SHELL ----------------------------- */
const RESIDENT_NAV = [
  {key:'dashboard', label:'Dashboard', icon:'dashboard', hash:'#/resident/dashboard'},
  {key:'documents', label:'Request Document', icon:'docs', hash:'#/resident/documents'},
  {key:'requests', label:'My Requests', icon:'requests', hash:'#/resident/requests'},
  {key:'announcements', label:'Announcements', icon:'bell', hash:'#/resident/announcements'},
  {key:'profile', label:'My Profile', icon:'user', hash:'#/resident/profile'},
];
function sidebarHtml(navItems, activeKey){
  return `
  <div class="sidebar-brand">
    <img src="${SEAL_SRC}" alt="logo">
    <div>
      <div class="t1">BCMS</div>
      <div class="t2">Brgy. Capacuhan Portal</div>
    </div>
  </div>
  <div class="nav-group">
    ${navItems.map(it=>`<button class="nav-item ${it.key===activeKey?'active':''}" data-hash="${it.hash}">${ICONS[it.icon]}<span>${it.label}</span></button>`).join('')}
  </div>
  <div class="sidebar-foot">
    <button class="nav-item" id="logoutBtn">${ICONS.logout}<span>Logout</span></button>
    <div class="sidebar-tag">Barangay Capacuhan<br>Oquendo District, Calbayog City</div>
  </div>`;
}
function bindShellChrome(){
  document.querySelectorAll('.nav-item[data-hash]').forEach(b=>b.addEventListener('click', ()=>{ navigate(b.dataset.hash); closeSidebarMobile(); }));
  const lo = document.getElementById('logoutBtn'); if(lo) lo.addEventListener('click', ()=>{ if(confirm('Log out of BCMS?')) logout(); });
  const ham = document.getElementById('hamburger'); if(ham) ham.addEventListener('click', openSidebarMobile);
  const ov = document.getElementById('mobileOverlay'); if(ov) ov.addEventListener('click', closeSidebarMobile);
}
function openSidebarMobile(){ document.querySelector('.sidebar').classList.add('open'); document.getElementById('mobileOverlay').classList.add('show'); }
function closeSidebarMobile(){ const sb=document.querySelector('.sidebar'); if(sb) sb.classList.remove('open'); const ov=document.getElementById('mobileOverlay'); if(ov) ov.classList.remove('show'); }

function avatarHtml(name, photoUrl, sizeClass){
  const cls = sizeClass ? `avatar ${sizeClass}` : 'avatar';
  if (photoUrl) return `<div class="${cls}" style="padding:0;overflow:hidden;"><img src="${photoUrl}" alt="${name}" style="width:100%;height:100%;object-fit:cover;"></div>`;
  return `<div class="${cls}">${initials(name)}</div>`;
}

function topbarHtml(title, subtitle, userName, userRole, photoUrl){
  return `
  <div class="topbar">
    <div style="display:flex;align-items:center;gap:10px;">
      <button class="hamburger" id="hamburger">${ICONS.menu}</button>
      <div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
    </div>
    <div class="topbar-right">
      <div class="user-chip">
        <div class="info"><div class="name">${userName}</div><div class="role">${userRole}</div></div>
        ${avatarHtml(userName, photoUrl)}
      </div>
    </div>
  </div>`;
}

function renderResidentShell(hash){
  const res = currentResident();
  const app = document.getElementById('app');
  const page = hash.split('/')[2] || 'dashboard';
  const navMeta = {
    dashboard:{title:'Dashboard', sub:`Welcome back, ${res.firstName}!`},
    documents:{title:'Request Documents', sub:'Choose a document to request'},
    requests:{title:'My Requests', sub:'Track the status of your document requests'},
    announcements:{title:'Announcements', sub:'Latest news and updates from the Barangay'},
    profile:{title:'My Profile', sub:'Your registered resident information'},
  }[page] || {title:'Dashboard', sub:''};

  app.innerHTML = `
  <div class="shell">
    <div class="mobile-overlay" id="mobileOverlay"></div>
    <div class="sidebar">${sidebarHtml(RESIDENT_NAV, page)}</div>
    <div class="main">
      ${topbarHtml(navMeta.title, navMeta.sub, fullName(res), 'Barangay Member', res.photoDataUrl)}
      <div class="content" id="pageContent"></div>
    </div>
  </div>
  <div id="modalRoot"></div>`;
  bindShellChrome();

  const content = document.getElementById('pageContent');
  if(page==='dashboard') { content.innerHTML = renderResidentDashboard(res); bindResidentDashboard(); }
  else if(page==='documents'){ content.innerHTML = renderDocumentGrid(); bindDocumentGrid(); }
  else if(page==='requests'){ content.innerHTML = renderMyRequests(res); bindMyRequests(res); }
  else if(page==='announcements'){ content.innerHTML = renderAnnouncementsList(); }
  else if(page==='profile'){ content.innerHTML = renderProfile(res); bindProfile(res); }
}

/* ---- Resident: Dashboard ---- */
function renderResidentDashboard(res){
  const myReqs = DB.requests.filter(r=>r.residentId===res.id).sort((a,b)=> new Date(b.dateRequested)-new Date(a.dateRequested));
  const pending = myReqs.filter(r=>r.status==='Pending').length;
  const ready = myReqs.filter(r=>r.status==='Ready for Pickup').length;
  const released = myReqs.filter(r=>r.status==='Released').length;
  const pinned = DB.announcements.filter(a=>a.pinned);
  return `
  <div class="stat-grid">
    <div class="stat-card">${iconWrap('requests','var(--green-pale)','var(--green-dark)')}<div class="num">${myReqs.length}</div><div class="lbl">Total Requests</div></div>
    <div class="stat-card">${iconWrap('clock','var(--amber-bg)','var(--amber)')}<div class="num">${pending}</div><div class="lbl">Pending</div></div>
    <div class="stat-card">${iconWrap('box','var(--blue-bg)','var(--blue)')}<div class="num">${ready}</div><div class="lbl">Ready for Pickup</div></div>
    <div class="stat-card">${iconWrap('check','var(--emerald-bg)','var(--emerald)')}<div class="num">${released}</div><div class="lbl">Released</div></div>
  </div>
  <div class="card" style="margin-bottom:20px;">
    <div class="card-head"><h3>Recent Requests</h3><button class="btn btn-outline btn-sm" data-hash="#/resident/requests">View all</button></div>
    ${myReqs.length===0? emptyState('requests','No requests yet','Your submitted document requests will appear here.') : `
    <div class="table-wrap"><table>
      <thead><tr><th>Reference No.</th><th>Document</th><th>Date Requested</th><th>Status</th></tr></thead>
      <tbody>
      ${myReqs.slice(0,5).map(r=>`<tr><td>${r.refNo}</td><td>${docType(r.docType).name}</td><td class="muted small">${fmtDate(r.dateRequested)}</td><td>${statusBadge(r.status)}</td></tr>`).join('')}
      </tbody>
    </table></div>`}
  </div>
  <div class="card">
    <div class="card-head"><h3>Announcements</h3><button class="btn btn-outline btn-sm" data-hash="#/resident/announcements">View all</button></div>
    ${pinned.concat(DB.announcements.filter(a=>!a.pinned)).slice(0,2).map(a=>`
      <div class="ann-item"><div class="top"><h4>${a.title}${a.pinned?'<span class="pin">PINNED</span>':''}</h4><span class="date">${fmtDate(a.date)}</span></div><p>${a.body}</p></div>
    `).join('')}
  </div>`;
}
function bindResidentDashboard(){ document.querySelectorAll('[data-hash]').forEach(b=>b.addEventListener('click', ()=>navigate(b.dataset.hash))); }

const STATUS_CLASS = {'Pending':'Pending','Approved':'Approved','Rejected':'Rejected','Ready for Pickup':'Ready','Released':'Released'};
function statusBadge(status){ return `<span class="badge badge-${STATUS_CLASS[status]||'Pending'}">${status}</span>`; }
function emptyState(icon,title,sub){ return `<div class="empty-state">${ICONS[icon]}<div style="font-weight:600;color:var(--text);margin-bottom:3px;">${title}</div><div class="small">${sub}</div></div>`; }

/* ---- Resident: Request Documents grid + Modal form ---- */
function renderDocumentGrid(){
  return `<div class="doc-grid">
    ${DOC_TYPES.map(d=>`
      <button class="doc-card" data-doc="${d.key}">
        <span class="pill pill-available">Available</span>
        ${iconWrap(d.icon, d.bg, d.color)}
        <h4>${d.name}</h4>
        <p>${d.desc}</p>
      </button>
    `).join('')}
  </div>`;
}
function bindDocumentGrid(){
  document.querySelectorAll('.doc-card').forEach(c=>c.addEventListener('click', ()=>openRequestModal(c.dataset.doc)));
}

function fieldHtml(f, res){
  const prefill = f.prefillFromProfile ? (res[f.prefillFromProfile] ?? '') : '';
  const req = f.required ? 'required' : '';
  const showAttr = f.showIf ? `data-showif-field="${f.showIf.field}" data-showif-value="${f.showIf.value}"` : '';
  let control = '';
  if(f.type==='select'){
    control = `<select name="${f.name}" ${req}><option value="">Select ${f.label.toLowerCase()}</option>${f.options.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`;
  } else if(f.type==='textarea'){
    control = `<textarea name="${f.name}" ${req} placeholder="${f.placeholder||''}"></textarea>`;
  } else if(f.type==='file'){
    control = `<div class="upload-box"><input type="file" name="${f.name}" accept="image/*,.pdf" ${req}><div class="upload-preview" data-preview="${f.name}"></div></div>`;
  } else if(f.type==='number'){
    control = `<input type="number" name="${f.name}" min="0" value="${prefill}" ${req}>`;
  } else {
    control = `<input type="${f.type}" name="${f.name}" value="${prefill}" ${req} placeholder="${f.placeholder||''}">`;
  }
  return `<div class="field" ${showAttr} style="${f.showIf?'display:none':''}"><label>${f.label}${f.required?'':' <span class="muted">(optional)</span>'}</label>${control}</div>`;
}

function openRequestModal(docKey){
  const dt = docType(docKey);
  const res = currentResident();
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
  <div class="overlay" id="ovModal">
    <div class="modal">
      <div class="modal-head">
        <div>
          <h3>${dt.name} Request</h3>
          <p>Fields marked required must be completed</p>
        </div>
        <button class="modal-close" id="closeReqModal">${ICONS.close}</button>
      </div>
      <form id="reqForm">
        <div class="modal-body">
          <fieldset>
            <legend>Requesting Resident</legend>
            <div class="field-row">
              <div class="field"><label>Full Name</label><input type="text" value="${fullName(res)}" disabled></div>
              <div class="field"><label>Civil Status</label><input type="text" value="${res.civilStatus}" disabled></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Address</label><input type="text" value="${residentAddress(res)}" disabled></div>
              <div class="field"><label>Birthdate</label><input type="text" value="${fmtDate(res.birthdate)}" disabled></div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Request Details</legend>
            ${dt.fields.map(f=>fieldHtml(f,res)).join('')}
          </fieldset>
        </div>
        <div class="modal-foot">
          <button type="submit" class="btn btn-primary btn-block">Submit Request</button>
        </div>
      </form>
    </div>
  </div>`;
  bindConditionalFields();
  document.getElementById('closeReqModal').addEventListener('click', closeAllModals);
  document.getElementById('ovModal').addEventListener('click', e=>{ if(e.target.id==='ovModal') closeAllModals(); });
  document.querySelectorAll('#reqForm input[type=file]').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      const prev = document.querySelector(`[data-preview="${inp.name}"]`);
      if(inp.files[0]) prev.textContent = '✓ '+inp.files[0].name;
    });
  });
  document.getElementById('reqForm').addEventListener('submit', async e=>{
    e.preventDefault();
    await submitRequest(dt, res, e.target);
  });
}
function bindConditionalFields(){
  const form = document.getElementById('reqForm');
  if(!form) return;
  function evalShow(){
    form.querySelectorAll('[data-showif-field]').forEach(el=>{
      const fname = el.dataset.showifField, want = el.dataset.showifValue;
      const src = form.querySelector(`[name="${fname}"]`);
      el.style.display = (src && src.value===want) ? '' : 'none';
    });
  }
  form.addEventListener('change', evalShow);
  evalShow();
}

async function submitRequest(dt, res, formEl){
  const submitBtn = formEl.querySelector('button[type=submit]');
  const fd = new FormData(formEl); // disabled prefill fields are auto-excluded by the browser
  fd.append('docKey', dt.key);
  submitBtn.disabled = true; submitBtn.textContent = 'Submitting...';
  try {
    await api('/requests', { method:'POST', body: fd });
    await refreshMyRequests();
    closeAllModals();
    toast('Request submitted! Track it under "My Requests".');
    navigate('#/resident/requests');
  } catch (err) {
    submitBtn.disabled = false; submitBtn.textContent = 'Submit Request';
    toast(err.message || 'Failed to submit request.', true);
  }
}

function closeAllModals(rerender=true){
  const root = document.getElementById('modalRoot');
  if(root) root.innerHTML='';
  const proot = document.getElementById('adminModalRoot');
  if(proot) proot.innerHTML='';
}

/* ---- Resident: My Requests ---- */
function renderMyRequests(res){
  const reqs = DB.requests.filter(r=>r.residentId===res.id).sort((a,b)=> new Date(b.dateRequested)-new Date(a.dateRequested));
  return `
  <div class="card">
    <div class="table-wrap">
    ${reqs.length===0 ? emptyState('requests','No requests yet','Head to "Request Document" to submit your first request.') : `
    <table>
      <thead><tr><th>Reference No.</th><th>Document</th><th>Date Requested</th><th>Last Update</th><th>Status</th><th></th></tr></thead>
      <tbody>
      ${reqs.map(r=>`
        <tr class="rowlink" data-view="${r.id}">
          <td><b>${r.refNo}</b></td>
          <td>${docType(r.docType).name}</td>
          <td class="muted small">${fmtDate(r.dateRequested)}</td>
          <td class="muted small">${fmtDate(r.dateUpdated)}</td>
          <td>${statusBadge(r.status)}</td>
          <td>${ICONS.chevRight}</td>
        </tr>`).join('')}
      </tbody>
    </table>`}
    </div>
  </div>`;
}
function bindMyRequests(res){
  document.querySelectorAll('[data-view]').forEach(row=>row.addEventListener('click', ()=>openRequestDetailModal(row.dataset.view,false)));
}

function openRequestDetailModal(reqId, isAdmin){
  const r = DB.requests.find(x=>x.id===reqId);
  const res = DB.residents.find(x=>x.id===r.residentId);
  const dt = docType(r.docType);
  const root = document.getElementById(isAdmin?'adminModalRoot':'modalRoot');
  const timeline = ['Pending','Approved','Ready for Pickup','Released'];
  const rejected = r.status==='Rejected';
  root.innerHTML = `
  <div class="overlay" id="ovDetail">
    <div class="modal modal-wide">
      <div class="modal-head">
        <div><h3>${dt.name}</h3><p>Reference No. ${r.refNo}</p></div>
        <button class="modal-close" id="closeDetail">${ICONS.close}</button>
      </div>
      <div class="modal-body">
        <div class="flex-between" style="margin-bottom:16px;">
          ${statusBadge(r.status)}
          <span class="muted small">Requested ${fmtDateTime(r.dateRequested)}</span>
        </div>
        ${!rejected ? `<div style="display:flex;gap:6px;margin-bottom:20px;">
          ${timeline.map((s,i)=>`<div style="flex:1;text-align:center;">
            <div style="height:6px;border-radius:4px;background:${statusOrder(r.status)>=i?'var(--green)':'var(--border)'};margin-bottom:6px;"></div>
            <div class="small" style="color:${statusOrder(r.status)>=i?'var(--green-dark)':'var(--text-muted)'};font-weight:${statusOrder(r.status)>=i?'700':'500'};">${s}</div>
          </div>`).join('')}
        </div>` : `<div class="login-error" style="margin-bottom:16px;">This request was rejected. See remarks below.</div>`}

        <fieldset>
          <legend>Requesting Resident</legend>
          <div class="profile-grid" style="padding:0;grid-template-columns:1fr 1fr;">
            <div class="pgi"><div class="l">Full Name</div><div class="v">${fullName(res)}</div></div>
            <div class="pgi"><div class="l">Civil Status</div><div class="v">${res.civilStatus}</div></div>
            <div class="pgi"><div class="l">Address</div><div class="v">${residentAddress(res)}</div></div>
            <div class="pgi"><div class="l">Contact Number</div><div class="v">${res.contactNumber}</div></div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Submitted Details</legend>
          <div class="profile-grid" style="padding:0;grid-template-columns:1fr 1fr;">
          ${dt.fields.map(f=>{
            const v = r.formData[f.name];
            if(f.type==='file'){
              return v ? `<div class="pgi"><div class="l">${f.label}</div><div class="v"><a href="${fileUrl(v)}" target="_blank" style="color:var(--green);font-weight:600;">${r.formData[f.name+'_name']||'View file'}</a></div></div>` : '';
            }
            return v ? `<div class="pgi"><div class="l">${f.label}</div><div class="v">${escapeHtml(String(v))}</div></div>` : '';
          }).join('')}
          </div>
        </fieldset>
        ${r.remarks ? `<fieldset><legend>Barangay Remarks</legend><div class="card-pad" style="background:var(--bg);border-radius:10px;font-size:13.5px;">${escapeHtml(r.remarks)}</div></fieldset>` : ''}
      </div>
      <div class="modal-foot" style="display:flex;gap:10px;">
        ${isAdmin ? `<button class="btn btn-outline btn-block" id="adminManageBtn">Manage Request</button>` : (r.status==='Ready for Pickup' || r.status==='Released' || r.status==='Approved' ? `<button class="btn btn-primary btn-block" id="viewCertBtn">View / Print Certificate</button>`: `<button class="btn btn-outline btn-block" id="closeDetail2">Close</button>`)}
      </div>
    </div>
  </div>`;
  document.getElementById('closeDetail').addEventListener('click', ()=>closeAllModals());
  const cd2 = document.getElementById('closeDetail2'); if(cd2) cd2.addEventListener('click', ()=>closeAllModals());
  document.getElementById('ovDetail').addEventListener('click', e=>{ if(e.target.id==='ovDetail') closeAllModals(); });
  const vc = document.getElementById('viewCertBtn'); if(vc) vc.addEventListener('click', ()=>{ closeAllModals(); navigate('#/certificate/'+r.id); });
  const mb = document.getElementById('adminManageBtn'); if(mb) mb.addEventListener('click', ()=>{ closeAllModals(); openAdminManageModal(r.id); });
}

/* ---- Resident: Announcements ---- */
function renderAnnouncementsList(){
  const list = [...DB.announcements].sort((a,b)=> (b.pinned-a.pinned) || (new Date(b.date)-new Date(a.date)));
  return `<div class="card">${list.map(a=>`
    <div class="ann-item"><div class="top"><h4>${a.title}${a.pinned?'<span class="pin">PINNED</span>':''}</h4><span class="date">${fmtDate(a.date)}</span></div><p>${a.body}</p><p class="small muted" style="margin-top:6px;">— ${a.author}</p></div>
  `).join('')}</div>`;
}

/* ---- Resident: Profile ---- */
function renderProfile(res){
  return `
  <div class="card" style="margin-bottom:20px;">
    <div class="profile-head">
      <label for="photoUploadInput" style="cursor:pointer;position:relative;" title="Click to change photo">
        ${avatarHtml(fullName(res), res.photoDataUrl, 'avatar-lg')}
        <span style="position:absolute;bottom:-2px;right:-2px;background:var(--green);color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;">${ICONS.upload}</span>
      </label>
      <input type="file" id="photoUploadInput" accept="image/*" style="display:none;">
      <div>
        <div style="font-size:17px;font-weight:700;">${fullName(res)}</div>
        <div class="muted small">@${res.username} · Member since ${fmtDate(res.dateRegistered)}</div>
        <div class="muted small" style="margin-top:4px;">Click your photo to change it</div>
      </div>
    </div>
    <div class="profile-grid">
      <div class="pgi"><div class="l">Birthdate</div><div class="v">${fmtDate(res.birthdate)}</div></div>
      <div class="pgi"><div class="l">Sex</div><div class="v">${res.sex}</div></div>
      <div class="pgi"><div class="l">Civil Status</div><div class="v">${res.civilStatus}</div></div>
      <div class="pgi"><div class="l">Occupation</div><div class="v">${res.occupation||'—'}</div></div>
      <div class="pgi"><div class="l">Purok</div><div class="v">${res.purok}</div></div>
      <div class="pgi"><div class="l">Complete Address</div><div class="v">${residentAddress(res)}</div></div>
      <div class="pgi"><div class="l">Contact Number</div><div class="v">${res.contactNumber}</div></div>
      <div class="pgi"><div class="l">Email Address</div><div class="v">${res.email||'—'}</div></div>
      <div class="pgi"><div class="l">Years of Residency</div><div class="v">${res.yearsOfResidency} years</div></div>
      <div class="pgi"><div class="l">Account Status</div><div class="v">${statusBadgeGeneric(res.status)}</div></div>
    </div>
    <div class="card-pad" style="border-top:1px solid var(--border);">
      <button class="btn btn-outline" id="editProfileBtn">Request Profile Update</button>
      <span class="muted small" style="margin-left:10px;">Changes to official records (name, address, civil status, etc.) must be verified at the Barangay Hall.</span>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h3>About Me</h3></div>
    <div class="card-pad">
      <p class="muted small" style="margin:0 0 12px;">A short bio shown on your profile. This is optional and just for your account — not an official barangay record.</p>
      <form id="bioForm">
        <div class="field">
          <textarea name="bio" placeholder="Tell us a bit about yourself..." maxlength="300" style="min-height:100px;">${escapeHtml(res.bio||'')}</textarea>
          <div class="hint" id="bioCount">0/300</div>
        </div>
        <button class="btn btn-primary" type="submit">Save Bio</button>
      </form>
    </div>
  </div>`;
}
function statusBadgeGeneric(s){ return `<span class="badge badge-Approved">${s}</span>`; }
function bindProfile(res){
  const photoInput = document.getElementById('photoUploadInput');
  if (photoInput) photoInput.addEventListener('change', async ()=>{
    const file = photoInput.files[0];
    if (!file) return;
    if (file.size > 3*1024*1024) { toast('Image too large. Please choose a photo under 3MB.', true); return; }
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const updated = await api('/residents/me', { method:'PATCH', body: fd });
      Object.assign(res, mapResident(updated));
      toast('Profile photo updated.');
      render();
    } catch (err) {
      toast(err.message || 'Failed to update photo.', true);
    }
  });

  const bioForm = document.getElementById('bioForm');
  const bioTextarea = bioForm ? bioForm.querySelector('textarea[name=bio]') : null;
  const bioCount = document.getElementById('bioCount');
  function updateCount(){ if (bioCount && bioTextarea) bioCount.textContent = `${bioTextarea.value.length}/300`; }
  if (bioTextarea) { updateCount(); bioTextarea.addEventListener('input', updateCount); }
  if (bioForm) bioForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const bio = new FormData(e.target).get('bio').trim();
    const submitBtn = bioForm.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = 'Saving...';
    try {
      const fd = new FormData();
      fd.append('bio', bio);
      const updated = await api('/residents/me', { method:'PATCH', body: fd });
      Object.assign(res, mapResident(updated));
      toast('Bio saved.');
      render();
    } catch (err) {
      submitBtn.disabled = false; submitBtn.textContent = 'Save Bio';
      toast(err.message || 'Failed to save bio.', true);
    }
  });

  const btn = document.getElementById('editProfileBtn');
  if(btn) btn.addEventListener('click', ()=> toast('Please visit the Barangay Hall or contact staff to update official records.'));
}

/* ----------------------------- ADMIN SHELL ----------------------------- */
const ADMIN_NAV = [
  {key:'dashboard', label:'Dashboard', icon:'dashboard', hash:'#/admin/dashboard'},
  {key:'requests', label:'Document Requests', icon:'requests', hash:'#/admin/requests'},
  {key:'residents', label:'Manage Residents', icon:'people', hash:'#/admin/residents'},
  {key:'announcements', label:'Announcements', icon:'bell', hash:'#/admin/announcements'},
  {key:'history', label:'Certificate History', icon:'history', hash:'#/admin/history'},
];
function renderAdminShell(hash){
  const ad = currentAdmin();
  const app = document.getElementById('app');
  const page = hash.split('/')[2] || 'dashboard';
  const navMeta = {
    dashboard:{title:'Admin Dashboard', sub:'Barangay Capacuhan operations overview'},
    requests:{title:'Document Requests', sub:'Review, approve, and release resident requests'},
    residents:{title:'Manage Residents', sub:'Resident accounts and household records'},
    announcements:{title:'Announcements', sub:'Publish news and updates to residents'},
    history:{title:'Certificate History', sub:'Log of all generated and released certificates'},
  }[page] || {title:'Admin', sub:''};

  app.innerHTML = `
  <div class="shell">
    <div class="mobile-overlay" id="mobileOverlay"></div>
    <div class="sidebar">${sidebarHtml(ADMIN_NAV, page)}</div>
    <div class="main">
      ${topbarHtml(navMeta.title, navMeta.sub, ad.fullName, ad.role)}
      <div class="content" id="pageContent"></div>
    </div>
  </div>
  <div id="adminModalRoot"></div>`;
  bindShellChrome();

  const content = document.getElementById('pageContent');
  if(page==='dashboard'){ content.innerHTML = renderAdminDashboard(); bindAdminDashboard(); }
  else if(page==='requests'){ renderAdminRequestsPage(content); }
  else if(page==='residents'){ renderAdminResidentsPage(content); }
  else if(page==='announcements'){ renderAdminAnnouncementsPage(content); }
  else if(page==='history'){ renderAdminHistoryPage(content); }
}

/* ---- Admin: Dashboard ---- */
function renderAdminDashboard(){
  const all = DB.requests;
  const pending = all.filter(r=>r.status==='Pending').length;
  const todayStr = new Date().toDateString();
  const approvedToday = all.filter(r=>r.status!=='Pending' && new Date(r.dateUpdated).toDateString()===todayStr).length;
  const totalResidents = DB.residents.filter(r=>r.status==='Active').length;
  const recent = [...all].sort((a,b)=> new Date(b.dateRequested)-new Date(a.dateRequested)).slice(0,6);
  return `
  <div class="stat-grid">
    <div class="stat-card">${iconWrap('people','var(--green-pale)','var(--green-dark)')}<div class="num">${totalResidents}</div><div class="lbl">Registered Residents</div></div>
    <div class="stat-card">${iconWrap('clock','var(--amber-bg)','var(--amber)')}<div class="num">${pending}</div><div class="lbl">Pending Requests</div></div>
    <div class="stat-card">${iconWrap('check','var(--emerald-bg)','var(--emerald)')}<div class="num">${approvedToday}</div><div class="lbl">Actioned Today</div></div>
    <div class="stat-card">${iconWrap('trend','var(--blue-bg)','var(--blue)')}<div class="num">${all.length}</div><div class="lbl">Total Requests</div></div>
  </div>
  <div class="card" style="margin-bottom:20px;">
    <div class="card-head"><h3>Recent Document Requests</h3><button class="btn btn-outline btn-sm" data-hash="#/admin/requests">Manage all</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Reference No.</th><th>Resident</th><th>Document</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>
      ${recent.map(r=>{ const res=DB.residents.find(x=>x.id===r.residentId); return `<tr class="rowlink" data-manage="${r.id}"><td><b>${r.refNo}</b></td><td>${fullName(res)}</td><td>${docType(r.docType).name}</td><td class="muted small">${fmtDate(r.dateRequested)}</td><td>${statusBadge(r.status)}</td></tr>`; }).join('')}
      </tbody>
    </table></div>
  </div>
  <div class="card">
    <div class="card-head"><h3>Post a Quick Announcement</h3></div>
    <div class="card-pad">
      <form id="quickAnnForm">
        <div class="field"><label>Title</label><input type="text" name="title" required placeholder="e.g., Barangay Health Center Schedule"></div>
        <div class="field"><label>Message</label><textarea name="body" required placeholder="Write your announcement..."></textarea></div>
        <button class="btn btn-primary" type="submit">Publish Announcement</button>
      </form>
    </div>
  </div>`;
}
function bindAdminDashboard(){
  document.querySelectorAll('[data-hash]').forEach(b=>b.addEventListener('click', ()=>navigate(b.dataset.hash)));
  document.querySelectorAll('[data-manage]').forEach(row=>row.addEventListener('click', ()=>openRequestDetailModal(row.dataset.manage,true)));
  const f = document.getElementById('quickAnnForm');
  if(f) f.addEventListener('submit', async e=>{
    e.preventDefault(); const fd=new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = 'Publishing...';
    try {
      await api('/announcements', { method:'POST', body: JSON.stringify({ title: fd.get('title'), body: fd.get('body'), pinned: false }) });
      await refreshAnnouncements();
      toast('Announcement published.'); render();
    } catch (err) {
      submitBtn.disabled = false; submitBtn.textContent = 'Publish Announcement';
      toast(err.message || 'Failed to publish announcement.', true);
    }
  });
}

/* ---- Admin: Document Requests Management ---- */
let ADMIN_REQ_FILTER = {status:'All', doc:'All', q:''};
function renderAdminRequestsPage(content){
  content.innerHTML = adminRequestsHtml();
  bindAdminRequestsPage();
}
function adminRequestsHtml(){
  const rows = filteredRequests();
  return `
  <div class="search-bar">
    <input type="text" id="reqSearch" placeholder="Search by reference no. or resident name..." value="${ADMIN_REQ_FILTER.q}">
    <select id="reqStatusFilter">
      ${['All','Pending','Approved','Ready for Pickup','Released','Rejected'].map(s=>`<option ${ADMIN_REQ_FILTER.status===s?'selected':''}>${s}</option>`).join('')}
    </select>
    <select id="reqDocFilter">
      <option ${ADMIN_REQ_FILTER.doc==='All'?'selected':''}>All</option>
      ${DOC_TYPES.map(d=>`<option value="${d.key}" ${ADMIN_REQ_FILTER.doc===d.key?'selected':''}>${d.name}</option>`).join('')}
    </select>
  </div>
  <div class="card">
    <div class="table-wrap">
    ${rows.length===0 ? emptyState('requests','No matching requests','Try adjusting your search or filters.') : `
    <table>
      <thead><tr><th>Reference No.</th><th>Resident</th><th>Document</th><th>Date Requested</th><th>Status</th><th></th></tr></thead>
      <tbody>
      ${rows.map(r=>{ const res=DB.residents.find(x=>x.id===r.residentId); return `
        <tr class="rowlink" data-manage="${r.id}">
          <td><b>${r.refNo}</b></td>
          <td>${fullName(res)}</td>
          <td>${docType(r.docType).name}</td>
          <td class="muted small">${fmtDate(r.dateRequested)}</td>
          <td>${statusBadge(r.status)}</td>
          <td>${ICONS.chevRight}</td>
        </tr>`; }).join('')}
      </tbody>
    </table>`}
    </div>
  </div>`;
}
function filteredRequests(){
  return DB.requests.filter(r=>{
    const res = DB.residents.find(x=>x.id===r.residentId);
    if(ADMIN_REQ_FILTER.status!=='All' && r.status!==ADMIN_REQ_FILTER.status) return false;
    if(ADMIN_REQ_FILTER.doc!=='All' && r.docType!==ADMIN_REQ_FILTER.doc) return false;
    if(ADMIN_REQ_FILTER.q){
      const q = ADMIN_REQ_FILTER.q.toLowerCase();
      if(!r.refNo.toLowerCase().includes(q) && !fullName(res).toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a,b)=> new Date(b.dateRequested)-new Date(a.dateRequested));
}
function bindAdminRequestsPage(){
  document.getElementById('reqSearch').addEventListener('input', e=>{ ADMIN_REQ_FILTER.q=e.target.value; refreshAdminRequestsTable(); });
  document.getElementById('reqStatusFilter').addEventListener('change', e=>{ ADMIN_REQ_FILTER.status=e.target.value; refreshAdminRequestsTable(); });
  document.getElementById('reqDocFilter').addEventListener('change', e=>{ ADMIN_REQ_FILTER.doc=e.target.value; refreshAdminRequestsTable(); });
  document.querySelectorAll('[data-manage]').forEach(row=>row.addEventListener('click', ()=>openRequestDetailModal(row.dataset.manage,true)));
}
function refreshAdminRequestsTable(){
  const content = document.getElementById('pageContent');
  content.innerHTML = adminRequestsHtml();
  bindAdminRequestsPage();
  // restore focus to search box for smooth typing
  const s = document.getElementById('reqSearch'); if(s){ s.focus(); s.selectionStart=s.selectionEnd=s.value.length; }
}

/* ---- Admin: Manage single request (status update / remarks) ---- */
function openAdminManageModal(reqId){
  const r = DB.requests.find(x=>x.id===reqId);
  const res = DB.residents.find(x=>x.id===r.residentId);
  const dt = docType(r.docType);
  const root = document.getElementById('adminModalRoot');
  root.innerHTML = `
  <div class="overlay" id="ovManage">
    <div class="modal">
      <div class="modal-head">
        <div><h3>Manage Request</h3><p>${dt.name} · ${r.refNo}</p></div>
        <button class="modal-close" id="closeManage">${ICONS.close}</button>
      </div>
      <form id="manageForm">
        <div class="modal-body">
          <div class="field"><label>Resident</label><input type="text" value="${fullName(res)} — ${residentAddress(res)}" disabled></div>
          <div class="field">
            <label>Update Status</label>
            <select name="status">
              ${['Pending','Approved','Rejected','Ready for Pickup','Released'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Remarks</label>
            <textarea name="remarks" placeholder="Add notes visible to the resident (e.g., reason for rejection, OR number, pickup instructions)...">${escapeHtml(r.remarks)}</textarea>
          </div>
        </div>
        <div class="modal-foot" style="display:flex;gap:10px;">
          <button type="button" class="btn btn-outline" id="printCertBtn" style="flex:1;">Generate / Print Certificate</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Save Changes</button>
        </div>
      </form>
    </div>
  </div>`;
  document.getElementById('closeManage').addEventListener('click', ()=>closeAllModals());
  document.getElementById('ovManage').addEventListener('click', e=>{ if(e.target.id==='ovManage') closeAllModals(); });
  document.getElementById('printCertBtn').addEventListener('click', ()=>{ navigate('#/certificate/'+r.id); });
  document.getElementById('manageForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = 'Saving...';
    try {
      await api('/requests/'+r.id, { method:'PATCH', body: JSON.stringify({ status: fd.get('status'), remarks: fd.get('remarks') }) });
      await refreshAllRequests();
      closeAllModals();
      toast('Request updated: '+fd.get('status'));
      render();
    } catch (err) {
      submitBtn.disabled = false; submitBtn.textContent = 'Save Changes';
      toast(err.message || 'Failed to update request.', true);
    }
  });
}

/* ---- Admin: Manage Residents ---- */
let RES_SEARCH = '';
function renderAdminResidentsPage(content){
  content.innerHTML = adminResidentsHtml();
  bindAdminResidentsPage();
}
function adminResidentsHtml(){
  const list = DB.residents.filter(r=> fullName(r).toLowerCase().includes(RES_SEARCH.toLowerCase()) || r.username.toLowerCase().includes(RES_SEARCH.toLowerCase()));
  return `
  <div class="flex-between search-bar">
    <input type="text" id="resSearch" placeholder="Search residents by name or username..." value="${RES_SEARCH}" style="max-width:340px;">
    <button class="btn btn-primary" id="addResidentBtn">${ICONS.plus} Add Resident</button>
  </div>
  <div class="card">
    <div class="table-wrap">
    ${list.length===0? emptyState('people','No residents found','Try a different search term.') : `
    <table>
      <thead><tr><th>Name</th><th>Username</th><th>Purok</th><th>Contact No.</th><th>Status</th><th></th></tr></thead>
      <tbody>
      ${list.map(r=>`
        <tr class="rowlink" data-res="${r.id}">
          <td><b>${fullName(r)}</b></td>
          <td class="muted">${r.username}</td>
          <td>${r.purok}</td>
          <td class="muted small">${r.contactNumber}</td>
          <td><span class="badge badge-${r.status==='Active'?'Approved':'Rejected'}">${r.status}</span></td>
          <td>${ICONS.chevRight}</td>
        </tr>`).join('')}
      </tbody>
    </table>`}
    </div>
  </div>`;
}
function bindAdminResidentsPage(){
  document.getElementById('resSearch').addEventListener('input', e=>{ RES_SEARCH=e.target.value; const c=document.getElementById('pageContent'); c.innerHTML=adminResidentsHtml(); bindAdminResidentsPage(); document.getElementById('resSearch').focus(); });
  document.getElementById('addResidentBtn').addEventListener('click', ()=>openResidentFormModal(null));
  document.querySelectorAll('[data-res]').forEach(row=>row.addEventListener('click', ()=>openResidentFormModal(row.dataset.res)));
}
function openResidentFormModal(resId){
  const editing = !!resId;
  const r = editing ? DB.residents.find(x=>x.id===resId) : null;
  const root = document.getElementById('adminModalRoot');
  root.innerHTML = `
  <div class="overlay" id="ovRes">
    <div class="modal modal-wide">
      <div class="modal-head">
        <div><h3>${editing?'Resident Profile':'Add New Resident'}</h3><p>${editing?'View, edit, or manage this resident account':'Create a new resident portal account'}</p></div>
        <button class="modal-close" id="closeRes">${ICONS.close}</button>
      </div>
      <form id="resForm">
        <div class="modal-body">
          <fieldset><legend>Personal Information</legend>
            <div class="field-row">
              <div class="field"><label>First Name</label><input type="text" name="firstName" required value="${r?r.firstName:''}"></div>
              <div class="field"><label>Last Name</label><input type="text" name="lastName" required value="${r?r.lastName:''}"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Middle Name</label><input type="text" name="middleName" value="${r?r.middleName:''}"></div>
              <div class="field"><label>Suffix</label><input type="text" name="suffix" value="${r?r.suffix:''}" placeholder="Jr., Sr., III"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Birthdate</label><input type="date" name="birthdate" required value="${r?r.birthdate:''}"></div>
              <div class="field"><label>Sex</label><select name="sex"><option ${r&&r.sex==='Male'?'selected':''}>Male</option><option ${r&&r.sex==='Female'?'selected':''}>Female</option></select></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Civil Status</label><select name="civilStatus">${['Single','Married','Widowed','Separated','Divorced'].map(o=>`<option ${r&&r.civilStatus===o?'selected':''}>${o}</option>`).join('')}</select></div>
              <div class="field"><label>Occupation</label><input type="text" name="occupation" value="${r?r.occupation:''}"></div>
            </div>
          </fieldset>
          <fieldset><legend>Address & Contact</legend>
            <div class="field-row">
              <div class="field"><label>Purok</label><select name="purok">${['Purok 1','Purok 2','Purok 3','Purok 4','Purok 5'].map(o=>`<option ${r&&r.purok===o?'selected':''}>${o}</option>`).join('')}</select></div>
              <div class="field"><label>Years of Residency</label><input type="number" min="0" name="yearsOfResidency" value="${r?r.yearsOfResidency:''}"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Contact Number</label><input type="tel" name="contactNumber" required value="${r?r.contactNumber:''}"></div>
              <div class="field"><label>Email Address</label><input type="email" name="email" value="${r?r.email:''}"></div>
            </div>
          </fieldset>
          <fieldset><legend>Portal Account</legend>
            <div class="field-row">
              <div class="field"><label>Username</label><input type="text" name="username" required value="${r?r.username:''}"></div>
              <div class="field"><label>Password</label><input type="text" name="password" ${editing?'':'required'} value="" placeholder="${editing?'Leave blank to keep current password':'Set a password'}"></div>
            </div>
            ${editing? `<div class="field"><label>Account Status</label><select name="status"><option ${r.status==='Active'?'selected':''}>Active</option><option ${r.status==='Deactivated'?'selected':''}>Deactivated</option></select></div>`:''}
          </fieldset>
        </div>
        <div class="modal-foot" style="display:flex;gap:10px;">
          ${editing? `<button type="button" class="btn btn-outline" id="viewHistoryBtn" style="flex:1;">View Request History</button>`:''}
          <button type="submit" class="btn btn-primary" style="flex:1;">${editing?'Save Changes':'Create Account'}</button>
        </div>
      </form>
    </div>
  </div>`;
  document.getElementById('closeRes').addEventListener('click', ()=>closeAllModals());
  document.getElementById('ovRes').addEventListener('click', e=>{ if(e.target.id==='ovRes') closeAllModals(); });
  const vh = document.getElementById('viewHistoryBtn');
  if(vh) vh.addEventListener('click', ()=>{ ADMIN_REQ_FILTER={status:'All',doc:'All',q:fullName(r)}; closeAllModals(); navigate('#/admin/requests'); });
  document.getElementById('resForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (!data.password) delete data.password; // empty = keep existing password on edit
    const submitBtn = e.target.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = editing ? 'Saving...' : 'Creating...';
    try {
      if (editing) {
        await api('/residents/'+r.id, { method:'PUT', body: JSON.stringify(data) });
        toast('Resident profile updated.');
      } else {
        if (!data.password) { toast('Password is required for a new account.', true); submitBtn.disabled=false; submitBtn.textContent='Create Account'; return; }
        await api('/residents', { method:'POST', body: JSON.stringify(data) });
        toast('Resident account created.');
      }
      await refreshResidents();
      closeAllModals(); render();
    } catch (err) {
      submitBtn.disabled = false; submitBtn.textContent = editing ? 'Save Changes' : 'Create Account';
      toast(err.message || 'Failed to save resident.', true);
    }
  });
}

/* ---- Admin: Announcements Management ---- */
function renderAdminAnnouncementsPage(content){
  content.innerHTML = adminAnnHtml();
  bindAdminAnnPage();
}
function adminAnnHtml(){
  const list = [...DB.announcements].sort((a,b)=> (b.pinned-a.pinned) || (new Date(b.date)-new Date(a.date)));
  return `
  <div class="flex-between" style="margin-bottom:16px;">
    <div></div>
    <button class="btn btn-primary" id="newAnnBtn">${ICONS.plus} New Announcement</button>
  </div>
  <div class="card">
    ${list.map(a=>`
    <div class="ann-item">
      <div class="top"><h4>${a.title}${a.pinned?'<span class="pin">PINNED</span>':''}</h4><span class="date">${fmtDate(a.date)}</span></div>
      <p>${a.body}</p>
      <div style="margin-top:10px;display:flex;gap:8px;">
        <button class="btn btn-outline btn-sm" data-pin="${a.id}">${a.pinned?'Unpin':'Pin'}</button>
        <button class="btn btn-outline btn-sm" data-editann="${a.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-delann="${a.id}">Delete</button>
      </div>
    </div>`).join('')}
  </div>`;
}
function bindAdminAnnPage(){
  document.getElementById('newAnnBtn').addEventListener('click', ()=>openAnnModal(null));
  document.querySelectorAll('[data-pin]').forEach(b=>b.addEventListener('click', async ()=>{
    const a=DB.announcements.find(x=>x.id===b.dataset.pin);
    try { await api('/announcements/'+a.id, { method:'PUT', body: JSON.stringify({ pinned: !a.pinned }) }); await refreshAnnouncements(); render(); }
    catch(err){ toast(err.message || 'Failed to update announcement.', true); }
  }));
  document.querySelectorAll('[data-editann]').forEach(b=>b.addEventListener('click', ()=>openAnnModal(b.dataset.editann)));
  document.querySelectorAll('[data-delann]').forEach(b=>b.addEventListener('click', async ()=>{
    if(!confirm('Delete this announcement?')) return;
    try { await api('/announcements/'+b.dataset.delann, { method:'DELETE' }); await refreshAnnouncements(); render(); }
    catch(err){ toast(err.message || 'Failed to delete announcement.', true); }
  }));
}
function openAnnModal(annId){
  const editing = !!annId;
  const a = editing ? DB.announcements.find(x=>x.id===annId) : null;
  const root = document.getElementById('adminModalRoot');
  root.innerHTML = `
  <div class="overlay" id="ovAnn">
    <div class="modal">
      <div class="modal-head"><div><h3>${editing?'Edit Announcement':'New Announcement'}</h3></div><button class="modal-close" id="closeAnn">${ICONS.close}</button></div>
      <form id="annForm">
        <div class="modal-body">
          <div class="field"><label>Title</label><input type="text" name="title" required value="${a?a.title:''}"></div>
          <div class="field"><label>Message</label><textarea name="body" required>${a?a.body:''}</textarea></div>
          <div class="field"><label><input type="checkbox" name="pinned" ${a&&a.pinned?'checked':''} style="width:auto;margin-right:6px;">Pin to top</label></div>
        </div>
        <div class="modal-foot"><button class="btn btn-primary btn-block" type="submit">${editing?'Save Changes':'Publish Announcement'}</button></div>
      </form>
    </div>
  </div>`;
  document.getElementById('closeAnn').addEventListener('click', ()=>closeAllModals());
  document.getElementById('ovAnn').addEventListener('click', e=>{ if(e.target.id==='ovAnn') closeAllModals(); });
  document.getElementById('annForm').addEventListener('submit', async e=>{
    e.preventDefault(); const fd=new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = editing ? 'Saving...' : 'Publishing...';
    const payload = { title: fd.get('title'), body: fd.get('body'), pinned: !!fd.get('pinned') };
    try {
      if (editing) { await api('/announcements/'+a.id, { method:'PUT', body: JSON.stringify(payload) }); toast('Announcement updated.'); }
      else { await api('/announcements', { method:'POST', body: JSON.stringify(payload) }); toast('Announcement published.'); }
      await refreshAnnouncements();
      closeAllModals(); render();
    } catch (err) {
      submitBtn.disabled = false; submitBtn.textContent = editing ? 'Save Changes' : 'Publish Announcement';
      toast(err.message || 'Failed to save announcement.', true);
    }
  });
}

/* ---- Admin: Certificate History ---- */
function renderAdminHistoryPage(content){
  const list = DB.requests.filter(r=>['Approved','Ready for Pickup','Released'].includes(r.status)).sort((a,b)=> new Date(b.dateUpdated)-new Date(a.dateUpdated));
  content.innerHTML = `
  <div class="card">
    <div class="table-wrap">
    ${list.length===0? emptyState('history','No certificates generated yet','Approved requests will appear here for printing.') : `
    <table>
      <thead><tr><th>Reference No.</th><th>Resident</th><th>Document</th><th>Status</th><th>Last Updated</th><th></th></tr></thead>
      <tbody>
      ${list.map(r=>{ const res=DB.residents.find(x=>x.id===r.residentId); return `
        <tr>
          <td><b>${r.refNo}</b></td><td>${fullName(res)}</td><td>${docType(r.docType).name}</td><td>${statusBadge(r.status)}</td>
          <td class="muted small">${fmtDateTime(r.dateUpdated)}</td>
          <td><button class="btn btn-outline btn-sm" data-print="${r.id}">${ICONS.print} Print</button></td>
        </tr>`; }).join('')}
      </tbody>
    </table>`}
    </div>
  </div>`;
  document.querySelectorAll('[data-print]').forEach(b=>b.addEventListener('click', ()=> navigate('#/certificate/'+b.dataset.print)));
}

/* ----------------------------- CERTIFICATE PAGE ----------------------------- */
function renderCertificatePage(reqId){
  const r = DB.requests.find(x=>x.id===reqId);
  if(!r) return `<div class="login-wrap"><div class="card card-pad">Certificate not found.</div></div>`;
  const res = DB.residents.find(x=>x.id===r.residentId);
  const dt = docType(r.docType);
  const controlNo = r.refNo;
  return `
  <div style="background:var(--bg);min-height:100vh;padding:30px 16px;">
    <div class="cert-toolbar no-print">
      <button class="btn btn-outline" id="certBack">&larr; Back</button>
      <button class="btn btn-primary" id="certPrint" style="white-space:nowrap;">${ICONS.print} Print / Save PDF</button>
    </div>
    <div class="cert-page">
      <div class="cert-watermark"><img src="${SEAL_SRC}"></div>
      <div class="cert-header">
        <div class="htext">
          <div class="l1">Republic of the Philippines</div>
          <div class="l2">Province of Samar</div>
          <div class="l3">City of Calbayog</div>
          <div class="l4">OFFICE OF THE PUNONG BARANGAY</div>
          <div class="l5">BARANGAY CAPACUHAN</div>
          <div class="l6">Oquendo District, Calbayog City</div>
        </div>
        <img src="${SEAL_SRC}" alt="seal">
      </div>
      <div class="cert-refno">Control No.: ${controlNo}</div>
      <div class="cert-title">${dt.certTitle}</div>
      <div class="cert-body">
        <p style="text-align:left;font-weight:700;">TO WHOM IT MAY CONCERN:</p>
        ${dt.certBody(r,res)}
      </div>
      <div class="cert-sign">
        <div class="cert-sign-block">
          <div class="approved-by">Approved by:</div>
          <div class="sig-space"></div>
          <div class="name">${DB.puno_barangay.toUpperCase()}</div>
          <div class="role">Punong Barangay</div>
        </div>
      </div>
      <div class="cert-foot">
        This is a system-generated certificate from the Brgy Capacuhan Management System (BCMS). Valid only with the official dry seal / signature of the Barangay. Not valid for altered or reproduced copies.<br>
        Generated on ${fmtDateTime(new Date().toISOString())} · Reference No. ${controlNo} · Status: ${r.status}
      </div>
    </div>
  </div>`;
}
function bindCertificatePage(reqId){
  const b = document.getElementById('certBack'); if(b) b.addEventListener('click', ()=> window.history.back());
  const p = document.getElementById('certPrint'); if(p) p.addEventListener('click', ()=> window.print());
}

/* ----------------------------- INITIAL BOOT ----------------------------- */
render();
