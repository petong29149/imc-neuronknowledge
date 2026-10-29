'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  SquarePen,
  Search,
  BookOpen,
  Pin,
  ChevronDown,
  ChevronRight,
  PanelLeft,
  Gauge,
  Link2,
  MessageSquare,
  Plus,
  Send,
  BarChart2,
  Table2,
  Globe,
  FileText,
  PieChart,
  Check,
  RotateCcw,
  Sparkles,
  Store,
  X,
  Database,
  Brain,
  Cpu,
  Loader2,
  ExternalLink,
  Code2,
  Copy,
  ShieldCheck,
  ChevronLeft,
  Download,
  Bookmark,
} from 'lucide-react';

export type CitationSourceType = 'vector_doc' | 'sql_data' | 'web_news' | 'regulation';

export interface CitationDetail {
  id: string;
  index: number;
  type: CitationSourceType;
  title: string;
  sourceName: string;
  date?: string;
  author?: string;
  url?: string;
  confidenceScore?: number;
  documentMeta?: {
    fileName: string;
    fileSize?: string;
    pageNumber?: string;
    collection: string;
    excerpt: string;
    matchedKeywords: string[];
    publisher?: string;
  };
  sqlMeta?: {
    database: string;
    table: string;
    query: string;
    recordCount: number;
    records: Array<Record<string, unknown>>;
    syncTime: string;
    verifiedBy?: string;
  };
  webMeta?: {
    domain: string;
    headline: string;
    summary: string;
    publishedAt: string;
    author?: string;
    keyPoints?: string[];
  };
  regulationMeta?: {
    lawNumber: string;
    authority: string;
    effectiveDate: string;
    status: 'Active' | 'Pending' | 'Under Review';
    affectedHSCodes: Array<{ code: string; label: string }>;
    summary: string;
    actionGuidelines?: string[];
  };
}

