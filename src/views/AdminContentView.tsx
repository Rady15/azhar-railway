import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Company, Announcement } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { confirmUi, promptUi } from '../utils/uiDialog';

type Props = {
  mode:'companies'|'announcements'; companies:Company[]; announcements:Announcement[];
  onAddCompany:(x:Partial<Company>)=>Promise<void>; onUpdateCompany:(id:string,x:Partial<Company>)=>Promise<void>; onDeleteCompany:(id:string)=>Promise<void>;
  onAddAnnouncement:(x:Partial<Announcement>)=>Promise<void>; onUpdateAnnouncement:(id:string,x:Partial<Announcement>)=>Promise<void>; onDeleteAnnouncement:(id:string)=>Promise<void>;
};
export const AdminContentView:React.FC<Props> = (p) => {
  const {language}=useLanguage(); const [q,setQ]=useState('');
  const rows=(p.mode==='companies'?p.companies:p.announcements).filter((x:any)=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
  const add=async()=>{
    if(p.mode==='companies'){
      const companyName=await promptUi({title:language==='ar'?'إضافة شركة':'Add company',message:language==='ar'?'أدخل اسم الشركة.':'Enter company name.',inputLabel:language==='ar'?'اسم الشركة':'Company name',confirmText:language==='ar'?'التالي':'Next',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(!companyName)return;
      const contactPerson=await promptUi({title:language==='ar'?'جهة الاتصال':'Contact person',message:language==='ar'?'أدخل اسم جهة الاتصال.':'Enter the contact person.',inputLabel:language==='ar'?'جهة الاتصال':'Contact person',confirmText:language==='ar'?'التالي':'Next',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(contactPerson===null)return;
      const specialization=await promptUi({title:language==='ar'?'التخصص':'Specialization',message:language==='ar'?'أدخل تخصص الشركة.':'Enter company specialization.',inputLabel:language==='ar'?'التخصص':'Specialization',confirmText:language==='ar'?'التالي':'Next',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(specialization===null)return;
      const phone=await promptUi({title:language==='ar'?'رقم الهاتف':'Phone number',message:language==='ar'?'أدخل رقم هاتف الشركة.':'Enter the company phone number.',inputLabel:language==='ar'?'الهاتف':'Phone',confirmText:language==='ar'?'إضافة الشركة':'Add company',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(phone===null)return;
      await p.onAddCompany({companyName,contactPerson,specialization,phone,email:'',notes:''});
    }else{
      const title=await promptUi({title:language==='ar'?'إضافة إعلان':'Add announcement',message:language==='ar'?'أدخل عنوان الإعلان.':'Enter announcement title.',inputLabel:language==='ar'?'العنوان':'Title',confirmText:language==='ar'?'التالي':'Next',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(!title)return;
      const description=await promptUi({title:language==='ar'?'نص الإعلان':'Announcement text',message:language==='ar'?'أدخل تفاصيل الإعلان.':'Enter announcement details.',inputLabel:language==='ar'?'التفاصيل':'Description',confirmText:language==='ar'?'نشر الإعلان':'Publish',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(description===null)return;
      await p.onAddAnnouncement({title,description,isActive:true,announcementDate:new Date().toISOString().slice(0,10)});
    }
  };
  const edit=async(x:any)=>{
    if(p.mode==='companies'){
      const companyName=await promptUi({title:language==='ar'?'تعديل الشركة':'Edit company',message:language==='ar'?'عدل اسم الشركة.':'Edit company name.',inputLabel:language==='ar'?'اسم الشركة':'Company name',defaultValue:x.companyName||'',confirmText:language==='ar'?'التالي':'Next',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(companyName===null)return;
      const phone=await promptUi({title:language==='ar'?'تعديل الهاتف':'Edit phone',message:language==='ar'?'عدل رقم الهاتف.':'Edit phone number.',inputLabel:language==='ar'?'الهاتف':'Phone',defaultValue:x.phone||'',confirmText:language==='ar'?'حفظ':'Save',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(phone===null)return;
      await p.onUpdateCompany(x.id,{...x,companyName,phone});
    }else{
      const title=await promptUi({title:language==='ar'?'تعديل الإعلان':'Edit announcement',message:language==='ar'?'عدل عنوان الإعلان.':'Edit announcement title.',inputLabel:language==='ar'?'العنوان':'Title',defaultValue:x.title||'',confirmText:language==='ar'?'التالي':'Next',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(title===null)return;
      const description=await promptUi({title:language==='ar'?'تعديل نص الإعلان':'Edit announcement text',message:language==='ar'?'عدل تفاصيل الإعلان.':'Edit announcement details.',inputLabel:language==='ar'?'التفاصيل':'Description',defaultValue:x.description||'',confirmText:language==='ar'?'حفظ':'Save',cancelText:language==='ar'?'إلغاء':'Cancel'}); if(description===null)return;
      await p.onUpdateAnnouncement(x.id,{...x,title,description});
    }
  };
  const del=async(x:any)=>{const ok=await confirmUi({title:language==='ar'?'تأكيد الحذف':'Confirm delete',message:language==='ar'?'هل أنت متأكد من حذف هذا السجل؟':'Are you sure you want to delete this record?',confirmText:language==='ar'?'حذف':'Delete',cancelText:language==='ar'?'إلغاء':'Cancel',tone:'danger'});if(!ok)return; p.mode==='companies'?await p.onDeleteCompany(x.id):await p.onDeleteAnnouncement(x.id);};
  return <div className="space-y-4"><div className="bg-white border rounded-2xl p-5 flex items-center justify-between"><div><h1 className="text-xl font-bold">{p.mode==='companies'?(language==='ar'?'إدارة الشركات':'Companies Management'):(language==='ar'?'إدارة الإعلانات':'Announcements Management')}</h1><p className="text-xs text-slate-500">{language==='ar'?'إدارة السجلات وإضافة وتعديل البيانات بسهولة':'Manage records and update information easily'}</p></div><button onClick={add} className="bg-cyan-600 text-white px-4 py-2 rounded-xl flex gap-2"><Plus className="w-4 h-4"/>{language==='ar'?'إضافة':'Add'}</button></div><div className="bg-white border rounded-xl p-3 relative"><Search className="w-4 h-4 absolute left-5 top-5 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} className="w-full border rounded-lg py-2 pl-9 pr-3" placeholder={language==='ar'?'بحث...':'Search...'}/></div><div className="bg-white border rounded-2xl overflow-hidden"><table className="w-full text-xs"><thead className="bg-slate-100"><tr><th className="p-3">#</th><th className="p-3 text-start">{p.mode==='companies'?'Name':'Title'}</th><th className="p-3 text-start">{p.mode==='companies'?'Contact / Phone':'Description'}</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{rows.map((x:any,i)=><tr key={x.id} className="border-t"><td className="p-3 text-center">{i+1}</td><td className="p-3 font-bold">{p.mode==='companies'?x.companyName:x.title}</td><td className="p-3">{p.mode==='companies'?`${x.contactPerson||''} ${x.phone||''}`:x.description}</td><td className="p-3 text-center">{p.mode==='companies'?'Active':(x.isActive?'Active':'Inactive')}</td><td className="p-3"><div className="flex justify-center gap-2"><button onClick={()=>edit(x)} className="p-2 bg-slate-100 rounded"><Pencil className="w-4 h-4"/></button><button onClick={()=>del(x)} className="p-2 bg-rose-50 text-rose-600 rounded"><Trash2 className="w-4 h-4"/></button></div></td></tr>)}</tbody></table></div></div>;
};
