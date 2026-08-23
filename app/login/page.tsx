"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage(){
  return <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-[#f3f6f4]"><LoaderCircle className="animate-spin text-brand-600"/></div>}><LoginForm/></Suspense>;
}

function LoginForm(){
  const [code,setCode]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(false);const router=useRouter();const search=useSearchParams();
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");try{const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});const data=await response.json();if(!response.ok)throw new Error(data.error||"登录失败");router.replace(search.get("next")||"/");router.refresh()}catch(e){setError(e instanceof Error?e.message:"登录失败")}finally{setLoading(false)}}
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#f3f6f4] p-5"><div className="w-full max-w-md"><div className="mb-6 flex justify-center"><div className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg"><Sparkles size={22}/></div></div><div className="panel p-7"><div className="text-center"><p className="eyebrow">Secure Workspace</p><h1 className="mt-3 text-2xl font-bold">进入招聘工作台</h1><p className="mt-2 text-sm leading-6 text-[#6d7972]">输入管理员配置的访问码。候选人数据属于敏感信息，请勿共享访问权限。</p></div><form onSubmit={submit} className="mt-6"><label className="label">工作区访问码</label><div className="relative"><KeyRound size={16} className="absolute left-3 top-3 text-[#8b9690]"/><input autoFocus type="password" value={code} onChange={e=>setCode(e.target.value)} className="input !pl-9" placeholder="请输入访问码"/></div>{error&&<p className="mt-2 text-xs text-[#a64f45]">{error}</p>}<button disabled={loading} className="btn-primary mt-4 w-full">{loading?<LoaderCircle size={16} className="animate-spin"/>:<ShieldCheck size={16}/>}验证并进入</button></form></div><p className="mt-4 text-center text-[11px] text-[#8b9690]">AI Talent Copilot · AI分析仅供辅助参考</p></div></div>
}