export interface ToolExecutionStep {
  id: string;
  type: 'thinking' | 'vector_db' | 'sql_db' | 'web_search' | 'skill_load';
  title: string;
  subtitle?: string;
  status: 'pending' | 'running' | 'completed';
  duration?: string;
  payload?: {
    query?: string;
    sql?: string;
    collection?: string;
    resultsCount?: number;
    summary?: string;
    sources?: string[];
    latency?: string;
    reasoning?: string;
    records?: Array<Record<string, unknown>>;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  streaming?: boolean;
  harnessState?: 'idle' | 'running' | 'completed';
  harnessDuration?: string;
  steps?: ToolExecutionStep[];
  citations?: CitationDetail[];
  modelBadge?: string;
  effortBadge?: string;
  sourceBadge?: string;
}

export interface MockThread {
  id: string;
  title: string;
  pinned?: boolean;
  messages: ChatMessage[];
}

const INITIAL_THREADS: MockThread[] = [
  {
    id: 'pinned-1',
    title: 'จากบทวิเคราะห์และข่าวที่เกี่ยว...',
    pinned: true,
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'จากบทวิเคราะห์และข่าวที่เกี่ยวข้อง สรุปแนวโน้มการส่งออกสินค้าเกษตรไทยไตรมาสล่าสุด',
        timestamp: '10:15',
      },
      {
        id: 'm2',
        role: 'assistant',
        harnessState: 'completed',
        harnessDuration: '6.2s',
        modelBadge: 'Gemini 3.8 Flash',
        effortBadge: 'สมดุล',
        steps: [
          {
            id: 'p1-step-1',
            type: 'thinking',
            title: 'วิเคราะห์เจตนาและวางแผนการเรียกใช้เครื่องมือ (Agent Harness Loop)',
            subtitle: 'ระบุเครื่องมือที่จำเป็น: Vector Store สำหรับบริบทนโยบาย + SQL DB สำหรับสถิติส่งออก + Web Search สำหรับข่าวสารตลาดคู่ค้า',
            status: 'completed',
            duration: '1.4s',
            payload: {
              reasoning:
                '1. คำถามต้องการบทวิเคราะห์ผสมผสานตัวเลขจริงและข่าวสารล่าสุด\n2. กำหนดแผน Loop:\n   - Turn 1: สืบค้นคลังเอกสาร Vector DB ของ สนค. (RAG)\n   - Turn 2: ดึงสถิติตัวเลขจริงจาก PostgreSQL Database (SQL DB)\n   - Turn 3: ตรวจสอบข่าวสารความเคลื่อนไหวจาก Web Retrieval\n   - Synthesis: รวบรวมหลักฐานและสร้างคำตอบสรุปแบบมีหลักฐานอ้างอิง',
              latency: '1,380ms',
            },
          },
          {
            id: 'p1-step-2',
            type: 'vector_db',
            title: 'สืบค้นคลังเอกสาร Vector Database (TPSO Knowledge Base)',
            subtitle: 'ค้นหาด้วย Cosine Similarity ในคอลเลกชันรายงาน สนค. และบทวิเคราะห์ภาวะการค้า',
            status: 'completed',
            duration: '1.5s',
            payload: {
              collection: 'tpso_trade_intelligence_v2',
              query: 'แนวโน้มการส่งออกสินค้าเกษตรไทย ข้าว ยางพารา ผลไม้สดและแปรรูป ตลาดคู่ค้าหลัก นโยบายภาครัฐ',
              latency: '1,520ms',
              resultsCount: 3,
              summary: 'พบ 3 ส่วนเอกสารที่มีความเกี่ยวข้องสูง (Similarity Score: 0.942, 0.918, 0.887)',
              sources: [
                'รายงานภาวะการค้าระหว่างประเทศ สนค. ประจำไตรมาส 3/2569 (หน้า 12-18)',
                'บทวิเคราะห์แนวโน้มสินค้าเกษตรและอุตสาหกรรมเกษตรไทย (ฉบับ ก.ย. 2569)',
                'รายงานความต้องการสินค้าอาหารและสินค้าเกษตรในตลาดจีนและสหรัฐฯ',
              ],
            },
          },
          {
            id: 'p1-step-3',
            type: 'sql_db',
            title: 'ดึงสถิติตัวเลขจริงจาก SQL Database (TPSO Trade Warehouse)',
            subtitle: 'สืบค้นมูลค่าการส่งออก ปริมาณ และอัตราการเติบโต YoY จากฐานข้อมูลศุลกากร',
            status: 'completed',
            duration: '1.6s',
            payload: {
              sql: `SELECT 
  category_name_th AS "หมวดสินค้า",
  export_value_million_usd AS "มูลค่า (ล้าน USD)",
  growth_yoy_pct AS "เติบโต YoY",
  top_destination_countries AS "ตลาดส่งออกหลัก"
FROM tpso_agricultural_exports_q3_2026
ORDER BY export_value_million_usd DESC
LIMIT 3;`,
              latency: '1,640ms',
              summary: 'คืนค่า 3 แถวข้อมูลสถิติที่ผ่านการรับรองความถูกต้องของ สนค.',
              records: [
                {
                  'หมวดสินค้า': 'ข้าว (รวมข้าวหอมมะลิและข้าวขาว)',
                  'มูลค่า (ล้าน USD)': '1,420.5',
                  'เติบโต YoY': '+8.4%',
                  'ตลาดส่งออกหลัก': 'อินโดนีเซีย, สหรัฐฯ, อิรัก',
                },
                {
                  'หมวดสินค้า': 'ยางพาราและผลิตภัณฑ์',
                  'มูลค่า (ล้าน USD)': '985.2',
                  'เติบโต YoY': '+12.1%',
                  'ตลาดส่งออกหลัก': 'จีน, ญี่ปุ่น, สหรัฐฯ',
                },
                {
                  'หมวดสินค้า': 'ผลไม้สด แช่เย็น แช่แข็งและแห้ง',
                  'มูลค่า (ล้าน USD)': '892.4',
                  'เติบโต YoY': '+15.6%',
                  'ตลาดส่งออกหลัก': 'จีน, ฮ่องกง, เวียดนาม',
                },
              ],
            },
          },
          {
            id: 'p1-step-4',
            type: 'web_search',
            title: 'ตรวจสอบข่าวสารและมาตรการการค้าโลก (Web Search)',
            subtitle: 'ดึงข่าวสารล่าสุดเกี่ยวกับสถานการณ์โลจิสติกส์และนโยบายนำเข้าของคู่ค้า',
            status: 'completed',
            duration: '1.7s',
            payload: {
              query: 'Thailand agricultural export news global demand US China trade 2026',
              latency: '1,710ms',
              summary: 'ดึงข้อมูลบทวิเคราะห์ภายนอก 3 รายการยืนยันอุปสงค์นำเข้าที่แข็งแกร่ง',
              sources: [
                'Reuters: Southeast Asia farm exports surge amid global food security buffer building',
                'Bloomberg APAC Trade Watch: China tariff adjustments on tropical fruits',
                'World Bank Agri-Commodity Outlook Q3-Q4 2026',
              ],
            },
          },
        ],
        content: `จากการประมวลผลผ่านคลังความรู้ สนค. (Vector DB) และข้อมูลสถิติจากฐานข้อมูลศุลกากร (SQL DB) สรุปภาพรวมแนวโน้มการส่งออกสินค้าเกษตรไทยในไตรมาสล่าสุดได้ดังนี้:

**1. ข้อมูลสถิติเชิงปริมาณ (SQL Database - สนค.)**
• **ข้าว:** มูลค่าการส่งออก 1,420.5 ล้านดอลลาร์สหรัฐ (ขยายตัว +8.4% YoY) โดยมีคำสั่งซื้อหลักจากอินโดนีเซีย สหรัฐฯ และอิรัก
• **ยางพารา:** มูลค่า 985.2 ล้านดอลลาร์สหรัฐ (ขยายตัว +12.1% YoY) หนุนโดยอุตสาหกรรมยานยนต์ในจีนและญี่ปุ่น
• **ผลไม้สดและแปรรูป:** มูลค่า 892.4 ล้านดอลลาร์สหรัฐ (ขยายตัว +15.6% YoY) ทุเรียนและมังคุดยังเป็นสินค้าเรือธงในตลาดจีน

**2. บทวิเคราะห์เชิงนโยบายและบริบท (Vector DB RAG)**
• นโยบายสำรองความมั่นคงทางอาหารของกลุ่มประเทศตะวันออกกลางและอาเซียน ส่งผลให้อุปสงค์ข้าวและสินค้าเกษตรแปรรูปของไทยมีเสถียรภาพสูง
• ข้อจำกัดด้านผลผลิตจากสภาพอากาศในบางประเทศคู่แข่ง ทำให้ไทยได้รับส่วนแบ่งตลาดเพิ่มขึ้นในไตรมาสนี้

**3. สถานการณ์ตลาดโลกและปัจจัยเฝ้าระวัง (Web Retrieval)**
• มาตรการตรวจสอบมาตรฐานสิ่งแวดล้อมและความยั่งยืน (เช่น EUDR) ยังเป็นประเด็นที่ผู้ประกอบการยางพาราและไม้ต้องเตรียมความพร้อมอย่างต่อเนื่อง

**แหล่งข้อมูลอ้างอิง:**
[1] รายงาน สนค. ประจำไตรมาส 3/2569 • [2] ฐานข้อมูลสถิติการค้าศุลกากร SQL • [3] World Bank Agri-Commodity Outlook`,
        timestamp: '10:15',
        citations: [
          {
            id: 'cit-p1-1',
            index: 1,
            type: 'vector_doc',
            title: 'รายงานภาวะการค้าระหว่างประเทศ สนค. ประจำไตรมาส 3/2569',
            sourceName: 'TPSO Knowledge Base (pgvector)',
            date: 'ตุลาคม 2569',
            confidenceScore: 0.942,
            documentMeta: {
              fileName: 'TPSO-Trade-Quarterly-Report-Q3-2026.pdf',
              fileSize: '3.8 MB',
              pageNumber: 'หน้า 12-18 (ย่อหน้าที่ 3)',
              collection: 'tpso_trade_intelligence_v2',
              publisher: 'กองยุทธศาสตร์การค้า สำนักงานนโยบายและยุทธศาสตร์การค้า (สนค.)',
              excerpt:
                'ภาพรวมการส่งออกสินค้าเกษตรและอุตสาหกรรมเกษตรของไทยในไตรมาสที่ 3 ขยายตัวอย่างมีนัยสำคัญ โดยเฉพาะสินค้าข้าวและยางพาราที่ได้รับแรงขับเคลื่อนจากความต้องการสำรองคลังสินค้าเพื่อความมั่นคงทางอาหารของกลุ่มประเทศตะวันออกกลางและอาเซียน รวมถึงอุตสาหกรรมยานยนต์ในจีนที่มีความต้องการใช้ยางธรรมชาติเพิ่มขึ้นอย่างต่อเนื่อง',
              matchedKeywords: ['สินค้าเกษตร', 'ข้าว', 'ยางพารา', 'ความมั่นคงทางอาหาร', 'ไตรมาส 3', 'ตลาดคู่ค้า'],
            },
          },
          {
            id: 'cit-p1-2',
            index: 2,
            type: 'sql_data',
            title: 'สถิติการส่งออกสินค้าเกษตรรายหมวด (ไตรมาส 3/2569)',
            sourceName: 'PostgreSQL Trade Data Warehouse',
            date: 'ปรับปรุงวันนี้ 06:00 น.',
            sqlMeta: {
              database: 'tpso_trade_warehouse_cluster',
              table: 'public.tpso_agricultural_exports_q3_2026',
              verifiedBy: 'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร กระทรวงพาณิชย์',
              syncTime: 'วันนี้ เวลา 06:00 น. (Daily Automated ETL)',
              recordCount: 3,
              query: `SELECT 
  category_name_th AS "หมวดสินค้า",
  export_value_million_usd AS "มูลค่า (ล้าน USD)",
  growth_yoy_pct AS "เติบโต YoY",
  top_destination_countries AS "ตลาดส่งออกหลัก"
FROM tpso_agricultural_exports_q3_2026
ORDER BY export_value_million_usd DESC
LIMIT 3;`,
              records: [
                { 'หมวดสินค้า': 'ข้าว (รวมข้าวหอมมะลิและข้าวขาว)', 'มูลค่า (ล้าน USD)': '1,420.5', 'เติบโต YoY': '+8.4%', 'ตลาดส่งออกหลัก': 'อินโดนีเซีย, สหรัฐฯ, อิรัก' },
                { 'หมวดสินค้า': 'ยางพาราและผลิตภัณฑ์', 'มูลค่า (ล้าน USD)': '985.2', 'เติบโต YoY': '+12.1%', 'ตลาดส่งออกหลัก': 'จีน, ญี่ปุ่น, สหรัฐฯ' },
                { 'หมวดสินค้า': 'ผลไม้สด แช่เย็น แช่แข็งและแห้ง', 'มูลค่า (ล้าน USD)': '892.4', 'เติบโต YoY': '+15.6%', 'ตลาดส่งออกหลัก': 'จีน, ฮ่องกง, เวียดนาม' },
              ],
            },
          },
          {
            id: 'cit-p1-3',
            index: 3,
            type: 'web_news',
            title: 'Southeast Asia Farm Exports Surge Amid Global Food Security Buffer Building',
            sourceName: 'Reuters Trade & Commodities Monitor',
            url: 'https://www.reuters.com/markets/commodities/sea-agriculture-trade-outlook-2026',
            webMeta: {
              domain: 'reuters.com',
              headline: 'Southeast Asia Farm Exports Surge Amid Global Food Security Buffer Building',
              publishedAt: '28 ต.ค. 2569 เวลา 14:30 GMT+7',
              author: 'Reuters Commodity Desk (Singapore)',
              summary:
                'รายงานพิเศษระบุว่า อุปสงค์การนำเข้าธัญพืชและผลผลิตเกษตรจากเอเชียตะวันออกเฉียงใต้เพิ่มสูงขึ้นอย่างมีนัยสำคัญในไตรมาสล่าสุด จากการที่หลายประเทศในตะวันออกกลางและเอเชียกลางเร่งสร้างคลังสำรองอาหารรับมือกับความผันผวนของสภาพภูมิอากาศโลก',
              keyPoints: [
                'ไทยและเวียดนามได้รับคำสั่งซื้อข้าวและมันสำปะหลังเพิ่มขึ้นกว่า 8-10%',
                'ความตึงเครียดด้านโลจิสติกส์ในเส้นทางเดินเรือบางจุดเริ่มคลี่คลาย',
                'มาตรการตรวจสอบความยั่งยืนด้านสิ่งแวดล้อมยังคงเป็นเงื่อนไขสำคัญของตลาดยุโรป',
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'pinned-2',
    title: '03สหรัฐฯ ขึ้นภาษีนำเข้า กระท...',
    pinned: true,
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: '03สหรัฐฯ ขึ้นภาษีนำเข้า กระทบสินค้าไทยกลุ่มไหนบ้าง',
        timestamp: '11:30',
      },
      {
        id: 'm4',
        role: 'assistant',
        harnessState: 'completed',
        harnessDuration: '7.8s',
        modelBadge: 'Gemini 3.8 Flash',
        effortBadge: 'ละเอียดลึกซึ้ง',
        steps: [
          {
            id: 'p2-step-1',
            type: 'thinking',
            title: 'วิเคราะห์ผลกระทบมาตรการภาษีสหรัฐฯ และแยกแยะห่วงโซ่อุปทาน',
            subtitle: 'วางแผนตรวจสอบรายการพิกัดศุลกากร (Harmonized System Code) และประกาศ USTR ล่าสุด',
            status: 'completed',
            duration: '2.1s',
            payload: {
              reasoning:
                'สหรัฐฯ มีการปรับปรุงโครงสร้างภาษีนำเข้าตาม Section 301 และมาตรการ AD/CVD ต้องตรวจสอบรายการสินค้าที่มีความเสี่ยงสูงผ่าน Web Search และเทียบเคียงกับรายงานผลกระทบภายใน สนค. ใน Vector Store',
              latency: '2,120ms',
            },
          },
          {
            id: 'p2-step-2',
            type: 'web_search',
            title: 'ค้นหาประกาศและรายการภาษี USTR ล่าสุด (Web Search)',
            subtitle: 'ดึงเอกสารประกาศจาก Federal Register & USTR Trade Enforcement Updates',
            status: 'completed',
            duration: '2.8s',
            payload: {
              query: 'US import tariffs Section 301 2026 electronics solar cells Thailand impact',
              latency: '2,810ms',
              summary: 'พบบทวิเคราะห์มาตรการภาษีนำเข้าและรายชื่อพิกัดสินค้าที่มีการทบทวนอัตราภาษี',
              sources: [
                'Office of the United States Trade Representative (USTR) Tariff Schedule Update',
                'US Federal Register Notice on Section 301 Modifications',
                'CSIS: Analyzing US Tariff Shifts on Southeast Asian Manufacturing',
              ],
            },
          },
          {
            id: 'p2-step-3',
            type: 'vector_db',
            title: 'สืบค้นรายงานการประเมินผลกระทบภายใน สนค. (Vector DB)',
            subtitle: 'ค้นหาเอกสารสรุปข้อเสนอแนะเชิงนโยบายเพื่อบรรเทาผลกระทบแก่ผู้ประกอบการไทย',
            status: 'completed',
            duration: '2.9s',
            payload: {
              collection: 'tpso_policy_briefs',
              query: 'ผลกระทบภาษีสหรัฐ มาตรการเยียวยา อิเล็กทรอนิกส์ โซลาร์เซลล์ ถุงมือยาง อุตสาหกรรมยานยนต์',
              latency: '2,890ms',
              summary: 'พบรายงานด่วน สนค. เรื่อง การปรับตัวของห่วงโซ่อุปทานไทยต่อการแบ่งขั้วทางการค้า',
              sources: [
                'รายงานด่วน สนค. เรื่อง ผลกระทบภาษีสหรัฐฯ และแนวทางบรรเทา (หน้า 5-11)',
                'บทวิเคราะห์การปรับตัวของห่วงโซ่อุปทานไทยต่อการแบ่งขั้วทางการค้า (ก.ย. 2569)',
              ],
            },
          },
        ],
        content: `จากการสืบค้นประกาศนโยบายการค้าล่าสุดและรายงานวิเคราะห์ผลกระทบของ สนค. สรุปผลกระทบจากการปรับขึ้นภาษีนำเข้าของสหรัฐฯ ออกเป็น 2 ด้านหลัก:

**1. กลุ่มที่อาจได้รับผลกระทบทางตรง (Direct Impact)**
• **ชิ้นส่วนอิเล็กทรอนิกส์และวงจรรวม [1]:** อาจเผชิญการตรวจสอบแหล่งกำเนิดสินค้าที่เข้มงวดขึ้นในรายการสินค้าที่เข้าข่ายพิกัด Section 301
• **โซลาร์เซลล์และแผงพลังงานแสงอาทิตย์ [1]:** อยู่ระหว่างการไต่สวนมาตรการป้องกันการทุ่มตลาด (AD/CVD) รอบใหม่
• **ผลิตภัณฑ์เหล็กและอะลูมิเนียม:** เผชิญมาตรการด้านภาษีคาร์บอนและอัตราภาษีนำเข้าพื้นฐาน

**2. กลุ่มที่ได้รับอานิสงส์จากการทดแทนสินค้าและย้ายฐานการผลิต (Opportunity & Substitution)**
• **ถุงมือยางและเวชภัณฑ์ทางการแพทย์ [2]:** สหรัฐฯ ปรับขึ้นภาษีสินค้าจากจีน ส่งผลให้คำสั่งซื้อย้ายมายังผู้ผลิตไทยเพิ่มขึ้น
• **เครื่องใช้ไฟฟ้าและชิ้นส่วนยานยนต์ [3]:** ได้รับประโยชน์จากการกระจายความเสี่ยงห่วงโซ่อุปทาน (Supply Chain Diversification)

**ข้อเสนอแนะ สนค.:**
ผู้ประกอบการควรเร่งยกระดับมาตรฐานแหล่งกำเนิดสินค้า (Rules of Origin) และใช้สิทธิประโยชน์ทางการค้าภายใต้กรอบความร่วมมือเพื่อลดต้นทุนภาษี

**แหล่งข้อมูลอ้างอิง:**
[1] ประกาศมาตรการ Section 301 (USTR) • [2] รายงานด่วน สนค. ผลกระทบภาษีสหรัฐฯ • [3] CSIS Report: Analyzing US Tariff Shifts`,
        timestamp: '11:31',
        citations: [
          {
            id: 'cit-p2-1',
            index: 1,
            type: 'regulation',
            title: 'ประกาศมาตรการปรับปรุงพิกัดภาษีนำเข้าตามมาตรา 301 (Section 301 Tariff Modifications)',
            sourceName: 'Office of the United States Trade Representative (USTR)',
            url: 'https://ustr.gov/issue-areas/enforcement/section-301-investigations',
            date: '1 ต.ค. 2569',
            regulationMeta: {
              lawNumber: 'Docket No. USTR-2026-0014 / 89 FR 42100',
              authority: 'Office of the United States Trade Representative (USTR)',
              effectiveDate: '1 ตุลาคม 2569',
              status: 'Active',
              summary:
                'การปรับเพิ่มอัตราภาษีศุลกากรสำหรับสินค้ายุทธศาสตร์บางกลุ่มนำเข้าสู่สหรัฐฯ โดยมุ่งเน้นการตรวจสอบการถ่ายโอนสินค้า (Transshipment) และการพิสูจน์แหล่งกำเนิดสินค้าที่แท้จริง (Substantial Transformation)',
              affectedHSCodes: [
                { code: 'HS 8541.40', label: 'โซลาร์เซลล์และแผงพลังงานแสงอาทิตย์ (+25-50%)' },
                { code: 'HS 8542.31', label: 'ชิ้นส่วนวงจรรวมและโปรเซสเซอร์ (+15-25%)' },
                { code: 'HS 4015.19', label: 'ถุงมือยางสำหรับตรวจโรคและการแพทย์ (+10-25%)' },
                { code: 'HS 7208.51', label: 'ผลิตภัณฑ์เหล็กและอะลูมิเนียม (+25%)' },
              ],
              actionGuidelines: [
                'ผู้ประกอบการไทยต้องเตรียมเอกสารรับรองถิ่นกำเนิดสินค้า (Form C/O) อย่างเคร่งครัด',
                'ตรวจสอบสัดส่วนมูลค่าวัตถุดิบในประเทศ (Local Content) ให้เป็นไปตามเกณฑ์',
                'ปรึกษาคลินิกให้คำปรึกษาการค้า สนค. เพื่อประเมินสิทธิการขอรับการยกเว้นภาษี',
              ],
            },
          },
          {
            id: 'cit-p2-2',
            index: 2,
            type: 'vector_doc',
            title: 'รายงานด่วน สนค. เรื่อง ผลกระทบภาษีสหรัฐฯ และแนวทางบรรเทา',
            sourceName: 'TPSO Internal Policy Store',
            date: 'กันยายน 2569',
            confidenceScore: 0.918,
            documentMeta: {
              fileName: 'TPSO-Policy-Brief-US-Tariffs-2026.pdf',
              fileSize: '1.9 MB',
              pageNumber: 'หน้า 5-11',
              collection: 'tpso_policy_briefs',
              publisher: 'กลุ่มวิเคราะห์มาตรการทางการค้า สำนักงานนโยบายและยุทธศาสตร์การค้า (สนค.)',
              excerpt:
                'การขึ้นภาษีสินค้ากลุ่มอิเล็กทรอนิกส์และโซลาร์เซลล์ของสหรัฐฯ อาจส่งผลกระทบต่อห่วงโซ่อุปทานที่เชื่อมโยงกับวัตถุดิบนำเข้า แต่ในขณะเดียวกัน สินค้าถุงมือยางและชิ้นส่วนยานยนต์ไทยได้รับอานิสงส์อย่างมากจากการย้ายคำสั่งซื้อทดแทนสินค้าจีนที่มีอัตราภาษีสูงกว่า',
              matchedKeywords: ['Section 301', 'ภาษีสหรัฐ', 'อิเล็กทรอนิกส์', 'ถุงมือยาง', 'ห่วงโซ่อุปทาน', 'ย้ายฐานการผลิต'],
            },
          },
          {
            id: 'cit-p2-3',
            index: 3,
            type: 'web_news',
            title: 'CSIS Report: Analyzing US Tariff Shifts on Southeast Asian Manufacturing Hubs',
            sourceName: 'Center for Strategic and International Studies (CSIS)',
            url: 'https://csis.org/analysis/us-tariff-shifts-southeast-asia',
            webMeta: {
              domain: 'csis.org',
              headline: 'Analyzing US Tariff Shifts on Southeast Asian Manufacturing Hubs',
              publishedAt: '25 ต.ค. 2569',
              author: 'Trade & Geopolitics Program',
              summary:
                'บทวิเคราะห์การแบ่งขั้วทางการค้าและผลกระทบเชิงโครงสร้างต่อผู้ส่งออกในภูมิภาคอาเซียน โดยชี้ว่าไทยมีโอกาสก้าวขึ้นเป็นฐานประกอบชิ้นส่วนอิเล็กทรอนิกส์และเวชภัณฑ์สำคัญ หากสามารถรักษามาตรฐานการปฏิบัติตามกฎถิ่นกำเนิดสินค้าได้',
              keyPoints: [
                'ไทยมีแต้มต่อในกลุ่มเวชภัณฑ์และถุงมือยางจากความพร้อมของวัตถุดิบน้ำยางธรรมชาติ',
                'มาตรการกีดกันรอบใหม่ให้ความสำคัญกับ Supply Chain Transparency สูงสุด',
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'recent-1',
    title: 'สวัสดี',
    pinned: false,
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: 'สวัสดี',
        timestamp: '14:02',
      },
      {
        id: 'm6',
        role: 'assistant',
        harnessState: 'completed',
        harnessDuration: '0.04s',
        modelBadge: 'Gemini 3.8 Flash',
        effortBadge: 'รวดเร็ว',
        steps: [
          {
            id: 'r1-step-1',
            type: 'thinking',
            title: 'วิเคราะห์เจตนา (Intent Recognition & Session Setup)',
            subtitle: 'ตรวจพบคำทักทายทั่วไป ไม่จำเป็นต้องเรียกใช้เครื่องมือภายนอก (Fast-path bypass)',
            status: 'completed',
            duration: '40ms',
            payload: {
              reasoning: 'ผู้ใช้กล่าวทักทาย ทำการตอบกลับอย่างสุภาพพร้อมแนะนำความสามารถของระบบ TPSO Trade Assistant',
              latency: '40ms',
            },
          },
        ],
        content:
          'สวัสดีครับ คุณ admintest2! ยินดีต้อนรับสู่ TPSO AI APP วันนี้ต้องการให้ช่วยวิเคราะห์สถิติการค้าระหว่างประเทศ ค้นหารายงานภายใน หรือเปรียบเทียบข้อมูลตลาดคู่ค้าเรื่องไหนดีครับ?',
        timestamp: '14:02',
      },
    ],
  },
  {
    id: 'recent-2',
    title: 'สรุปภาวะการส่งออก ข้าว ไตร...',
    pinned: false,
    messages: [
      {
        id: 'm7',
        role: 'user',
        content: 'สรุปภาวะการส่งออก ข้าว ไตรมาส 3',
        timestamp: '15:20',
      },
      {
        id: 'm8',
        role: 'assistant',
        harnessState: 'completed',
        harnessDuration: '5.2s',
        modelBadge: 'Gemini 3.8 Flash',
        effortBadge: 'สมดุล',
        steps: [
          {
            id: 'r2-step-1',
            type: 'thinking',
            title: 'วางแผนดึงข้อมูลเฉพาะเจาะจงสินค้าข้าว',
            subtitle: 'เรียกใช้ SQL DB เพื่อคำนวณปริมาณ/มูลค่า และ Vector DB สำหรับปัจจัยหนุน',
            status: 'completed',
            duration: '1.4s',
            payload: {
              reasoning: 'คำถามเฉพาะเจาะจงกับสินค้าข้าว ไตรมาส 3 ดึงสถิติตรงจากตารางศุลกากร สนค.',
              latency: '1,420ms',
            },
          },
          {
            id: 'r2-step-2',
            type: 'sql_db',
            title: 'Query ฐานข้อมูลสถิติการค้าข้าว (SQL Database)',
            subtitle: 'คำนวณปริมาณรวมและมูลค่าแยกตามประเภทข้าว',
            status: 'completed',
            duration: '1.9s',
            payload: {
              sql: `SELECT 
  rice_type AS "ประเภทข้าว",
  export_volume_kton AS "ปริมาณ (พันตัน)",
  export_value_million_usd AS "มูลค่า (ล้าน USD)",
  growth_yoy_pct AS "เติบโต YoY"
FROM tpso_rice_export_2026_q3
ORDER BY export_value_million_usd DESC;`,
              latency: '1,880ms',
              summary: 'ดึงข้อมูลสำเร็จ 4 รายการข้าวหลัก',
              records: [
                { 'ประเภทข้าว': 'ข้าวขาว', 'ปริมาณ (พันตัน)': '1,240', 'มูลค่า (ล้าน USD)': '780.2', 'เติบโต YoY': '+9.8%' },
                { 'ประเภทข้าว': 'ข้าวหอมมะลิไทย', 'ปริมาณ (พันตัน)': '610', 'มูลค่า (ล้าน USD)': '495.1', 'เติบโต YoY': '+6.5%' },
                { 'ประเภทข้าว': 'ข้าวนึ่งและข้าวเหนียว', 'ปริมาณ (พันตัน)': '300', 'มูลค่า (ล้าน USD)': '145.2', 'เติบโต YoY': '+7.1%' },
              ],
            },
          },
          {
            id: 'r2-step-3',
            type: 'vector_db',
            title: 'สืบค้นรายงานวิเคราะห์ปัจจัยหนุนตลาดข้าว (Vector DB)',
            subtitle: 'ค้นหาคำอธิบายเกี่ยวกับคำสั่งซื้อและมาตรการนำเข้าของประเทศคู่ค้า',
            status: 'completed',
            duration: '1.9s',
            payload: {
              collection: 'tpso_trade_intelligence_v2',
              query: 'ปัจจัยหนุนการส่งออกข้าว ไตรมาส 3 อินโดนีเซีย อิรัก แอฟริกาใต้ สต็อกอาหาร',
              latency: '1,910ms',
              summary: 'พบ 2 บทวิเคราะห์ สนค. ยืนยันคำสั่งซื้อนำเข้าต่อเนื่อง',
              sources: [
                'สรุปภาวะการค้าข้าวไทยรายไตรมาส (สนค. ต.ค. 2569)',
                'รายงานตลาดข้าวในภูมิภาคอาเซียนและตะวันออกกลาง',
              ],
            },
          },
        ],
        content: `ภาวะการส่งออกข้าวไทยในไตรมาส 3 มีความเคลื่อนไหวสำคัญดังนี้:

**สถิติการส่งออก (SQL Database) [1]:**
• **ปริมาณส่งออกรวม:** 2.15 ล้านตัน (เพิ่มขึ้น +6.2% เมื่อเทียบกับไตรมาสก่อนหน้า)
• **มูลค่าส่งออกรวม:** 1,420.5 ล้านดอลลาร์สหรัฐ (ขยายตัว +8.4% YoY)
• **ตลาดส่งออกหลัก:** อินโดนีเซีย, อิรัก, สหรัฐอเมริกา และแอฟริกาใต้

**ปัจจัยหนุนสำคัญ (TPSO Knowledge Base) [2]:**
ความต้องการนำเข้าข้าวขาวและข้าวหอมมะลิเพื่อสำรองสต็อกคลังอาหารก่อนเข้าสู่ฤดูหนาวในต่างประเทศ ยังคงมีคำสั่งซื้อเข้ามาอย่างต่อเนื่อง ส่งผลให้ราคาและปริมาณส่งออกทรงตัวในระดับสูง

**แหล่งข้อมูลอ้างอิง:**
[1] สถิติการค้าข้าว SQL Database • [2] รายงานภาวะการค้าข้าว สนค.`,
        timestamp: '15:21',
        citations: [
          {
            id: 'cit-r2-1',
            index: 1,
            type: 'sql_data',
            title: 'ฐานข้อมูลสถิติการค้าข้าว ไตรมาส 3/2569 (ปริมาณและมูลค่ารายประเภท)',
            sourceName: 'PostgreSQL Rice Trade Statistics',
            date: '29 ต.ค. 2569',
            sqlMeta: {
              database: 'tpso_trade_warehouse_cluster',
              table: 'public.tpso_rice_export_2026_q3',
              verifiedBy: 'กรมการค้าต่างประเทศ และ สนค.',
              syncTime: 'ปรับปรุงล่าสุด 29 ต.ค. 2569',
              recordCount: 3,
              query: `SELECT 
  rice_type AS "ประเภทข้าว",
  export_volume_kton AS "ปริมาณ (พันตัน)",
  export_value_million_usd AS "มูลค่า (ล้าน USD)",
  growth_yoy_pct AS "เติบโต YoY"
FROM tpso_rice_export_2026_q3
ORDER BY export_value_million_usd DESC;`,
              records: [
                { 'ประเภทข้าว': 'ข้าวขาว', 'ปริมาณ (พันตัน)': '1,240', 'มูลค่า (ล้าน USD)': '780.2', 'เติบโต YoY': '+9.8%' },
                { 'ประเภทข้าว': 'ข้าวหอมมะลิไทย', 'ปริมาณ (พันตัน)': '610', 'มูลค่า (ล้าน USD)': '495.1', 'เติบโต YoY': '+6.5%' },
                { 'ประเภทข้าว': 'ข้าวนึ่งและข้าวเหนียว', 'ปริมาณ (พันตัน)': '300', 'มูลค่า (ล้าน USD)': '145.2', 'เติบโต YoY': '+7.1%' },
              ],
            },
          },
          {
            id: 'cit-r2-2',
            index: 2,
            type: 'vector_doc',
            title: 'รายงานสรุปภาวะการค้าข้าวไทยรายไตรมาส (สนค. ต.ค. 2569)',
            sourceName: 'TPSO Knowledge Base (pgvector)',
            confidenceScore: 0.935,
            documentMeta: {
              fileName: 'Rice-Market-Outlook-Q3-2026.pdf',
              fileSize: '2.1 MB',
              pageNumber: 'หน้า 4-8',
              collection: 'tpso_trade_intelligence_v2',
              publisher: 'กองยุทธศาสตร์การค้า สนค.',
              excerpt:
                'ความต้องการนำเข้าข้าวขาวและข้าวหอมมะลิเพื่อสำรองสต็อกคลังอาหารก่อนเข้าสู่ฤดูหนาวในต่างประเทศ ยังคงมีคำสั่งซื้อเข้ามาอย่างต่อเนื่อง ส่งผลให้ราคาและปริมาณส่งออกทรงตัวในระดับสูง โดยเฉพาะตลาดอินโดนีเซีย อิรัก และสหรัฐฯ',
              matchedKeywords: ['ข้าวขาว', 'ข้าวหอมมะลิ', 'คำสั่งซื้อ', 'สำรองอาหาร', 'อินโดนีเซีย'],
            },
          },
        ],
      },
    ],
  },
];

const MODEL_OPTIONS = [
  'Gemini 3.8 Flash',
  'Gemini 3.8 Pro',
  'Claude 3.7 Sonnet',
  'GPT-4o',
];

const EFFORT_OPTIONS = ['สมดุล', 'รวดเร็ว', 'ละเอียดลึกซึ้ง'];

const DATA_SOURCE_OPTIONS = [
  'แหล่งข้อมูล: อัตโนมัติ',
  'แหล่งข้อมูล: สถิติการค้า (TPSO)',
  'แหล่งข้อมูล: รายงานภายใน',
  'แหล่งข้อมูล: ข่าวสารการค้าโลก',
];

const SKILL_OPTIONS = [
  'อัตโนมัติ',
  'วิเคราะห์ภาวะการค้า',
  'เปรียบเทียบรายหมวด',
  'สรุปแถลงข่าว',
];

/**
 * Smart generator that plans out realistic Agent Harness Steps based on user query
 */
function createHarnessRunForQuery(
  query: string,
  model: string,
  source: string,
  skill: string,
  effort: string
): { steps: ToolExecutionStep[]; fullResponse: string; citations: CitationDetail[] } {
  const isTariff =
    query.includes('ภาษี') ||
    query.includes('สหรัฐ') ||
    query.includes('จีน') ||
    query.includes('NTB') ||
    query.includes('กีดกัน');
  const isCompare =
    query.includes('เปรียบเทียบ') ||
    query.includes('รายหมวด') ||
    query.includes('สัดส่วน') ||
    query.includes('อันดับ');

  const stepDurations =
    effort === 'รวดเร็ว'
      ? {
          think: '950ms',
          thinkLat: '950ms',
          vector: '1.0s',
          vectorLat: '1,020ms',
          sql: '1.1s',
          sqlLat: '1,100ms',
          web: '1.1s',
          webLat: '1,130ms',
        }
      : effort === 'ละเอียดลึกซึ้ง'
      ? {
          think: '2.0s',
          thinkLat: '2,040ms',
          vector: '2.1s',
          vectorLat: '2,120ms',
          sql: '2.2s',
          sqlLat: '2,240ms',
          web: '2.2s',
          webLat: '2,100ms',
        }
      : {
          think: '1.4s',
          thinkLat: '1,420ms',
          vector: '1.5s',
          vectorLat: '1,510ms',
          sql: '1.6s',
          sqlLat: '1,640ms',
          web: '1.8s',
          webLat: '1,780ms',
        };

  // Step 1: AI Reasoning / Thinking
  const thinkingStep: ToolExecutionStep = {
    id: `step-think-${Date.now()}`,
    type: 'thinking',
    title: 'วิเคราะห์เจตนาและวางแผนการสืบค้นข้อมูล (Agent Harness Loop)',
    subtitle: `โมเดล ${model} กำลังวางแผนเรียกใช้เครื่องมือตามระดับความลึกซึ้ง (${effort})`,
    status: 'running',
    duration: stepDurations.think,
    payload: {
      reasoning: `วิเคราะห์คำถาม: "${query}"\n\n1. ตรวจสอบความต้องการของผู้ใช้: ต้องการข้อมูลที่ถูกต้อง ตรวจสอบได้ พร้อมหลักฐานอ้างอิง\n2. กำหนด Harness Execution Pipeline:\n   - Loop Turn 1: สืบค้นคลังเอกสารบริบทเชิงคุณภาพ (Vector DB RAG)\n   - Loop Turn 2: สืบหาตัวเลขสถิติปริมาณและมูลค่าเชิงปริมาณ (PostgreSQL Database)\n   - Loop Turn 3: สืบค้นข่าวสารสถานการณ์การค้าและมาตรการระหว่างประเทศ (Web Retrieval)\n3. เตรียมสังเคราะห์ผลลัพธ์เป็นรายงานสรุปเชิงบริหาร (Executive Brief)`,
      latency: stepDurations.thinkLat,
    },
  };

  // Step 2: Vector DB
  const vectorStep: ToolExecutionStep = {
    id: `step-vector-${Date.now()}`,
    type: 'vector_db',
    title: 'สืบค้นคลังเอกสาร Vector Database (TPSO Knowledge Base)',
    subtitle: 'ค้นหาด้วย Cosine Similarity ในคอลเลกชันรายงาน สนค. และบทวิเคราะห์ภาวะการค้า',
    status: 'pending',
    duration: stepDurations.vector,
    payload: {
      collection: isTariff ? 'tpso_policy_briefs' : 'tpso_trade_intelligence_v2',
      query: `สืบค้นบริบทและประเด็นเชิงนโยบาย: ${query}`,
      latency: stepDurations.vectorLat,
      resultsCount: 4,
      summary: 'พบ 4 ส่วนเอกสารที่มีคะแนนความเกี่ยวข้องสูง (> 0.89)',
      sources: isTariff
        ? [
            'รายงานวิเคราะห์ผลกระทบมาตรการกีดกันทางการค้าและการปรับโครงสร้างภาษี (สนค. 2569)',
            'เอกสารชี้แจงกฎเกณฑ์ทางการค้าและแนวทางการเยียวยาผู้ประกอบการไทย',
            'รายงานการติดตามนโยบายการค้าของประเทศคู่ค้าหลักในเอเชียและอเมริกา',
          ]
        : [
            'รายงานภาวะการค้าระหว่างประเทศ สนค. ประจำไตรมาสล่าสุด (บทวิเคราะห์รายหมวด)',
            'บทวิเคราะห์แนวโน้มการส่งออกและดัชนีราคาสินค้าเกษตรและอุตสาหกรรม (สนค.)',
            'รายงานสรุปสถานการณ์ตลาดคู่ค้าหลัก 5 อันดับแรกของไทย',
          ],
    },
  };

  // Step 3: SQL Database
  const sqlStep: ToolExecutionStep = {
    id: `step-sql-${Date.now()}`,
    type: 'sql_db',
    title: 'ดึงสถิติตัวเลขจริงจาก SQL Database (TPSO Trade Warehouse)',
    subtitle: 'ส่งคำสั่ง Query ไปยัง PostgreSQL Database ของ สนค. เพื่อดึงสถิติที่มีการรับรอง',
    status: 'pending',
    duration: stepDurations.sql,
    payload: {
      sql: isCompare
        ? `SELECT 
  sector_name AS "หมวดสินค้า",
  export_val_million_usd AS "มูลค่า (ล้าน USD)",
  growth_yoy_pct AS "เติบโต YoY",
  share_pct AS "สัดส่วน (%)"
FROM tpso_export_sectors_quarterly
WHERE year = 2026 AND quarter = 3
ORDER BY export_val_million_usd DESC;`
        : `SELECT 
  category_name_th AS "รายการ",
  export_value_million_usd AS "มูลค่าส่งออก (ล้าน USD)",
  growth_rate_yoy AS "การเติบโต YoY (%)",
  top_destination AS "ตลาดส่งออกหลัก"
FROM tpso_trade_statistics_master
WHERE year = 2026 AND quarter = 3
ORDER BY export_value_million_usd DESC LIMIT 4;`,
      latency: stepDurations.sqlLat,
      summary: 'คืนค่าผลลัพธ์ 4 แถวข้อมูล พร้อมการคำนวณอัตราการเปลี่ยนแปลง',
      records: isCompare
        ? [
            { 'หมวดสินค้า': 'สินค้าอุตสาหกรรม (Manufacturing)', 'มูลค่า (ล้าน USD)': '18,450.2', 'เติบโต YoY': '+5.4%', 'สัดส่วน (%)': '78.2%' },
            { 'หมวดสินค้า': 'สินค้าเกษตร (Agricultural)', 'มูลค่า (ล้าน USD)': '2,890.6', 'เติบโต YoY': '+8.9%', 'สัดส่วน (%)': '12.3%' },
            { 'หมวดสินค้า': 'สินค้าอุตสาหกรรมเกษตร (Agro-industry)', 'มูลค่า (ล้าน USD)': '2,240.1', 'เติบโต YoY': '+6.2%', 'สัดส่วน (%)': '9.5%' },
          ]
        : [
            { 'รายการ': 'ข้าวและผลิตภัณฑ์ธัญพืช', 'มูลค่าส่งออก (ล้าน USD)': '1,420.5', 'การเติบโต YoY (%)': '+8.4%', 'ตลาดส่งออกหลัก': 'อินโดนีเซีย, สหรัฐฯ, อิรัก' },
            { 'รายการ': 'ยางพาราและผลิตภัณฑ์', 'มูลค่าส่งออก (ล้าน USD)': '985.2', 'การเติบโต YoY (%)': '+12.1%', 'ตลาดส่งออกหลัก': 'จีน, ญี่ปุ่น, สหรัฐฯ' },
            { 'รายการ': 'ผลไม้สด แช่เย็น แช่แข็งและแปรรูป', 'มูลค่าส่งออก (ล้าน USD)': '892.4', 'การเติบโต YoY (%)': '+15.6%', 'ตลาดส่งออกหลัก': 'จีน, ฮ่องกง, เวียดนาม' },
            { 'รายการ': 'อาหารทะเลและผลิตภัณฑ์แปรรูป', 'มูลค่าส่งออก (ล้าน USD)': '675.8', 'การเติบโต YoY (%)': '+4.7%', 'ตลาดส่งออกหลัก': 'สหรัฐฯ, ญี่ปุ่น, ออสเตรเลีย' },
          ],
    },
  };

  // Step 4: Web Search
  const webStep: ToolExecutionStep = {
    id: `step-web-${Date.now()}`,
    type: 'web_search',
    title: 'ตรวจสอบข่าวสารและมาตรการการค้าโลก (Web Search)',
    subtitle: 'สืบค้นข้อมูลข่าวสาร ข้อมูลเศรษฐกิจโลก และนโยบายนำเข้าของคู่ค้าแบบเรียลไทม์',
    status: 'pending',
    duration: stepDurations.web,
    payload: {
      query: `Thailand trade intelligence updates 2026: ${query}`,
      latency: stepDurations.webLat,
      summary: 'ดึงข้อมูลบทวิเคราะห์ภายนอก 3 รายการเพื่อตรวจสอบความสอดคล้องของแนวโน้ม',
      sources: [
        'Reuters Trade Monitor: Southeast Asia Trade Flows and Key Partner Dynamics (2026)',
        'Bloomberg APAC Commodity Watch: Shifting Supply Chains and Agricultural Logistics',
        'World Bank / WTO Trade Outlook Brief (Quarterly Economic Updates)',
      ],
    },
  };

  const steps = [thinkingStep, vectorStep, sqlStep, webStep];

  let citations: CitationDetail[] = [];

  if (isTariff) {
    citations = [
      {
        id: `cit-gen-1-${Date.now()}`,
        index: 1,
        type: 'regulation',
        title: 'ประกาศมาตรการปรับปรุงพิกัดภาษีนำเข้าและมาตรการที่ไม่ใช่ภาษี (NTBs)',
        sourceName: 'Office of the United States Trade Representative (USTR) & WTO',
        url: 'https://ustr.gov/issue-areas/enforcement',
        regulationMeta: {
          lawNumber: 'USTR Section 301 / WTO TBT Notification 2026',
          authority: 'Office of the USTR & คณะกรรมาธิการยุโรป',
          effectiveDate: 'ไตรมาส 3/2569 เป็นต้นไป',
          status: 'Active',
          summary: `การปรับปรุงมาตรการภาษีและเกณฑ์มาตรฐานสิ่งแวดล้อมที่ส่งผลกระทบต่อรายการสินค้าส่งออกจากเอเชียตะวันออกเฉียงใต้ โดยเฉพาะประเด็น: "${query}"`,
          affectedHSCodes: [
            { code: 'HS 8541-8542', label: 'ชิ้นส่วนอิเล็กทรอนิกส์และวงจรรวม' },
            { code: 'HS 4015', label: 'ผลิตภัณฑ์ยางและถุงมือแพทย์' },
            { code: 'HS 8415-8418', label: 'เครื่องใช้ไฟฟ้าและเครื่องปรับอากาศ' },
          ],
          actionGuidelines: [
            'ตรวจสอบเอกสารรับรองถิ่นกำเนิดสินค้า (Certificate of Origin)',
            'ติดตามการไต่สวนมาตรการตอบโต้การทุ่มตลาด (AD/CVD) อย่างใกล้ชิด',
            'ประสานงานกับกรมเจรจาการค้าระหว่างประเทศเพื่อขอรับคำแนะนำเชิงเทคนิค',
          ],
        },
      },
      {
        id: `cit-gen-2-${Date.now()}`,
        index: 2,
        type: 'vector_doc',
        title: 'รายงานวิเคราะห์ผลกระทบมาตรการกีดกันทางการค้าและการปรับโครงสร้างภาษี (สนค. 2569)',
        sourceName: 'TPSO Knowledge Base (pgvector)',
        confidenceScore: 0.925,
        documentMeta: {
          fileName: 'TPSO-Policy-Brief-Trade-Barriers-2026.pdf',
          fileSize: '2.5 MB',
          pageNumber: 'หน้า 8-15 (บทที่ 2)',
          collection: 'tpso_policy_briefs',
          publisher: 'สำนักงานนโยบายและยุทธศาสตร์การค้า (สนค.)',
          excerpt: `ผลการประเมินผลกระทบเชิงนโยบายจากข้อซักถาม "${query}" พบว่าผู้ส่งออกไทยจำเป็นต้องกระจายตลาดคู่ค้าเพื่อลดการพึ่งพาตลาดเดี่ยว พร้อมทั้งปรับปรุงกระบวนการผลิตให้สอดคล้องกับมาตรฐานความยั่งยืนของคู่ค้าหลัก`,
          matchedKeywords: ['มาตรการภาษี', 'ผลกระทบ', 'ห่วงโซ่อุปทาน', 'สนค.', 'นโยบายการค้า'],
        },
      },
      {
        id: `cit-gen-3-${Date.now()}`,
        index: 3,
        type: 'web_news',
        title: 'Global Trade Monitor: Policy Shifts and Tariffs Outlook 2026',
        sourceName: 'Reuters & Bloomberg Trade Intelligence',
        url: 'https://www.reuters.com/markets/macro-trade-update',
        webMeta: {
          domain: 'reuters.com',
          headline: 'Global Trade Monitor: Policy Shifts and Tariffs Outlook 2026',
          publishedAt: 'เผยแพร่สัปดาห์ล่าสุด',
          author: 'International Trade Analysis Team',
          summary: `การติดตามความเคลื่อนไหวด้านนโยบายการค้าระหว่างประเทศที่เกี่ยวข้องกับ ${query} สะท้อนให้เห็นถึงการจัดระเบียบห่วงโซ่อุปทานใหม่ของกลุ่มประเทศคู่ค้าหลัก`,
          keyPoints: [
            'การตรวจสอบแหล่งกำเนิดสินค้าเข้มงวดขึ้นในกลุ่มสินค้าเทคโนโลยี',
            'ประเทศในอาเซียนกลายเป็นเป้าหมายการย้ายฐานการผลิตที่มีอัตราการเติบโตสูง',
          ],
        },
      },
    ];
  } else if (isCompare) {
    citations = [
      {
        id: `cit-gen-1-${Date.now()}`,
        index: 1,
        type: 'sql_data',
        title: 'สถิติการส่งออกเปรียบเทียบรายหมวดสินค้า (ไตรมาส 3/2569)',
        sourceName: 'PostgreSQL Trade Statistics Warehouse',
        date: 'ข้อมูล ณ วันที่ 29 ต.ค. 2569',
        sqlMeta: {
          database: 'tpso_trade_warehouse_cluster',
          table: 'public.tpso_export_sectors_quarterly',
          verifiedBy: 'กลุ่มสถิติและการค้าดิจิทัล สนค.',
          syncTime: 'วันนี้ เวลา 06:00 น. (Daily Automated Sync)',
          recordCount: 3,
          query: `SELECT 
  sector_name AS "หมวดสินค้า",
  export_val_million_usd AS "มูลค่า (ล้าน USD)",
  growth_yoy_pct AS "เติบโต YoY",
  share_pct AS "สัดส่วน (%)"
FROM tpso_export_sectors_quarterly
WHERE year = 2026 AND quarter = 3
ORDER BY export_val_million_usd DESC;`,
          records: [
            { 'หมวดสินค้า': 'สินค้าอุตสาหกรรม (Manufacturing)', 'มูลค่า (ล้าน USD)': '18,450.2', 'เติบโต YoY': '+5.4%', 'สัดส่วน (%)': '78.2%' },
            { 'หมวดสินค้า': 'สินค้าเกษตร (Agricultural)', 'มูลค่า (ล้าน USD)': '2,890.6', 'เติบโต YoY': '+8.9%', 'สัดส่วน (%)': '12.3%' },
            { 'หมวดสินค้า': 'สินค้าอุตสาหกรรมเกษตร (Agro-industry)', 'มูลค่า (ล้าน USD)': '2,240.1', 'เติบโต YoY': '+6.2%', 'สัดส่วน (%)': '9.5%' },
          ],
        },
      },
      {
        id: `cit-gen-2-${Date.now()}`,
        index: 2,
        type: 'vector_doc',
        title: 'รายงานภาวะการค้าระหว่างประเทศ สนค. ฉบับวิเคราะห์เชิงโครงสร้าง',
        sourceName: 'TPSO Knowledge Base (pgvector)',
        confidenceScore: 0.938,
        documentMeta: {
          fileName: 'TPSO-Structure-Trade-Analysis-2026.pdf',
          fileSize: '3.1 MB',
          pageNumber: 'หน้า 14-22 (ส่วนที่ 3)',
          collection: 'tpso_trade_intelligence_v2',
          publisher: 'กองยุทธศาสตร์การค้า สำนักงานนโยบายและยุทธศาสตร์การค้า (สนค.)',
          excerpt: `การเปรียบเทียบสัดส่วนและอัตราการเติบโตรายหมวดสินค้าตามหัวข้อ "${query}" ชี้ให้เห็นว่า สินค้าเกษตรและเกษตรแปรรูปเป็นตัวขับเคลื่อนเสถียรภาพดุลการค้า ในขณะที่สินค้าอุตสาหกรรมสร้างมูลค่าส่งออกหลัก`,
          matchedKeywords: ['เปรียบเทียบ', 'รายหมวด', 'สินค้าอุตสาหกรรม', 'สินค้าเกษตร', 'สัดส่วนการส่งออก'],
        },
      },
      {
        id: `cit-gen-3-${Date.now()}`,
        index: 3,
        type: 'web_news',
        title: 'Bloomberg APAC Trade Watch: Sectoral Growth and Export Competitiveness',
        sourceName: 'Bloomberg Markets',
        url: 'https://www.bloomberg.com/markets/apac-trade-sectors',
        webMeta: {
          domain: 'bloomberg.com',
          headline: 'APAC Trade Watch: Sectoral Growth and Export Competitiveness',
          publishedAt: '28 ต.ค. 2569',
          author: 'Bloomberg APAC Desk',
          summary: 'บทวิเคราะห์ความสามารถในการแข่งขันของภาคการผลิตและการส่งออกในกลุ่มประเทศอาเซียน โดยเน้นย้ำถึงบทบาทของสินค้าอุตสาหกรรมเกษตรแปรรูปของไทยที่มีมูลค่าเพิ่มสูง',
          keyPoints: [
            'อุตสาหกรรมเกษตรแปรรูปไทยมีอัตราการเติบโตเหนือค่าเฉลี่ยของภูมิภาค',
            'การนำเทคโนโลยีและระบบอัตโนมัติมาใช้ช่วยเพิ่มประสิทธิภาพการส่งออก',
          ],
        },
      },
    ];
  } else {
    citations = [
      {
        id: `cit-gen-1-${Date.now()}`,
        index: 1,
        type: 'vector_doc',
        title: 'รายงานภาวะการค้าระหว่างประเทศ สนค. ประจำไตรมาสล่าสุด',
        sourceName: 'TPSO Knowledge Base (pgvector)',
        confidenceScore: 0.945,
        documentMeta: {
          fileName: 'TPSO-Trade-Quarterly-Report-Q3-2026.pdf',
          fileSize: '4.2 MB',
          pageNumber: 'หน้า 10-16',
          collection: 'tpso_trade_intelligence_v2',
          publisher: 'สำนักงานนโยบายและยุทธศาสตร์การค้า (สนค.)',
          excerpt: `จากการประมวลผลคำถาม "${query}" ในคลังข้อมูล สนค. พบว่าภาพรวมการค้าระหว่างประเทศของไทยยังคงได้รับปัจจัยบวกจากอุปสงค์ในตลาดคู่ค้าหลัก แม้จะต้องเผชิญความไม่แน่นอนทางภูมิรัฐศาสตร์`,
          matchedKeywords: ['การค้าล่าสุด', 'การส่งออก', 'ตลาดคู่ค้า', 'สนค.', 'ตัวเลขสถิติ'],
        },
      },
      {
        id: `cit-gen-2-${Date.now()}`,
        index: 2,
        type: 'sql_data',
        title: 'ฐานข้อมูลสถิติการค้าศุลกากร (SQL Data Warehouse)',
        sourceName: 'PostgreSQL Trade Statistics Cluster',
        date: 'ปรับปรุงวันนี้ 06:00 น.',
        sqlMeta: {
          database: 'tpso_trade_warehouse_cluster',
          table: 'public.tpso_trade_statistics_master',
          verifiedBy: 'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร สนค.',
          syncTime: 'วันนี้ เวลา 06:00 น. (Daily Automated Sync)',
          recordCount: 4,
          query: `SELECT 
  category_name_th AS "รายการ",
  export_value_million_usd AS "มูลค่าส่งออก (ล้าน USD)",
  growth_rate_yoy AS "การเติบโต YoY (%)",
  top_destination AS "ตลาดส่งออกหลัก"
FROM tpso_trade_statistics_master
WHERE year = 2026 AND quarter = 3
ORDER BY export_value_million_usd DESC LIMIT 4;`,
          records: [
            { 'รายการ': 'ข้าวและผลิตภัณฑ์ธัญพืช', 'มูลค่าส่งออก (ล้าน USD)': '1,420.5', 'การเติบโต YoY (%)': '+8.4%', 'ตลาดส่งออกหลัก': 'อินโดนีเซีย, สหรัฐฯ, อิรัก' },
            { 'รายการ': 'ยางพาราและผลิตภัณฑ์', 'มูลค่าส่งออก (ล้าน USD)': '985.2', 'การเติบโต YoY (%)': '+12.1%', 'ตลาดส่งออกหลัก': 'จีน, ญี่ปุ่น, สหรัฐฯ' },
            { 'รายการ': 'ผลไม้สด แช่เย็น แช่แข็งและแปรรูป', 'มูลค่าส่งออก (ล้าน USD)': '892.4', 'การเติบโต YoY (%)': '+15.6%', 'ตลาดส่งออกหลัก': 'จีน, ฮ่องกง, เวียดนาม' },
            { 'รายการ': 'อาหารทะเลและผลิตภัณฑ์แปรรูป', 'มูลค่าส่งออก (ล้าน USD)': '675.8', 'การเติบโต YoY (%)': '+4.7%', 'ตลาดส่งออกหลัก': 'สหรัฐฯ, ญี่ปุ่น, ออสเตรเลีย' },
          ],
        },
      },
      {
        id: `cit-gen-3-${Date.now()}`,
        index: 3,
        type: 'web_news',
        title: 'ข้อมูลข่าวสารและการติดตามตลาดการค้าโลก (Reuters & Bloomberg)',
        sourceName: 'Reuters & Bloomberg Trade Intelligence',
        url: 'https://www.reuters.com/markets/commodities/sea-trade-2026',
        webMeta: {
          domain: 'reuters.com',
          headline: 'Southeast Asia Trade Flows and Global Demand Patterns (2026)',
          publishedAt: '28 ต.ค. 2569 เวลา 14:30 GMT+7',
          author: 'Reuters Trade Desk',
          summary: `ข่าวสารและรายงานตลาดโลกยืนยันความต้องการสินค้าส่งออกจากเอเชียตะวันออกเฉียงใต้ โดยเฉพาะสินค้าในกลุ่มที่เชื่อมโยงกับ ${query}`,
          keyPoints: [
            'อุปสงค์สินค้าอาหารและการเกษตรแปรรูปยังคงเป็นเสาหลักสำคัญ',
            'ดัชนีความเชื่อมั่นผู้ส่งออกไทยปรับตัวขึ้นในระดับทรงตัวบวก',
          ],
        },
      },
    ];
  }

  // Rich response synthesized from the tools
  const fullResponse = `จากการประมวลผลผ่านกระบวนการ Agent Harness Loop (เชื่อมโยงคลังความรู้ Vector DB, ฐานข้อมูลสถิติ SQL และข้อมูลข่าวสาร Web Retrieval) สรุปรายงานสำหรับ "${query}" ดังนี้:

**1. สรุปภาพรวมเชิงปริมาณ (สถิติจริงจาก SQL Database - สนค.) [2]**
• **มูลค่าและอัตราการเติบโต:** สินค้าส่งออกกลุ่มหลักของไทยยังคงขยายตัวได้ดี โดยเฉพาะกลุ่มสินค้าเกษตร (+8.9% YoY) และอุตสาหกรรมเกษตร (+6.2% YoY)
• **ตลาดส่งออกที่มีบทบาทนำ:** สหรัฐอเมริกา, จีน, อาเซียน และกลุ่มประเทศตะวันออกกลาง ยังคงเป็นจุดหมายปลายทางหลักที่มีคำสั่งซื้อต่อเนื่อง
• **เสถียรภาพทางการค้า:** ดุลการค้าในกลุ่มสินค้าเกษตรแปรรูปยังคงเกินดุลอย่างมีนัยสำคัญ

**2. บทวิเคราะห์เชิงนโยบายและบริบท (TPSO Knowledge Base - Vector DB) [1]**
• ความต้องการด้านความมั่นคงทางอาหาร (Food Security) ของประเทศคู่ค้ายังเป็นแรงขับเคลื่อนสำคัญที่ช่วยพยุงการส่งออกของไทย
• นโยบายส่งเสริมและเจรจาขยายกรอบความร่วมมือทางการค้า (FTA) ของกระทรวงพาณิชย์ช่วยลดอุปสรรคทางภาษีในตลาดใหม่ได้อย่างมีประสิทธิภาพ

**3. ปัจจัยเฝ้าระวังและแนวโน้มตลาดโลก (Web Retrieval) [3]**
• มาตรการด้านสิ่งแวดล้อม มาตรฐานคาร์บอน (CBAM) และกฎหมายว่าด้วยการไม่ตัดไม้ทำลายป่า (EUDR) ยังคงเป็นเกณฑ์ที่ผู้ส่งออกไทยต้องเฝ้าระวังและปรับตัว
• การปรับเปลี่ยนนโยบายภาษีนำเข้าของประเทศมหาอำนาจอาจเปิดโอกาสให้ไทยเป็นฐานทดแทนสินค้าในบางกลุ่มอุตสาหกรรม

**แหล่งข้อมูลอ้างอิงและเครื่องมือที่ใช้:**
[1] รายงาน สนค. ประจำไตรมาส 3/2569 • [2] ฐานข้อมูลสถิติการค้าศุลกากร SQL • [3] ข้อมูลข่าวสารการค้าโลก (Reuters & Bloomberg)`;

  return { steps, fullResponse, citations };
}

/**
 * Renders payload details (SQL, Vector chunks, Reasoning, Web URLs) in a clean inspector
 */
function PayloadViewer({ step }: { step: ToolExecutionStep }) {
  if (!step.payload) return null;

  return (
    <div className="mt-2.5 p-3 sm:p-3.5 rounded-xl bg-[#0b1324] text-slate-200 border border-slate-800 text-[11.5px] sm:text-[12px] font-sans shadow-inner">
      {/* THINKING REASONING */}
      {step.type === 'thinking' && step.payload.reasoning && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-purple-400">
            <span className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              AI Strategic Reasoning & Plan
            </span>
            <span className="text-slate-400 font-normal">
              Latency: {step.payload.latency || step.duration}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-200 leading-relaxed whitespace-pre-line font-mono text-[11px] sm:text-[11.5px]">
            {step.payload.reasoning}
          </div>
        </div>
      )}

      {/* VECTOR DB DETAILS */}
      {step.type === 'vector_db' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-sky-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Vector Similarity Search (pgvector / Qdrant)
            </span>
            <span className="text-slate-400 font-normal">
              Latency: {step.payload.latency || step.duration}
            </span>
          </div>

          {step.payload.collection && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-400 font-semibold">Target Collection:</span>
              <code className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/50 font-mono">
                {step.payload.collection}
              </code>
              <span className="text-emerald-400 font-semibold">Score: &gt; 0.91 Cosine</span>
            </div>
          )}

          {step.payload.query && (
            <div className="text-[11px] text-slate-300">
              <span className="text-slate-400 font-semibold">Query Embedding:</span>{' '}
              <span className="italic text-slate-200">&ldquo;{step.payload.query}&rdquo;</span>
            </div>
          )}

          {step.payload.sources && step.payload.sources.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                เอกสารที่ตรวจพบ (Top Matched Chunks):
              </div>
              {step.payload.sources.map((src, idx) => (
                <div
                  key={idx}
                  className="p-1.5 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2"
                >
                  <span className="text-sky-400 font-bold shrink-0">{idx + 1}.</span>
                  <span>{src}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SQL DATABASE DETAILS */}
      {step.type === 'sql_db' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Table2 className="w-3.5 h-3.5" />
              PostgreSQL Trade Data Warehouse
            </span>
            <span className="text-slate-400 font-normal">
              Latency: {step.payload.latency || step.duration}
            </span>
          </div>

          {step.payload.sql && (
            <div className="p-2.5 rounded-lg bg-[#050b14] border border-slate-800 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto">
              <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                SQL Query
              </div>
              <pre className="whitespace-pre-wrap">{step.payload.sql}</pre>
            </div>
          )}

          {step.payload.records && step.payload.records.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#070e1b]">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    {Object.keys(step.payload.records[0]).map((col) => (
                      <th key={col} className="px-2.5 py-1.5 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {step.payload.records.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/50 transition-colors">
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx} className="px-2.5 py-1.5 whitespace-nowrap">
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WEB SEARCH DETAILS */}
      {step.type === 'web_search' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-indigo-400">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Live Web Retrieval Engine
            </span>
            <span className="text-slate-400 font-normal">
              Latency: {step.payload.latency || step.duration}
            </span>
          </div>

          {step.payload.query && (
            <div className="text-[11px] text-slate-300">
              <span className="text-slate-400 font-semibold">Search Keywords:</span>{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800 font-mono">
                {step.payload.query}
              </code>
            </div>
          )}

          {step.payload.sources && step.payload.sources.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                แหล่งข่าวสารที่สืบค้น (External Citations):
              </div>
              {step.payload.sources.map((src, idx) => (
                <div
                  key={idx}
                  className="p-1.5 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="truncate">{src}</span>
                  </div>
                  <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 shrink-0">
                    Verified
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Visualizer showing AI Thinking, Database Query, Vector Store, and Web Search steps
 */
function ToolHarnessVisualizer({
  steps,
  harnessState,
  harnessDuration,
}: {
  steps: ToolExecutionStep[];
  harnessState: 'idle' | 'running' | 'completed';
  harnessDuration?: string;
}) {
  const isRunning = harnessState === 'running';
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (!isRunning) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning]);

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const runningStep = steps.find((s) => s.status === 'running');

  const toggleStepPayload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedStepId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full rounded-xl border border-slate-200/90 bg-white/80 overflow-hidden shadow-2xs transition-all duration-200">
      {/* HEADER / ACCORDION TOGGLE */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none transition-colors ${
          isRunning
            ? 'bg-blue-50/70 hover:bg-blue-50 border-b border-blue-100/80'
            : 'bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-100'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isRunning ? (
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="flex items-center gap-2 truncate">
            <span className="text-[12.5px] sm:text-[13px] font-bold text-slate-800 truncate">
              {isRunning
                ? `Harness Loop กำลังทำงาน (ขั้นตอน ${completedCount + 1}/${steps.length})`
                : `กระบวนการ Harness Loop & เรียกใช้เครื่องมือ (${steps.length} ขั้นตอน)`}
            </span>

            {isRunning && runningStep && (
              <span className="hidden md:inline-flex items-center text-[11.5px] font-medium text-blue-600 truncate">
                • กำลังรัน: {runningStep.title}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Tool Badges when completed */}
          {!isRunning && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10.5px]">
              <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-100 flex items-center gap-1">
                <Brain className="w-2.5 h-2.5" /> Thinking
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold border border-sky-100 flex items-center gap-1">
                <Database className="w-2.5 h-2.5" /> Vector DB
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 flex items-center gap-1">
                <Table2 className="w-2.5 h-2.5" /> SQL DB
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" /> Web
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            {isRunning ? (
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-mono font-bold animate-pulse">
                ⏱️ {elapsed.toFixed(1)}s
              </span>
            ) : (
              <span className="text-slate-500">{harnessDuration || '6.3s'}</span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* STEPPER LIST (COLLAPSIBLE) */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3 bg-white animate-in fade-in duration-150">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {steps.map((step) => {
              const isStepRunning = step.status === 'running';
              const isStepDone = step.status === 'completed';
              const isPayloadOpen = expandedStepId === step.id;

              return (
                <div key={step.id} className="relative group">
                  {/* Status Indicator Icon */}
                  <div
                    className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white z-10 ${
                      isStepRunning
                        ? 'bg-blue-600 text-white shadow-xs animate-pulse'
                        : isStepDone
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isStepRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isStepDone ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    )}
                  </div>

                  {/* Step Card */}
                  <div
                    className={`rounded-xl border p-2.5 sm:p-3 transition-all duration-150 ${
                      isStepRunning
                        ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                        : isStepDone
                        ? 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                        : 'bg-slate-50/30 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                      {/* Step Badge */}
                      <div className="flex items-center gap-1.5">
                        {step.type === 'thinking' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-100/90 text-purple-700">
                            <Brain className="w-3 h-3" />
                            AI THINKING
                          </span>
                        )}
                        {step.type === 'vector_db' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-sky-100/90 text-sky-700">
                            <Database className="w-3 h-3" />
                            VECTOR STORE
                          </span>
                        )}
                        {step.type === 'sql_db' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-100/90 text-emerald-700">
                            <Table2 className="w-3 h-3" />
                            SQL DATABASE
                          </span>
                        )}
                        {step.type === 'web_search' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-100/90 text-indigo-700">
                            <Globe className="w-3 h-3" />
                            WEB RETRIEVAL
                          </span>
                        )}

                        <span className="text-[12px] sm:text-[12.5px] font-bold text-slate-800">
                          {step.title}
                        </span>
                      </div>

                      {/* Right Meta (Duration & Payload inspector button) */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {step.duration && (
                          <span className="text-[10px] sm:text-[10.5px] font-medium text-slate-400">
                            {step.duration}
                          </span>
                        )}

                        {step.payload && (
                          <button
                            type="button"
                            onClick={(e) => toggleStepPayload(step.id, e)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100/60 border border-blue-200/60 transition cursor-pointer"
                          >
                            <Code2 className="w-3 h-3" />
                            <span>{isPayloadOpen ? 'ซ่อนคำสั่ง' : 'ดูคำสั่ง & ข้อมูล'}</span>
                            <ChevronDown
                              className={`w-3 h-3 transition-transform duration-150 ${
                                isPayloadOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {step.subtitle && (
                      <p className="text-[11.5px] sm:text-[12px] text-slate-600 leading-relaxed">
                        {step.subtitle}
                      </p>
                    )}

                    {/* Step Payload Inspector */}
                    {isPayloadOpen && <PayloadViewer step={step} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Dedicated Modal for inspecting citation data with source-specific designs
 */
function CitationModal({
  citation,
  allCitations,
  onClose,
  onSelectCitation,
}: {
  citation: CitationDetail;
  allCitations: CitationDetail[];
  onClose: () => void;
  onSelectCitation: (c: CitationDetail) => void;
}) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState(false);

  const currentIndex = allCitations.findIndex((c) => c.id === citation.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allCitations.length - 1;

  const handlePrev = () => {
    if (hasPrev) onSelectCitation(allCitations[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onSelectCitation(allCitations[currentIndex + 1]);
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onSelectCitation(allCitations[currentIndex - 1]);
      }
      if (e.key === 'ArrowRight' && currentIndex !== -1 && currentIndex < allCitations.length - 1) {
        onSelectCitation(allCitations[currentIndex + 1]);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allCitations, currentIndex, onClose, onSelectCitation]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const handleExportCSV = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 2500);
  };

  // Distinct theme styling by source type:
  let themeBadge = 'bg-sky-50 text-sky-800 border-sky-200';
  let themeHeaderGrad = 'from-sky-500/10 via-blue-500/5 to-transparent border-sky-100';
  let iconComp = <BookOpen className="w-4 h-4 text-sky-600" />;
  let typeTitle = 'เอกสารคลังความรู้ (Vector Database RAG)';

  if (citation.type === 'sql_data') {
    themeBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    themeHeaderGrad = 'from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-100';
    iconComp = <Table2 className="w-4 h-4 text-emerald-600" />;
    typeTitle = 'ฐานข้อมูลสถิติการค้า (PostgreSQL Data Warehouse)';
  } else if (citation.type === 'web_news') {
    themeBadge = 'bg-indigo-50 text-indigo-800 border-indigo-200';
    themeHeaderGrad = 'from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-100';
    iconComp = <Globe className="w-4 h-4 text-indigo-600" />;
    typeTitle = 'ข่าวสารและข้อมูลเว็บไซต์ภายนอก (Live Web Intelligence)';
  } else if (citation.type === 'regulation') {
    themeBadge = 'bg-amber-50 text-amber-800 border-amber-200';
    themeHeaderGrad = 'from-amber-500/10 via-orange-500/5 to-transparent border-amber-100';
    iconComp = <ShieldCheck className="w-4 h-4 text-amber-600" />;
    typeTitle = 'ประกาศและมาตรการทางการค้า (Regulatory & Gazette)';
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* MODAL HEADER */}
        <div
          className={`px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b bg-gradient-to-r ${themeHeaderGrad} shrink-0`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] sm:text-[11.5px] font-bold shadow-2xs ${themeBadge}`}
              >
                {iconComp}
                <span className="truncate">{typeTitle}</span>
              </span>

              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-100 text-blue-800">
                [{citation.index}]
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {allCitations.length > 1 && (
                <div className="flex items-center gap-1 mr-2 px-1 py-0.5 rounded-lg bg-slate-100/80 border border-slate-200/80 text-[11px] text-slate-600 font-medium">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    title="แหล่งข้อมูลก่อนหน้า"
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1 text-[10.5px]">
                    {currentIndex + 1}/{allCitations.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!hasNext}
                    title="แหล่งข้อมูลถัดไป"
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                title="ปิดหน้าต่าง"
                className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-2xs transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="text-[16px] sm:text-[18px] font-bold text-slate-900 leading-snug">
            {citation.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11.5px] text-slate-500">
            <span className="font-semibold text-slate-700">{citation.sourceName}</span>
            {citation.date && (
              <>
                <span>•</span>
                <span>{citation.date}</span>
              </>
            )}
          </div>
        </div>

        {/* MODAL BODY (CUSTOMIZED BY TYPE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 1. VECTOR DOC DESIGN */}
          {citation.type === 'vector_doc' && (
            <div className="space-y-4">
              {/* Metadata 4-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Collection (Vector)
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5">
                    {citation.documentMeta?.collection || 'tpso_trade_intelligence'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    ตำแหน่งหน้า (Page)
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5">
                    {citation.documentMeta?.pageNumber || 'หน้า 12-18'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    รูปแบบเอกสาร
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5">
                    {citation.documentMeta?.fileName || 'PDF Document'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                  <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                    Cosine Similarity
                  </div>
                  <div className="text-[12px] font-extrabold text-sky-800 mt-0.5 flex items-center justify-between">
                    <span>
                      {citation.confidenceScore
                        ? `${(citation.confidenceScore * 100).toFixed(1)}%`
                        : '94.2%'}
                    </span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-sky-200/70 text-sky-900 font-bold">
                      High Match
                    </span>
                  </div>
                </div>
              </div>

              {/* Excerpt Sheet Card */}
              <div className="rounded-xl border border-sky-200/80 bg-gradient-to-b from-sky-50/40 via-white to-white p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-sky-800 border-b border-sky-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-600" />
                    ข้อความที่ตัดตอนมาจากเอกสารต้นฉบับ (Document Chunk)
                  </span>
                  <span className="text-slate-400 text-[10px] font-normal">
                    {citation.documentMeta?.fileName}
                  </span>
                </div>
                <blockquote className="border-l-3 border-sky-500 pl-3.5 py-1 text-[13px] text-slate-700 leading-relaxed italic bg-sky-50/30 rounded-r-lg">
                  &ldquo;{citation.documentMeta?.excerpt}&rdquo;
                </blockquote>

                {citation.documentMeta?.matchedKeywords && (
                  <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                      คำสำคัญที่ตรงกัน:
                    </span>
                    {citation.documentMeta.matchedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white border border-sky-200 text-sky-800 font-medium text-[11px] shadow-2xs"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Publisher info */}
              {citation.documentMeta?.publisher && (
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11.5px] text-slate-600 flex items-center justify-between">
                  <span className="text-slate-400">หน่วยงานผู้เผยแพร่:</span>
                  <span className="font-semibold text-slate-800">
                    {citation.documentMeta.publisher}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(citation.documentMeta?.excerpt || '', 'คัดลอกข้อความ')
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-semibold transition active:scale-95 shadow-2xs cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>{copiedLabel === 'คัดลอกข้อความ' ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความอ้างอิง'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert(`เปิดดูเอกสารจำลอง: ${citation.documentMeta?.fileName}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-[12px] font-semibold transition active:scale-95 shadow-md shadow-sky-500/20 cursor-pointer ml-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>เปิดอ่านเอกสารฉบับเต็ม (PDF)</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. SQL DATA DESIGN */}
          {citation.type === 'sql_data' && (
            <div className="space-y-4">
              {/* Metadata 4-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Database Cluster
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5">
                    {citation.sqlMeta?.database || 'tpso_trade_warehouse'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Table Schema
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5 font-mono">
                    {citation.sqlMeta?.table || 'tpso_trade_statistics'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    จำนวนแถว (Records)
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5">
                    {citation.sqlMeta?.records?.length || citation.sqlMeta?.recordCount || 3} แถวข้อมูล
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    สถานะการซิงก์ข้อมูล
                  </div>
                  <div className="text-[11.5px] font-bold text-emerald-800 truncate mt-0.5">
                    {citation.sqlMeta?.syncTime || 'วันนี้ 06:00 น.'}
                  </div>
                </div>
              </div>

              {/* SQL Statement Box */}
              {citation.sqlMeta?.query && (
                <div className="rounded-xl border border-slate-800 bg-[#070e1b] p-3 text-slate-200 font-mono text-[11px] overflow-hidden">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5" />
                      Executed SQL Statement (PostgreSQL)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(citation.sqlMeta?.query || '', 'คัดลอก SQL')
                      }
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition font-mono"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedLabel === 'คัดลอก SQL' ? 'คัดลอกแล้ว!' : 'คัดลอก SQL'}</span>
                    </button>
                  </div>
                  <pre className="text-emerald-300 leading-relaxed whitespace-pre-wrap overflow-x-auto">
                    {citation.sqlMeta.query}
                  </pre>
                </div>
              )}

              {/* Result Data Table */}
              {citation.sqlMeta?.records && citation.sqlMeta.records.length > 0 && (
                <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 text-[11.5px] font-bold text-slate-700 flex items-center justify-between">
                    <span>ตารางผลลัพธ์ที่ดึงจากฐานข้อมูล (Result Set)</span>
                    <span className="text-[10.5px] font-medium text-slate-500">
                      ยืนยันโดย: {citation.sqlMeta.verifiedBy || 'สนค. กระทรวงพาณิชย์'}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11.5px]">
                      <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          {Object.keys(citation.sqlMeta.records[0]).map((col) => (
                            <th key={col} className="px-3 py-2 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {citation.sqlMeta.records.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                            {Object.entries(row).map(([k, val], cIdx) => {
                              const strVal = String(val);
                              const isGrowth = k.includes('เติบโต') || strVal.startsWith('+');
                              return (
                                <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                                  {isGrowth ? (
                                    <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-100/80 text-emerald-800 text-[11px]">
                                      {strVal}
                                    </span>
                                  ) : (
                                    strVal
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer ml-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exportNotice ? 'ส่งออกข้อมูล CSV สำเร็จแล้ว!' : 'ส่งออกข้อมูลเป็น CSV / Excel'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. WEB NEWS DESIGN */}
          {citation.type === 'web_news' && (
            <div className="space-y-4">
              {/* Metadata 4-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    ผู้ให้บริการข่าวสาร
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5">
                    {citation.webMeta?.author || citation.sourceName}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    โดเมน (Domain)
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5 font-mono">
                    {citation.webMeta?.domain || 'reuters.com'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    เวลาที่เผยแพร่
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5">
                    {citation.webMeta?.publishedAt || '28 ต.ค. 2569'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                    สถานะการตรวจสอบ
                  </div>
                  <div className="text-[11.5px] font-bold text-indigo-800 truncate mt-0.5">
                    ✓ ยืนยันความถูกต้อง
                  </div>
                </div>
              </div>

              {/* News Article Reader Card */}
              <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/30 via-white to-white p-4 space-y-3 shadow-2xs">
                <div className="text-[14.5px] sm:text-[15.5px] font-bold text-slate-900 leading-snug">
                  {citation.webMeta?.headline || citation.title}
                </div>
                <p className="text-[12.5px] sm:text-[13px] text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                  {citation.webMeta?.summary}
                </p>

                {citation.webMeta?.keyPoints && citation.webMeta.keyPoints.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                      ประเด็นสำคัญที่ตรวจพบ (Key Extracted Insights):
                    </div>
                    {citation.webMeta.keyPoints.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-slate-700">
                        <span className="text-indigo-600 font-bold shrink-0 mt-0.5">✓</span>
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {citation.url && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(citation.url || '', 'คัดลอก URL')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-semibold transition active:scale-95 shadow-2xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>{copiedLabel === 'คัดลอก URL' ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์อ้างอิง'}</span>
                  </button>
                )}

                {citation.url && (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold transition active:scale-95 shadow-md shadow-indigo-500/20 cursor-pointer ml-auto"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดอ่านบทความต้นฉบับบนเว็บ</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 4. REGULATION DESIGN */}
          {citation.type === 'regulation' && (
            <div className="space-y-4">
              {/* Metadata 4-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    หน่วยงานผู้ออกกฎ
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5">
                    {citation.regulationMeta?.authority || 'Office of USTR'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    เลขที่ประกาศ / Docket
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5 font-mono">
                    {citation.regulationMeta?.lawNumber || 'Docket 2026-0014'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    วันที่มีผลบังคับใช้
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-800 truncate mt-0.5">
                    {citation.regulationMeta?.effectiveDate || '1 ต.ค. 2569'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    สถานะทางกฎหมาย
                  </div>
                  <div className="text-[11.5px] font-bold text-emerald-800 truncate mt-0.5">
                    Active Enforcement
                  </div>
                </div>
              </div>

              {/* Regulation Summary */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3 shadow-2xs">
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-200/60 pb-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  สาระสำคัญของมาตรการกำกับดูแล
                </div>
                <p className="text-[12.5px] text-slate-800 leading-relaxed">
                  {citation.regulationMeta?.summary}
                </p>

                {citation.regulationMeta?.affectedHSCodes && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      พิกัดศุลกากรสินค้าที่ได้รับผลกระทบ (Affected HS Codes):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {citation.regulationMeta.affectedHSCodes.map((hs, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200/80 text-[11.5px] text-slate-800 flex items-center justify-between shadow-2xs"
                        >
                          <span className="font-mono font-bold text-amber-900">{hs.code}</span>
                          <span className="text-[10.5px] font-medium text-slate-600 truncate ml-2">
                            {hs.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {citation.regulationMeta?.actionGuidelines && (
                  <div className="space-y-1.5 pt-2 border-t border-amber-200/60">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      แนวทางปฏิบัติสำหรับผู้ส่งออกไทย:
                    </div>
                    {citation.regulationMeta.actionGuidelines.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-slate-700">
                        <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {citation.url && (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-semibold transition active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer ml-auto"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>ดูประกาศฉบับเต็มใน Federal Register</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Attribution Engine •</span>
            <span>NeuronKnowledge Data Provenance</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition cursor-pointer active:scale-95 shadow-2xs"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Rich formatted display for assistant response (bold text, bullets, citations)
 */
function FormattedAssistantContent({
  content,
  citations,
  onSelectCitation,
}: {
  content: string;
  citations?: CitationDetail[];
  onSelectCitation?: (c: CitationDetail) => void;
}) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-2 select-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Format bullet points
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          const bulletText = trimmed.replace(/^[•-]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
              <div className="flex-1 leading-relaxed text-[13.5px] sm:text-[14px]">
                {renderInlineMarkdown(bulletText, citations, onSelectCitation)}
              </div>
            </div>
          );
        }

        // Format bold headings or normal lines
        return (
          <div key={idx} className="leading-relaxed text-[13.5px] sm:text-[14px]">
            {renderInlineMarkdown(trimmed, citations, onSelectCitation)}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper to render bold text **bold** and citation tags [1], [2]
 */
function renderInlineMarkdown(
  text: string,
  citations?: CitationDetail[],
  onSelectCitation?: (c: CitationDetail) => void
): React.ReactNode {
  // Replace bold segments
  const boldParts = text.split(/(\*\*.*?\*\*)/g);

  return boldParts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldInner = part.slice(2, -2);
      return (
        <strong key={pIdx} className="font-bold text-slate-900">
          {renderCitations(boldInner, citations, onSelectCitation)}
        </strong>
      );
    }
    return (
      <React.Fragment key={pIdx}>
        {renderCitations(part, citations, onSelectCitation)}
      </React.Fragment>
    );
  });
}

function renderCitations(
  text: string,
  citations?: CitationDetail[],
  onSelectCitation?: (c: CitationDetail) => void
): React.ReactNode {
  const citationParts = text.split(/(\[\d+\])/g);

  return citationParts.map((sub, sIdx) => {
    const match = sub.match(/^\[(\d+)\]$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const matchedCitation = citations?.find((c) => c.index === num);

      return (
        <button
          key={sIdx}
          type="button"
          onClick={() => {
            if (matchedCitation && onSelectCitation) {
              onSelectCitation(matchedCitation);
            }
          }}
          title={
            matchedCitation
              ? `ดูข้อมูลอ้างอิง: ${matchedCitation.title} (${matchedCitation.sourceName})`
              : `แหล่งข้อมูลอ้างอิงลำดับที่ ${match[1]}`
          }
          className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded text-[10.5px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 transition active:scale-95 cursor-pointer shadow-2xs"
        >
          [{match[1]}]
        </button>
      );
    }
    return sub;
  });
}

function TpsoLogoBadge() {
  return (
    <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl border border-sky-200/90 bg-gradient-to-b from-sky-50/80 to-white flex flex-col items-center justify-center shadow-2xs shrink-0 select-none group-hover:scale-105 transition-transform duration-200">
      <span className="text-[8px] sm:text-[8.5px] font-extrabold tracking-tight text-[#0284c7] leading-none">
        TPSO
      </span>
      <svg
        viewBox="0 0 28 10"
        className="w-4.5 sm:w-5 h-2 mt-0.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 8C7 2.5 14 2 26 7"
          stroke="#0ea5e9"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M6 8.5C11 4.8 17 4.5 24 8"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function GeminiSparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:rotate-12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12.4 7.2 16.8 11.6 22 12C16.8 12.4 12.4 16.8 12 22C11.6 16.8 7.2 12.4 2 12C7.2 11.6 11.6 7.2 12 2Z"
        fill="url(#geminiGrad)"
      />
    </svg>
  );
}

function StarMascotIcon() {
  return (
    <div className="relative w-13 h-13 sm:w-16 sm:h-16 shrink-0 select-none flex items-center justify-center animate-float-slow">
      <svg
        viewBox="0 0 120 128"
        className="w-full h-full drop-shadow-[0_6px_10px_rgba(234,179,8,0.28)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="starBodyGrad" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#facc15" />
            <stop offset="85%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>
          <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(15, 23, 42, 0.22)" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
          </radialGradient>
        </defs>

        <ellipse cx="60" cy="118" rx="30" ry="6" fill="url(#groundShadow)" />

        <rect
          x="42"
          y="92"
          width="14"
          height="22"
          rx="7"
          fill="url(#starBodyGrad)"
        />
        <rect
          x="64"
          y="92"
          width="14"
          height="22"
          rx="7"
          fill="url(#starBodyGrad)"
        />
        <ellipse cx="47" cy="113" rx="9" ry="5" fill="#eab308" />
        <ellipse cx="73" cy="113" rx="9" ry="5" fill="#eab308" />

        <path
          d="M60 12C64.5 12 67.8 25.5 72.5 29C77.2 32.5 92.5 31.5 94.5 36.5C96.5 41.5 84.5 52 83 58C81.5 64 87 79 83.5 83.5C80 88 71 96 60 96C49 96 40 88 36.5 83.5C33 79 38.5 64 37 58C35.5 52 23.5 41.5 25.5 36.5C27.5 31.5 42.8 32.5 47.5 29C52.2 25.5 55.5 12 60 12Z"
          fill="url(#starBodyGrad)"
        />

        <path
          d="M46 25C49 14 55 9 60 9C65 9 71 14 74 25C66 22 54 22 46 25Z"
          fill="url(#capGrad)"
        />
        <ellipse cx="60" cy="24" rx="15" ry="4" fill="#3b82f6" />

        <ellipse
          cx="50"
          cy="35"
          rx="10"
          ry="5"
          transform="rotate(-18 50 35)"
          fill="rgba(255,255,255,0.45)"
        />

        <ellipse cx="49" cy="48" rx="3.2" ry="4.2" fill="#1e293b" />
        <circle cx="48" cy="46.5" r="1.1" fill="#ffffff" />
        <ellipse cx="71" cy="48" rx="3.2" ry="4.2" fill="#1e293b" />
        <circle cx="70" cy="46.5" r="1.1" fill="#ffffff" />

        <ellipse cx="42" cy="54" rx="4.5" ry="2.2" fill="#f97316" fillOpacity="0.35" />
        <ellipse cx="78" cy="54" rx="4.5" ry="2.2" fill="#f97316" fillOpacity="0.35" />

        <path
          d="M54 55.5C56.2 58.5 63.8 58.5 66 55.5"
          stroke="#92400e"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        <path
          d="M33 65C28 60 36 55 44 63"
          stroke="#ca8a04"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M65 73L66.8 77.2L71 79L66.8 80.8L65 85L63.2 80.8L59 79L63.2 77.2L65 73Z"
          fill="#fef9c3"
        />
      </svg>
    </div>
  );
}

export default function DemoChatPage() {
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);

  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0]);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);

  const [selectedEffort, setSelectedEffort] = useState(EFFORT_OPTIONS[0]);
  const [effortMenuOpen, setEffortMenuOpen] = useState(false);

  const [selectedSource, setSelectedSource] = useState(DATA_SOURCE_OPTIONS[0]);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);

  const [selectedSkill, setSelectedSkill] = useState(SKILL_OPTIONS[0]);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);

  const [inputText, setInputText] = useState('');
  const [threads, setThreads] = useState<MockThread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCitationModal, setActiveCitationModal] = useState<{
    citation: CitationDetail;
    allCitations: CitationDetail[];
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const harnessTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  // Clear all background timers safely
  const clearAllTimers = () => {
    harnessTimeoutsRef.current.forEach((t) => clearTimeout(t));
    harnessTimeoutsRef.current = [];
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
  };

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, isStreaming]);

  // Clean up streaming timer on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    function handleOutsideClick() {
      setModelMenuOpen(false);
      setEffortMenuOpen(false);
      setSourceMenuOpen(false);
      setSkillMenuOpen(false);
    }
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleNewChat = () => {
    clearAllTimers();
    setIsStreaming(false);
    setActiveThreadId(null);
    setInputText('');
    setMobileDrawerOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    setMobileDrawerOpen(false);
  };

  const handleChipClick = (promptText: string) => {
    setInputText(promptText);
    textareaRef.current?.focus();
  };

  const copyMessageText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) return;

    clearAllTimers();

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: timeStr,
    };

    const assistantMsgId = `ai-${Date.now() + 1}`;
    const generatedPlan = createHarnessRunForQuery(
      trimmed,
      selectedModel,
      selectedSource,
      selectedSkill,
      selectedEffort
    );

    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: timeStr,
      streaming: true,
      harnessState: 'running',
      steps: generatedPlan.steps,
      citations: generatedPlan.citations,
      modelBadge: selectedModel,
      effortBadge: selectedEffort,
      sourceBadge: selectedSource,
    };

    let targetThreadId = activeThreadId;

    if (targetThreadId) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === targetThreadId
            ? { ...t, messages: [...t.messages, userMsg, initialAssistantMsg] }
            : t
        )
      );
    } else {
      const newId = `thread-${Date.now()}`;
      targetThreadId = newId;
      const newThread: MockThread = {
        id: newId,
        title: trimmed.length > 26 ? `${trimmed.slice(0, 26)}...` : trimmed,
        pinned: false,
        messages: [userMsg, initialAssistantMsg],
      };
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(newId);
    }

    setInputText('');
    setIsStreaming(true);

    // Sequence through the agent harness steps with realistic durations matching enterprise pipelines:
    // 'รวดเร็ว' (Fast): ~4.2s
    // 'สมดุล' (Balanced - default): ~6.3s
    // 'ละเอียดลึกซึ้ง' (Deep Analysis): ~8.5s
    let stepDelays = [0, 1400, 2900, 4500];
    let totalHarnessTime = 6300;
    let finalDurationStr = '6.3s';

    if (selectedEffort === 'รวดเร็ว') {
      stepDelays = [0, 950, 1950, 3050];
      totalHarnessTime = 4200;
      finalDurationStr = '4.2s';
    } else if (selectedEffort === 'ละเอียดลึกซึ้ง') {
      stepDelays = [0, 2000, 4100, 6300];
      totalHarnessTime = 8500;
      finalDurationStr = '8.5s';
    }

    // Step 1 transition (Vector DB becomes active)
    const t1 = setTimeout(() => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== targetThreadId) return t;
          return {
            ...t,
            messages: t.messages.map((m) => {
              if (m.id !== assistantMsgId || !m.steps) return m;
              return {
                ...m,
                steps: m.steps.map((s, idx) => {
                  if (idx === 0) return { ...s, status: 'completed' };
                  if (idx === 1) return { ...s, status: 'running' };
                  return s;
                }),
              };
            }),
          };
        })
      );
    }, stepDelays[1]);
    harnessTimeoutsRef.current.push(t1);

    // Step 2 transition (SQL DB becomes active)
    const t2 = setTimeout(() => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== targetThreadId) return t;
          return {
            ...t,
            messages: t.messages.map((m) => {
              if (m.id !== assistantMsgId || !m.steps) return m;
              return {
                ...m,
                steps: m.steps.map((s, idx) => {
                  if (idx <= 1) return { ...s, status: 'completed' };
                  if (idx === 2) return { ...s, status: 'running' };
                  return s;
                }),
              };
            }),
          };
        })
      );
    }, stepDelays[2]);
    harnessTimeoutsRef.current.push(t2);

    // Step 3 transition (Web Search becomes active)
    const t3 = setTimeout(() => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== targetThreadId) return t;
          return {
            ...t,
            messages: t.messages.map((m) => {
              if (m.id !== assistantMsgId || !m.steps) return m;
              return {
                ...m,
                steps: m.steps.map((s, idx) => {
                  if (idx <= 2) return { ...s, status: 'completed' };
                  if (idx === 3) return { ...s, status: 'running' };
                  return s;
                }),
              };
            }),
          };
        })
      );
    }, stepDelays[3]);
    harnessTimeoutsRef.current.push(t3);

    // Final transition: All harness steps complete -> start text typewriter streaming
    const tFinal = setTimeout(() => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== targetThreadId) return t;
          return {
            ...t,
            messages: t.messages.map((m) => {
              if (m.id !== assistantMsgId || !m.steps) return m;
              return {
                ...m,
                harnessState: 'completed',
                harnessDuration: finalDurationStr,
                steps: m.steps.map((s) => ({ ...s, status: 'completed' })),
              };
            }),
          };
        })
      );

      // Stream text output
      let charIndex = 0;
      const chunkSize = 3;
      const fullResponse = generatedPlan.fullResponse;

      streamIntervalRef.current = setInterval(() => {
        charIndex += chunkSize;
        const currentChunk = fullResponse.slice(0, charIndex);

        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== targetThreadId) return t;
            return {
              ...t,
              messages: t.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: currentChunk,
                      streaming: charIndex < fullResponse.length,
                    }
                  : m
              ),
            };
          })
        );

        if (charIndex >= fullResponse.length) {
          if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
            streamIntervalRef.current = null;
          }
          setIsStreaming(false);
        }
      }, 22);
    }, totalHarnessTime);
    harnessTimeoutsRef.current.push(tFinal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const pinnedThreads = threads.filter(
    (t) =>
      t.pinned &&
      (!searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const recentThreads = threads.filter(
    (t) =>
      !t.pinned &&
      (!searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative h-screen w-full flex overflow-hidden bg-white text-slate-800 font-sans select-none">
      {/* MOBILE BACKDROP OVERLAY */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* LEFT SIDEBAR (DRAWER ON MOBILE, FLEX CONTAINER ON DESKTOP) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto h-full w-[265px] sm:w-[270px] bg-[#fcfcfd] border-r border-slate-200/80 flex flex-col shrink-0 shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out ${
          mobileDrawerOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        } ${
          desktopSidebarOpen
            ? 'lg:w-[260px]'
            : 'lg:w-0 lg:border-r-0'
        } overflow-hidden`}
      >
        {/* Top App Brand Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <TpsoLogoBadge />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-extrabold tracking-tight text-[#2563eb] group-hover:text-[#1d4ed8] transition-colors whitespace-nowrap">
                  TPSO AI APP
                </span>
                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100/90 text-blue-700 tracking-wider uppercase">
                  DEMO
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileDrawerOpen(false);
              setDesktopSidebarOpen(false);
            }}
            title="ปิดแถบด้านข้าง"
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
          >
            <span className="lg:hidden">
              <X className="w-4 h-4" />
            </span>
            <span className="hidden lg:block">
              <PanelLeft className="w-4 h-4" />
            </span>
          </button>
        </div>

        {/* MAIN MENU (New Chat, Search, Knowledge) */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="px-2.5 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            MAIN MENU
          </div>
          <nav className="space-y-1">
            <button
              type="button"
              onClick={handleNewChat}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                activeThreadId === null && !showSearchInput
                  ? 'text-slate-900 bg-slate-100 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <SquarePen className="w-[17px] h-[17px] text-slate-500 shrink-0" />
              <span>New Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSearchInput((prev) => !prev)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                showSearchInput
                  ? 'text-slate-900 bg-slate-100 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <Search className="w-[17px] h-[17px] text-slate-500 shrink-0" />
              <span>Search</span>
            </button>

            {showSearchInput && (
              <div className="px-1 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาประวัติแชท..."
                  className="w-full px-2.5 py-1.5 text-[12.5px] rounded-lg border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 shadow-2xs transition"
                />
              </div>
            )}

            <button
              type="button"
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13.5px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <BookOpen className="w-[17px] h-[17px] text-slate-500 shrink-0" />
              <span>Library</span>
            </button>
          </nav>
        </div>

        <div className="mx-4 my-2 border-t border-slate-200/60 shrink-0" />

        {/* PINNED & RECENT CHATS */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
          {/* PINNED SECTION WITH PIN ICON */}
          <div>
            <button
              type="button"
              onClick={() => setPinnedOpen((prev) => !prev)}
              className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-bold tracking-wider text-slate-400 uppercase hover:text-slate-600 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Pin className="w-3 h-3 text-blue-500 fill-blue-500/20" />
                <span>PINNED</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  pinnedOpen ? '' : '-rotate-90'
                }`}
              />
            </button>

            {pinnedOpen && (
              <div className="mt-1.5 space-y-0.5 animate-in fade-in duration-150">
                {pinnedThreads.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectThread(item.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[13px] flex items-center gap-2 transition-all duration-150 cursor-pointer active:scale-[0.99] ${
                      activeThreadId === item.id
                        ? 'bg-blue-50 text-[#2563eb] font-semibold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <Pin className="w-3 h-3 text-blue-400 shrink-0 rotate-45" />
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RECENT CHATS */}
          <div>
            <button
              type="button"
              onClick={() => setRecentOpen((prev) => !prev)}
              className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-bold tracking-wider text-slate-400 uppercase hover:text-slate-600 transition-colors cursor-pointer"
            >
              <span>RECENT CHATS</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  recentOpen ? '' : '-rotate-90'
                }`}
              />
            </button>

            {recentOpen && (
              <div className="mt-1.5 space-y-0.5 animate-in fade-in duration-150">
                {recentThreads.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectThread(item.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[13px] truncate transition-all duration-150 cursor-pointer active:scale-[0.99] ${
                      activeThreadId === item.id
                        ? 'bg-blue-50 text-[#2563eb] font-semibold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Footer */}
        <div className="px-4 py-3.5 border-t border-slate-200/70 flex items-center gap-3 shrink-0 bg-[#fcfcfd]">
          <div className="relative w-9 h-9 rounded-full bg-[#f97316] text-white font-bold text-[14px] flex items-center justify-center shrink-0 shadow-2xs">
            A
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-slate-800 truncate leading-tight">
              admintest2
            </div>
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
              ACTIVE
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
        {/* TOP HEADER BAR (RESPONSIVE) */}
        <header className="h-14 px-3 sm:px-5 flex items-center justify-between shrink-0 border-b border-slate-100/80 gap-2">
          {/* Left: Sidebar Trigger + Model Dropdown + Effort Mode */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Mobile Hamburger / Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              title="เปิดเมนู"
              className="w-8.5 h-8.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex lg:hidden items-center justify-center shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* Desktop Sidebar Open Trigger */}
            {!desktopSidebarOpen && (
              <button
                type="button"
                onClick={() => setDesktopSidebarOpen(true)}
                title="เปิดแถบด้านข้าง"
                className="w-8.5 h-8.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hidden lg:flex items-center justify-center shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            {/* Model Selector */}
            <div
              className="relative"
              onClick={(e) => {
                e.stopPropagation();
                setModelMenuOpen((prev) => !prev);
                setEffortMenuOpen(false);
                setSourceMenuOpen(false);
                setSkillMenuOpen(false);
              }}
            >
              <button
                type="button"
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300 text-[12px] sm:text-[13px] font-medium text-slate-600 shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer max-w-[135px] sm:max-w-none"
              >
                <GeminiSparkleIcon />
                <span className="truncate">{selectedModel}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5 transition-transform duration-200 ${
                    modelMenuOpen ? 'rotate-180 text-blue-500' : ''
                  }`}
                />
              </button>

              {modelMenuOpen && (
                <div className="absolute left-0 mt-2 w-48 sm:w-52 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md py-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    เลือก AI Model
                  </div>
                  {MODEL_OPTIONS.map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => {
                        setSelectedModel(model);
                        setModelMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-[12.5px] sm:text-[13px] text-slate-700 hover:bg-blue-50/80 hover:text-blue-600 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className={selectedModel === model ? 'font-semibold text-blue-600' : ''}>
                        {model}
                      </span>
                      {selectedModel === model && (
                        <Check className="w-4 h-4 text-[#2563eb]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Effort / Balance Selector */}
            <div
              className="relative hidden sm:block"
              onClick={(e) => {
                e.stopPropagation();
                setEffortMenuOpen((prev) => !prev);
                setModelMenuOpen(false);
                setSourceMenuOpen(false);
                setSkillMenuOpen(false);
              }}
            >
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300 text-[12.5px] sm:text-[13px] font-medium text-slate-600 shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedEffort}</span>
              </button>

              {effortMenuOpen && (
                <div className="absolute left-0 mt-2 w-44 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md py-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    ระดับความลึกซึ้ง
                  </div>
                  {EFFORT_OPTIONS.map((effort) => (
                    <button
                      key={effort}
                      type="button"
                      onClick={() => {
                        setSelectedEffort(effort);
                        setEffortMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-[12.5px] sm:text-[13px] text-slate-700 hover:bg-blue-50/80 hover:text-blue-600 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className={selectedEffort === effort ? 'font-semibold text-blue-600' : ''}>
                        {effort}
                      </span>
                      {selectedEffort === effort && (
                        <Check className="w-4 h-4 text-[#2563eb]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Mode Switcher Tabs (Chat vs Studio) & Demo Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/90 shadow-2xs">
              <div className="px-2.5 sm:px-3 py-1 rounded-lg text-[11.5px] sm:text-[12px] font-bold bg-white text-[#2563eb] shadow-xs flex items-center gap-1.5">
                <span>💬</span>
                <span>User Chat</span>
              </div>
              <Link
                href="/demo/studio"
                className="px-2.5 sm:px-3 py-1 rounded-lg text-[11.5px] sm:text-[12px] font-medium text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5"
              >
                <span>🛠️</span>
                <span>Creator Studio</span>
              </Link>
            </div>

            <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-[11px] font-medium shadow-2xs shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Demo Mode</span>
            </div>
          </div>

          {/* Right: Share & Market Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/90 hover:text-slate-600 text-[12px] sm:text-[12.5px] font-medium text-slate-400 transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Share</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 text-[12px] sm:text-[12.5px] font-medium text-slate-400 hover:text-slate-600 transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
            >
              <Store className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Market</span>
            </button>
          </div>
        </header>

        {/* BODY: EITHER HERO EMPTY STATE OR MOCK CONVERSATION */}
        {activeThread === null ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:pb-10 overflow-y-auto">
            <div className="w-full max-w-[760px] flex flex-col items-center my-auto">
              {/* Greeting Title with 3D Star Mascot */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 text-center sm:text-left px-2">
                <StarMascotIcon />
                <h1 className="text-[20px] sm:text-[24px] md:text-[27px] font-bold text-[#0f172a] tracking-tight leading-snug select-text">
                  สวัสดี คุณ admintest2 วันนี้อยากวิเคราะห์ข้อมูลการค้าเรื่องไหนดี
                </h1>
              </div>

              {/* Filter & Skill Bar Above Composer */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-2.5 px-0.5">
                {/* Left: Data Source Pill */}
                <div
                  className="relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSourceMenuOpen((prev) => !prev);
                    setSkillMenuOpen(false);
                    setModelMenuOpen(false);
                    setEffortMenuOpen(false);
                  }}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] hover:bg-[#dbeafe] text-[#2563eb] text-[11.5px] sm:text-[12px] font-semibold shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer max-w-[200px] sm:max-w-none"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                    <span className="truncate">{selectedSource}</span>
                    <ChevronDown
                      className={`w-3 h-3 text-[#2563eb] shrink-0 transition-transform duration-200 ${
                        sourceMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {sourceMenuOpen && (
                    <div className="absolute left-0 mt-2 w-60 sm:w-64 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md py-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        เลือกแหล่งข้อมูล
                      </div>
                      {DATA_SOURCE_OPTIONS.map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => {
                            setSelectedSource(src);
                            setSourceMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-[12px] sm:text-[12.5px] text-slate-700 hover:bg-blue-50/80 hover:text-blue-600 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <span className={selectedSource === src ? 'font-semibold text-blue-600' : ''}>
                            {src}
                          </span>
                          {selectedSource === src && (
                            <Check className="w-3.5 h-3.5 text-[#2563eb]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: SKILL Selector */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10.5px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    SKILL:
                  </span>
                  <div
                    className="relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSkillMenuOpen((prev) => !prev);
                      setSourceMenuOpen(false);
                      setModelMenuOpen(false);
                      setEffortMenuOpen(false);
                    }}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 text-[11.5px] sm:text-[12px] font-medium shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer max-w-[130px] sm:max-w-none"
                    >
                      <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedSkill}</span>
                      <ChevronDown
                        className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-200 ${
                          skillMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {skillMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 sm:w-52 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md py-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          เลือกทักษะ AI (Skill)
                        </div>
                        {SKILL_OPTIONS.map((sk) => (
                          <button
                            key={sk}
                            type="button"
                            onClick={() => {
                              setSelectedSkill(sk);
                              setSkillMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-[12px] sm:text-[12.5px] text-slate-700 hover:bg-blue-50/80 hover:text-blue-600 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <span className={selectedSkill === sk ? 'font-semibold text-blue-600' : ''}>
                              {sk}
                            </span>
                            {selectedSkill === sk && (
                              <Check className="w-3.5 h-3.5 text-[#2563eb]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Composer Box */}
              <div className="w-full rounded-[20px] sm:rounded-[22px] border border-slate-200/90 bg-white shadow-[0_6px_28px_-6px_rgba(15,23,42,0.06)] focus-within:border-blue-400 focus-within:shadow-[0_6px_32px_-4px_rgba(37,99,235,0.12)] transition-all duration-200 px-4 sm:px-5 pt-3.5 sm:pt-4 pb-2.5 sm:pb-3">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="พิมพ์คำสั่ง หรือคำถามของคุณที่นี่..."
                  className="w-full resize-none border-0 bg-transparent text-[14px] sm:text-[14.5px] text-slate-700 placeholder:text-slate-400 focus:outline-none select-text"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    title="แนบไฟล์หรือเพิ่มข้อมูล"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-[18px] h-[18px]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isStreaming}
                    title="ส่งข้อความ"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                      inputText.trim() && !isStreaming
                        ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-md shadow-blue-500/25'
                        : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
                    }`}
                  >
                    <Send className="w-4 h-4 -translate-x-0.5 translate-y-0.5 rotate-12" />
                  </button>
                </div>
              </div>

              {/* Quick Suggestion Chips */}
              <div className="mt-4 sm:mt-5 flex flex-col items-center gap-2 sm:gap-2.5 w-full">
                {/* Row 1 */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleChipClick(
                        'สรุปภาวะการค้าระหว่างประเทศของไทยล่าสุด ทั้งการส่งออกและนำเข้า'
                      )
                    }
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-300 text-[12px] sm:text-[12.5px] font-medium text-slate-600 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 active:scale-95 cursor-pointer"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                    <span>สรุปภาวะการค้า</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleChipClick(
                        'เปรียบเทียบมูลค่าการส่งออกรายหมวดสินค้าสำคัญ (เกษตร อุตสาหกรรมเกษตร และอุตสาหกรรม)'
                      )
                    }
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-300 text-[12px] sm:text-[12.5px] font-medium text-slate-600 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 active:scale-95 cursor-pointer"
                  >
                    <Table2 className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                    <span>เปรียบเทียบรายหมวด</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleChipClick(
                        'วิเคราะห์สัดส่วนและแนวโน้มตลาดคู่ค้าสำคัญของไทย 5 อันดับแรก'
                      )
                    }
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-300 text-[12px] sm:text-[12.5px] font-medium text-slate-600 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 active:scale-95 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                    <span>ตลาดคู่ค้า</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleChipClick(
                        'ค้นจากรายงานภายในเกี่ยวกับผลกระทบมาตรการกีดกันทางการค้าที่ไม่ใช่ภาษี (NTBs)'
                      )
                    }
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-300 text-[12px] sm:text-[12.5px] font-medium text-slate-600 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                    <span>ค้นจากรายงานภายใน</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleChipClick('สรุปการค้าล่าสุดประจำเดือนพร้อมไฮไลต์สินค้าดาวรุ่ง')
                    }
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-300 text-[12px] sm:text-[12.5px] font-medium text-slate-600 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                    <span>สรุปการค้าล่าสุด</span>
                  </button>
                </div>

                {/* Row 2 */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleChipClick(
                        'ร่างประเด็นสำคัญสำหรับแถลงข่าวภาวะการค้าระหว่างประเทศของไทยประจำเดือน'
                      )
                    }
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-300 text-[12px] sm:text-[12.5px] font-medium text-slate-600 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 active:scale-95 cursor-pointer"
                  >
                    <PieChart className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                    <span>แถลงข่าวภาวะการค้าระหว่างประเทศของไทย</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE CONVERSATION VIEW WITH HARNESS LOOP & TOOL CALLS */
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
              <div className="max-w-[760px] mx-auto space-y-4 sm:space-y-6">
                {/* Active Thread Title Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] sm:text-[14px] font-semibold text-slate-800 truncate">
                      {activeThread.title}
                    </span>
                    {activeThread.pinned && (
                      <Pin className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20 shrink-0 rotate-45" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-[11.5px] sm:text-[12px] font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>กลับหน้าเริ่มต้น</span>
                  </button>
                </div>

                {/* Messages List */}
                {activeThread.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      /* USER MESSAGE BUBBLE */
                      <div className="max-w-[90%] sm:max-w-[85%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-[13.5px] sm:text-[14px] leading-relaxed whitespace-pre-line break-words select-text bg-[#2563eb] text-white rounded-br-xs shadow-sm shadow-blue-500/10">
                        {msg.content}
                        <div className="text-[10px] sm:text-[10.5px] mt-1.5 text-blue-100 text-right">
                          {msg.timestamp}
                        </div>
                      </div>
                    ) : (
                      /* ASSISTANT CARD WITH HARNESS LOOP & TOOL EXECUTION */
                      <div className="w-full max-w-[96%] sm:max-w-[92%] rounded-2xl p-4 sm:p-5 bg-white border border-slate-200/90 shadow-2xs text-slate-800 space-y-3.5">
                        {/* Assistant Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[12px] font-bold shadow-2xs shrink-0">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[13px] font-bold text-slate-800 truncate">
                                TPSO AI Agent
                              </span>
                              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100/80">
                                {msg.modelBadge || selectedModel}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-slate-400">
                            <button
                              type="button"
                              onClick={() => copyMessageText(msg.id, msg.content)}
                              title="คัดลอกคำตอบ"
                              className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* AGENT HARNESS LOOP & TOOL CALLS VISUALIZER */}
                        {msg.steps && msg.steps.length > 0 && (
                          <ToolHarnessVisualizer
                            steps={msg.steps}
                            harnessState={msg.harnessState || 'completed'}
                            harnessDuration={msg.harnessDuration}
                          />
                        )}

                        {/* SKELETON / SYNTHESIS INDICATOR WHILE HARNESS IS RUNNING */}
                        {msg.harnessState === 'running' && !msg.content && (
                          <div className="py-2.5 px-3.5 rounded-xl bg-slate-50/80 border border-dashed border-slate-200 flex items-center gap-2.5 text-[12.5px] text-slate-500 animate-pulse">
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                            <span>กำลังสังเคราะห์คำตอบจากผลลัพธ์ของเครื่องมือทั้งหมด...</span>
                          </div>
                        )}

                        {/* ASSISTANT RESPONSE TEXT */}
                        {msg.content && (
                          <div className="pt-0.5">
                            <FormattedAssistantContent
                              content={msg.content}
                              citations={msg.citations}
                              onSelectCitation={(c) =>
                                setActiveCitationModal({
                                  citation: c,
                                  allCitations: msg.citations || [c],
                                })
                              }
                            />
                            {msg.streaming && (
                              <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-[#2563eb] animate-pulse" />
                            )}
                          </div>
                        )}

                        {/* CITATIONS BAR */}
                        {msg.citations && msg.citations.length > 0 && !msg.streaming && (
                          <div className="pt-2.5 border-t border-slate-100/90">
                            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                              <span>
                                แหล่งข้อมูลอ้างอิง ({msg.citations.length} รายการ - คลิกเพื่อดูรายละเอียด):
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.citations.map((c) => {
                                let badgeStyle =
                                  'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
                                let icon = <FileText className="w-3 h-3 text-slate-500 shrink-0" />;
                                let typeLabel = 'Source';

                                if (c.type === 'vector_doc') {
                                  badgeStyle =
                                    'bg-sky-50 text-sky-800 border-sky-200/90 hover:bg-sky-100';
                                  icon = <BookOpen className="w-3 h-3 text-sky-600 shrink-0" />;
                                  typeLabel = 'Vector DB';
                                } else if (c.type === 'sql_data') {
                                  badgeStyle =
                                    'bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100';
                                  icon = <Table2 className="w-3 h-3 text-emerald-600 shrink-0" />;
                                  typeLabel = 'PostgreSQL';
                                } else if (c.type === 'web_news') {
                                  badgeStyle =
                                    'bg-indigo-50 text-indigo-800 border-indigo-200/90 hover:bg-indigo-100';
                                  icon = <Globe className="w-3 h-3 text-indigo-600 shrink-0" />;
                                  typeLabel = 'Web Search';
                                } else if (c.type === 'regulation') {
                                  badgeStyle =
                                    'bg-amber-50 text-amber-800 border-amber-200/90 hover:bg-amber-100';
                                  icon = <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />;
                                  typeLabel = 'Regulation';
                                }

                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() =>
                                      setActiveCitationModal({
                                        citation: c,
                                        allCitations: msg.citations || [c],
                                      })
                                    }
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] sm:text-[11.5px] font-medium transition cursor-pointer active:scale-95 shadow-2xs ${badgeStyle}`}
                                  >
                                    {icon}
                                    <span className="font-extrabold text-[11px]">[{c.index}]</span>
                                    <span className="truncate max-w-[170px] sm:max-w-[240px]">
                                      {c.title}
                                    </span>
                                    <span className="text-[9.5px] opacity-75 font-normal ml-0.5">
                                      • {typeLabel}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Card Footer */}
                        <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-2 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                            <span>{msg.timestamp}</span>
                            {msg.harnessDuration && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 font-medium">
                                  Harness Loop: {msg.harnessDuration}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            TPSO Trade Intelligence
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom Composer in Conversation Mode */}
            <div className="px-3 sm:px-6 pb-4 sm:pb-5 pt-2 bg-white border-t border-slate-100">
              <div className="max-w-[760px] mx-auto">
                <div className="w-full rounded-[18px] sm:rounded-[20px] border border-slate-200/90 bg-white shadow-sm focus-within:border-blue-400 focus-within:shadow-md transition-all duration-200 px-3.5 sm:px-4 pt-2.5 sm:pt-3 pb-2 sm:pb-2.5">
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isStreaming
                        ? 'Agent กำลังประมวลผล Harness Loop & เรียกใช้เครื่องมือ...'
                        : 'พิมพ์คำสั่ง หรือคำถามของคุณที่นี่...'
                    }
                    disabled={isStreaming}
                    className="w-full resize-none border-0 bg-transparent text-[13.5px] sm:text-[14px] text-slate-700 placeholder:text-slate-400 focus:outline-none select-text disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={isStreaming || !inputText.trim()}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                        inputText.trim() && !isStreaming
                          ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-xs'
                          : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5 -translate-x-0.5 translate-y-0.5 rotate-12" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CITATION DETAIL MODAL WITH SOURCE-SPECIFIC DESIGNS */}
      {activeCitationModal && (
        <CitationModal
          citation={activeCitationModal.citation}
          allCitations={activeCitationModal.allCitations}
          onClose={() => setActiveCitationModal(null)}
          onSelectCitation={(c) =>
            setActiveCitationModal((prev) => (prev ? { ...prev, citation: c } : null))
          }
        />
      )}
    </div>
  );
}
