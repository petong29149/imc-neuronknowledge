"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  Bot, 
  Send, 
  Sparkles, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  Database, 
  Cpu, 
  ShieldCheck, 
  Layers, 
  ChevronDown, 
  RefreshCw,
  Search,
  BookOpen,
  Info,
  X
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";

interface AgentPreset {
  id: string;
  name: string;
  category: "ready" | "custom" | "hybrid";
  categoryLabel: string;
  categoryColor: string;
  icon: string;
  description: string;
  knowledgeBase: string;
  chunksCount: string;
  samplePrompts: string[];
  chatHistory: {
    role: "user" | "assistant";
    content: string;
    citations?: {
      id: string;
      docName: string;
      page: number;
      similarity: number;
      textSnippet: string;
      updatedAt: string;
    }[];
  }[];
}

const AGENT_PRESETS: AgentPreset[] = [
  {
    id: "trade",
    name: "Trade & Export Specialist",
    category: "ready",
    categoryLabel: "Ready Knowledge (IMC)",
    categoryColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: "🚢",
    description: "เชี่ยวชาญพิกัดศุลกากร (HS Code), กฎแหล่งกำเนิดสินค้า (ROO), สิทธิประโยชน์ Form D/E และ FTA",
    knowledgeBase: "imc_trade_customs_2025 (Qdrant)",
    chunksCount: "18,450 chunks",
    samplePrompts: [
      "ส่งออกหม้อแปลงไฟฟ้าพิกัด HS 8504.40 ไปเวียดนาม ขอ Form D ต้องใช้เกณฑ์ใด?",
      "ข้อแตกต่างระหว่างพิกัด 8471.30 กับ 8528.52 ในการสำแดงนำเข้า",
      "เกณฑ์ RVC (Regional Value Content) ของสินค้ากลุ่มยานยนต์ภายใต้ ATIGA"
    ],
    chatHistory: [
      {
        role: "user",
        content: "ส่งออกหม้อแปลงไฟฟ้าพิกัด HS 8504.40 ไปเวียดนาม ขอ Form D ต้องใช้เกณฑ์ใดในการพิสูจน์ถิ่นกำเนิด?"
      },
      {
        role: "assistant",
        content: `สำหรับการส่งออก **Static Converters / Power Transformers (พิกัด HS 8504.40)** ไปยังประเทศเวียดนาม ภายใต้ความตกลงการค้าเสรีอาเซียน (ATIGA / Form D) สรุปสาระสำคัญตามเกณฑ์การตรวจสอบถิ่นกำเนิดสินค้าได้ดังนี้ครับ:

1. **เกณฑ์ถิ่นกำเนิดสินค้า (Product Specific Rules - PSR):**
   - ผู้ส่งออกสามารถเลือกใช้เกณฑ์อย่างใดอย่างหนึ่งดังต่อไปนี้:
     - **RVC (Regional Value Content) ไม่น้อยกว่า 40%** [cite:1] คำนวณตามสูตรต้นทุนวัตถุดิบภายในกลุ่มอาเซียน
     - หรือ **CTH (Change in Tariff Heading)** [cite:2] มีการเปลี่ยนตอนของพิกัดศุลกากรในระดับ 4 หลัก จากวัตถุดิบนำเข้าต่างถิ่น

2. **เอกสารประกอบการขอหนังสือรับรอง (Form D):**
   - โครงสร้างต้นทุนการผลิต (Cost Structure) รับรองโดยผู้มีอำนาจ
   - ใบเสร็จรับเงิน/ใบกำกับภาษีการซื้อวัตถุดิบภายในประเทศหรือในกลุ่มสมาชิก ATIGA [cite:3]

3. **ข้อควรระวังสำหรับด่านศุลกากรเวียดนาม:**
   - แนะนำให้ส่งข้อมูลผ่านระบบ ASEAN Single Window (ASW) ล่วงหน้าเพื่อลดระยะเวลารอตรวจปล่อยสินค้า`,
        citations: [
          {
            id: "cite:1",
            docName: "ATIGA_PSR_Annex3_HS8504.pdf",
            page: 184,
            similarity: 0.952,
            textSnippet: "Heading 85.04: Electrical transformers, static converters. Rule: A regional value content of not less than 40% (RVC 40); or A change to heading 85.04 from any other heading (CTH).",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          },
          {
            id: "cite:2",
            docName: "คู่มือการออกหนังสือรับรองถิ่นกำเนิดสินค้า_กรมการค้าต่างประเทศ_2567.pdf",
            page: 42,
            similarity: 0.928,
            textSnippet: "หมวดเครื่องใช้ไฟฟ้าและอิเล็กทรอนิกส์: การคำนวณสัดส่วนมูลค่าวัตถุดิบในภูมิภาค (Regional Value Content: RVC) ต้องจัดทำเอกสารแสดงสูตรการผลิต (Formula of Production) ยื่นผ่านระบบ DFT e-Service",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          },
          {
            id: "cite:3",
            docName: "ระเบียบปฏิบัติศุลกากรเวียดนาม_Circular_38_2015_Customs.pdf",
            page: 19,
            similarity: 0.895,
            textSnippet: "Article 26: Preferential C/O verification. Vietnam Customs accepts electronic Form D via ASEAN Single Window with digital signature verification.",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          }
        ]
      }
    ]
  },
  {
    id: "medical",
    name: "Medical & Clinical Protocol Agent",
    category: "ready",
    categoryLabel: "Ready Knowledge (IMC)",
    categoryColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: "🩺",
    description: "แนวทางการรักษาตาม Clinical Practice Guidelines (CPG), บัญชียาหลัก และการตรวจสอบ Drug Interactions",
    knowledgeBase: "imc_clinical_cpg_thailand (Qdrant)",
    chunksCount: "32,100 chunks",
    samplePrompts: [
      "แนวทางการเลือกใช้ยาเบาหวานกลุ่ม SGLT2i ในผู้ป่วยที่มีภาวะ eGFR ต่ำกว่า 30",
      "First-line empirical antibiotics สำหรับ Hospital-Acquired Pneumonia (HAP)",
      "ข้อห้ามการใช้ NSAIDs ร่วมกับยากลุ่ม ACE-inhibitor / ARB"
    ],
    chatHistory: [
      {
        role: "user",
        content: "แนวทางการเลือกใช้ยาเบาหวานกลุ่ม SGLT2 inhibitors ในผู้ป่วยเบาหวานชนิดที่ 2 ที่มีภาวะ eGFR ต่ำกว่า 30 ml/min/1.73m² ตาม guideline ปัจจุบันเป็นอย่างไร?"
      },
      {
        role: "assistant",
        content: `ตาม **Clinical Practice Guideline สำหรับโรคเบาหวาน (ฉบับปรับปรุง) และ KDIGO Guideline** [cite:1] มีข้อสรุปและแนวทางปฏิบัติดังนี้:

1. **การเริ่มยา (Initiation):**
   - โดยทั่วไปไม่แนะนำให้ *เริ่มต้นยาใหม่ (Do not initiate)* ในกลุ่ม SGLT2i (เช่น Dapagliflozin, Empagliflozin) หากผู้ป่วยมี **eGFR < 20-25 ml/min/1.73m²** เนื่องจากประสิทธิภาพในการลดระดับน้ำตาลในเลือด (Glycemic efficacy) จะลดลงอย่างมีนัยสำคัญ [cite:1]

2. **การใช้ยาต่อเนื่องเพื่อผล Cardiorenal Protection:**
   - หากผู้ป่วย **ได้รับยาอยู่เดิมแล้ว** และค่า eGFR ลดลงมาอยู่ในช่วง 20–30 ml/min/1.73m² สามารถ *รับประทานยาต่อได้ต่อเนื่อง* [cite:2] เพื่อชะลอการเสื่อมของไต (Renal outcome benefit) และลดอัตราการเกิด Heart Failure hospitalization
   - ควรหยุดยาเมื่อผู้ป่วยเข้าสู่ภาวะต้องได้รับการฟอกไต (Dialysis/ESRD) [cite:3]

3. **ข้อควรระวังในการติดตาม (Safety Monitoring):**
   - เฝ้าระวังความเสี่ยงภาวะ Euglycemic DKA, ภาวะขาดน้ำ (Volume depletion), และการติดเชื้อในระบบทางเดินปัสสาวะอย่างใกล้ชิด`,
        citations: [
          {
            id: "cite:1",
            docName: "CPG_Diabetes_Mellitus_Thailand_2024.pdf",
            page: 58,
            similarity: 0.967,
            textSnippet: "บทที่ 7 การใช้ยาลดระดับน้ำตาล: SGLT2 inhibitors มีข้อบ่งใช้เพิ่มเติมในการชะลอการดำเนินโรคมะเร็งไตเรื้อรัง (CKD progression) แม้การลด HbA1c จะจำกัดเมื่อ eGFR < 45 ml/min ให้พิจารณาเกณฑ์ eGFR cutoff ตามฉลากกำกับยาแต่ละตัว",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          },
          {
            id: "cite:2",
            docName: "KDIGO_Clinical_Practice_Guideline_Diabetes_Management_CKD.pdf",
            page: 34,
            similarity: 0.941,
            textSnippet: "Recommendation 1.3: We recommend treating patients with T2D, CKD, and an eGFR >= 20 ml/min per 1.73m2 with an SGLT2i. Once initiated, SGLT2i can be continued until kidney replacement therapy.",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          },
          {
            id: "cite:3",
            docName: "บัญชียาหลักแห่งชาติ_กลุ่มต่อมไร้ท่อและระบบไต_2567.pdf",
            page: 112,
            similarity: 0.912,
            textSnippet: "เงื่อนไขการอนุมัติยา SGLT-2 inhibitors: สำหรับผู้ป่วยเบาหวานที่มีภาวะโปรตีนรั่วในปัสสาวะ หรือมีความเสี่ยงโรคหัวใจและหลอดเลือดสูงร่วมกับแพทย์เฉพาะทาง",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          }
        ]
      }
    ]
  },
  {
    id: "legal",
    name: "Legal & Compliance Advisor",
    category: "ready",
    categoryLabel: "Ready Knowledge (IMC)",
    categoryColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: "⚖️",
    description: "กฎหมายแรงงาน, พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA), สัญญาธุรกิจ และข้อกำหนด Compliance",
    knowledgeBase: "imc_legal_pdpa_labor_code (Qdrant)",
    chunksCount: "24,800 chunks",
    samplePrompts: [
      "กรณีส่งข้อมูลพนักงานให้บริษัทแม่ในต่างประเทศ ต้องทำ Cross-Border Data Transfer อย่างไร?",
      "การเลิกจ้างด้วยเหตุผล AI ทดแทนงาน ต้องจ่ายค่าชดเชยตาม ม.121 อย่างไร?",
      "ระยะเวลาจัดเก็บ Log ตาม พ.ร.บ. คอมพิวเตอร์ และการเก็บข้อมูลกล้อง CCTV ตาม PDPA"
    ],
    chatHistory: [
      {
        role: "user",
        content: "บริษัทต้องการส่งข้อมูลประวัติและเงินเดือนพนักงานไทยไปเก็บไว้ที่เซิร์ฟเวอร์สำนักงานใหญ่ในสิงคโปร์ ต้องปฏิบัติตามเกณฑ์ Cross-Border Data Transfer ของ PDPA อย่างไร?"
      },
      {
        role: "assistant",
        content: `ตาม **พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) มาตรา 28 และมาตรา 29** ประกอบกับประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่องหลักเกณฑ์การโอนข้อมูลส่วนบุคคลไปยังต่างประเทศ [cite:1] มีแนวทางปฏิบัติดังนี้ครับ:

1. **การตรวจสอบมาตรฐานความปลอดภัยของปลายทาง (Adequacy Decision):**
   - สิงคโปร์มีกฎหมายคุ้มครองข้อมูลส่วนบุคคล (Singapore PDPA) แต่ผู้ควบคุมข้อมูลของไทยยังต้องมีมาตรการคุ้มครองตามที่กฎหมายไทยกำหนด [cite:1]

2. **มาตรการที่สามารถเลือกใช้ได้ (Appropriate Safeguards):**
   - **Binding Corporate Rules (BCRs):** หากเป็นการส่งระหว่างบริษัทในเครือเดียวกัน แนะนำให้จัดทำข้อกำหนดนโยบายคุ้มครองข้อมูลส่วนบุคคลในเครือกิจการ (BCRs) ซึ่งได้รับความเห็นชอบจากสำนักงาน PDPC [cite:2]
   - **Standard Contractual Clauses (SCCs):** หากยังไม่มี BCRs สามารถจัดทำสัญญาโอนข้อมูลโดยใช้สัญญามาตรฐานตามแนวทางที่คณะกรรมการกำหนด [cite:2]

3. **ฐานทางกฎหมาย (Legal Basis):**
   - อาศัยฐาน **ความจำเป็นเพื่อการปฏิบัติตามสัญญาจ้างแรงงาน (Contractual Necessity)** มาตรา 24(3) ร่วมกับแจ้งนโยบายความเป็นส่วนตัว (Privacy Notice) แก่พนักงานโดยละเอียด [cite:3]`,
        citations: [
          {
            id: "cite:1",
            docName: "พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล_พศ_2562_มาตรา28_29.pdf",
            page: 18,
            similarity: 0.973,
            textSnippet: "มาตรา 28 ในกรณีที่ผู้ควบคุมข้อมูลส่วนบุคคลส่งหรือโอนข้อมูลส่วนบุคคลไปยังต่างประเทศ ประเทศปลายทางหรือองค์การระหว่างประเทศที่รับข้อมูลส่วนบุคคลต้องมีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลที่เพียงพอ",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          },
          {
            id: "cite:2",
            docName: "ประกาศ_กคส_หลักเกณฑ์การส่งหรือโอนข้อมูลส่วนบุคคลไปยังต่างประเทศ_2566.pdf",
            page: 4,
            similarity: 0.945,
            textSnippet: "ข้อ 6 ข้อกำหนดนโยบายในการคุ้มครองข้อมูลส่วนบุคคล (Binding Corporate Rules: BCRs) ต้องมีผลผูกพันและบังคับใช้ได้จริงระหว่างองค์กรในเครือกิจการเดียวกัน มีการตรวจสอบสิทธิ์และกลไกความรับผิดชอบ",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          },
          {
            id: "cite:3",
            docName: "แนวปฏิบัติการคุ้มครองข้อมูลส่วนบุคคลสำหรับงานบริหารทรัพยากรมนุษย์_PDPC_2024.pdf",
            page: 29,
            similarity: 0.918,
            textSnippet: "หมวดที่ 4 การประมวลผลข้อมูลเงินเดือนและสวัสดิการ: ข้อมูลเงินเดือนจัดเป็นข้อมูลส่วนบุคคลทั่วไป สามารถใช้ฐานสัญญาจ้างได้ ไม่ต้องขอความยินยอมซ้ำซ้อน หากมีการระบุไว้ชัดเจนใน Employee Privacy Notice",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          }
        ]
      }
    ]
  },
  {
    id: "hybrid",
    name: "Hybrid Enterprise ERP & Policy Agent",
    category: "hybrid",
    categoryLabel: "Hybrid (IMC Ready + Your Data)",
    categoryColor: "bg-amber-500/10 text-amber-600 dark:text-[#fec921] border-amber-500/20",
    icon: "🏢",
    description: "ผสานระเบียบกฎหมายภายนอก (Ready Knowledge) เข้ากับ SOP, ERP PO, สัญญาจัดซื้อ และคู่มือภายในองค์กร (Custom Data)",
    knowledgeBase: "hybrid_tenant_corp_knowledge (Qdrant Dual Index)",
    chunksCount: "48,920 chunks",
    samplePrompts: [
      "ตรวจสอบ PO #2026-9942 เทียบกับเงื่อนไขสัญญาจัดซื้อจัดจ้าง และกฎหมายภาษีหัก ณ ที่จ่าย",
      "สิทธิการลาบวชและการคำนวณเบี้ยขยันตามคู่มือพนักงานเทียบกับ พ.ร.บ. คุ้มครองแรงงาน",
      "ขั้นตอนการขออนุมัติเบิกค่าเดินทางไปดูงานต่างประเทศตามระเบียบบริษัทข้อ 4.2"
    ],
    chatHistory: [
      {
        role: "user",
        content: "ตรวจสอบใบสั่งซื้อ (PO) #2026-9942 ยอด 450,000 บาท เทียบกับระเบียบการจัดซื้อภายใน และตรวจว่าต้องหักภาษี ณ ที่จ่ายตามกฎหมายกี่เปอร์เซ็นต์?"
      },
      {
        role: "assistant",
        content: `จากการผสานข้อมูลระหว่าง **ระเบียบจัดซื้อภายในองค์กร (Custom Internal SOP)** และ **ประมวลรัษฎากรว่าด้วยภาษีหัก ณ ที่จ่าย (Ready Knowledge)** [cite:1, cite:2] มีข้อสรุปการตรวจสอบดังนี้:

1. **อำนาจอนุมัติภายในองค์กร (Internal Approval Matrix):**
   - ยอดสั่งซื้อ 450,000 บาท จัดอยู่ในวงเงินระดับ Tier 2 (300,000 – 1,000,000 บาท) [cite:1]
   - ต้องได้รับอนุมัติจาก **Department Director + VP of Procurement** และแนบใบเสนอราคาเปรียบเทียบอย่างน้อย 3 เจ้าในระบบ SAP ก่อนปล่อย PO

2. **อัตราภาษีหัก ณ ที่จ่าย (Withholding Tax - ภ.ง.ด. 53):**
   - ตามรายการใน PO เป็นงาน **จ้างบริการติดตั้งและวางระบบเครือข่าย (Service Contract)** จึงเข้าเกณฑ์หักภาษี ณ ที่จ่าย **3%** ตามคำสั่งกรมสรรพากร ท.ป. 4/2528 [cite:2]
   - *หมายเหตุ:* หากมีการแยกใบกำกับภาษีระหว่างค่าฮาร์ดแวร์ (ขายสินค้า = ไม่หักภาษี) กับค่าติดตั้งบริการ (หัก 3%) จะช่วยลดภาระกระแสเงินสดของคู่สัญญาได้ตามระเบียบคู่มือการเงิน [cite:3]`,
        citations: [
          {
            id: "cite:1",
            docName: "[Custom Data] คู่มือระเบียบจัดซื้อจัดจ้าง_ฉบับปรับปรุง_2025.pdf",
            page: 12,
            similarity: 0.962,
            textSnippet: "หมวด 3 อำนาจดำเนินการ: วงเงิน 300,001 - 1,000,000 บาท ต้องผ่านการพิจารณาของคณะกรรมการคัดเลือก และลงนามอนุมัติโดยผู้อำนวยการฝ่ายร่วมกับรองกรรมการผู้จัดการฝ่ายจัดซื้อ",
            updatedAt: "Custom Ingested • 22/09/2026"
          },
          {
            id: "cite:2",
            docName: "[Ready Knowledge] ประมวลรัษฎากร_คำสั่งทป_4_2528_ภาษีหักณที่จ่าย.pdf",
            page: 38,
            similarity: 0.947,
            textSnippet: "ข้อ 12/1 การจ่ายเงินได้พึงประเมินตามมาตรา 40(7) และ (8) ให้แก่บริษัทหรือห้างหุ้นส่วนนิติบุคคล ผู้จ่ายมีหน้าที่หักภาษี ณ ที่จ่ายในอัตราร้อยละ 3.0 สำหรับค่าจ้างทำของหรือบริการ",
            updatedAt: "Qdrant Vector DB • 24/09/2026"
          },
          {
            id: "cite:3",
            docName: "[Custom Data] ERP_Vendor_Contract_Template_2025.docx",
            page: 7,
            similarity: 0.889,
            textSnippet: "Clause 5.4: Payment Terms require dual breakdown of Hardware deliverables and Professional Services to ensure accurate taxation filing via E-Tax Invoice.",
            updatedAt: "Custom Ingested • 15/08/2026"
          }
        ]
      }
    ]
  }
];

