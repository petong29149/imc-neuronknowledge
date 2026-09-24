"use client";

import React, { useState } from "react";
import { 
  Stethoscope, 
  Ship, 
  Scale, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  Search,
  ExternalLink
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";

interface DomainLibrary {
  id: string;
  name: string;
  badge: string;
  icon: React.ElementType;
  targetAudience: string;
  tagline: string;
  features: string[];
  sampleDocuments: string[];
  readyAgentName: string;
  agentCapabilities: string[];
}

const DOMAINS: DomainLibrary[] = [
  {
    id: "medical",
    name: "Medical & Health Knowledge",
    badge: "HealthTech & Hospital",
    icon: Stethoscope,
    tagline: "โรค ยา แนวทางการดูแลรักษาตาม CPG และมาตรฐานสากล",
    targetAudience: "โรงพยาบาล, คลินิกเครือข่าย, บริษัทประกันสุขภาพ, ผู้พัฒนา HealthTech",
    features: [
      "Clinical Practice Guidelines (CPG) ฉบับทางการของราชวิทยาลัยและกระทรวงสาธารณสุข",
      "บัญชียาหลักแห่งชาติ ข้อบ่งใช้ ขนาดการบริหารยา และข้อห้ามใช้ (Contraindications)",
      "ระบบตรวจสอบ Drug-Drug Interaction (DDI) เพื่อความปลอดภัยสูงสุดของผู้ป่วย",
      "คลังคำถามและแนวทางสื่อสารการดูแลผู้ป่วยโรคเรื้อรัง (NCDs)"
    ],
    sampleDocuments: [
      "CPG_Diabetes_Mellitus_Thailand_2024.pdf",
      "National_Essential_Drug_List_2024_Edition.pdf",
      "Cardiovascular_Risk_Assessment_Guideline.pdf",
      "Hospital_SOP_Infection_Control_Protocol.pdf"
    ],
    readyAgentName: "Medical Clinical Assistant Agent",
    agentCapabilities: [
      "สืบค้นเกณฑ์การจ่ายยาและ dose adjustment ตามค่า eGFR",
      "ช่วยแพทย์และพยาบาลสรุปประวัติและแนวทางปฏิบัติอย่างรวดเร็ว",
      "คัดกรองอาการเบื้องต้น (Triage assistant) ก่อนพบแพทย์"
    ]
  },
  {
    id: "trade",
    name: "Trade & Export Knowledge",
    badge: "Logistics & Global Trade",
    icon: Ship,
    tagline: "นำเข้า-ส่งออก พิกัดศุลกากร (HS Code) สิทธิประโยชน์ FTA และตลาดสากล",
    targetAudience: "ผู้ส่งออก-นำเข้า, ตัวแทนออกของ (Customs Broker), โลจิสติกส์, ที่ปรึกษาการค้าระหว่างประเทศ",
    features: [
      "พิกัดอัตราศุลกากรไทย ฉบับพิกัดฮาร์โมไนซ์ (AHTN / HS 2022) อัปเดตล่าสุด",
      "กฎถิ่นกำเนิดสินค้าเฉพาะรายสินค้า (Product Specific Rules - PSR) ทุกกรอบ FTA",
      "ระเบียบการขอหนังสือรับรองถิ่นกำเนิดสินค้า (Form D, Form E, Form JTEPA, RCEP)",
      "มาตรการภาษี สิทธิประโยชน์คลังสินค้าทัณฑ์บน (Bonded Warehouse) และ Free Zone"
    ],
    sampleDocuments: [
      "พิกัดอัตราศุลกากร_AHTN_ฉบับสมบูรณ์_2567.pdf",
      "ATIGA_Form_D_Rules_of_Origin_Annex3.pdf",
      "คู่มือการใช้สิทธิประโยชน์ทางภาษี_BOI_Customs.pdf",
      "มาตรการทางการค้าที่มิใช่ภาษี_NTM_ASEAN_EU.pdf"
    ],
    readyAgentName: "Trade & Customs Intelligence Agent",
    agentCapabilities: [
      "เทียบเคียงรหัส HS Code 6-8 หลักจากคำอธิบายคุณสมบัติสินค้า",
      "คำนวณและตรวจสอบเกณฑ์ RVC / CTC เพื่อการขอ Form ลดหย่อนภาษี",
      "ตรวจเช็กเอกสาร Shipping Documents ป้องกันความผิดพลาดที่ด่านศุลกากร"
    ]
  },
  {
    id: "legal",
    name: "Legal & Compliance Knowledge",
    badge: "Corporate Governance",
    icon: Scale,
    tagline: "กฎหมาย ระเบียบข้อบังคับ นโยบายกำกับดูแล (SOP) และ PDPA",
    targetAudience: "ฝ่ายกฎหมายองค์กร, หน่วยงานกำกับดูแล (Compliance), ฝ่าย HR, ผู้ตรวจสอบภายใน",
    features: [
      "พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) พร้อมประกาศ กคส. ทุกฉบับ",
      "ประมวลกฎหมายแพ่งและพาณิชย์ และ พ.ร.บ. คุ้มครองแรงงาน (ฉบับปรับปรุง)",
      "พระราชบัญญัติหลักทรัพย์และตลาดหลักทรัพย์ ระเบียบ กลต. และ ตลท.",
      "กรอบมาตรฐานการบริหารจัดการความมั่นคงปลอดภัยสารสนเทศ (ISO 27001 / NIST)"
    ],
    sampleDocuments: [
      "PDPA_Thailand_Full_Act_and_Royal_Decrees.pdf",
      "ประกาศ_กคส_เกณฑ์_Data_Breach_Notification.pdf",
      "พระราชบัญญัติคุ้มครองแรงงาน_สิทธิการเลิกจ้างและค่าชดเชย.pdf",
      "Corporate_Governance_and_Audit_Checklist.pdf"
    ],
    readyAgentName: "Legal & Compliance Copilot",
    agentCapabilities: [
      "ตรวจสอบสัญญาทางธุรกิจ (Contract Review) หาข้อผูกมัดและความเสี่ยง",
      "ตอบข้อซักถามระเบียบแรงงานและวินัยพนักงานอย่างเป็นธรรม",
      "ประเมินผลกระทบด้านการคุ้มครองข้อมูลส่วนบุคคล (DPIA Assistant)"
    ]
  },
  {
    id: "enterprise",
    name: "Custom Enterprise Knowledge",
    badge: "Enterprise Tailored",
    icon: Building2,
    tagline: "เอกสารองค์กร คู่มือปฏิบัติการ FAQ และฐานข้อมูลเฉพาะทางของคุณ",
    targetAudience: "องค์กรขนาดใหญ่, ธนาคาร, รัฐวิสาหกิจ, เครือธุรกิจค้าปลีกและอุตสาหกรรม",
    features: [
      "คู่มือพนักงาน นโยบายสวัสดิการ และแผนการประเมินผล KPI/OKRs",
      "คู่มือเทคนิคและขั้นตอนการทำงานมาตรฐาน (Standard Operating Procedure - SOP)",
      "คลังความรู้ฝ่ายบริการลูกค้า (Customer Service & Call Center Knowledge Base)",
      "เอกสารรายงานการประชุม รายงานประจำปี และคู่มือผลิตภัณฑ์ภายในองค์กร"
    ],
    sampleDocuments: [
      "Internal_Employee_Handbook_2025.docx",
      "Core_Banking_Operation_SOP_v3.pdf",
      "Customer_Support_Incident_Resolution_Tree.pdf",
      "ERP_Database_Schema_and_Business_Rules.xlsx"
    ],
    readyAgentName: "Enterprise Internal Expert Agent",
    agentCapabilities: [
      "ตอบคำถามพนักงานเรื่องนโยบายและขั้นตอนเบิกจ่ายได้ตลอด 24 ชั่วโมง",
      "ช่วย Onboard พนักงานใหม่ให้ค้นพบคำตอบที่ถูกต้องโดยไม่ต้องรบกวนรุ่นพี่",
      "สืบค้นข้อมูลประวัติโครงการและการตัดสินใจในอดีตได้ในเสี้ยววินาที"
    ]
  }
];

export default function KnowledgeLibrary() {
  const [activeTab, setActiveTab] = useState<string>("medical");
  const selectedDomain = DOMAINS.find(d => d.id === activeTab) || DOMAINS[0];
  const IconComponent = selectedDomain.icon;

  return (
    <section id="library" className="py-24 relative bg-white dark:bg-[#070b14] border-b border-slate-200/80 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <ScrollReveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Our Knowledge Library</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              คลังความรู้พร้อมใช้ (Domain Knowledge Library)
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              เจาะลึก 4 โดเมนหลักที่ผ่านการกลั่นกรองและจัดทำดัชนีเวกเตอร์อย่างพิถีพิถัน พร้อมเปิดใช้งานในองค์กรทันที
            </p>
          </div>
        </ScrollReveal>

        {/* Tab Buttons */}
        <ScrollReveal variant="fade-up" delay={80}>
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10">
            {DOMAINS.map((domain) => {
              const TabIcon = domain.icon;
              const isActive = activeTab === domain.id;
              return (
                <button
                  key={domain.id}
                  onClick={() => setActiveTab(domain.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#0055fa] text-white shadow-lg shadow-[#0055fa]/25 scale-[1.02]"
                      : "bg-slate-100 dark:bg-[#0d1424] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-white/5"
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{domain.name}</span>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Active Domain Detail Showcase */}
        <ScrollReveal variant="zoom-in" delay={140}>
          <div 
            key={selectedDomain.id}
            className="p-8 sm:p-10 rounded-3xl bg-slate-50/80 dark:bg-[#0d1424] border border-slate-200 dark:border-white/10 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200 transition-all"
          >
          
          {/* Left Info: Domain Highlights */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#fec921]/15 text-[#b48206] dark:text-[#fec921] border border-[#fec921]/30 mb-3">
                <span>{selectedDomain.badge}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <IconComponent className="w-8 h-8 text-[#0055fa] dark:text-[#60a5fa]" />
                <span>{selectedDomain.name}</span>
              </h3>
              <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 mt-2">
                {selectedDomain.tagline}
              </p>
            </div>

            {/* Target Audience */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#121c32] border border-slate-200/80 dark:border-white/5 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">เหมาะสำหรับ: </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDomain.targetAudience}</span>
            </div>

            {/* Core Coverage Features */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                สิ่งที่บรรจุอยู่ในคลังความรู้นี้
              </div>
              <div className="space-y-2.5">
                {selectedDomain.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ready Agent Showcase */}
            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
              <div className="text-xs font-bold uppercase tracking-wider text-[#0055fa] dark:text-blue-400 mb-2">
                🤖 พร้อมสร้างเป็น Ready Agent: <span className="text-slate-900 dark:text-white">{selectedDomain.readyAgentName}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {selectedDomain.agentCapabilities.map((cap, cIdx) => (
                  <div key={cIdx} className="p-2.5 rounded-xl bg-white dark:bg-[#121c32] border border-slate-200/60 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0055fa] shrink-0"></div>
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Info: Sample Ingested Documents List */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#121c32] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <FileText className="w-4 h-4 text-[#0055fa]" />
                <span>ตัวอย่างเอกสารในคลังเวกเตอร์</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#0055fa] dark:text-blue-400">
                Indexed in Qdrant
              </span>
            </div>

            <div className="space-y-3">
              {selectedDomain.sampleDocuments.map((doc, dIdx) => (
                <div
                  key={dIdx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#0a101d] border border-slate-200/80 dark:border-white/5 flex items-center justify-between group hover:border-[#0055fa]/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-[#0055fa] dark:text-blue-300 flex items-center justify-center shrink-0 text-xs font-mono">
                      PDF
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {doc}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 ml-2">
                    Verified
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300">
              <div className="font-bold text-[#0055fa] dark:text-blue-400 mb-1">
                ต้องการเพิ่มข้อมูลขององค์กรคุณเอง?
              </div>
              <div>
                คุณสามารถอัปโหลดเอกสารเฉพาะ หรือเชื่อมโยงกับฐานข้อมูล ERP ของคุณ เพื่อผสมผสานเข้ากับคลังความรู้นี้ได้ทันที
              </div>
              <a
                href="#contact"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-[#0055fa] dark:text-blue-400 hover:underline"
              >
                <span>ปรึกษาทีมงาน IMC เกี่ยวกับคลังความรู้ของคุณ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
