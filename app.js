import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// ضع بيانات مشروع Firebase هنا من Firebase Console > Project settings > Your apps.
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};
const configured = !firebaseConfig.apiKey.startsWith('YOUR_');
let auth, db;
if (configured) { const app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); }

const $=s=>document.querySelector(s);
const splash=$('#splash');
window.addEventListener('load',()=>{setTimeout(()=>splash?.classList.add('hide'),8000);});
const nav=$('#mainNav'), menu=$('#menuBtn'); menu.onclick=()=>nav.classList.toggle('open');
document.querySelectorAll('nav a').forEach(a=>a.onclick=()=>nav.classList.remove('open'));

document.querySelectorAll('.filters button').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;document.querySelectorAll('.project').forEach(p=>p.style.display=(f==='all'||p.dataset.cat===f)?'block':'none')});
document.querySelectorAll('[data-service]').forEach(a=>a.onclick=()=>{setTimeout(()=>{$('#service').value=a.dataset.service},50)});

const modal=$('#authModal'); let loginMode=true;
function openAuth(){modal.classList.add('open'); $('#authMsg').textContent=configured?'':'أكمل إعداد Firebase أولًا في app.js.'}
function closeAuth(){modal.classList.remove('open')}
$('#loginBtn').onclick=openAuth; $('#closeModal').onclick=closeAuth; modal.onclick=e=>{if(e.target===modal)closeAuth()};
$('#switchAuth').onclick=()=>{loginMode=!loginMode;$('#authTitle').textContent=loginMode?'مرحبًا بك في إبداع برو':'أنشئ حسابك في إبداع برو';$('#authSub').textContent=loginMode?'سجّل الدخول للوصول إلى طلباتك.':'أنشئ حسابًا مجانيًا لإرسال ومتابعة طلباتك.';$('#authSubmit').textContent=loginMode?'تسجيل الدخول':'إنشاء حساب';$('#switchAuth').textContent=loginMode?'ليس لديك حساب؟ إنشاء حساب':'لديك حساب؟ تسجيل الدخول';$('#authMsg').textContent=''};
$('#googleBtn').onclick=async()=>{if(!configured)return $('#authMsg').textContent='لم يتم إعداد Firebase بعد.';try{await signInWithPopup(auth,new GoogleAuthProvider());closeAuth()}catch(e){$('#authMsg').textContent=humanError(e)}};
$('#authForm').onsubmit=async e=>{e.preventDefault();if(!configured)return $('#authMsg').textContent='لم يتم إعداد Firebase بعد.';const email=$('#authEmail').value,password=$('#authPassword').value;try{if(loginMode)await signInWithEmailAndPassword(auth,email,password);else await createUserWithEmailAndPassword(auth,email,password);closeAuth()}catch(e){$('#authMsg').textContent=humanError(e)}};
function humanError(e){const m={'auth/invalid-credential':'البريد الإلكتروني أو كلمة المرور غير صحيحة.','auth/email-already-in-use':'هذا البريد مستخدم بالفعل.','auth/weak-password':'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.','auth/popup-closed-by-user':'تم إغلاق نافذة Google.','auth/network-request-failed':'تحقق من اتصال الإنترنت.'};return m[e.code]||'حدث خطأ، حاول مرة أخرى.'}

let currentUser=null;
const accountModal=$('#accountModal');
const accountEmail=$('#accountEmail');
const accountAvatar=$('#accountAvatar');
const accountProvider=$('#accountProvider');
const accountRequests=$('#accountRequests');
const requestCount=$('#requestCount');

function openAccount(){
  if(!currentUser){ openAuth(); return; }
  accountEmail.textContent=currentUser.email||'حساب Google';
  accountAvatar.textContent=(currentUser.displayName||currentUser.email||'م').trim().charAt(0).toUpperCase();
  accountProvider.textContent=currentUser.providerData?.some(p=>p.providerId==='google.com')?'Google':'Email';
  accountModal.classList.add('open');
  loadMyRequests();
}
function closeAccount(){accountModal.classList.remove('open')}
$('#closeAccount').onclick=closeAccount;
accountModal.onclick=e=>{if(e.target===accountModal)closeAccount()};
$('#logoutBtn').onclick=async()=>{if(auth){await signOut(auth);closeAccount();}};

async function loadMyRequests(){
  if(!configured||!db||!currentUser)return;
  accountRequests.innerHTML='<div class="account-empty">جارٍ تحميل طلباتك...</div>';
  try{
    let snap;
    try{
      snap=await getDocs(query(collection(db,'serviceRequests'),where('userId','==',currentUser.uid),orderBy('createdAt','desc')));
    }catch(_){
      snap=await getDocs(query(collection(db,'serviceRequests'),where('userId','==',currentUser.uid)));
    }
    requestCount.textContent=snap.size;
    if(snap.empty){accountRequests.innerHTML='<div class="account-empty">لا توجد طلبات حتى الآن.<br>يمكنك إرسال أول طلب من قسم «اطلب خدمة».</div>';return;}
    const items=[];
    snap.forEach(doc=>{
      const d=doc.data();
      const status=d.status||'new';
      const labels={new:'جديد',in_progress:'قيد التنفيذ',review:'قيد المراجعة',completed:'مكتمل',cancelled:'ملغى'};
      const date=d.createdAt?.toDate?d.createdAt.toDate().toLocaleDateString('ar-MR'):'—';
      items.push(`<div class="account-request"><div><strong>${escapeHtml(d.service||'خدمة')}</strong><small>${escapeHtml(date)}</small></div><span class="status status-${escapeHtml(status)}">${labels[status]||escapeHtml(status)}</span></div>`);
    });
    accountRequests.innerHTML=items.join('');
  }catch(err){
    accountRequests.innerHTML='<div class="account-empty">تعذر تحميل الطلبات. تحقق من قواعد Firestore.</div>';
  }
}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

if(configured){
  onAuthStateChanged(auth,u=>{
    currentUser=u;
    const b=$('#loginBtn');
    if(u){
      b.textContent='حسابي';
      b.onclick=openAccount;
    }else{
      b.textContent='تسجيل الدخول';
      b.onclick=openAuth;
    }
  });
}else{
  $('#loginBtn').onclick=openAuth;
}

$('#requestForm').onsubmit=async e=>{e.preventDefault();const msg=$('#requestMsg');if(!configured){msg.textContent='أكمل إعداد Firebase في app.js أولًا.';msg.style.color='#b42318';return}if(!currentUser){msg.textContent='يجب تسجيل الدخول أولًا.';msg.style.color='#b42318';openAuth();return}const data={userId:currentUser.uid,userEmail:currentUser.email||'',service:$('#service').value,name:$('#clientName').value.trim(),phone:$('#phone').value.trim(),details:$('#details').value.trim(),status:'new',createdAt:serverTimestamp()};try{await addDoc(collection(db,'serviceRequests'),data);msg.textContent='تم إرسال طلبك بنجاح، سنتواصل معك قريبًا.';msg.style.color='#067647';e.target.reset()}catch(err){msg.textContent='تعذر إرسال الطلب. تحقق من قواعد Firestore.';msg.style.color='#b42318'}};