const MODELS = [
  { id: "claude-3-7-sonnet", label: "Claude 3.7 Sonnet", provider: "OpenRouter", latency: "14ms", desc: "Top reasoning & citation accuracy" },
  { id: "gpt-4o", label: "GPT-4o (Omni)", provider: "OpenRouter", latency: "18ms", desc: "Fast multi-lingual extraction" },
  { id: "deepseek-r1", label: "DeepSeek R1", provider: "OpenRouter", latency: "22ms", desc: "Advanced logic & reasoning chain" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "OpenRouter", latency: "16ms", desc: "High token context window" },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: {
    id: string;
    docName: string;
    page: number;
    similarity: number;
    textSnippet: string;
    updatedAt: string;
  }[];
}

function getResponseForPrompt(agentId: string, prompt: string, fallbackAgent: AgentPreset): { content: string; citations?: ChatMessage["citations"] } {
  const standardPresetAssistant = fallbackAgent.chatHistory.find(c => c.role === "assistant");
  const standardPresetUser = fallbackAgent.chatHistory.find(c => c.role === "user");
  
  if (standardPresetUser && prompt.trim() === standardPresetUser.content.trim() && standardPresetAssistant) {
    return {
      content: standardPresetAssistant.content,
      citations: standardPresetAssistant.citations
    };
  }

  if (agentId === "trade") {
    if (prompt.includes("8471.30") || prompt.includes("8528.52")) {
      return {
        content: `ข้อแตกต่างสำคัญระหว่าง **พิกัด HS 8471.30 (แล็ปท็อป/คอมพิวเตอร์พกพา)** และ **HS 8528.52 (จอภาพคอมพิวเตอร์)** ในการสำแดงนำเข้า สรุปสาระสำคัญตามพิกัดศุลกากรไทย-อาเซียน ได้ดังนี้ครับ:

1. **พิกัด HS 8471.30 (Portable ADP Machines):** [cite:1]
   - ต้องประกอบด้วยหน่วยประมวลผลกลาง (CPU), คีย์บอร์ด และหน้าจอแสดงผลรวมอยู่ในตัวเครื่องเดียวกัน และน้ำหนักไม่เกิน 10 กิโลกรัม
   - ได้รับสิทธิยกเว้นอากรขาเข้า (0%) ตามกรอบความตกลง Information Technology Agreement (ITA)

2. **พิกัด HS 8528.52 (Monitors for ADP):** [cite:2]
   - เป็นจอแสดงผลที่ออกแบบมาเพื่อเชื่อมต่อกับเครื่องประมวลผลข้อมูลอัตโนมัติเท่านั้น (ไม่มี TV Tuner หรือตัวรับสัญญาณโทรทัศน์)
   - หากนำเข้าจากกลุ่มประเทศสมาชิก ATIGA และมีหนังสือรับรองถิ่นกำเนิดสินค้า **Form D** [cite:3] จะได้รับสิทธิพิเศษทางภาษีศุลกากร 0%`,
        citations: standardPresetAssistant?.citations
      };
    }
    if (prompt.includes("RVC") || prompt.includes("ยานยนต์") || prompt.includes("ATIGA")) {
      return {
        content: `สำหรับเกณฑ์ถิ่นกำเนิดสินค้าในกลุ่มยานยนต์และชิ้นส่วนยานยนต์ภายใต้ความตกลง **ATIGA (ASEAN Trade in Goods Agreement)** [cite:1]:

1. **เกณฑ์สัดส่วนมูลค่าวัตถุดิบในภูมิภาค (RVC):**
   - สินค้ากลุ่มยานยนต์ส่วนใหญ่กำหนดเกณฑ์ **RVC ไม่น้อยกว่า 40% (RVC >= 40%)** [cite:1]
   - คำนวณได้ทั้งแบบ Direct Method (FOB - วัตถุดิบนำเข้าต่างถิ่น) หรือ Indirect Method

2. **การสะสมถิ่นกำเนิด (Cumulation Rule):** [cite:2]
   - วัตถุดิบหรือชิ้นส่วนที่ผลิตในประเทศสมาชิกอาเซียน สามารถนำมาคำนวณเป็นสัดส่วนวัตถุดิบในกลุ่มอาเซียนได้ 100%

3. **เอกสารแสดงสูตรการผลิต (Cost Structure):** [cite:3]
   - ผู้ประกอบการต้องยื่นโครงสร้างต้นทุนและรับการตรวจรับรองโรงงานล่วงหน้าจากกรมการค้าต่างประเทศ`,
        citations: standardPresetAssistant?.citations
      };
    }
  } else if (agentId === "medical") {
    if (prompt.includes("Hospital-Acquired Pneumonia") || prompt.includes("HAP") || prompt.includes("antibiotics")) {
      return {
        content: `ตามแนวทางเวชปฏิบัติการดูแลรักษา **Hospital-Acquired Pneumonia (HAP) ในประเทศไทย (ฉบับปรับปรุง)** [cite:1]:

1. **การประเมินความเสี่ยงเชื้อดื้อยา (MDR Risk Factors):** [cite:1]
   - หากผู้ป่วยไม่มีความเสี่ยงต่อเชื้อดื้อยา แนะนำยาฉีดกลุ่ม Antipseudomonal Beta-lactams:
     - **Piperacillin/Tazobactam 4.5g IV q 6h**, **Cefepime 2g IV q 8h**, หรือ **Meropenem 1g IV q 8h** [cite:2]

2. **กรณีมีความเสี่ยงต่อเชื้อ MRSA:** [cite:3]
   - แนะนำให้เพิ่ม **Vancomycin (15-20 mg/kg IV q 8-12h)** ร่วมด้วย โดยต้องมีการติดตามระดับยาในกระแสเลือด (TDM Trough level) อย่างเคร่งครัด`,
        citations: standardPresetAssistant?.citations
      };
    }
    if (prompt.includes("NSAIDs") || prompt.includes("ACE") || prompt.includes("ARB")) {
      return {
        content: `ข้อควรระวังและอันตรายจากการใช้ **NSAIDs ร่วมกับยากลุ่ม ACE-inhibitors หรือ ARBs** [cite:1]:

1. **กลไกการเกิดภาวะไตวายเฉียบพลัน (Triple Whammy Effect):** [cite:1]
   - NSAIDs ยับยั้ง Prostaglandins ทำให้หลอดเลือดไตขาเข้า (Afferent arteriole) หดตัว เลือดไปเลี้ยงไตลดลง
   - ACEi/ARB ยับยั้ง Angiotensin II ทำให้หลอดเลือดไตขาออก (Efferent arteriole) ขยายตัว ส่งผลให้ความดันกรองในไตลดลงอย่างรวดเร็ว
   - เมื่อใช้ร่วมกัน โดยเฉพาะในผู้ป่วยสูงอายุ จะเสี่ยงเกิด **ภาวะไตวายเฉียบพลัน (Acute Kidney Injury - AKI)** [cite:2]

2. **คำแนะนำทางคลินิก:** [cite:3]
   - ควรหลีกเลี่ยงการสั่งใช้ร่วมกัน หากจำเป็นต้องบรรเทาปวด ให้พิจารณาใช้ยา Paracetamol หรือ Topical NSAIDs ทดแทนเป็นลำดับแรก`,
        citations: standardPresetAssistant?.citations
      };
    }
  } else if (agentId === "legal") {
    if (prompt.includes("121") || prompt.includes("AI") || prompt.includes("เลิกจ้าง")) {
      return {
        content: `การเลิกจ้างเนื่องจากการนำเทคโนโลยีหรือระบบอัตโนมัติ (AI / Automation) มาปรับปรุงหน่วยงาน มีข้อกำหนดตาม **พ.ร.บ. คุ้มครองแรงงาน พ.ศ. 2541 มาตรา 121 และ 122** [cite:1] ดังนี้:

1. **การบอกกล่าวล่วงหน้า (Advance Notice):** [cite:1]
   - นายจ้างต้องแจ้งกำหนดวันที่จะเลิกจ้าง เหตุผล และรายชื่อลูกจ้างต่อพนักงานตรวจแรงงานและลูกจ้างที่จะถูกเลิกจ้าง **ล่วงหน้าไม่น้อยกว่า 60 วัน** ก่อนวันเลิกจ้าง
   - หากไม่บอกกล่าวล่วงหน้าตามกำหนด ต้องจ่าย **สินจ้างแทนการบอกกล่าวล่วงหน้าพิเศษ** เท่ากับค่าจ้าง 60 วันสุดท้าย [cite:2]

2. **ค่าชดเชยการเลิกจ้างปกติ (Severance Pay):** [cite:2]
   - จ่ายตามอายุงานตามมาตรา 118 (ตั้งแต่ 30 วัน ถึง 400 วันของค่าจ้าง)

3. **ค่าชดเชยพิเศษตามอายุงาน (Special Severance Pay - ม.122):** [cite:3]
   - สำหรับลูกจ้างที่ทำงานติดต่อกันเกิน 6 ปีขึ้นไป นายจ้างต้องจ่ายค่าชดเชยพิเศษเพิ่มอีกไม่น้อยกว่าค่าจ้าง 15 วัน ต่อการทำงานครบทุก 1 ปี`,
        citations: standardPresetAssistant?.citations
      };
    }
    if (prompt.includes("Log") || prompt.includes("CCTV") || prompt.includes("คอมพิวเตอร์")) {
      return {
        content: `ข้อกำหนดการจัดเก็บข้อมูลการจราจรทางคอมพิวเตอร์ (Log) และการจัดเก็บข้อมูลกล้อง CCTV ตามกฎหมายไทย [cite:1]:

1. **การจัดเก็บ Log ตาม พ.ร.บ. คอมพิวเตอร์ฯ มาตรา 26:** [cite:1]
   - องค์กรต้องจัดเก็บข้อมูลการจราจรทางคอมพิวเตอร์ **ไม่น้อยกว่า 90 วัน** นับแต่วันที่ข้อมูลเข้าสู่ระบบ
   - กรณีจำเป็นเฉพาะราย เจ้าหน้าที่มีอำนาจสั่งให้เก็บรักษาไว้เกิน 90 วันแต่ไม่เกิน 2 ปี [cite:2]

2. **การบันทึกภาพกล้อง CCTV ตาม PDPA:** [cite:2]
   - สามารถอาศัยฐานประโยชน์อันชอบธรรม (Legitimate Interest) เพื่อการรักษาความปลอดภัย
   - ต้องติดป้ายแจ้งเตือน (CCTV Notice) ชัดเจนก่อนเข้าสู่พื้นที่ [cite:3] และกำหนดระยะเวลาจัดเก็บ (Retention Period) เช่น 30 วัน แล้วเขียนทับอัตโนมัติ`,
        citations: standardPresetAssistant?.citations
      };
    }
  } else if (agentId === "hybrid") {
    if (prompt.includes("ลาบวช") || prompt.includes("เบี้ยขยัน")) {
      return {
        content: `การเปรียบเทียบสิทธิการลาอุปสมบท (ลาบวช) และการคิดเบี้ยขยันระหว่าง **คู่มือพนักงานบริษัท (Internal HR Handbook Ch.4)** และ **พ.ร.บ. คุ้มครองแรงงาน** [cite:1]:

1. **สิทธิการลาอุปสมบท:** [cite:1]
   - ตามกฎหมายแรงงาน: มิได้บังคับให้นายจ้างต้องจ่ายค่าจ้าง ขึ้นอยู่กับข้อบังคับการทำงาน
   - ตามคู่มือพนักงานบริษัท (SOP-HR-04): พนักงานชายที่มีอายุงานครบ 2 ปีขึ้นไป มีสิทธิลาอุปสมบทได้ **ไม่เกิน 30 วันโดยยังได้รับค่าจ้างตามปกติ** [cite:2]

2. **เกณฑ์การคำนวณเบี้ยขยัน:** [cite:3]
   - การลาอุปสมบทที่ได้รับอนุมัติล่วงหน้าตามระเบียบบริษัท จะไม่ถูกตัดสิทธิเบี้ยขยันประจำไตรมาส`,
        citations: standardPresetAssistant?.citations
      };
    }
    if (prompt.includes("CAPEX") || prompt.includes("1,000,000") || prompt.includes("DOA")) {
      return {
        content: `ขั้นตอนการขออนุมัติงบประมาณรายจ่ายฝ่ายทุน (CAPEX) เกิน 1,000,000 บาท ตามระเบียบอำนาจดำเนินการ **Delegation of Authority (DOA Matrix 2026)** [cite:1]:

1. **ระดับอำนาจอนุมัติ (Approval Threshold):** [cite:1]
   - วงเงินตั้งแต่ 1,000,000 - 5,000,000 บาท: ต้องได้รับการอนุมัติร่วมจาก **CFO และ Managing Director (MD)** [cite:2]
   - วงเงินเกิน 5,000,000 บาทขึ้นไป: ต้องผ่านความเห็นชอบจากคณะกรรมการบริหาร (Executive Committee)

2. **เอกสารและขั้นตอนการเสนอเรื่อง (Procurement Workflow):** [cite:2]
   - แนบใบเสนอราคาเปรียบเทียบขั้นต่ำ 3 ราย (Three Bidding Quotes) พร้อมเอกสารประเมิน ROI
   - เอกสารสัญญามูลค่าเกิน 1,000,000 บาท ต้องผ่านการตรวจร่างโดยฝ่ายกฎหมาย (Legal Compliance Review) [cite:3]`,
        citations: standardPresetAssistant?.citations
      };
    }
  }

  // Fallback for custom user questions
  return {
    content: `ผลการสืบค้นและวิเคราะห์ข้อมูลจากคลังความรู้ **${fallbackAgent.name}** ผ่าน **${fallbackAgent.knowledgeBase}** [cite:1]:

สำหรับคำถาม: *"${prompt}"*

1. **การตรวจสอบความถูกต้องและข้อกำหนด:** [cite:1]
   - ระบบได้ทำการจับคู่ Vector Semantic Search เข้ากับคลังเอกสารองค์กรที่ผ่านการรับรอง พบเอกสารที่มีค่าความคล้ายคลึง (Cosine Similarity > 0.92) ที่สอดคล้องกับหัวข้อนี้
   - สาระสำคัญระบุว่าการดำเนินการต้องสอดคล้องกับมาตรฐานการปฏิบัติงานและระเบียบข้อบังคับที่เป็นทางการ [cite:2]

2. **ข้อแนะนำเชิงนโยบายและการปฏิบัติ:** [cite:3]
   - ควรจัดทำเอกสารและหลักฐานประกอบตามขั้นตอนที่กำหนดไว้ในคู่มือ SOP ขององค์กร
   - คุณสามารถคลิกที่แท็กเอกสารอ้างอิงด้านบนเพื่อตรวจสอบข้อความต้นฉบับใน Qdrant ได้ทันที`,
    citations: standardPresetAssistant?.citations || [
      {
        id: "cite:1",
        docName: `${fallbackAgent.id}_standard_operating_procedure_2026.pdf`,
        page: 12,
        similarity: 0.948,
        textSnippet: `ข้อมูลอ้างอิงสำหรับหัวข้อ ${prompt}: การปฏิบัติงานต้องเป็นไปตามเกณฑ์มาตรฐานความปลอดภัยและนโยบายองค์กร`,
        updatedAt: "Qdrant Vector DB • 24/09/2026"
      },
      {
        id: "cite:2",
        docName: `${fallbackAgent.id}_compliance_and_governance.pdf`,
        page: 45,
        similarity: 0.925,
        textSnippet: "แนวทางการประมวลผลและการจัดทำรายงานตามมาตรฐานสากล พร้อมการตรวจสอบ Audit Trail",
        updatedAt: "Qdrant Vector DB • 24/09/2026"
      },
      {
        id: "cite:3",
        docName: `${fallbackAgent.id}_operational_handbook_v3.pdf`,
        page: 78,
        similarity: 0.899,
        textSnippet: "ข้อกำหนดและขั้นตอนการอนุมัติสำหรับผู้ดูแลระบบและผู้ปฏิบัติงานที่เกี่ยวข้อง",
        updatedAt: "Qdrant Vector DB • 24/09/2026"
      }
    ]
  };
}

export default function HarnessSimulator() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("trade");
  const [selectedModel, setSelectedModel] = useState<string>("claude-3-7-sonnet");
  const [activeCitation, setActiveCitation] = useState<{
    id: string;
    docName: string;
    page: number;
    similarity: number;
    textSnippet: string;
    updatedAt: string;
  } | null>(null);
  
  const currentAgent = AGENT_PRESETS.find(a => a.id === selectedAgentId) || AGENT_PRESETS[0];

  // Dynamic chat messages state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(currentAgent.chatHistory);
  
  // Streaming state: character-by-character flow
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>("");

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to start character-by-character typewriter stream
  const startStream = (fullText: string) => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    setDisplayedText("");
    setIsSearching(true);
    setIsStreaming(true);

    // Initial 260ms vector retrieval simulation in Qdrant
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
      let currentIndex = 0;
      const textLen = fullText.length;

      streamIntervalRef.current = setInterval(() => {
        if (currentIndex < textLen) {
          // If the upcoming substring is a citation tag [cite:X], consume the entire tag at once
          if (fullText.slice(currentIndex).startsWith("[cite:")) {
            const closeIndex = fullText.indexOf("]", currentIndex);
            if (closeIndex !== -1) {
              currentIndex = closeIndex + 1;
            } else {
              currentIndex += 2;
            }
          } else {
            // Stream 2-3 characters per tick for a responsive, natural LLM flow (~50 tokens/sec)
            currentIndex = Math.min(currentIndex + 3, textLen);
          }
          setDisplayedText(fullText.slice(0, currentIndex));
        } else {
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
          setIsStreaming(false);
          setDisplayedText(fullText);
        }
      }, 16);
    }, 260);
  };

  const skipStreaming = () => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(false);
    setIsStreaming(false);
    const lastAssistant = [...chatMessages].reverse().find(m => m.role === "assistant");
    if (lastAssistant) {
      setDisplayedText(lastAssistant.content);
    }
  };

  // Run stream on agent change
  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setActiveCitation(null);
    const preset = AGENT_PRESETS.find(a => a.id === agentId) || AGENT_PRESETS[0];
    setChatMessages(preset.chatHistory);
    const assistantMsg = preset.chatHistory.find(m => m.role === "assistant");
    if (assistantMsg) {
      startStream(assistantMsg.content);
    }
  };

  // Run stream on mount
  useEffect(() => {
    const initialAssistant = currentAgent.chatHistory.find(m => m.role === "assistant");
    if (initialAssistant) {
      startStream(initialAssistant.content);
    }
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handlePromptSubmit = (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;

    const response = getResponseForPrompt(selectedAgentId, trimmed, currentAgent);
    const newChat: ChatMessage[] = [
      { role: "user", content: trimmed },
      { 
        role: "assistant", 
        content: response.content, 
        citations: response.citations 
      }
    ];

    setChatMessages(newChat);
    setActiveCitation(null);
    setCustomInput("");
    startStream(response.content);
  };

  const openCitation = (citeId: string) => {
    const lastAssistant = [...chatMessages].reverse().find(c => c.role === "assistant");
    const found = lastAssistant?.citations?.find(c => c.id === citeId) || currentAgent.chatHistory.find(c => c.role === "assistant")?.citations?.find(c => c.id === citeId);
    if (found) {
      setActiveCitation(found);
    }
  };

  // Helper to render message content with clickable citation tags and safe partial markdown
  const renderMessageContent = (text: string) => {
    // If text has an unclosed bold tag ** during streaming, close it temporarily for clean display
    const boldMatches = text.match(/\*\*/g);
    const boldCount = boldMatches ? boldMatches.length : 0;
    let safeText = text;
    if (boldCount % 2 !== 0) {
      safeText += "**";
    }

    const parts = safeText.split(/(\[cite:\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[cite:(\d+)\]/);
      if (match) {
        const citeId = `cite:${match[1]}`;

        return (
          <button
            key={index}
            onClick={() => openCitation(citeId)}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 text-xs font-mono font-semibold rounded-md bg-[#0055fa]/10 dark:bg-[#0055fa]/20 text-[#0055fa] dark:text-[#60a5fa] border border-[#0055fa]/30 hover:bg-[#0055fa] hover:text-white transition-all cursor-pointer group shadow-xs animate-in zoom-in-95 duration-150"
            title="คลิกเพื่อตรวจสอบ Source Document ใน Qdrant"
          >
            <span>[Doc {match[1]}]</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
          </button>
        );
      }

      // Format bold text
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bPart, bIndex) => {
        if (bPart.startsWith("**") && bPart.endsWith("**")) {
          return <strong key={`${index}-${bIndex}`} className="font-semibold text-slate-900 dark:text-white">{bPart.slice(2, -2)}</strong>;
        }
        return bPart;
      });
    });
  };

  return (
    <section id="simulator" className="py-24 bg-slate-50/70 dark:bg-[#060a13] relative border-y border-slate-200/80 dark:border-white/5 overflow-hidden">
      {/* Top Background Image Banner */}
      <div className="absolute top-0 inset-x-0 h-[400px] sm:h-[480px] lg:h-[540px] pointer-events-none select-none overflow-hidden z-0">
        <Image
          src="/sim_section2.png"
          alt="NeuronKnowledge Simulator"
          fill
          sizes="100vw"
          className="object-cover object-top mix-blend-multiply dark:mix-blend-screen"
        />
        {/* Soft bottom gradient fade to seamlessly merge into the section background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/20 to-slate-50/80 dark:from-transparent dark:via-[#060a13]/40 dark:to-[#060a13]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <ScrollReveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ตัวอย่างจำลอง · Preview</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              สัมผัสประสบการณ์ Harness ที่ไม่มีคำว่า “มั่ว”
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-800 dark:text-slate-300">
              ทดลองเลือกสลับ Domain Agent ด้านล่าง และคลิกที่แท็ก <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-[#0055fa] dark:text-blue-300 font-bold">[Doc X]</span> ในคำตอบ เพื่อดูตัวอย่างข้อมูลอ้างอิง
            </p>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              หน้านี้เป็นภาพจำลองเพื่อสาธิตเท่านั้น ไม่ได้เรียก MCP Tools หรือโมเดลจริง
            </p>
          </div>
        </ScrollReveal>

        {/* Agent Selector Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {AGENT_PRESETS.map((agent, idx) => {
            const isSelected = selectedAgentId === agent.id;
            return (
              <ScrollReveal key={agent.id} variant="fade-up" delay={idx * 70}>
                <button
                  onClick={() => handleSelectAgent(agent.id)}
                  className={`w-full flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-1 ${
                    isSelected
                      ? "bg-white dark:bg-[#0f172a] border-[#0055fa] shadow-md shadow-[#0055fa]/15 ring-2 ring-[#0055fa]/20 scale-[1.01]"
                      : "bg-white/80 dark:bg-[#090f1d] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-2xl">{agent.icon}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${agent.categoryColor}`}>
                      {agent.category === "hybrid" ? "Hybrid" : "Ready"}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                    {agent.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {agent.description}
                  </div>
                </button>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Main Harness Frame (Open WebUI-inspired clean Enterprise interface) */}
        <ScrollReveal variant="zoom-in" delay={150}>
          <div className="relative rounded-2xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0b1120] shadow-2xl overflow-hidden">
          
          {/* Top Window Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-100/90 dark:bg-[#090e1a] border-b border-slate-200 dark:border-white/10">
            
            {/* Left: Active Agent Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block"></span>
              </div>
              <div className="h-4 w-px bg-slate-300 dark:bg-white/10"></div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#0055fa] dark:text-[#3b82f6]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentAgent.name}
                </span>
                <span className="hidden sm:inline-block text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  • {currentAgent.knowledgeBase}
                </span>
              </div>
            </div>

            {/* Right: Model Selector & Latency Badge */}
            <div className="flex items-center gap-3">
              {isStreaming ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0055fa]/10 text-[#0055fa] dark:text-blue-400 text-[11px] font-mono border border-[#0055fa]/20 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0055fa]"></span>
                  <span>STREAMING...</span>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Grounding 100% • Qdrant HNSW</span>
                </div>
              )}

              {/* OpenRouter Model Selector */}
              <div className="relative flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#131d33] border border-slate-300 dark:border-white/15 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <Cpu className="w-3.5 h-3.5 text-[#0055fa]" />
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer pr-1 text-xs font-semibold"
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id} className="dark:bg-[#0f172a] text-slate-900 dark:text-white">
                        {m.label} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Harness Body: Chat + Sidebar/Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
            
            {/* Left Sub-panel: Active Vector Index Meta */}
            <div className="hidden lg:block lg:col-span-3 border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#080d18] p-4 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-slate-500 mb-3 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#0055fa]" />
                <span>Qdrant Vector Isolation</span>
              </div>

              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0e1628] border border-slate-200 dark:border-white/10">
                  <div className="text-[10px] text-slate-400 font-mono">TENANT COLLECTION</div>
                  <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold text-xs mt-0.5 truncate">
                    {currentAgent.knowledgeBase}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span>Indexed Chunks:</span>
                    <span className="font-semibold text-[#0055fa] dark:text-blue-400">{currentAgent.chunksCount}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0e1628] border border-slate-200 dark:border-white/10">
                  <div className="text-[10px] text-slate-400 font-mono">EMBEDDING MODEL</div>
                  <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold text-xs mt-0.5">
                    text-embedding-3-large
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">3,072 Dims • Cosine metric</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0e1628] border border-slate-200 dark:border-white/10">
                  <div className="text-[10px] text-slate-400 font-mono">ENTERPRISE GUARDRAIL</div>
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold text-xs mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Strict Grounding Only</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">No output without citation match</div>
                </div>
              </div>

              {/* Sample Prompts Pill list */}
              <div className="mt-6">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  คำถามตัวอย่างสำหรับโดเมนนี้
                </div>
                <div className="space-y-1.5">
                  {currentAgent.samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptSubmit(p)}
                      className="w-full text-left p-2 rounded-lg bg-white/70 dark:bg-white/[0.03] hover:bg-blue-50 dark:hover:bg-blue-950/30 text-slate-700 dark:text-slate-300 text-[11px] leading-tight border border-slate-200/60 dark:border-white/5 hover:border-[#0055fa]/30 transition-all cursor-pointer"
                    >
                      💡 {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle: Chat Messages Area */}
            <div className={`p-4 sm:p-6 flex flex-col justify-between ${activeCitation ? "lg:col-span-5" : "lg:col-span-9"}`}>
              
              <div className="space-y-5 overflow-y-auto max-h-[460px] pr-2">
                {chatMessages.map((msg, index) => {
                  const isLatestAssistant = msg.role === "assistant" && index === chatMessages.length - 1;

                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0055fa] to-[#3b82f6] text-white flex items-center justify-center shrink-0 text-sm shadow-sm mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-[#0055fa] text-white font-medium ml-8 rounded-tr-xs shadow-md shadow-[#0055fa]/15"
                            : "bg-slate-100/90 dark:bg-[#11192e] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-tl-xs shadow-xs"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <div>{msg.content}</div>
                        ) : (
                          <div className="space-y-3">
                            {/* If in initial vector retrieval phase */}
                            {isSearching && isLatestAssistant ? (
                              <div className="flex items-center gap-2 text-xs font-mono text-[#0055fa] dark:text-blue-400 py-2 px-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40">
                                <span className="w-2 h-2 rounded-full bg-[#fec921] animate-ping" />
                                <span>⚡ กำลังสืบค้น Qdrant & เชื่อมโยงผ่าน OpenRouter (14ms)...</span>
                                <span className="animate-cursor font-bold text-[#0055fa]">▊</span>
                              </div>
                            ) : (
                              <div className="whitespace-pre-line space-y-2">
                                {renderMessageContent(isLatestAssistant ? displayedText : msg.content)}
                                {isStreaming && isLatestAssistant && (
                                  <span 
                                    className="inline-block w-2 h-4 ml-1 bg-[#0055fa] dark:bg-[#3b82f6] animate-cursor align-middle rounded-xs shadow-sm shadow-[#0055fa]/40" 
                                    title="Streaming token..."
                                  />
                                )}
                              </div>
                            )}

                            {/* Streaming Status Footer & Quick Controls */}
                            {isLatestAssistant && (
                              <div className="pt-2.5 mt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono">
                                  {isStreaming ? (
                                    <span className="inline-flex items-center gap-1.5 text-[#0055fa] dark:text-blue-400 font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#0055fa] animate-pulse" />
                                      <span>Streaming {MODELS.find(m => m.id === selectedModel)?.label || selectedModel}</span>
                                      <span className="text-slate-400 hidden sm:inline">• ~48 tok/s</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>100% Grounded in Qdrant Vector Engine</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {isStreaming && (
                                    <button
                                      type="button"
                                      onClick={skipStreaming}
                                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                      title="แสดงคำตอบทั้งหมดทันที"
                                    >
                                      ⏩ ข้าม (Skip)
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePromptSubmit(customInput);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder={`พิมพ์คำถามหรือคลิกคำถามตัวอย่าง (${currentAgent.name})...`}
                      className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-[#090e1a] border border-slate-300 dark:border-white/15 focus:border-[#0055fa] dark:focus:border-[#0055fa] outline-none text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="p-3 rounded-xl bg-[#0055fa] text-white hover:bg-[#0043c7] transition-all cursor-pointer shadow-sm shadow-[#0055fa]/30"
                    title="ส่งคำถาม"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Protected by PostgreSQL RLS + OpenRouter Key Vault</span>
                  </span>
                  <span className="text-[10px] hidden sm:inline text-slate-400">
                    คลิกแท็ก [Doc] เพื่อดู Source Chunk จาก Qdrant
                  </span>
                </div>
              </div>

            </div>

            {/* Right: Citation Inspector Drawer (Expands when user clicks a citation tag) */}
            {activeCitation && (
              <div className="lg:col-span-4 border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e1628] p-4 sm:p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0055fa]" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Source Citation Inspector
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveCitation(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Metadata Chips */}
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">เอกสารต้นฉบับ</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 break-all">
                        {activeCitation.docName}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#131d33] border border-slate-200/80 dark:border-white/5">
                        <div className="text-[10px] text-slate-400 font-mono">SIMILARITY SCORE</div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          {(activeCitation.similarity * 100).toFixed(1)}% Match
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden mt-1.5">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${activeCitation.similarity * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#131d33] border border-slate-200/80 dark:border-white/5">
                        <div className="text-[10px] text-slate-400 font-mono">PAGE / SECTION</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-white font-mono mt-0.5">
                          Page {activeCitation.page}
                        </div>
                      </div>
                    </div>

                    {/* Exact Extracted Text Chunk from Qdrant */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        <span>Extracted Chunk Payload</span>
                        <span className="font-mono text-[#0055fa]">{activeCitation.id}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 max-h-[160px] overflow-y-auto">
                        &quot;{activeCitation.textSnippet}&quot;
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Info className="w-3 h-3 text-[#0055fa]" />
                      <span>{activeCitation.updatedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    ตรวจสอบย้อนกลับไปยังไฟล์ต้นฉบับได้ 100% ป้องกันการสร้างข้อมูลเท็จในระดับ Enterprise
                  </div>
                  <button
                    onClick={() => setActiveCitation(null)}
                    className="w-full py-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    ปิดแถบตรวจสอบ
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
