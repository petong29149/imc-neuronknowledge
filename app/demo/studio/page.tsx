'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Database,
  FileText,
  Globe,
  CheckCircle2,
  Copy,
  Check,
  Play,
  RotateCcw,
  ShieldCheck,
  Key,
  Layers,
  ArrowRight,
  ArrowLeft,
  Server,
  Plus,
  Eye,
  EyeOff,
  Code2,
  Terminal,
  Settings,
  ExternalLink,
  X,
  Lock,
  ChevronDown,
  ChevronUp,
  Table2,
  Columns,
  Edit3,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  Info,
  Folder,
  FolderPlus,
  UploadCloud,
  Trash2,
  ArrowRightLeft,
  Sparkles,
  BookOpen,
} from 'lucide-react';

// Types for Creator Studio Demo
type PhaseId = 1 | 2 | 3 | 4;

export type DbEngine =
  | 'PostgreSQL'
  | 'MySQL'
  | 'SQL Server'
  | 'Oracle'
  | 'MariaDB'
  | 'Snowflake';

export interface ColumnMeta {
  name: string;
  type: string;
  published: boolean;
  description: string;
  isPii?: boolean;
}

export interface TableMeta {
  name: string;
  published: boolean;
  description: string;
  joinTip?: string;
  columns: ColumnMeta[];
}

export interface CustomerDatabase {
  id: string;
  name: string;
  type: DbEngine;
  host: string;
  port: number;
  database: string;
  user: string;
  status: 'connected' | 'testing' | 'untested';
  readOnlyVerified: boolean;
  published: boolean;
  dbDescription: string;
  tables: TableMeta[];
}

export interface KnowledgeFolder {
  id: string;
  name: string;
  description: string;
  color: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo';
  createdAt?: string;
}

interface CustomerFile {
  id: string;
  name: string;
  size: string;
  collection: string;
  folderId?: string;
  status: 'ready' | 'processing' | 'error';
  chunks: number;
  progress: number;
  uploadedAt?: string;
}

export type WebCategory = 'gov' | 'market' | 'standard' | 'partner';

interface CustomerWebsite {
  id: string;
  url: string;
  title?: string;
  purpose: string;
  category: WebCategory;
  status: 'verified' | 'checking' | 'error';
  lastChecked?: string;
}

interface CatalogSource {
  id: string;
  type: 'db' | 'knowledge' | 'web';
  title: string;
  tool: string;
  provider: string;
  description: string;
  badge: string;
  selected: boolean;
  details?: string;
}

interface TestCase {
  id: string;
  question: string;
  expectedQuery: string;
  expectedSource: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  result?: string;
}

// Database Engine Logos from /public/db_icon
export const DB_ENGINE_LOGOS: Record<DbEngine, { src: string; alt: string }> = {
  PostgreSQL: { src: '/db_icon/Postgresql.webp', alt: 'PostgreSQL Logo' },
  MySQL: { src: '/db_icon/MYSQL.png', alt: 'MySQL Logo' },
  'SQL Server': { src: '/db_icon/microsoft_sql_server.png', alt: 'Microsoft SQL Server Logo' },
  Oracle: { src: '/db_icon/oracle.svg', alt: 'Oracle Database Logo' },
  MariaDB: { src: '/db_icon/mariadb.png', alt: 'MariaDB Logo' },
  Snowflake: { src: '/db_icon/snowflake-icon.webp', alt: 'Snowflake Logo' },
};

export function DbEngineLogo({
  engine,
  className = 'w-7 h-7',
  size = 32,
}: {
  engine: DbEngine;
  className?: string;
  size?: number;
}) {
  const logo = DB_ENGINE_LOGOS[engine];
  if (!logo) {
    return <Database className={className} />;
  }
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <Image
        src={logo.src}
        alt={logo.alt}
        width={size}
        height={size}
        className="w-full h-full object-contain"
        unoptimized
      />
    </div>
  );
}

const SUPPORTED_ENGINES: {
  type: DbEngine;
  name: string;
  defaultPort: number;
  description: string;
  badge: string;
  iconBg: string;
  logoSrc: string;
}[] = [
  {
    type: 'PostgreSQL',
    name: 'PostgreSQL',
    defaultPort: 5432,
    description: 'รองรับ pgvector, JSONB, schema queries และ SSL mode',
    badge: 'แนะนำ',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
    logoSrc: '/db_icon/Postgresql.webp',
  },
  {
    type: 'MySQL',
    name: 'MySQL',
    defaultPort: 3306,
    description: 'รองรับ MySQL 8.x, utf8mb4 และ Read-replica connection',
    badge: 'ยอดนิยม',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    logoSrc: '/db_icon/MYSQL.png',
  },
  {
    type: 'SQL Server',
    name: 'Microsoft SQL Server',
    defaultPort: 1433,
    description: 'รองรับ T-SQL, Windows/SQL Auth, Azure SQL Database',
    badge: 'Enterprise',
    iconBg: 'bg-red-50 text-red-600 border-red-200',
    logoSrc: '/db_icon/microsoft_sql_server.png',
  },
  {
    type: 'Oracle',
    name: 'Oracle Database',
    defaultPort: 1521,
    description: 'รองรับ Oracle 19c/21c, Service Name / SID connection',
    badge: 'Enterprise',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
    logoSrc: '/db_icon/oracle.svg',
  },
  {
    type: 'MariaDB',
    name: 'MariaDB',
    defaultPort: 3306,
    description: 'รองรับ MariaDB 10.x, Galera Cluster, ColumnStore',
    badge: 'Open Source',
    iconBg: 'bg-teal-50 text-teal-600 border-teal-200',
    logoSrc: '/db_icon/mariadb.png',
  },
  {
    type: 'Snowflake',
    name: 'Snowflake',
    defaultPort: 443,
    description: 'Cloud Data Warehouse, read-only analytical queries',
    badge: 'Cloud DW',
    iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    logoSrc: '/db_icon/snowflake-icon.webp',
  },
];

export default function DemoStudioPage() {
  const [currentPhase, setCurrentPhase] = useState<PhaseId>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Phase 1 States
  const [p1Tab, setP1Tab] = useState<'db' | 'files' | 'web'>('db');
  const [dbList, setDbList] = useState<CustomerDatabase[]>([
    {
      id: 'db-1',
      name: 'ระบบคลังสินค้าและการจัดส่ง (Warehouse DB)',
      type: 'PostgreSQL',
      host: 'db.customer-corp.internal',
      port: 5432,
      database: 'logistics_db',
      user: 'mcp_readonly_user',
      status: 'connected',
      readOnlyVerified: true,
      published: true,
      dbDescription:
        'ฐานข้อมูลระบบคลังสินค้า สต็อกคงเหลือ และประวัติการส่งออกสินค้าของบริษัท ใช้สำหรับตอบคำถามสถานะสต็อกและปริมาณพร้อมส่งมอบ',
      tables: [
        {
          name: 'inventory_items',
          published: true,
          description: 'รายการสินค้าในสต็อก ปริมาณคงเหลือ และสถานที่จัดเก็บ',
          joinTip: 'Join กับ shipment_records ด้วย item_id',
          columns: [
            {
              name: 'item_id',
              type: 'INT (PK)',
              published: true,
              description: 'รหัสสินค้ามาตรฐานภายในองค์กร',
            },
            {
              name: 'sku_code',
              type: 'VARCHAR(50)',
              published: true,
              description: 'รหัสบาร์โค้ดสากล (SKU)',
            },
            {
              name: 'item_name',
              type: 'VARCHAR(200)',
              published: true,
              description: 'ชื่อสินค้าและรายละเอียดสายพันธุ์/เกรด',
            },
            {
              name: 'qty_available',
              type: 'INT',
              published: true,
              description: 'ปริมาณสินค้าคงเหลือที่พร้อมส่งมอบ (ตัน)',
            },
            {
              name: 'unit_cost',
              type: 'NUMERIC(10,2)',
              published: false,
              description: 'ต้นทุนต่อหน่วย (ไม่เผยแพร่ - Confidential)',
              isPii: true,
            },
          ],
        },
        {
          name: 'shipment_records',
          published: true,
          description: 'ประวัติการส่งออกสินค้า วันที่ส่ง และประเทศปลายทาง',
          joinTip: 'Join กับ inventory_items ด้วย item_id',
          columns: [
            {
              name: 'shipment_id',
              type: 'INT (PK)',
              published: true,
              description: 'รหัสเอกสารการส่งมอบ',
            },
            {
              name: 'item_id',
              type: 'INT (FK)',
              published: true,
              description: 'รหัสสินค้าที่เชื่อมโยงกับสต็อก',
            },
            {
              name: 'destination_country',
              type: 'VARCHAR(100)',
              published: true,
              description: 'ประเทศปลายทางที่ส่งมอบสินค้า',
            },
            {
              name: 'shipment_date',
              type: 'DATE',
              published: true,
              description: 'วันที่ส่งมอบออกจากท่าเรือ',
            },
            {
              name: 'status',
              type: 'VARCHAR(30)',
              published: true,
              description: 'สถานะการเดินทาง (In-transit, Delivered)',
            },
          ],
        },
        {
          name: 'internal_audit_logs',
          published: false,
          description:
            'บันทึกประวัติการแก้ไขข้อมูลภายในระบบ ERP (ข้อมูลความลับ ไม่เผยแพร่ให้ AI)',
          columns: [
            {
              name: 'log_id',
              type: 'BIGINT',
              published: false,
              description: 'รหัสบันทึก',
            },
            {
              name: 'operator_id',
              type: 'VARCHAR(50)',
              published: false,
              description: 'รหัสผู้ใช้งานระบบ',
            },
          ],
        },
      ],
    },
    {
      id: 'db-2',
      name: 'ระบบคำสั่งซื้อและลูกค้าสัมพันธ์ (E-Commerce Order DB)',
      type: 'MySQL',
      host: 'order-mysql.corp.internal',
      port: 3306,
      database: 'ecommerce_order_db',
      user: 'bi_readonly_user',
      status: 'connected',
      readOnlyVerified: true,
      published: true,
      dbDescription:
        'ฐานข้อมูลยอดขาย คำสั่งซื้อ ประวัติลูกค้า และสินค้าขายดี สำหรับวิเคราะห์แนวโน้มยอดขายและสรุปผลประกอบการ',
      tables: [
        {
          name: 'orders',
          published: true,
          description: 'ประวัติคำสั่งซื้อ ยอดรวม สถานะการชำระเงิน และวันที่ทำรายการ',
          joinTip: 'Join กับ order_items ด้วย order_id และ customers ด้วย customer_id',
          columns: [
            { name: 'order_id', type: 'VARCHAR(36) (PK)', published: true, description: 'รหัสคำสั่งซื้อ UUID' },
            { name: 'customer_id', type: 'INT (FK)', published: true, description: 'รหัสลูกค้า' },
            { name: 'order_date', type: 'TIMESTAMP', published: true, description: 'วันและเวลาที่สั่งซื้อ' },
            { name: 'total_amount', type: 'DECIMAL(12,2)', published: true, description: 'ยอดรวมสุทธิ (บาท)' },
            { name: 'payment_status', type: 'VARCHAR(20)', published: true, description: 'สถานะการชำระ (PAID, PENDING)' },
          ],
        },
        {
          name: 'order_items',
          published: true,
          description: 'รายการย่อยสินค้าในแต่ละคำสั่งซื้อ ปริมาณ และราคาขายต่อหน่วย',
          joinTip: 'Join กับ orders ด้วย order_id',
          columns: [
            { name: 'item_id', type: 'BIGINT (PK)', published: true, description: 'รหัสรายการ' },
            { name: 'order_id', type: 'VARCHAR(36) (FK)', published: true, description: 'รหัสคำสั่งซื้อ' },
            { name: 'product_name', type: 'VARCHAR(255)', published: true, description: 'ชื่อสินค้า' },
            { name: 'quantity', type: 'INT', published: true, description: 'จำนวนชิ้น' },
            { name: 'subtotal', type: 'DECIMAL(10,2)', published: true, description: 'ยอดรวมย่อย' },
          ],
        },
        {
          name: 'customers',
          published: true,
          description: 'ข้อมูลลูกค้า ระดับสมาชิก และประเทศของลูกค้า',
          joinTip: 'Join กับ orders ด้วย customer_id',
          columns: [
            { name: 'customer_id', type: 'INT (PK)', published: true, description: 'รหัสลูกค้า' },
            { name: 'company_name', type: 'VARCHAR(150)', published: true, description: 'ชื่อบริษัทหรือคู่ค้า' },
            { name: 'country', type: 'VARCHAR(100)', published: true, description: 'ประเทศที่ตั้ง' },
            { name: 'customer_tier', type: 'VARCHAR(20)', published: true, description: 'ระดับลูกค้า (VIP, Gold, Regular)' },
            { name: 'contact_email', type: 'VARCHAR(100)', published: false, description: 'อีเมลติดต่อ (PII - ปกปิด)', isPii: true },
          ],
        },
        {
          name: 'payment_webhook_logs',
          published: false,
          description: 'บันทึก raw payload การชำระเงินจาก Payment Gateway (ข้อมูลลับ)',
          columns: [
            { name: 'log_id', type: 'BIGINT (PK)', published: false, description: 'รหัส Log' },
            { name: 'raw_payload', type: 'TEXT', published: false, description: 'Payload ดิบที่มีข้อมูลบัตร' },
          ],
        },
      ],
    },
    {
      id: 'db-3',
      name: 'ระบบการเงินและการออกใบกำกับภาษี (Finance ERP DB)',
      type: 'SQL Server',
      host: 'sqlserver-erp.finance.corp',
      port: 1433,
      database: 'finance_master_db',
      user: 'mcp_report_reader',
      status: 'connected',
      readOnlyVerified: true,
      published: true,
      dbDescription:
        'ฐานข้อมูลระบบบัญชี ใบแจ้งหนี้ อัตราภาษีศุลกากร และข้อมูลการเงิน สำหรับตรวจสอบภาษีและทำรายงานการเงิน',
      tables: [
        {
          name: 'tax_invoices',
          published: true,
          description: 'ใบกำกับภาษีเต็มรูป วันที่ออกเอกสาร และจำนวนภาษีมูลค่าเพิ่ม',
          columns: [
            { name: 'invoice_no', type: 'VARCHAR(30) (PK)', published: true, description: 'เลขที่ใบกำกับภาษี' },
            { name: 'tax_id', type: 'VARCHAR(20)', published: true, description: 'เลขประจำตัวผู้เสียภาษี' },
            { name: 'issue_date', type: 'DATE', published: true, description: 'วันที่ออกใบกำกับภาษี' },
            { name: 'vat_amount', type: 'NUMERIC(14,2)', published: true, description: 'มูลค่าภาษี VAT 7%' },
          ],
        },
        {
          name: 'customs_duty_rates',
          published: true,
          description: 'พิกัดอัตราภาษีศุลกากรสินค้าส่งออก (HS Code) ประจำปีภาษี',
          columns: [
            { name: 'hs_code', type: 'VARCHAR(12) (PK)', published: true, description: 'รหัสพิกัดศุลกากร 8-10 หลัก' },
            { name: 'product_category', type: 'VARCHAR(100)', published: true, description: 'หมวดหมู่สินค้า' },
            { name: 'duty_rate_percent', type: 'DECIMAL(5,2)', published: true, description: 'อัตราภาษีร้อยละ' },
          ],
        },
        {
          name: 'payroll_confidential',
          published: false,
          description: 'ข้อมูลเงินเดือนและสวัสดิการพนักงาน (ข้อมูลลับ ไม่อนุญาตให้ AI เข้าถึง)',
          columns: [
            { name: 'emp_id', type: 'INT', published: false, description: 'รหัสพนักงาน' },
            { name: 'salary_tier', type: 'VARCHAR(10)', published: false, description: 'ระดับเงินเดือน' },
          ],
        },
      ],
    },
  ]);

  // Database Tab UX Enhancement States
  const [selectedDbId, setSelectedDbId] = useState<string>('db-1');
  const [dbSearchQuery, setDbSearchQuery] = useState<string>('');
  const [dbEngineFilter, setDbEngineFilter] = useState<string>('all');
  const [dbPublishFilter, setDbPublishFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [dbViewMode, setDbViewMode] = useState<'split' | 'cards'>('split');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [tableFilter, setTableFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [expandedTableNamesInDetail, setExpandedTableNamesInDetail] = useState<Record<string, boolean>>({});
  const [collapsedDbIds, setCollapsedDbIds] = useState<Record<string, boolean>>({});
  const [mobileDbView, setMobileDbView] = useState<'list' | 'detail'>('list');

  // Database Connection & Schema Publishing Modal State
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'connection' | 'publishing'>(
    'connection'
  );
  const [selectedEngine, setSelectedEngine] = useState<DbEngine>('PostgreSQL');
  const [dbForm, setDbForm] = useState({
    name: '',
    host: '',
    port: 5432,
    database: '',
    user: '',
    password: '',
    sslMode: 'prefer',
    dbDescription: '',
    published: true,
  });
  const [modalTables, setModalTables] = useState<TableMeta[]>([]);
  const [expandedTableNames, setExpandedTableNames] = useState<string[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [editingDbId, setEditingDbId] = useState<string | null>(null);

  // Knowledge Folders / Sets for Vector DB
  const [knowledgeFolders, setKnowledgeFolders] = useState<KnowledgeFolder[]>([
    {
      id: 'ks-export',
      name: 'คู่มือและขั้นตอนการส่งออก (Export SOP)',
      description: 'ระเบียบการส่งออก พิธีการศุลกากร และสิทธิประโยชน์ทางภาษี',
      color: 'blue',
      createdAt: '28 ต.ค. 2569',
    },
    {
      id: 'ks-legal',
      name: 'สัญญาและกฎหมายการค้า (Trade Legal)',
      description: 'สัญญาคู่ค้าระหว่างประเทศ ข้อกำหนด Incoterms และเงื่อนไขข้อพิพาท',
      color: 'purple',
      createdAt: '28 ต.ค. 2569',
    },
    {
      id: 'ks-market',
      name: 'รายงานและการวิเคราะห์ตลาด (Market Research)',
      description: 'ข้อมูลสถิติการค้าอาเซียน แนวโน้มสินค้าเกษตรแปรรูป และข้อมูลคู่แข่ง',
      color: 'emerald',
      createdAt: '29 ต.ค. 2569',
    },
  ]);

  const [filesList, setFilesList] = useState<CustomerFile[]>([
    {
      id: 'file-1',
      name: 'ระเบียบการส่งออกและพิธีการศุลกากร_2569.pdf',
      size: '4.2 MB',
      collection: 'customer-export-sop',
      folderId: 'ks-export',
      status: 'ready',
      chunks: 148,
      progress: 100,
      uploadedAt: '28 ต.ค. 2569',
    },
    {
      id: 'file-2',
      name: 'สัญญาคู่ค้าระหว่างประเทศ_มาตรฐาน.docx',
      size: '1.8 MB',
      collection: 'customer-legal-docs',
      folderId: 'ks-legal',
      status: 'ready',
      chunks: 64,
      progress: 100,
      uploadedAt: '28 ต.ค. 2569',
    },
  ]);

  // States for Knowledge Set / Folder UI in Vector DB Tab
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [folderViewMode, setFolderViewMode] = useState<'table' | 'grid'>('table');
  const [fileSearchQuery, setFileSearchQuery] = useState('');

  // Modals for Knowledge Files
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [movingFile, setMovingFile] = useState<CustomerFile | null>(null);

  // Upload Form State
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string>('ks-export');
  const [uploadSelectedFileName, setUploadSelectedFileName] = useState('');
  const [uploadSelectedFileSize, setUploadSelectedFileSize] = useState('');

  // New Folder Form State
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<KnowledgeFolder['color']>('blue');

  // States for Websites Tab (Grouped by Category)
  const [selectedWebCategory, setSelectedWebCategory] = useState<string>('all');
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [isAddWebModalOpen, setIsAddWebModalOpen] = useState(false);
  const [newWebForm, setNewWebForm] = useState<{
    url: string;
    title: string;
    purpose: string;
    category: WebCategory;
  }>({
    url: '',
    title: '',
    purpose: '',
    category: 'gov',
  });

  const [webList, setWebList] = useState<CustomerWebsite[]>([
    {
      id: 'web-1',
      url: 'https://customs.go.th',
      title: 'กรมศุลกากร (The Customs Department)',
      purpose: 'อ้างอิงพิกัดศุลกากร ประกาศอัตราอากร และสิทธิประโยชน์ทางภาษี',
      category: 'gov',
      status: 'verified',
      lastChecked: 'วันนี้ 10:30',
    },
    {
      id: 'web-2',
      url: 'https://ditp.go.th',
      title: 'กรมส่งเสริมการค้าระหว่างประเทศ (DITP)',
      purpose: 'ข่าวสารกิจกรรมส่งเสริมการค้าระหว่างประเทศและรายงานตลาดส่งออก',
      category: 'market',
      status: 'verified',
      lastChecked: 'วันนี้ 09:15',
    },
    {
      id: 'web-3',
      url: 'https://dft.go.th',
      title: 'กรมการค้าต่างประเทศ (DFT)',
      purpose: 'ระเบียบการขอหนังสือรับรองแหล่งกำเนิดสินค้า (Form C/O) และมาตรการทางการค้า',
      category: 'gov',
      status: 'verified',
      lastChecked: 'วันนี้ 11:00',
    },
    {
      id: 'web-4',
      url: 'https://fda.moph.go.th',
      title: 'สำนักงานคณะกรรมการอาหารและยา (อย.)',
      purpose: 'ตรวจสอบบัญชีสารควบคุมและข้อกำหนดการขึ้นทะเบียนผลิตภัณฑ์สุขภาพส่งออก',
      category: 'standard',
      status: 'verified',
      lastChecked: '28 ต.ค.',
    },
  ]);

  // Phase 2 States: IMC Catalog
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<'all' | 'db' | 'knowledge' | 'web'>('all');
  const [catalogItems, setCatalogItems] = useState<CatalogSource[]>([
    {
      id: 'imc-db-1',
      type: 'db',
      title: 'สถิติการค้าไทย กรมศุลกากร (Customs Trade Data)',
      tool: 'database_query',
      provider: 'สนค. (TPSO)',
      description:
        'สถิติการนำเข้า-ส่งออกรายเดือน ย้อนหลัง 10 ปี จำแนกตามพิกัด HS Code 2-8 หลัก และประเทศคู่ค้า',
      badge: 'SQL Query สด',
      selected: true,
      details:
        'โครงสร้างตาราง: trade_statistics (year, month, hs_code, country_code, export_value, import_value)',
    },
    {
      id: 'imc-db-2',
      type: 'db',
      title: 'Global Trade Atlas (GTA Macro Database)',
      tool: 'database_query',
      provider: 'IMC Institute',
      description:
        'ข้อมูลการค้าโลกรายไตรมาส เปรียบเทียบสัดส่วนคู่ค้าและมาตรการภาษีนำเข้าทั่วโลก',
      badge: 'SQL Query สด',
      selected: false,
      details: 'โครงสร้างตาราง: global_trade_flows, tariff_matrix',
    },
    {
      id: 'imc-rag-1',
      type: 'knowledge',
      title: 'คลังกฎหมายและมาตรการทางการค้าของกระทรวงพาณิชย์',
      tool: 'rag_query',
      provider: 'สนค. (TPSO)',
      description:
        'เอกสารระเบียบ มาตรการกีดกันทางการค้าที่ไม่ใช่ภาษี (NTBs) และสรุปความตกลง FTA 15 ฉบับ',
      badge: 'Vector DB (Hybrid RAG)',
      selected: true,
    },
    {
      id: 'imc-rag-2',
      type: 'knowledge',
      title: 'คู่มือและข้อกำหนดสิทธิประโยชน์ FTA 15 ฉบับ (FTA Guidelines)',
      tool: 'rag_query',
      provider: 'กรมเจรจาการค้าระหว่างประเทศ (DTN)',
      description:
        'เงื่อนไขการสะสมถิ่นกำเนิดสินค้า กฎถิ่นกำเนิดเฉพาะรายสินค้า (PSRs) และแบบฟอร์ม C/O',
      badge: 'Vector DB (Hybrid RAG)',
      selected: false,
    },
    {
      id: 'imc-web-1',
      type: 'web',
      title: 'ประกาศและข่าวสารกระทรวงพาณิชย์ (MOC Official News)',
      tool: 'web_search',
      provider: 'IMC Institute',
      description:
        'ดึงหัวข้อข่าว ข่าวแถลง และดัชนีราคาผู้บริโภคแบบเรียลไทม์จากระบบกลางของกระทรวงพาณิชย์',
      badge: 'Live Web Search',
      selected: true,
    },
    {
      id: 'imc-web-2',
      type: 'web',
      title: 'รายงานอัตราแลกเปลี่ยนและดัชนีเศรษฐกิจมหภาค (BOT Macro Data)',
      tool: 'web_search',
      provider: 'ธนาคารแห่งประเทศไทย (BOT)',
      description:
        'อัตราแลกเปลี่ยนถัวเฉลี่ยถ่วงน้ำหนักรายวัน ดัชนีราคาสินค้าเกษตร และรายงานดุลบัญชีเดินสะพัด',
      badge: 'Live API Feed',
      selected: true,
    },
  ]);

  // Phase 3 States: Use Case
  const [systemPrompt, setSystemPrompt] = useState(
    'คุณคือ AI ผู้ช่วยวิเคราะห์ข้อมูลการค้าระหว่างประเทศระดับองค์กร ทำหน้าที่ตอบคำถามโดยอ้างอิงข้อมูลจากคลังสินค้าของลูกค้า และสถิติการค้าทางการของ TPSO\n\nกฎสำคัญ:\n1. ตรวจสอบตารางที่อนุญาตก่อนเขียน SQL เสมอ\n2. ทุกคำตอบต้องระบุแหล่งที่มาและตัวเลขที่ตรวจสอบได้\n3. ห้ามคาดเดาพิกัด HS ให้ส่งชื่อสินค้าเพื่อตรวจสอบก่อน'
  );
  const [allowedTables, setAllowedTables] = useState<string[]>([
    'inventory_items',
    'shipment_records',
    'trade_statistics',
  ]);
  const [allowedKnowledgeSetIds, setAllowedKnowledgeSetIds] = useState<string[]>([
    'ks-export',
    'imc-rag-1',
  ]);
  const [allowedWebIds, setAllowedWebIds] = useState<string[]>([
    'https://customs.go.th',
    'imc-web-1',
  ]);
  const [useCaseScopeFilter, setUseCaseScopeFilter] = useState<'all' | 'db' | 'knowledge' | 'web'>('all');
  // Tool-specific Guardrails & Retrieval Settings
  const [maxRows, setMaxRows] = useState(500);
  const [queryTimeout, setQueryTimeout] = useState(15);
  const [topKChunks, setTopKChunks] = useState(5);
  const [minScoreThreshold, setMinScoreThreshold] = useState(70);
  const [maxWebResults, setMaxWebResults] = useState(3);
  const [enforceDomainWhitelist, setEnforceDomainWhitelist] = useState(true);
  const [useCaseVersion, setUseCaseVersion] = useState(1);
  const [testSuite, setTestSuite] = useState<TestCase[]>([
    {
      id: 'test-1',
      question:
        'สินค้ากลุ่มข้าวหอมมะลิในสต็อกมีเหลือส่งออกกี่ตัน และไตรมาสล่าสุดส่งไปประเทศใดมากที่สุด?',
      expectedQuery: 'SELECT item_name, qty_available FROM inventory_items...',
      expectedSource: 'inventory_items + trade_statistics',
      status: 'passed',
      result:
        'พบข้อมูลใน inventory_items (คงเหลือ 1,200 ตัน) และสถิติ TPSO ระบุส่งออกไปสหรัฐฯ มากที่สุด 45%',
    },
    {
      id: 'test-2',
      question: 'ขอทราบอัตราภาษีนำเข้าโซลาร์เซลล์ของสหรัฐฯ ล่าสุด',
      expectedQuery: 'SELECT ... FROM tariff_matrix...',
      expectedSource: 'คลังกฎหมายและมาตรการกระทรวงพาณิชย์',
      status: 'passed',
      result:
        'ค้นพบในประกาศกระทรวงพาณิชย์ระบุอัตรามาตรา 301 ที่ 50% มีผลบังคับใช้ปี 2569',
    },
  ]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Phase 4 States: MCP Provisioning
  const [authType, setAuthType] = useState<'machine' | 'user'>('machine');
  const [showSecret, setShowSecret] = useState(false);
  const [simulatorStep, setSimulatorStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run Test Suite simulation
  const handleRunTests = () => {
    setIsRunningTests(true);
    setTestSuite((prev) => prev.map((t) => ({ ...t, status: 'running' })));

    setTimeout(() => {
      setTestSuite((prev) =>
        prev.map((t) => ({
          ...t,
          status: 'passed',
        }))
      );
      setIsRunningTests(false);
    }, 1200);
  };

  // Run Live MCP Request Inspector simulation
  const handleSimulateRequest = () => {
    setIsSimulating(true);
    setSimulatorStep(1);

    const stepInterval = setInterval(() => {
      setSimulatorStep((prev) => {
        if (prev >= 7) {
          clearInterval(stepInterval);
          setIsSimulating(false);
          return 7;
        }
        return prev + 1;
      });
    }, 450);
  };

  // Test DB connection simulation
  const handleTestDb = (id: string) => {
    setDbList((prev) =>
      prev.map((db) => (db.id === id ? { ...db, status: 'testing' } : db))
    );
    setTimeout(() => {
      setDbList((prev) =>
        prev.map((db) =>
          db.id === id
            ? { ...db, status: 'connected', readOnlyVerified: true }
            : db
        )
      );
    }, 800);
  };

  // Open modal for NEW connection
  const handleOpenNewDbModal = () => {
    setEditingDbId(null);
    setSelectedEngine('PostgreSQL');
    setDbForm({
      name: 'ระบบฐานข้อมูลการผลิตและบัญชี (Production & ERP DB)',
      host: 'db.corp-erp.internal',
      port: 5432,
      database: 'erp_production_db',
      user: 'mcp_readonly_user',
      password: 'readonly_secure_password_2026',
      sslMode: 'prefer',
      dbDescription:
        'ฐานข้อมูลระบบ ERP รายการคำสั่งซื้อของคู่ค้า ปริมาณการผลิตรายวัน และข้อมูลการชำระเงิน',
      published: true,
    });
    setModalTables([
      {
        name: 'production_batches',
        published: true,
        description:
          'ล็อตการผลิตสินค้า วันที่ผลิต ปริมาณที่ผลิตได้ และสถานะการตรวจสอบคุณภาพ (QC)',
        joinTip: 'Join กับ order_items ด้วย batch_id',
        columns: [
          {
            name: 'batch_id',
            type: 'INT (PK)',
            published: true,
            description: 'รหัสล็อตการผลิต',
          },
          {
            name: 'product_sku',
            type: 'VARCHAR(50)',
            published: true,
            description: 'รหัสสินค้า SKU',
          },
          {
            name: 'produced_quantity',
            type: 'NUMERIC(12,2)',
            published: true,
            description: 'จำนวนที่ผลิตเสร็จสมบูรณ์',
          },
          {
            name: 'qc_passed',
            type: 'BOOLEAN',
            published: true,
            description: 'ผ่านเกณฑ์ตรวจสอบคุณภาพส่งออกหรือไม่',
          },
          {
            name: 'inspector_id',
            type: 'VARCHAR(50)',
            published: false,
            description: 'รหัสเจ้าหน้าที่ตรวจสอบ (ข้อมูลบุคคลภายใน)',
            isPii: true,
          },
        ],
      },
      {
        name: 'customer_orders',
        published: true,
        description: 'รายการใบสั่งซื้อสินค้าจากคู่ค้าต่างประเทศ มูลค่า และสกุลเงิน',
        joinTip: 'Join กับ production_batches ด้วย product_sku',
        columns: [
          {
            name: 'order_id',
            type: 'INT (PK)',
            published: true,
            description: 'รหัสใบสั่งซื้อสากล',
          },
          {
            name: 'customer_name',
            type: 'VARCHAR(150)',
            published: true,
            description: 'ชื่อบริษัทคู่ค้าต่างประเทศ',
          },
          {
            name: 'total_amount_usd',
            type: 'NUMERIC(14,2)',
            published: true,
            description: 'มูลค่าการสั่งซื้อสุทธิ (USD)',
          },
          {
            name: 'credit_term_days',
            type: 'INT',
            published: true,
            description: 'เครดิตเทอมการชำระเงิน (วัน)',
          },
        ],
      },
      {
        name: 'payroll_compensation',
        published: false,
        description:
          'ข้อมูลเงินเดือนและค่าตอบแทนพนักงานฝ่ายผลิต (ห้ามเผยแพร่ - ข้อมูลส่วนบุคคล)',
        columns: [
          {
            name: 'emp_id',
            type: 'INT',
            published: false,
            description: 'รหัสพนักงาน',
          },
          {
            name: 'salary_amount',
            type: 'NUMERIC(12,2)',
            published: false,
            description: 'ฐานเงินเดือน',
            isPii: true,
          },
        ],
      },
    ]);
    setExpandedTableNames(['production_batches']);
    setConnectionTested(false);
    setModalStep('connection');
    setIsDbModalOpen(true);
  };

  // Open modal to EDIT existing connection publishing
  const handleOpenEditDbModal = (db: CustomerDatabase) => {
    setEditingDbId(db.id);
    setSelectedEngine(db.type);
    setDbForm({
      name: db.name,
      host: db.host,
      port: db.port,
      database: db.database,
      user: db.user,
      password: '••••••••••••••••',
      sslMode: 'prefer',
      dbDescription: db.dbDescription || '',
      published: db.published,
    });
    setModalTables(JSON.parse(JSON.stringify(db.tables)));
    setExpandedTableNames(db.tables.map((t) => t.name));
    setConnectionTested(true);
    setModalStep('publishing');
    setIsDbModalOpen(true);
  };

  // Test connection inside modal
  const handleModalTestConnection = () => {
    setIsTestingConnection(true);
    setTimeout(() => {
      setIsTestingConnection(false);
      setConnectionTested(true);
      setModalStep('publishing');
    }, 700);
  };

  // Save database from modal
  const handleSaveModalDatabase = () => {
    if (editingDbId) {
      setDbList((prev) =>
        prev.map((db) =>
          db.id === editingDbId
            ? {
                ...db,
                name: dbForm.name,
                type: selectedEngine,
                host: dbForm.host,
                port: dbForm.port,
                database: dbForm.database,
                user: dbForm.user,
                dbDescription: dbForm.dbDescription,
                published: dbForm.published,
                tables: modalTables,
              }
            : db
        )
      );
    } else {
      const newDb: CustomerDatabase = {
        id: `db-${Date.now()}`,
        name: dbForm.name || 'ฐานข้อมูลใหม่ของลูกค้า',
        type: selectedEngine,
        host: dbForm.host || 'db.internal.corp',
        port: dbForm.port,
        database: dbForm.database || 'production_db',
        user: dbForm.user || 'readonly_user',
        status: 'connected',
        readOnlyVerified: true,
        published: dbForm.published,
        dbDescription: dbForm.dbDescription,
        tables: modalTables,
      };
      setDbList((prev) => [...prev, newDb]);
      setSelectedDbId(newDb.id);
      setMobileDbView('detail');
    }
    setIsDbModalOpen(false);
  };

  // Toggle table publish state
  const handleToggleTablePublish = (tblName: string) => {
    setModalTables((prev) =>
      prev.map((t) =>
        t.name === tblName ? { ...t, published: !t.published } : t
      )
    );
  };

  // Toggle column publish state
  const handleToggleColumnPublish = (tblName: string, colName: string) => {
    setModalTables((prev) =>
      prev.map((t) => {
        if (t.name !== tblName) return t;
        return {
          ...t,
          columns: t.columns.map((c) =>
            c.name === colName ? { ...c, published: !c.published } : c
          ),
        };
      })
    );
  };

  // Update table description
  const handleUpdateTableDescription = (tblName: string, desc: string) => {
    setModalTables((prev) =>
      prev.map((t) => (t.name === tblName ? { ...t, description: desc } : t))
    );
  };

  // Update table join tip
  const handleUpdateTableJoinTip = (tblName: string, tip: string) => {
    setModalTables((prev) =>
      prev.map((t) => (t.name === tblName ? { ...t, joinTip: tip } : t))
    );
  };

  // Update column description
  const handleUpdateColumnDescription = (
    tblName: string,
    colName: string,
    desc: string
  ) => {
    setModalTables((prev) =>
      prev.map((t) => {
        if (t.name !== tblName) return t;
        return {
          ...t,
          columns: t.columns.map((c) =>
            c.name === colName ? { ...c, description: desc } : c
          ),
        };
      })
    );
  };

  // Toggle table expand in modal
  const toggleTableExpand = (tblName: string) => {
    setExpandedTableNames((prev) =>
      prev.includes(tblName)
        ? prev.filter((n) => n !== tblName)
        : [...prev, tblName]
    );
  };

  // Knowledge Sets / Folders Handlers
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newId = `ks-${Date.now()}`;
    const newFolder: KnowledgeFolder = {
      id: newId,
      name: newFolderName.trim(),
      description: newFolderDesc.trim() || 'ชุดความรู้เอกสารเฉพาะทางขององค์กร',
      color: newFolderColor,
      createdAt: 'วันนี้',
    };
    setKnowledgeFolders((prev) => [...prev, newFolder]);
    setNewFolderName('');
    setNewFolderDesc('');
    setIsNewFolderModalOpen(false);
    setSelectedFolderFilter(newId);
  };

  const handleDeleteFolder = (folderId: string) => {
    const folder = knowledgeFolders.find((f) => f.id === folderId);
    if (!folder) return;
    const hasFiles = filesList.some((f) => f.folderId === folderId);
    if (hasFiles) {
      const confirmDelete = window.confirm(
        `ชุดความรู้ "${folder.name}" มีเอกสารอยู่ข้างใน คุณต้องการลบชุดความรู้นี้หรือไม่? (เอกสารจะถูกย้ายไปยังชุดความรู้อื่น)`
      );
      if (!confirmDelete) return;
      const otherFolder = knowledgeFolders.find((f) => f.id !== folderId);
      if (otherFolder) {
        setFilesList((prev) =>
          prev.map((f) => (f.folderId === folderId ? { ...f, folderId: otherFolder.id } : f))
        );
      }
    }
    setKnowledgeFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (selectedFolderFilter === folderId) {
      setSelectedFolderFilter('all');
    }
  };

  const handleUploadFileSubmit = () => {
    const fileName =
      uploadSelectedFileName.trim() ||
      `เอกสารนำเข้า_${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}.pdf`;
    const fileSize = uploadSelectedFileSize || '3.2 MB';
    const folder = knowledgeFolders.find((f) => f.id === uploadTargetFolderId);
    const collectionName = folder ? `customer-${folder.id}` : 'customer-general-docs';

    const newFile: CustomerFile = {
      id: `file-${Date.now()}`,
      name: fileName,
      size: fileSize,
      collection: collectionName,
      folderId: uploadTargetFolderId,
      status: 'processing',
      chunks: 0,
      progress: 25,
      uploadedAt: 'เพิ่งอัปโหลด',
    };

    setFilesList((prev) => [newFile, ...prev]);
    setIsUploadModalOpen(false);
    setUploadSelectedFileName('');
    setUploadSelectedFileSize('');

    // Simulate progress
    setTimeout(() => {
      setFilesList((prev) =>
        prev.map((f) => (f.id === newFile.id ? { ...f, progress: 65, chunks: 42 } : f))
      );
    }, 700);

    setTimeout(() => {
      setFilesList((prev) =>
        prev.map((f) =>
          f.id === newFile.id ? { ...f, status: 'ready', progress: 100, chunks: 112 } : f
        )
      );
    }, 1500);
  };

  const handleMoveFile = (fileId: string, targetFolderId: string) => {
    const targetFolder = knowledgeFolders.find((f) => f.id === targetFolderId);
    setFilesList((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              folderId: targetFolderId,
              collection: targetFolder ? `customer-${targetFolder.id}` : f.collection,
            }
          : f
      )
    );
    setMovingFile(null);
  };

  const handleDeleteFile = (fileId: string) => {
    setFilesList((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Add dummy file (quick shortcut)
  const handleAddDummyFile = (targetFolderId?: string) => {
    const assignedFolderId =
      targetFolderId ||
      (selectedFolderFilter !== 'all' ? selectedFolderFilter : knowledgeFolders[0]?.id || 'ks-export');
    const folder = knowledgeFolders.find((f) => f.id === assignedFolderId);

    const dummySamples = [
      { name: 'รายงานการวิเคราะห์ตลาดส่งออก_Q3.pdf', size: '2.5 MB', chunks: 85 },
      { name: 'แนวปฏิบัติการขอหนังสือรับรองแหล่งกำเนิดสินค้า_C/O.docx', size: '1.9 MB', chunks: 54 },
      { name: 'บัญชีรายการสินค้าควบคุมและมาตรการนำเข้า_2569.xlsx', size: '3.1 MB', chunks: 120 },
    ];
    const sample = dummySamples[Math.floor(Math.random() * dummySamples.length)];

    const newFile: CustomerFile = {
      id: `file-${Date.now()}`,
      name: sample.name,
      size: sample.size,
      collection: folder ? `customer-${folder.id}` : 'customer-market-analysis',
      folderId: assignedFolderId,
      status: 'processing',
      chunks: 0,
      progress: 30,
      uploadedAt: 'เพิ่งอัปโหลด',
    };
    setFilesList((prev) => [newFile, ...prev]);

    setTimeout(() => {
      setFilesList((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? { ...f, status: 'ready', chunks: sample.chunks, progress: 100 }
            : f
        )
      );
    }, 1400);
  };

  // Website Handlers (Category-based)
  const handleAddWebsiteSubmit = () => {
    if (!newWebForm.url.trim()) return;
    let formattedUrl = newWebForm.url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let defaultTitle = 'เว็บไซต์อ้างอิง';
    try {
      defaultTitle = new URL(formattedUrl).hostname;
    } catch {
      defaultTitle = formattedUrl;
    }

    const newWeb: CustomerWebsite = {
      id: `web-${Date.now()}`,
      url: formattedUrl,
      title: newWebForm.title.trim() || defaultTitle,
      purpose: newWebForm.purpose.trim() || 'เว็บไซต์อ้างอิงข้อมูลภายนอกที่ได้รับอนุมัติสำหรับ AI',
      category: newWebForm.category,
      status: 'checking',
      lastChecked: 'เพิ่งเพิ่ม',
    };

    setWebList((prev) => [newWeb, ...prev]);
    setIsAddWebModalOpen(false);
    setNewWebForm({ url: '', title: '', purpose: '', category: 'gov' });

    setTimeout(() => {
      setWebList((prev) =>
        prev.map((w) =>
          w.id === newWeb.id ? { ...w, status: 'verified', lastChecked: 'ตรวจสอบแล้ว' } : w
        )
      );
    }, 1200);
  };

  const handleDeleteWebsite = (id: string) => {
    setWebList((prev) => prev.filter((w) => w.id !== id));
  };

  // Filtered databases for Phase 1 Database Tab
  const filteredDbList = dbList.filter((db) => {
    if (dbSearchQuery.trim()) {
      const q = dbSearchQuery.toLowerCase().trim();
      const matchName = db.name.toLowerCase().includes(q);
      const matchDb = db.database.toLowerCase().includes(q);
      const matchHost = db.host.toLowerCase().includes(q);
      const matchTable = db.tables.some((t) => t.name.toLowerCase().includes(q));
      if (!matchName && !matchDb && !matchHost && !matchTable) return false;
    }
    if (dbEngineFilter !== 'all' && db.type !== dbEngineFilter) {
      return false;
    }
    if (dbPublishFilter === 'published' && !db.published) return false;
    if (dbPublishFilter === 'unpublished' && db.published) return false;
    return true;
  });

  const currentSelectedDb =
    dbList.find((db) => db.id === selectedDbId) || filteredDbList[0] || dbList[0];

  const totalDbsCount = dbList.length;
  const totalTablesCount = dbList.reduce((acc, db) => acc + db.tables.length, 0);
  const totalPublishedTablesCount = dbList.reduce(
    (acc, db) => acc + db.tables.filter((t) => t.published).length,
    0
  );
  const totalColumnsCount = dbList.reduce(
    (acc, db) =>
      acc + db.tables.reduce((tAcc, t) => tAcc + t.columns.length, 0),
    0
  );
  const totalPublishedColumnsCount = dbList.reduce(
    (acc, db) =>
      acc +
      db.tables.reduce(
        (tAcc, t) => tAcc + t.columns.filter((c) => c.published).length,
        0
      ),
    0
  );
  const distinctEngines = Array.from(new Set(dbList.map((db) => db.type)));

  const filteredTablesInDetail = (currentSelectedDb?.tables || []).filter((tbl) => {
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase().trim();
      const matchName = tbl.name.toLowerCase().includes(q);
      const matchDesc = (tbl.description || '').toLowerCase().includes(q);
      const matchCol = tbl.columns.some((c) => c.name.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchCol) return false;
    }
    if (tableFilter === 'published' && !tbl.published) return false;
    if (tableFilter === 'hidden' && tbl.published) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col">
      {/* TOP GLOBAL BAR & MODE SWITCHER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
          {/* Logo and Platform Name */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 group focus:outline-none"
            >
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-[#0055fa] to-[#0043c7] flex items-center justify-center text-white font-extrabold text-sm shadow-sm group-hover:scale-105 transition-transform">
                NK
              </div>
              <div className="flex flex-col">
                <span className="text-[14.5px] font-extrabold text-slate-900 tracking-tight leading-none">
                  NeuronKnowledge
                </span>
                <span className="text-[10px] font-semibold text-[#0055fa] uppercase tracking-wider mt-0.5">
                  Creator Studio Mockup
                </span>
              </div>
            </Link>

            <span className="hidden sm:inline-block w-px h-5 bg-slate-200 mx-1" />

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
              <Link
                href="/demo"
                className="px-3 py-1 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5"
              >
                <span>💬</span>
                <span>User Chat</span>
              </Link>
              <div className="px-3 py-1 rounded-lg text-[12px] font-bold bg-white text-[#0055fa] shadow-xs flex items-center gap-1.5">
                <span>🛠️</span>
                <span>Creator Studio</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-200">
                  Phases 1–4
                </span>
              </div>
            </div>
          </div>

          {/* Right Info: Live Demo Prototype Badge */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] font-medium shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="hidden sm:inline">
                MCP Hub Onboarding Workflow
              </span>
              <span className="font-bold sm:hidden">DEMO</span>
            </div>

            <Link
              href="/demo"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-medium text-slate-600 transition shadow-2xs"
            >
              <span>ทดลองแชท</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* WORKFLOW PHASE STEPPER */}
        <div className="border-t border-slate-100 bg-[#fbfcfd] px-4 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2 sm:gap-4">
            {[
              {
                step: 1,
                title: 'ระยะที่ 1: แหล่งข้อมูลลูกค้า',
                sub: 'ฐานข้อมูล, ไฟล์ RAG, เว็บไซต์',
                icon: Database,
              },
              {
                step: 2,
                title: 'ระยะที่ 2: แคตตาล็อกของ IMC',
                sub: 'สถิติการค้า, ประกาศ, กฎระเบียบ',
                icon: Layers,
              },
              {
                step: 3,
                title: 'ระยะที่ 3: ออกแบบ Use Case',
                sub: 'System Prompt, สิทธิ์, ทดสอบ',
                icon: Settings,
              },
              {
                step: 4,
                title: 'ระยะที่ 4: ออกบัญชี MCP',
                sub: 'Keycloak, Token, เชื่อม AI',
                icon: Key,
              },
            ].map((p) => {
              const isActive = currentPhase === p.step;
              const isDone = currentPhase > p.step;
              const Icon = p.icon;

              return (
                <button
                  key={p.step}
                  type="button"
                  onClick={() => setCurrentPhase(p.step as PhaseId)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white border border-[#0055fa]/30 shadow-xs ring-2 ring-[#0055fa]/10'
                      : isDone
                      ? 'hover:bg-slate-100/80 text-slate-700'
                      : 'opacity-60 hover:opacity-100 text-slate-500'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isActive
                        ? 'bg-[#0055fa] text-white'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-[12.5px] font-bold leading-tight ${
                        isActive ? 'text-[#0055fa]' : 'text-slate-800'
                      }`}
                    >
                      {p.title}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                      {p.sub}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ========================================================================= */}
        {/* PHASE 1: ลูกค้าเพิ่มแหล่งข้อมูลของตัวเอง */}
        {/* ========================================================================= */}
        {currentPhase === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header description */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                  ระยะที่ 1 จาก 4
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  ลูกค้าเพิ่มแหล่งข้อมูลของตัวเอง (Customer Data Sources)
                </h2>
                <p className="mt-1 text-sm text-slate-600 max-w-3xl leading-relaxed">
                  ลูกค้านำแหล่งข้อมูลมาได้ 3 รูปแบบ โดย MCP Server จะให้ AI
                  เข้าถึงแต่ละแบบผ่านเครื่องมือเฉพาะ
                  และลูกค้าสามารถเลือกเผยแพร่เฉพาะ Database, Table หรือ Column
                  ที่ต้องการพร้อมใส่คำอธิบายเชิงธุรกิจ
                </p>
              </div>

              {/* Server Ingress IP Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs shrink-0 sm:max-w-xs">
                <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-600" />
                  <span>IP ของ MCP Server (สำหรับ Whitelist / VPN)</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
                  <span>203.150.24.88</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('203.150.24.88', 'ip')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                    title="คัดลอก IP"
                  >
                    {copiedKey === 'ip' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-Tabs: DB, Files, Websites */}
            <div className="flex border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setP1Tab('db')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  p1Tab === 'db'
                    ? 'border-[#0055fa] text-[#0055fa]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>1. ฐานข้อมูลลูกค้า</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
                  tools: database_query, database_catalog
                </span>
              </button>

              <button
                type="button"
                onClick={() => setP1Tab('files')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  p1Tab === 'files'
                    ? 'border-[#0055fa] text-[#0055fa]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>2. ไฟล์ความรู้ (Vector DB)</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
                  tool: rag_query
                </span>
              </button>

              <button
                type="button"
                onClick={() => setP1Tab('web')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  p1Tab === 'web'
                    ? 'border-[#0055fa] text-[#0055fa]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>3. รายชื่อเว็บไซต์</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
                  tool: web_search
                </span>
              </button>
            </div>

            {/* TAB CONTENT: 1.1 ฐานข้อมูล (Enterprise Multi-DB & Schema Governance Explorer) */}
            {p1Tab === 'db' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* 1. Quick Stats & Governance Summary Bar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      ฐานข้อมูลที่เชื่อมต่อ
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900">
                        {totalDbsCount}
                      </span>
                      <span className="text-xs text-slate-500">ระบบ</span>
                    </div>
                    <div className="text-[11px] text-blue-600 font-mono truncate">
                      {distinctEngines.join(', ')}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      ความปลอดภัยการเชื่อมต่อ
                    </span>
                    <div className="flex items-center gap-1.5 text-xl font-bold text-emerald-600">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>100% Read-Only</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      SSL Mode & AES-256 Vault
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      ตารางที่เผยแพร่ให้ AI
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900">
                        {totalPublishedTablesCount}
                      </span>
                      <span className="text-xs text-slate-500">
                        / {totalTablesCount} ตาราง
                      </span>
                      <span className="text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700">
                        {Math.round((totalPublishedTablesCount / (totalTablesCount || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ซ่อนตาราง Audit & Log
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      การกำกับระดับคอลัมน์
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900">
                        {totalPublishedColumnsCount}
                      </span>
                      <span className="text-xs text-slate-500">
                        / {totalColumnsCount} คอลัมน์
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-700 font-medium">
                      ปกปิด PII & รหัสลับแล้ว
                    </div>
                  </div>
                </div>

                {/* 2. Database Toolbar (Search, Engine Filters, View Switcher, Add New) */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Search & Engine Quick Filter */}
                    <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={dbSearchQuery}
                          onChange={(e) => setDbSearchQuery(e.target.value)}
                          placeholder="ค้นหาฐานข้อมูล (ชื่อ, host, database หรือชื่อตาราง)..."
                          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055fa] focus:bg-white transition"
                        />
                        {dbSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setDbSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Engine Filter Dropdown */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={dbEngineFilter}
                          onChange={(e) => setDbEngineFilter(e.target.value)}
                          className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-[#0055fa]"
                        >
                          <option value="all">ทุก Engine</option>
                          <option value="PostgreSQL">PostgreSQL</option>
                          <option value="MySQL">MySQL</option>
                          <option value="SQL Server">SQL Server</option>
                          <option value="Oracle">Oracle</option>
                          <option value="MariaDB">MariaDB</option>
                          <option value="Snowflake">Snowflake</option>
                        </select>

                        <select
                          value={dbPublishFilter}
                          onChange={(e) =>
                            setDbPublishFilter(
                              e.target.value as 'all' | 'published' | 'unpublished'
                            )
                          }
                          className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-[#0055fa]"
                        >
                          <option value="all">ทุกสถานะเผยแพร่</option>
                          <option value="published">เฉพาะที่เผยแพร่ให้ AI</option>
                          <option value="unpublished">เฉพาะที่ไม่เผยแพร่</option>
                        </select>
                      </div>
                    </div>

                    {/* View Switcher & Action Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setDbViewMode('split')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            dbViewMode === 'split'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Master-Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDbViewMode('cards')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            dbViewMode === 'cards'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>การ์ดย่อ-ขยาย</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenNewDbModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>เพิ่มการเชื่อมต่อใหม่</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter tags when active */}
                  {(dbSearchQuery || dbEngineFilter !== 'all' || dbPublishFilter !== 'all') && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">
                        ผลการกรอง: {filteredDbList.length} จาก {dbList.length} ฐานข้อมูล
                      </span>
                      {dbSearchQuery && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          คำค้น: &quot;{dbSearchQuery}&quot;
                          <button
                            type="button"
                            onClick={() => setDbSearchQuery('')}
                            className="cursor-pointer hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {dbEngineFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          Engine: {dbEngineFilter}
                          <button
                            type="button"
                            onClick={() => setDbEngineFilter('all')}
                            className="cursor-pointer hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {dbPublishFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          สถานะ:{' '}
                          {dbPublishFilter === 'published' ? 'เผยแพร่' : 'ไม่เผยแพร่'}
                          <button
                            type="button"
                            onClick={() => setDbPublishFilter('all')}
                            className="cursor-pointer hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setDbSearchQuery('');
                          setDbEngineFilter('all');
                          setDbPublishFilter('all');
                        }}
                        className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer ml-1"
                      >
                        ล้างตัวกรองทั้งหมด
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Empty State if no DBs matched */}
                {filteredDbList.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Database className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">
                      ไม่พบฐานข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูรายการฐานข้อมูลที่มีทั้งหมด
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDbSearchQuery('');
                        setDbEngineFilter('all');
                        setDbPublishFilter('all');
                      }}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      ล้างตัวกรอง
                    </button>
                  </div>
                ) : dbViewMode === 'split' ? (
                  /* ================= MASTER-DETAIL SPLIT VIEW (Clean & Scalable) ================= */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* LEFT PANEL: Database Connection Directory (col-span-4) */}
                    <div
                      className={`lg:col-span-4 space-y-2.5 ${
                        mobileDbView === 'detail' ? 'hidden lg:block' : 'block'
                      }`}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          เลือกฐานข้อมูล ({filteredDbList.length})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          คลิกเพื่อดูโครงสร้าง
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[720px] overflow-y-auto pr-0.5">
                        {filteredDbList.map((db) => {
                          const isSelected = currentSelectedDb?.id === db.id;
                          const publishedTablesCount = db.tables.filter(
                            (t) => t.published
                          ).length;

                          return (
                            <button
                              key={db.id}
                              type="button"
                              onClick={() => {
                                setSelectedDbId(db.id);
                                setMobileDbView('detail');
                              }}
                              className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative group ${
                                isSelected
                                  ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-150 shadow-2xs flex items-center justify-center shrink-0 p-1.5 group-hover:scale-105 transition-transform">
                                  <DbEngineLogo engine={db.type} className="w-7 h-7" size={28} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                      {db.name}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">
                                      {db.type}
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500 truncate mb-2">
                                    {db.host}:{db.port} / {db.database}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-semibold ${
                                        db.published
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                          : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      {db.published
                                        ? `✓ ${publishedTablesCount}/${db.tables.length} ตาราง`
                                        : '✗ ซ่อน'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                      Read-only
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <ChevronRight className="w-4 h-4 text-blue-600 shrink-0 self-center hidden lg:block" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT PANEL: Selected Database Detail & Schema Catalog (col-span-8) */}
                    {currentSelectedDb && (
                      <div
                        className={`lg:col-span-8 space-y-4 ${
                          mobileDbView === 'list' ? 'hidden lg:block' : 'block'
                        }`}
                      >
                        {/* Mobile Back Button */}
                        <div className="lg:hidden">
                          <button
                            type="button"
                            onClick={() => setMobileDbView('list')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 mb-2 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>กลับไปเลือกฐานข้อมูล</span>
                          </button>
                        </div>

                        {/* Database Profile Header Box */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 p-1.5">
                                <DbEngineLogo
                                  engine={currentSelectedDb.type}
                                  className="w-8 h-8"
                                  size={36}
                                />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-base font-bold text-slate-900">
                                    {currentSelectedDb.name}
                                  </h4>
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                                    {currentSelectedDb.type}
                                  </span>
                                  <span
                                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                      currentSelectedDb.published
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {currentSelectedDb.published
                                      ? '✓ เผยแพร่ให้ MCP'
                                      : '✗ ปิดกั้นการเข้าถึง'}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                  {currentSelectedDb.host}:{currentSelectedDb.port} /{' '}
                                  {currentSelectedDb.database} (User:{' '}
                                  {currentSelectedDb.user})
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditDbModal(currentSelectedDb)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-xs font-semibold text-blue-700 transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>จัดการสิทธิ์ & คำอธิบาย</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTestDb(currentSelectedDb.id)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
                              >
                                {currentSelectedDb.status === 'testing'
                                  ? 'กำลังตรวจ...'
                                  : 'ทดสอบการเชื่อมต่อ'}
                              </button>
                            </div>
                          </div>

                          {/* Database Description */}
                          {currentSelectedDb.dbDescription ? (
                            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-slate-900 block mb-0.5">
                                  คำอธิบายฐานข้อมูล (สำหรับ AI เลือกใช้งาน):
                                </span>
                                <span>{currentSelectedDb.dbDescription}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              ยังไม่ได้ระบุคำอธิบายฐานข้อมูล (กดปุ่ม &quot;จัดการสิทธิ์ & คำอธิบาย&quot; เพื่อเพิ่ม)
                            </p>
                          )}
                        </div>

                        {/* Table Schema & Data Dictionary Explorer */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">
                                  Data Dictionary & Schema Catalog
                                </h4>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold font-mono">
                                  {currentSelectedDb.tables.length} ตาราง
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                AI จะเห็นและอ่านเฉพาะตารางและคอลัมน์ที่ติ๊กเผยแพร่เท่านั้น
                              </p>
                            </div>

                            {/* Table Filter Tabs */}
                            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 text-xs font-semibold">
                              <button
                                type="button"
                                onClick={() => setTableFilter('all')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                  tableFilter === 'all'
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                ทั้งหมด ({currentSelectedDb.tables.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setTableFilter('published')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                  tableFilter === 'published'
                                    ? 'bg-white text-emerald-700 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                เผยแพร่ ({currentSelectedDb.tables.filter((t) => t.published).length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setTableFilter('hidden')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                  tableFilter === 'hidden'
                                    ? 'bg-white text-slate-700 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                ซ่อน ({currentSelectedDb.tables.filter((t) => !t.published).length})
                              </button>
                            </div>
                          </div>

                          {/* Table Search Input */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={tableSearchQuery}
                              onChange={(e) => setTableSearchQuery(e.target.value)}
                              placeholder="ค้นหาชื่อตาราง หรือคอลัมน์ในฐานข้อมูลนี้..."
                              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055fa] focus:bg-white transition"
                            />
                            {tableSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setTableSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Table Items */}
                          {filteredTablesInDetail.length === 0 ? (
                            <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                              ไม่พบตารางที่ตรงกับคำค้นหา &quot;{tableSearchQuery}&quot;
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {filteredTablesInDetail.map((tbl) => {
                                const isColumnsExpanded =
                                  !!expandedTableNamesInDetail[tbl.name];
                                const publishedCols = tbl.columns.filter(
                                  (c) => c.published
                                );

                                return (
                                  <div
                                    key={tbl.name}
                                    className={`rounded-xl border transition-all ${
                                      tbl.published
                                        ? 'bg-white border-slate-200 shadow-2xs'
                                        : 'bg-slate-50/60 border-slate-200/60 opacity-70'
                                    }`}
                                  >
                                    <div className="p-3.5 space-y-2">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Table2 className="w-4 h-4 text-blue-600 shrink-0" />
                                          <span
                                            className={`font-mono font-bold text-sm ${
                                              tbl.published
                                                ? 'text-slate-900'
                                                : 'text-slate-500 line-through'
                                            }`}
                                          >
                                            {tbl.name}
                                          </span>
                                          <span
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                              tbl.published
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-slate-200 text-slate-600'
                                            }`}
                                          >
                                            {tbl.published
                                              ? '✓ เผยแพร่ให้ AI'
                                              : '✗ ซ่อนจาก AI'}
                                          </span>
                                          <span className="text-[10.5px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                            {publishedCols.length}/
                                            {tbl.columns.length} columns
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedTableNamesInDetail((prev) => ({
                                              ...prev,
                                              [tbl.name]: !prev[tbl.name],
                                            }))
                                          }
                                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer self-start sm:self-auto"
                                        >
                                          <Columns className="w-3.5 h-3.5" />
                                          <span>
                                            {isColumnsExpanded
                                              ? 'ซ่อนโครงสร้างคอลัมน์'
                                              : `ดูโครงสร้าง (${tbl.columns.length} คอลัมน์)`}
                                          </span>
                                          {isColumnsExpanded ? (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>

                                      <p className="text-xs text-slate-600 leading-relaxed">
                                        {tbl.description}
                                      </p>

                                      {/* Published Column Tags Preview */}
                                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <span className="text-[11px] font-semibold text-slate-500">
                                          คอลัมน์ที่เปิดให้ AI:
                                        </span>
                                        {publishedCols.length > 0 ? (
                                          publishedCols.map((c) => (
                                            <span
                                              key={c.name}
                                              className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                            >
                                              {c.name}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[11px] text-slate-400 italic">
                                            ไม่มีคอลัมน์ที่เผยแพร่
                                          </span>
                                        )}
                                      </div>

                                      {tbl.joinTip && tbl.published && (
                                        <div className="text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/70 font-medium flex items-center gap-1.5">
                                          <span>💡</span>
                                          <span>
                                            <strong>คำแนะนำ Join:</strong> {tbl.joinTip}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Expandable Column Schema Matrix */}
                                    {isColumnsExpanded && (
                                      <div className="border-t border-slate-100 p-3.5 bg-slate-50/50 rounded-b-xl space-y-2 animate-in fade-in duration-150">
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                          โครงสร้างคอลัมน์ทั้งหมดของตาราง `{tbl.name}`
                                        </span>
                                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                          <table className="w-full text-left text-xs">
                                            <thead>
                                              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600">
                                                <th className="p-2.5">ชื่อคอลัมน์</th>
                                                <th className="p-2.5">ชนิดข้อมูล (Type)</th>
                                                <th className="p-2.5">สถานะ</th>
                                                <th className="p-2.5">คำอธิบายสำหรับ AI</th>
                                                <th className="p-2.5">หมายเหตุ</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {tbl.columns.map((c) => (
                                                <tr
                                                  key={c.name}
                                                  className={
                                                    c.published
                                                      ? 'hover:bg-slate-50/50'
                                                      : 'bg-slate-50/30 opacity-60'
                                                  }
                                                >
                                                  <td className="p-2.5 font-mono font-bold text-slate-800">
                                                    {c.name}
                                                  </td>
                                                  <td className="p-2.5 font-mono text-[11px] text-slate-500">
                                                    {c.type}
                                                  </td>
                                                  <td className="p-2.5">
                                                    {c.published ? (
                                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        ✓ เผยแพร่
                                                      </span>
                                                    ) : (
                                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                        ✗ ซ่อน
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="p-2.5 text-slate-600 text-xs">
                                                    {c.description || '-'}
                                                  </td>
                                                  <td className="p-2.5">
                                                    {c.isPii ? (
                                                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                                        🔒 PII / ลับ
                                                      </span>
                                                    ) : (
                                                      <span className="text-[10px] text-slate-400">
                                                        ปกติ
                                                      </span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ================= COLLAPSIBLE CARDS VIEW (Accordion Mode) ================= */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-slate-500 font-medium">
                        แสดงการเชื่อมต่อทั้งหมด {filteredDbList.length} ฐานข้อมูล
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const allCollapsed = filteredDbList.every(
                            (db) => collapsedDbIds[db.id]
                          );
                          const nextState: Record<string, boolean> = {};
                          filteredDbList.forEach((db) => {
                            nextState[db.id] = !allCollapsed;
                          });
                          setCollapsedDbIds(nextState);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        {filteredDbList.every((db) => collapsedDbIds[db.id])
                          ? 'ขยายทั้งหมด'
                          : 'ยุบทั้งหมด'}
                      </button>
                    </div>

                    {filteredDbList.map((db) => {
                      const isCollapsed = !!collapsedDbIds[db.id];
                      const publishedTablesCount = db.tables.filter(
                        (t) => t.published
                      ).length;
                      const totalCols = db.tables.reduce(
                        (acc, t) => acc + t.columns.length,
                        0
                      );
                      const pubCols = db.tables.reduce(
                        (acc, t) =>
                          acc + t.columns.filter((c) => c.published).length,
                        0
                      );

                      return (
                        <div
                          key={db.id}
                          className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden transition-all"
                        >
                          {/* Card Header (Clickable to collapse/expand) */}
                          <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 bg-white hover:bg-slate-50/40 transition">
                            <div
                              className="flex items-start gap-3 cursor-pointer flex-1"
                              onClick={() =>
                                setCollapsedDbIds((prev) => ({
                                  ...prev,
                                  [db.id]: !prev[db.id],
                                }))
                              }
                            >
                              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 p-1.5">
                                <DbEngineLogo engine={db.type} className="w-8 h-8" size={32} />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-slate-900 text-base">
                                    {db.name}
                                  </span>
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                                    {db.type}
                                  </span>
                                  <span
                                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                      db.published
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {db.published
                                      ? '✓ เผยแพร่ให้ MCP'
                                      : '✗ ปิดกั้นการเข้าถึง'}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                  {db.host}:{db.port} / {db.database} (User:{' '}
                                  {db.user})
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-medium">
                                เผยแพร่ {publishedTablesCount}/{db.tables.length}{' '}
                                ตาราง ({pubCols}/{totalCols} คอลัมน์)
                              </span>

                              <button
                                type="button"
                                onClick={() => handleOpenEditDbModal(db)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-xs font-semibold text-blue-700 transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>จัดการการเผยแพร่ & คำอธิบาย</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTestDb(db.id)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
                              >
                                {db.status === 'testing'
                                  ? 'กำลังตรวจ...'
                                  : 'ทดสอบการเชื่อมต่อ'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsedDbIds((prev) => ({
                                    ...prev,
                                    [db.id]: !prev[db.id],
                                  }))
                                }
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
                              >
                                {isCollapsed ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronUp className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Card Content (When expanded) */}
                          {!isCollapsed && (
                            <div className="p-5 space-y-4 bg-slate-50/30 animate-in fade-in duration-150">
                              {db.dbDescription && (
                                <p className="text-xs text-slate-600 leading-relaxed p-3 rounded-xl bg-white border border-slate-200">
                                  <strong>คำอธิบายฐานข้อมูล:</strong>{' '}
                                  {db.dbDescription}
                                </p>
                              )}

                              <div>
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                                  <span>
                                    ตารางในฐานข้อมูลนี้ ({db.tables.length} ตาราง)
                                  </span>
                                  <span className="text-blue-600 text-[11px] font-normal">
                                    AI จะอ่านเฉพาะตารางและคอลัมน์ที่ตั้งสถานะเผยแพร่
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {db.tables.map((tbl) => {
                                    const pubTableCols = tbl.columns.filter(
                                      (c) => c.published
                                    );
                                    return (
                                      <div
                                        key={tbl.name}
                                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 bg-white transition-all ${
                                          tbl.published
                                            ? 'border-slate-200'
                                            : 'border-slate-200/60 opacity-60'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className={`font-mono font-bold text-xs ${
                                                tbl.published
                                                  ? 'text-blue-700'
                                                  : 'text-slate-500 line-through'
                                              }`}
                                            >
                                              {tbl.name}
                                            </span>
                                            {!tbl.published && (
                                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-medium">
                                                ซ่อนจาก AI
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10.5px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                            {pubTableCols.length}/
                                            {tbl.columns.length} columns
                                          </span>
                                        </div>

                                        <p className="text-slate-600 leading-relaxed text-[11.5px]">
                                          {tbl.description}
                                        </p>

                                        <div className="text-slate-500 font-mono text-[11px] truncate">
                                          เผยแพร่:{' '}
                                          {pubTableCols.length > 0
                                            ? pubTableCols
                                                .map((c) => c.name)
                                                .join(', ')
                                            : 'ไม่มีคอลัมน์ที่เผยแพร่'}
                                        </div>

                                        {tbl.joinTip && tbl.published && (
                                          <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200/60 font-medium">
                                            💡 คำแนะนำ Join: {tbl.joinTip}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 1.2 ไฟล์ความรู้ (Vector DB) 2-Column Knowledge Explorer + Compact Table */}
            {p1Tab === 'files' && (
              <div className="space-y-4">
                {/* Header & Quick Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">
                        เอกสารใน Vector Database ({filesList.length} ไฟล์)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                        {knowledgeFolders.length} ชุดความรู้ (Knowledge Sets)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      จัดกลุ่มเอกสารเป็น Knowledge Set เพื่อระบุบริบทที่เกี่ยวข้องกัน และตัด Chunk ทำ Embedding สำหรับ Vector RAG
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsNewFolderModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                      <span>สร้าง Knowledge Set ใหม่</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadTargetFolderId(
                          selectedFolderFilter !== 'all' ? selectedFolderFilter : knowledgeFolders[0]?.id || 'ks-export'
                        );
                        setIsUploadModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>อัปโหลดเอกสารเข้าชุด</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddDummyFile()}
                      title="สุ่มจำลองไฟล์ใหม่เข้าชุดความรู้ปัจจุบัน"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>จำลองด่วน</span>
                    </button>
                  </div>
                </div>

                {/* 2-COLUMN KNOWLEDGE EXPLORER (SIDEBAR + COMPACT DATA TABLE) */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs flex flex-col lg:flex-row min-h-[460px]">
                  {/* LEFT SIDEBAR: KNOWLEDGE SETS LIST */}
                  <div className="w-full lg:w-72 lg:shrink-0 bg-slate-50/60 border-b lg:border-b-0 lg:border-r border-slate-200 p-3 flex flex-col justify-between gap-3">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-blue-600" />
                          <span>ชุดความรู้ ({knowledgeFolders.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsNewFolderModalOpen(true)}
                          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>สร้างชุดใหม่</span>
                        </button>
                      </div>

                      {/* Folder Items */}
                      <div className="space-y-1">
                        {/* All Documents */}
                        <button
                          type="button"
                          onClick={() => setSelectedFolderFilter('all')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                            selectedFolderFilter === 'all'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-200/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">เอกสารทั้งหมด (All)</span>
                          </div>
                          <span
                            className={`text-[10.5px] px-2 py-0.2 rounded-full font-mono ${
                              selectedFolderFilter === 'all'
                                ? 'bg-blue-800 text-white'
                                : 'bg-slate-200/90 text-slate-700'
                            }`}
                          >
                            {filesList.length}
                          </span>
                        </button>

                        {/* Each Knowledge Set Item */}
                        {knowledgeFolders.map((folder) => {
                          const count = filesList.filter((f) => f.folderId === folder.id).length;
                          const isSelected = selectedFolderFilter === folder.id;
                          return (
                            <div
                              key={folder.id}
                              onClick={() => setSelectedFolderFilter(folder.id)}
                              className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                                  : 'text-slate-700 hover:bg-slate-200/60'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0 pr-1">
                                <Folder
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSelected ? 'text-white' : 'text-blue-600'
                                  }`}
                                />
                                <span className="truncate" title={folder.name}>
                                  {folder.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[10.5px] px-2 py-0.2 rounded-full font-mono ${
                                    isSelected
                                      ? 'bg-blue-800 text-white'
                                      : 'bg-slate-200/90 text-slate-700'
                                  }`}
                                >
                                  {count}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(folder.id);
                                  }}
                                  title="ลบชุดความรู้นี้"
                                  className={`p-1 rounded-md transition ${
                                    isSelected
                                      ? 'text-blue-200 hover:text-white hover:bg-blue-700'
                                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sidebar Footer Hint */}
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-[11px] text-blue-800 leading-relaxed">
                      💡 <strong>ชุดความรู้ (Knowledge Set):</strong> รวมเอกสารที่เกี่ยวข้องกันเพื่อใช้ทำ RAG ตอบคำถามเฉพาะทาง
                    </div>
                  </div>

                  {/* RIGHT PANEL: COMPACT DATA TABLE & FILE EXPLORER */}
                  <div className="flex-1 flex flex-col min-w-0 p-4 space-y-3.5 bg-white">
                    {/* Active Set Header & Description */}
                    {(() => {
                      const activeFolder = knowledgeFolders.find((f) => f.id === selectedFolderFilter);
                      const displayFiles = filesList.filter((f) => {
                        const matchesFolder =
                          selectedFolderFilter === 'all' || f.folderId === selectedFolderFilter;
                        const matchesSearch = fileSearchQuery.trim()
                          ? f.name.toLowerCase().includes(fileSearchQuery.toLowerCase().trim())
                          : true;
                        return matchesFolder && matchesSearch;
                      });
                      const totalChunks = displayFiles.reduce((acc, f) => acc + (f.chunks || 0), 0);

                      return (
                        <>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                  {selectedFolderFilter === 'all'
                                    ? 'เอกสารทั้งหมดในระบบ'
                                    : activeFolder?.name || 'ชุดความรู้'}
                                </h4>
                                {selectedFolderFilter !== 'all' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium">
                                    collection: customer-{selectedFolderFilter}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {selectedFolderFilter === 'all'
                                  ? 'แสดงเอกสารทั้งหมดที่ถูกตัด Chunk และทำ Vector Indexing พร้อมใช้งาน'
                                  : activeFolder?.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                                {displayFiles.length} ไฟล์ • {totalChunks} Chunks รวม
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadTargetFolderId(
                                    selectedFolderFilter !== 'all' ? selectedFolderFilter : knowledgeFolders[0]?.id || 'ks-export'
                                  );
                                  setIsUploadModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>เพิ่มเอกสาร</span>
                              </button>
                            </div>
                          </div>

                          {/* Toolbar: Live Search & View Switcher */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-sm">
                              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={fileSearchQuery}
                                onChange={(e) => setFileSearchQuery(e.target.value)}
                                placeholder="ค้นหาชื่อเอกสารในชุดนี้..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                              {fileSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setFileSearchQuery('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setFolderViewMode('table')}
                                title="มุมมองตารางกะทัดรัด (Compact Table View)"
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                                  folderViewMode === 'table'
                                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <List className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">ตารางกะทัดรัด</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setFolderViewMode('grid')}
                                title="มุมมองการ์ด (Grid Cards View)"
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                                  folderViewMode === 'grid'
                                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">การ์ด</span>
                              </button>
                            </div>
                          </div>

                          {/* CONTENT: COMPACT TABLE OR CARDS */}
                          {displayFiles.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/40 my-auto">
                              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-xs font-semibold text-slate-600">
                                {fileSearchQuery ? 'ไม่พบเอกสารที่ตรงกับคำค้นหา' : 'ยังไม่มีเอกสารในชุดความรู้นี้'}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                                {fileSearchQuery
                                  ? 'ลองตรวจสอบคำสะกด หรือล้างคำค้นหา'
                                  : 'อัปโหลดคู่มือ สัญญา หรือเอกสารข้อมูลเพื่อทำ Vector Indexing'}
                              </p>
                              {!fileSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUploadTargetFolderId(
                                      selectedFolderFilter !== 'all' ? selectedFolderFilter : knowledgeFolders[0]?.id || 'ks-export'
                                    );
                                    setIsUploadModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                                >
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>อัปโหลดเอกสารเข้าชุดนี้</span>
                                </button>
                              )}
                            </div>
                          ) : folderViewMode === 'table' ? (
                            /* COMPACT ENTERPRISE DATA TABLE */
                            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                                  <tr>
                                    <th className="py-2.5 px-3.5 min-w-[220px]">ชื่อเอกสาร</th>
                                    {selectedFolderFilter === 'all' && (
                                      <th className="py-2.5 px-3 min-w-[140px]">ชุดความรู้</th>
                                    )}
                                    <th className="py-2.5 px-3 w-20">ขนาด</th>
                                    <th className="py-2.5 px-3 min-w-[190px]">สถานะ Vector DB</th>
                                    <th className="py-2.5 px-3 w-24">วันที่</th>
                                    <th className="py-2.5 px-3 text-right w-24">จัดการ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                  {displayFiles.map((file) => {
                                    const parentFolder = knowledgeFolders.find((k) => k.id === file.folderId);
                                    return (
                                      <tr
                                        key={file.id}
                                        className="hover:bg-slate-50/70 transition-colors"
                                      >
                                        {/* File Name & Icon */}
                                        <td className="py-2 px-3.5">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                              <FileText className="w-3.5 h-3.5" />
                                            </div>
                                            <span
                                              className="font-semibold text-slate-900 truncate max-w-[260px] sm:max-w-xs block"
                                              title={file.name}
                                            >
                                              {file.name}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Knowledge Set (All View) */}
                                        {selectedFolderFilter === 'all' && (
                                          <td className="py-2 px-3">
                                            {parentFolder ? (
                                              <button
                                                type="button"
                                                onClick={() => setSelectedFolderFilter(parentFolder.id)}
                                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition cursor-pointer max-w-[160px] truncate"
                                                title={`กรองดูชุด: ${parentFolder.name}`}
                                              >
                                                <Folder className="w-2.5 h-2.5 shrink-0" />
                                                <span className="truncate">{parentFolder.name}</span>
                                              </button>
                                            ) : (
                                              <span className="text-slate-400 text-[11px]">-</span>
                                            )}
                                          </td>
                                        )}

                                        {/* Size */}
                                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                                          {file.size}
                                        </td>

                                        {/* Vector DB Status & Chunks */}
                                        <td className="py-2 px-3">
                                          {file.status === 'processing' ? (
                                            <div className="space-y-1 max-w-[160px]">
                                              <div className="flex justify-between text-[10px] text-blue-600 font-medium">
                                                <span>กำลังตัด Chunk...</span>
                                                <span>{file.progress}%</span>
                                              </div>
                                              <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                  className="h-full bg-blue-600 transition-all duration-300"
                                                  style={{ width: `${file.progress}%` }}
                                                />
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                                                <Check className="w-3 h-3 stroke-[2.5]" />
                                                <span>พร้อมใช้ ({file.chunks} Chunks)</span>
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                                                rag_query
                                              </span>
                                            </div>
                                          )}
                                        </td>

                                        {/* Uploaded Date */}
                                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                                          {file.uploadedAt || '28 ต.ค. 2569'}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-2 px-3 text-right">
                                          <div className="inline-flex items-center gap-1 justify-end">
                                            <button
                                              type="button"
                                              onClick={() => setMovingFile(file)}
                                              title="ย้ายไปยัง Knowledge Set อื่น"
                                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                            >
                                              <ArrowRightLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteFile(file.id)}
                                              title="ลบเอกสารนี้"
                                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            /* OPTIONAL COMPACT GRID VIEW */
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {displayFiles.map((file) => {
                                const parentFolder = knowledgeFolders.find((k) => k.id === file.folderId);
                                return (
                                  <div
                                    key={file.id}
                                    className="p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2 transition"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                                          <FileText className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <div
                                            className="font-semibold text-slate-900 text-xs truncate"
                                            title={file.name}
                                          >
                                            {file.name}
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                                            {parentFolder && (
                                              <span className="text-blue-600 font-medium">
                                                {parentFolder.name} •
                                              </span>
                                            )}
                                            <span>{file.size}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setMovingFile(file)}
                                          title="ย้ายไปยัง Knowledge Set อื่น"
                                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                        >
                                          <ArrowRightLeft className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteFile(file.id)}
                                          title="ลบไฟล์นี้"
                                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {file.status === 'processing' ? (
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-blue-600">
                                          <span>กำลังตัด Chunk...</span>
                                          <span>{file.progress}%</span>
                                        </div>
                                        <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                                          <div
                                            className="h-full bg-blue-600 transition-all duration-300"
                                            style={{ width: `${file.progress}%` }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                          <Check className="w-3 h-3" />
                                          <span>พร้อมใช้งาน ({file.chunks} Chunks)</span>
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                                          rag_query
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 1.3 รายชื่อเว็บไซต์ (จัดกลุ่มตาม Category + ตารางกะทัดรัด) */}
            {p1Tab === 'web' && (
              <div className="space-y-4">
                {/* Header & Main Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">
                        รายชื่อเว็บไซต์ที่กำหนด ({webList.length} เว็บไซต์)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-200">
                        Whitelist Domain Search
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      จัดกลุ่มเว็บไซต์ตามหมวดหมู่ เพื่อให้ AI ค้นหาผ่าน tool <code className="font-mono text-blue-600">web_search</code> เฉพาะแหล่งข้อมูลที่เกี่ยวข้อง
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsAddWebModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มเว็บไซต์</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const samples: CustomerWebsite[] = [
                          {
                            id: `web-${Date.now()}-1`,
                            url: 'https://bot.or.th',
                            title: 'ธนาคารแห่งประเทศไทย (BOT)',
                            purpose: 'อ้างอิงอัตราแลกเปลี่ยนเงินตราต่างประเทศและรายงานเศรษฐกิจมหภาค',
                            category: 'market',
                            status: 'verified',
                            lastChecked: 'เพิ่งเพิ่ม',
                          },
                          {
                            id: `web-${Date.now()}-2`,
                            url: 'https://rd.go.th',
                            title: 'กรมสรรพากร (Revenue Department)',
                            purpose: 'ตรวจสอบอัตราภาษีมูลค่าเพิ่ม (VAT 0% ส่งออก) และอนุสัญญาภาษีซ้อน',
                            category: 'gov',
                            status: 'verified',
                            lastChecked: 'เพิ่งเพิ่ม',
                          },
                          {
                            id: `web-${Date.now()}-3`,
                            url: 'https://tisi.go.th',
                            title: 'สำนักงานมาตรฐานผลิตภัณฑ์อุตสาหกรรม (สมอ.)',
                            purpose: 'ตรวจสอบมาตรฐาน มอก. บังคับและข้อกำหนดสินค้าอุตสาหกรรมนำเข้าส่งออก',
                            category: 'standard',
                            status: 'verified',
                            lastChecked: 'เพิ่งเพิ่ม',
                          },
                        ];
                        const randomSample = samples[Math.floor(Math.random() * samples.length)];
                        setWebList((prev) => [randomSample, ...prev]);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs transition cursor-pointer"
                      title="สุ่มเพิ่มเว็บไซต์ตัวอย่างที่มีประโยชน์สำหรับธุรกิจ"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                      <span>จำลองเพิ่มเว็บ</span>
                    </button>
                  </div>
                </div>

                {/* Toolbar: Category Filter Pills & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedWebCategory('all')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                        selectedWebCategory === 'all'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      <span>ทั้งหมด</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          selectedWebCategory === 'all'
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {webList.length}
                      </span>
                    </button>

                    {[
                      { id: 'gov', label: '🏛️ ภาครัฐและศุลกากร' },
                      { id: 'market', label: '📈 สถิติการค้าและตลาด' },
                      { id: 'standard', label: '🛡️ มาตรฐานและการรับรอง' },
                      { id: 'partner', label: '🤝 พอร์ทัลคู่ค้า' },
                    ].map((cat) => {
                      const count = webList.filter((w) => w.category === cat.id).length;
                      const isSelected = selectedWebCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedWebCategory(cat.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={webSearchQuery}
                      onChange={(e) => setWebSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อเว็บ, URL หรือวัตถุประสงค์..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    {webSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setWebSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* COMPACT DATA TABLE (ประหยัดพื้นที่ แถวละ ~40px) */}
                {(() => {
                  const filteredWebs = webList.filter((w) => {
                    const matchesCategory =
                      selectedWebCategory === 'all' || w.category === selectedWebCategory;
                    const matchesQuery = webSearchQuery.trim()
                      ? w.url.toLowerCase().includes(webSearchQuery.toLowerCase().trim()) ||
                        (w.title && w.title.toLowerCase().includes(webSearchQuery.toLowerCase().trim())) ||
                        w.purpose.toLowerCase().includes(webSearchQuery.toLowerCase().trim())
                      : true;
                    return matchesCategory && matchesQuery;
                  });

                  if (filteredWebs.length === 0) {
                    return (
                      <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-2xs">
                        <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">
                          {webSearchQuery ? 'ไม่พบเว็บไซต์ที่ตรงกับคำค้นหา' : 'ยังไม่มีเว็บไซต์ในหมวดหมู่นี้'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                          {webSearchQuery
                            ? 'ลองตรวจคำสะกดหรือล้างคำค้นหา'
                            : 'เพิ่ม URL เว็บไซต์ที่ต้องการให้ AI ใช้ค้นหาข้อมูลภายนอก'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddWebModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>เพิ่มเว็บไซต์แรก</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden overflow-x-auto shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3.5 min-w-[220px]">เว็บไซต์ & แหล่งข้อมูล</th>
                            <th className="py-2.5 px-3 w-44">หมวดหมู่ (Category)</th>
                            <th className="py-2.5 px-3 min-w-[240px]">วัตถุประสงค์สำหรับ AI (`web_search`)</th>
                            <th className="py-2.5 px-3 w-36">สถานะ</th>
                            <th className="py-2.5 px-3 text-right w-16">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredWebs.map((web) => {
                            const categoryBadge = (() => {
                              switch (web.category) {
                                case 'gov':
                                  return { label: '🏛️ ภาครัฐและศุลกากร', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
                                case 'market':
                                  return { label: '📈 สถิติการค้าและตลาด', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                                case 'standard':
                                  return { label: '🛡️ มาตรฐานและการรับรอง', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
                                case 'partner':
                                  return { label: '🤝 พอร์ทัลคู่ค้า', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
                                default:
                                  return { label: '🌐 ทั่วไป', cls: 'bg-slate-50 text-slate-700 border-slate-200' };
                              }
                            })();

                            return (
                              <tr key={web.id} className="hover:bg-slate-50/70 transition-colors">
                                {/* Website Title & URL */}
                                <td className="py-2.5 px-3.5">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                      <Globe className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      {web.title && (
                                        <div className="font-semibold text-slate-900 text-xs truncate max-w-[220px]">
                                          {web.title}
                                        </div>
                                      )}
                                      <a
                                        href={web.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-mono text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 truncate max-w-[220px]"
                                      >
                                        <span>{web.url}</span>
                                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                      </a>
                                    </div>
                                  </div>
                                </td>

                                {/* Category Badge */}
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${categoryBadge.cls}`}
                                  >
                                    {categoryBadge.label}
                                  </span>
                                </td>

                                {/* Purpose for AI */}
                                <td className="py-2.5 px-3 text-slate-600 text-[11.5px] leading-relaxed">
                                  {web.purpose}
                                </td>

                                {/* Status */}
                                <td className="py-2.5 px-3">
                                  {web.status === 'checking' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10.5px] font-medium border border-blue-200 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                      <span>กำลังตรวจสอบ...</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold border border-emerald-200">
                                      <Check className="w-3 h-3 stroke-[2.5]" />
                                      <span>200 OK (พร้อมใช้)</span>
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteWebsite(web.id)}
                                    title="ลบเว็บไซต์นี้"
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Bottom Stepper Action */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentPhase(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <span>ถัดไป: เลือกระยะที่ 2 (แคตตาล็อก IMC)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 2: ลูกค้าเลือกแหล่งข้อมูลของเรา */}
        {/* ========================================================================= */}
        {currentPhase === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                ระยะที่ 2 จาก 4
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                ลูกค้าเลือกแหล่งข้อมูลของ IMC (IMC Ready Knowledge & Database
                Catalog)
              </h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-3xl">
                เลือกผสมผสานแหล่งข้อมูลของ IMC ทั้งฐานข้อมูลสถิติ คลังความรู้
                RAG และเว็บไซต์ทางการ เพื่อนำมารวมกับข้อมูลของลูกค้าในระยะที่ 1
                กลายเป็นชุดข้อมูลที่ AI มีสิทธิ์เข้าถึง
              </p>
            </div>

            {/* Toolbar: Category Filter Pills & Selection Counter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'ทั้งหมด', count: catalogItems.length },
                  { id: 'db', label: '🗄️ ฐานข้อมูลสถิติ (SQL)', count: catalogItems.filter((c) => c.type === 'db').length },
                  { id: 'knowledge', label: '📚 คลังความรู้ (Vector RAG)', count: catalogItems.filter((c) => c.type === 'knowledge').length },
                  { id: 'web', label: '🌐 ข้อมูลสด (Web & APIs)', count: catalogItems.filter((c) => c.type === 'web').length },
                ].map((tab) => {
                  const isSelected = selectedCatalogCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedCatalogCategory(tab.id as 'all' | 'db' | 'knowledge' | 'web')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  เลือกแล้ว {catalogItems.filter((c) => c.selected).length} จาก {catalogItems.length} รายการ
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = catalogItems.every((c) => c.selected);
                    setCatalogItems((prev) => prev.map((c) => ({ ...c, selected: !allSelected })));
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline cursor-pointer px-1"
                >
                  {catalogItems.every((c) => c.selected) ? 'ล้างการเลือก' : 'เลือกทั้งหมด'}
                </button>
              </div>
            </div>

            {/* Grouped Row Sections (แสดงรายการข้อมูลแยกเป็น row ตามหมวดหมู่) */}
            <div className="space-y-4">
              {[
                {
                  id: 'db',
                  name: 'ฐานข้อมูลกลางเชิงปริมาณและสถิติ (SQL Databases)',
                  tool: 'database_query',
                  icon: Database,
                  iconColor: 'text-blue-600 bg-blue-100',
                  desc: 'ข้อมูลดุลการค้ารายเดือน สถิติย้อนหลัง 10 ปี จำแนกตาม HS Code และการไหลเวียนการค้าโลก',
                },
                {
                  id: 'knowledge',
                  name: 'คลังความรู้เอกสารและกฎระเบียบพร้อมใช้ (Vector RAG)',
                  tool: 'rag_query',
                  icon: BookOpen,
                  iconColor: 'text-amber-600 bg-amber-100',
                  desc: 'ระเบียบมาตรการทางการค้าที่ไม่ใช่ภาษี (NTBs) และสรุปเงื่อนไขสิทธิประโยชน์ความตกลง FTA',
                },
                {
                  id: 'web',
                  name: 'บริการข้อมูลข่าวสารและการสืบค้นสด (Live Web & API Feeds)',
                  tool: 'web_search',
                  icon: Globe,
                  iconColor: 'text-emerald-600 bg-emerald-100',
                  desc: 'ดึงหัวข้อข่าวแถลง ประกาศล่าสุด และอัตราแลกเปลี่ยนเงินตราต่างประเทศแบบเรียลไทม์',
                },
              ]
                .filter((sec) => selectedCatalogCategory === 'all' || selectedCatalogCategory === sec.id)
                .map((sec) => {
                  const sectionItems = catalogItems.filter((c) => c.type === sec.id);
                  const selectedInSec = sectionItems.filter((c) => c.selected).length;
                  const Icon = sec.icon;

                  return (
                    <div
                      key={sec.id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                    >
                      {/* Section Header */}
                      <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sec.iconColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-800">
                                {sec.name}
                              </h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-600">
                                tool: {sec.tool}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-500 mt-0.5 truncate">
                              {sec.desc}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className="text-[11px] font-medium text-slate-500">
                            เลือก {selectedInSec}/{sectionItems.length} รายการ
                          </span>
                        </div>
                      </div>

                      {/* Rows List (ตารางแยกแถว) */}
                      <div className="divide-y divide-slate-100">
                        {sectionItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() =>
                              setCatalogItems((prev) =>
                                prev.map((c) => (c.id === item.id ? { ...c, selected: !c.selected } : c))
                              )
                            }
                            className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors cursor-pointer ${
                              item.selected ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Left: Checkbox + Title + Description */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {/* Checkbox */}
                              <div className="pt-0.5 shrink-0">
                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                    item.selected
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {item.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>

                              {/* Details */}
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className={`text-sm font-bold ${item.selected ? 'text-blue-950' : 'text-slate-900'}`}>
                                    {item.title}
                                  </h4>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    {item.badge}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    ผู้จัดเตรียม: <strong>{item.provider}</strong>
                                  </span>
                                </div>

                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {item.description}
                                </p>

                                {item.details && (
                                  <div className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10.5px] font-mono text-slate-600 border border-slate-200">
                                    {item.details}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: Select Action Button */}
                            <div className="flex items-center gap-3 shrink-0 self-end md:self-center pl-8 md:pl-0">
                              <span className="text-[11px] text-emerald-600 font-semibold hidden lg:inline">
                                ✓ พร้อมใช้งานทันที
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCatalogItems((prev) =>
                                    prev.map((c) => (c.id === item.id ? { ...c, selected: !c.selected } : c))
                                  );
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-w-[90px] text-center ${
                                  item.selected
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                                    : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                {item.selected ? '✓ เลือกแล้ว' : '+ เลือกใช้'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Customer Mapping Summary Table */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ตารางสรุปความสัมพันธ์แหล่งข้อมูลที่ผูกกับลูกค้า (Customer
                    Mapping Matrix)
                  </h3>
                  <p className="text-xs text-slate-500">
                    MCP Server จะอนุญาตเฉพาะรายการที่ระบุในตารางนี้เท่านั้น
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                  รวม{' '}
                  {dbList.length +
                    filesList.length +
                    webList.length +
                    catalogItems.filter((c) => c.selected).length}{' '}
                  แหล่งข้อมูล
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="p-3">ชนิดแหล่งข้อมูล</th>
                      <th className="p-3">ชื่อรายการ</th>
                      <th className="p-3">เจ้าของแหล่งข้อมูล</th>
                      <th className="p-3">MCP Tool ที่ใช้เรียก</th>
                      <th className="p-3">สถานะสิทธิ์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dbList.map((db) => (
                      <tr key={db.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-blue-600 font-semibold">
                          ฐานข้อมูล (SQL)
                        </td>
                        <td className="p-3 font-semibold">
                          {db.name}{' '}
                          <span className="text-[11px] text-slate-400">
                            ({db.tables.filter((t) => t.published).length}{' '}
                            ตารางที่เผยแพร่)
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">
                          ลูกค้า (Customer)
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          database_query
                        </td>
                        <td className="p-3 text-emerald-600 font-semibold">
                          ✓ อนุญาต (Read-only)
                        </td>
                      </tr>
                    ))}
                    {filesList.map((file) => {
                      const folder = knowledgeFolders.find((f) => f.id === file.folderId);
                      return (
                        <tr key={file.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-purple-600 font-semibold">
                            เอกสาร (Vector RAG)
                          </td>
                          <td className="p-3 font-semibold">
                            {file.name}{' '}
                            <span className="text-[11px] text-slate-400">
                              (ชุด: {folder?.name || file.collection} • {file.chunks} Chunks)
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">
                            ลูกค้า (Customer)
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            rag_query
                          </td>
                          <td className="p-3 text-emerald-600 font-semibold">
                            {file.status === 'ready' ? '✓ อนุญาต (Indexed)' : '⏳ กำลังประมวลผล'}
                          </td>
                        </tr>
                      );
                    })}
                    {webList.map((web) => (
                      <tr key={web.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-sky-600 font-semibold">
                          เว็บไซต์ที่กำหนด
                        </td>
                        <td className="p-3 font-semibold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{web.title || web.url}</span>
                            <span className="font-mono text-[11px] text-slate-400">({web.url})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {web.purpose}
                          </div>
                        </td>
                        <td className="p-3 text-slate-500">
                          ลูกค้า (Customer)
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          web_search
                        </td>
                        <td className="p-3 text-emerald-600 font-semibold">
                          ✓ อนุญาต (Domain Whitelist)
                        </td>
                      </tr>
                    ))}
                    {catalogItems
                      .filter((c) => c.selected)
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-amber-600 font-semibold">
                            {c.type === 'db'
                              ? 'ฐานข้อมูลกลาง'
                              : c.type === 'knowledge'
                              ? 'Vector RAG'
                              : 'เว็บไซต์'}
                          </td>
                          <td className="p-3 font-semibold">{c.title}</td>
                          <td className="p-3 text-slate-500">{c.provider}</td>
                          <td className="p-3 font-mono text-slate-600">
                            {c.tool}
                          </td>
                          <td className="p-3 text-emerald-600 font-semibold">
                            ✓ อนุญาต
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentPhase(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ย้อนกลับ: ระยะที่ 1</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPhase(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <span>ถัดไป: ระยะที่ 3 (ออกแบบ Use Case)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 3: ออกแบบ Use Case */}
        {/* ========================================================================= */}
        {currentPhase === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                  ระยะที่ 3 จาก 4
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  ออกแบบและตรวจรับ Use Case (Use Case Design & Test Suite)
                </h2>
                <p className="mt-1 text-sm text-slate-600 max-w-3xl leading-relaxed">
                  กำหนด System Prompt, ขอบเขตตารางที่อนุญาต (Data Scope),
                  ข้อจำกัดความปลอดภัย
                  และรันชุดทดสอบความแม่นยำก่อนที่ลูกค้าจะยืนยันตรวจรับเป็นเวอร์ชันที่มีประวัติย้อนกลับได้
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-500">เวอร์ชันปัจจุบัน:</span>
                <span className="font-bold text-blue-700 font-mono text-sm">
                  v{useCaseVersion}.0.0
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10.5px]">
                  ผ่านการตรวจรับ
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: System Prompt & Guardrails (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* System Prompt Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-blue-600" />
                      <span>System Prompt & คำแนะนำการ Join ตาราง</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      แก้ไขและปรับแต่งได้
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm font-mono text-slate-700 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-400 leading-relaxed"
                  />
                </div>

                {/* Data Scope & Guardrails: Integrated Sources from Phase 1 & 2 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>
                          ขอบเขตข้อมูลที่อนุญาตสำหรับ Use Case นี้ (Data Scope & Whitelist)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        เลือกเปิด/ปิดแหล่งข้อมูลจากระยะที่ 1 และ 2 เพื่อจำกัดขอบเขตการเข้าถึงของ AI
                      </p>
                    </div>

                    {/* Source Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] self-start sm:self-center font-medium">
                      {[
                        { id: 'all', label: 'ทั้งหมด' },
                        { id: 'db', label: '🗄️ SQL' },
                        { id: 'knowledge', label: '📚 RAG' },
                        { id: 'web', label: '🌐 Web/Live' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setUseCaseScopeFilter(tab.id as 'all' | 'db' | 'knowledge' | 'web')}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            useCaseScopeFilter === tab.id
                              ? 'bg-white text-blue-700 font-bold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ALL SOURCES LIST (GROUPED BY TYPE) */}
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {/* SECTION 1: SQL TABLES */}
                    {(useCaseScopeFilter === 'all' || useCaseScopeFilter === 'db') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 text-blue-800">
                            <Database className="w-3.5 h-3.5 text-blue-600" />
                            <span>1. ตารางฐานข้อมูล SQL (tool: database_query)</span>
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {/* Phase 1 Customer Tables */}
                          {dbList.flatMap((db) =>
                            db.tables
                              .filter((t) => t.published)
                              .map((tbl) => {
                                const isAllowed = allowedTables.includes(tbl.name);
                                return (
                                  <div
                                    key={`cust-tbl-${tbl.name}`}
                                    onClick={() =>
                                      setAllowedTables((prev) =>
                                        isAllowed ? prev.filter((t) => t !== tbl.name) : [...prev, tbl.name]
                                      )
                                    }
                                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                                      isAllowed
                                        ? 'bg-blue-50/50 border-blue-200'
                                        : 'bg-slate-50/60 border-slate-200 opacity-60'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                                          isAllowed
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'border-slate-300 bg-white'
                                        }`}
                                      >
                                        {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                      <div className="truncate">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-mono font-bold text-slate-900">{tbl.name}</span>
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-semibold">
                                            👤 ลูกค้า (ระยะที่ 1)
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                          {tbl.description} • {db.name}
                                        </div>
                                      </div>
                                    </div>

                                    <span
                                      className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                        isAllowed
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {isAllowed ? '✓ อนุญาต' : '✗ ปิด'}
                                    </span>
                                  </div>
                                );
                              })
                          )}

                          {/* Phase 2 IMC Database Tables */}
                          {catalogItems
                            .filter((c) => c.type === 'db' && c.selected)
                            .map((c) => {
                              const tblName = c.id === 'imc-db-1' ? 'trade_statistics' : 'global_trade_flows';
                              const isAllowed = allowedTables.includes(tblName);
                              return (
                                <div
                                  key={`imc-tbl-${c.id}`}
                                  onClick={() =>
                                    setAllowedTables((prev) =>
                                      isAllowed ? prev.filter((t) => t !== tblName) : [...prev, tblName]
                                    )
                                  }
                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                                    isAllowed
                                      ? 'bg-blue-50/50 border-blue-200'
                                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                                        isAllowed
                                          ? 'bg-blue-600 border-blue-600 text-white'
                                          : 'border-slate-300 bg-white'
                                      }`}
                                    >
                                      {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono font-bold text-slate-900">{tblName}</span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold">
                                          🏢 IMC Catalog (ระยะที่ 2)
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                        {c.title} • {c.provider}
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                      isAllowed
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {isAllowed ? '✓ อนุญาต' : '✗ ปิด'}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: VECTOR RAG KNOWLEDGE SETS */}
                    {(useCaseScopeFilter === 'all' || useCaseScopeFilter === 'knowledge') && (
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 text-amber-800">
                            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                            <span>2. คลังความรู้และเอกสาร Vector RAG (tool: rag_query)</span>
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {/* Phase 1 Customer Knowledge Sets */}
                          {knowledgeFolders.map((folder) => {
                            const isAllowed = allowedKnowledgeSetIds.includes(folder.id);
                            const fileCount = filesList.filter((f) => f.folderId === folder.id).length;
                            return (
                              <div
                                key={`cust-ks-${folder.id}`}
                                onClick={() =>
                                  setAllowedKnowledgeSetIds((prev) =>
                                    isAllowed ? prev.filter((id) => id !== folder.id) : [...prev, folder.id]
                                  )
                                }
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                                  isAllowed
                                    ? 'bg-amber-50/50 border-amber-200'
                                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                                      isAllowed
                                        ? 'bg-amber-600 border-amber-600 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-slate-900">{folder.name}</span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-semibold">
                                        👤 ลูกค้า ({fileCount} ไฟล์)
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                      {folder.description}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                    isAllowed
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {isAllowed ? '✓ อนุญาต' : '✗ ปิด'}
                                </span>
                              </div>
                            );
                          })}

                          {/* Phase 2 IMC Knowledge Sets */}
                          {catalogItems
                            .filter((c) => c.type === 'knowledge' && c.selected)
                            .map((c) => {
                              const isAllowed = allowedKnowledgeSetIds.includes(c.id);
                              return (
                                <div
                                  key={`imc-ks-${c.id}`}
                                  onClick={() =>
                                    setAllowedKnowledgeSetIds((prev) =>
                                      isAllowed ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                    )
                                  }
                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                                    isAllowed
                                      ? 'bg-amber-50/50 border-amber-200'
                                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                                        isAllowed
                                          ? 'bg-amber-600 border-amber-600 text-white'
                                          : 'border-slate-300 bg-white'
                                      }`}
                                    >
                                      {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-900">{c.title}</span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold">
                                          🏢 IMC Catalog (ระยะที่ 2)
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                        {c.description}
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                      isAllowed
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {isAllowed ? '✓ อนุญาต' : '✗ ปิด'}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* SECTION 3: APPROVED WEBSITES & LIVE FEEDS */}
                    {(useCaseScopeFilter === 'all' || useCaseScopeFilter === 'web') && (
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 text-emerald-800">
                            <Globe className="w-3.5 h-3.5 text-emerald-600" />
                            <span>3. เว็บไซต์และบริการข้อมูลสด (tool: web_search)</span>
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {/* Phase 1 Customer Websites */}
                          {webList.map((web) => {
                            const isAllowed = allowedWebIds.includes(web.url);
                            return (
                              <div
                                key={`cust-web-${web.id}`}
                                onClick={() =>
                                  setAllowedWebIds((prev) =>
                                    isAllowed ? prev.filter((id) => id !== web.url) : [...prev, web.url]
                                  )
                                }
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                                  isAllowed
                                    ? 'bg-emerald-50/50 border-emerald-200'
                                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                                      isAllowed
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-slate-900">{web.title || web.url}</span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-semibold">
                                        👤 ลูกค้า ({web.url})
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                      {web.purpose}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                    isAllowed
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {isAllowed ? '✓ อนุญาต' : '✗ ปิด'}
                                </span>
                              </div>
                            );
                          })}

                          {/* Phase 2 IMC Live Web Services */}
                          {catalogItems
                            .filter((c) => c.type === 'web' && c.selected)
                            .map((c) => {
                              const isAllowed = allowedWebIds.includes(c.id);
                              return (
                                <div
                                  key={`imc-web-${c.id}`}
                                  onClick={() =>
                                    setAllowedWebIds((prev) =>
                                      isAllowed ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                    )
                                  }
                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                                    isAllowed
                                      ? 'bg-emerald-50/50 border-emerald-200'
                                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                                        isAllowed
                                          ? 'bg-emerald-600 border-emerald-600 text-white'
                                          : 'border-slate-300 bg-white'
                                      }`}
                                    >
                                      {isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-900">{c.title}</span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold">
                                          🏢 IMC Live Feed (ระยะที่ 2)
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                        {c.description}
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                      isAllowed
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {isAllowed ? '✓ อนุญาต' : '✗ ปิด'}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tool-specific Guardrails & Retrieval Settings */}
                  <div className="pt-3 border-t border-slate-200/90 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>ขีดจำกัดและการควบคุมเครื่องมือ (Tool Guardrails & Retrieval Settings)</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        จำกัดขอบเขตการทำงานของแต่ละ Tool เพื่อความปลอดภัยและประหยัด Token
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* SQL Database Guardrail */}
                      <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                          <Database className="w-3.5 h-3.5 text-blue-600" />
                          <span>1. ฐานข้อมูล SQL</span>
                          <span className="text-[10px] font-mono text-blue-600 font-normal">
                            (database_query)
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                              <span>แถวผลลัพธ์สูงสุด (Max Rows):</span>
                              <span className="font-mono font-bold text-blue-700">{maxRows} แถว</span>
                            </div>
                            <input
                              type="number"
                              min={10}
                              max={2000}
                              step={50}
                              value={maxRows}
                              onChange={(e) => setMaxRows(Number(e.target.value))}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                              <span>Query Timeout:</span>
                              <span className="font-mono font-bold text-blue-700">{queryTimeout} วินาที</span>
                            </div>
                            <input
                              type="number"
                              min={5}
                              max={60}
                              value={queryTimeout}
                              onChange={(e) => setQueryTimeout(Number(e.target.value))}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Vector RAG Guardrail */}
                      <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                          <span>2. คลังความรู้ Vector RAG</span>
                          <span className="text-[10px] font-mono text-amber-600 font-normal">
                            (rag_query)
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                              <span>ชิ้นข้อความสูงสุด (Top-K):</span>
                              <span className="font-mono font-bold text-amber-700">{topKChunks} Chunks</span>
                            </div>
                            <input
                              type="number"
                              min={1}
                              max={15}
                              value={topKChunks}
                              onChange={(e) => setTopKChunks(Number(e.target.value))}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono text-slate-800 text-xs focus:outline-hidden focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                              <span>คะแนนความคล้ายขั้นต่ำ:</span>
                              <span className="font-mono font-bold text-amber-700">{minScoreThreshold}%</span>
                            </div>
                            <input
                              type="number"
                              min={30}
                              max={95}
                              step={5}
                              value={minScoreThreshold}
                              onChange={(e) => setMinScoreThreshold(Number(e.target.value))}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono text-slate-800 text-xs focus:outline-hidden focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Live Web Search Guardrail */}
                      <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span>3. ค้นหาเว็บสด</span>
                          <span className="text-[10px] font-mono text-emerald-600 font-normal">
                            (web_search)
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                              <span>จำนวนลิงก์สูงสุด (Max Links):</span>
                              <span className="font-mono font-bold text-emerald-700">{maxWebResults} ลิงก์</span>
                            </div>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={maxWebResults}
                              onChange={(e) => setMaxWebResults(Number(e.target.value))}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono text-slate-800 text-xs focus:outline-hidden focus:border-emerald-500"
                            />
                          </div>

                          <div className="pt-1">
                            <label
                              onClick={() => setEnforceDomainWhitelist(!enforceDomainWhitelist)}
                              className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition"
                            >
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                                  enforceDomainWhitelist
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {enforceDomainWhitelist && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-[10.5px] font-medium text-slate-700">
                                บังคับเฉพาะ Whitelist โดเมนเท่านั้น
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Test Suite & Customer Approval (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        ชุดทดสอบด้วยคำถามของลูกค้า ({testSuite.length} ข้อ)
                      </h3>
                      <p className="text-[11.5px] text-slate-500">
                        ตรวจสอบความแม่นยำก่อนลูกค้ายืนยันตรวจรับ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunTests}
                      disabled={isRunningTests}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>
                        {isRunningTests ? 'กำลังรัน...' : 'รันชุดทดสอบ'}
                      </span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {testSuite.map((test, idx) => (
                      <div
                        key={test.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-800">
                            ข้อ {idx + 1}: {test.question}
                          </span>
                          {test.status === 'running' ? (
                            <span className="text-amber-600 font-bold animate-pulse shrink-0">
                              กำลังคิด...
                            </span>
                          ) : test.status === 'passed' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pass 100%</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 shrink-0">
                              รอทดสอบ
                            </span>
                          )}
                        </div>

                        {test.result && (
                          <div className="p-2 rounded bg-white border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                            <strong>คำตอบที่ AI สรุปได้:</strong> {test.result}
                          </div>
                        )}

                        <div className="text-[10.5px] text-slate-400 font-mono">
                          แหล่งที่คาดหวัง: {test.expectedSource}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Approval Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 space-y-2.5">
                    <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-blue-600 stroke-[3]" />
                      <span>ลูกค้ายืนยันตรวจรับการตั้งค่า Use Case</span>
                    </div>
                    <p className="text-[11.5px] text-blue-700 leading-relaxed">
                      เมื่อผลทดสอบเป็นที่พอใจ
                      กดบันทึกเพื่อออกเป็นเวอร์ชันใหม่ที่มีประวัติถาวร
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setUseCaseVersion((v) => v + 1);
                        alert(
                          `ลูกค้ายืนยันตรวจรับเรียบร้อย! ระบบบันทึกเป็น Use Case Version ${
                            useCaseVersion + 1
                          }.0.0`
                        );
                      }}
                      className="w-full py-2 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      ยืนยันตรวจรับและบันทึกเป็น v{useCaseVersion + 1}.0.0
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentPhase(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ย้อนกลับ: ระยะที่ 2</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPhase(4)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <span>ถัดไป: ระยะที่ 4 (ออกบัญชีเข้าใช้ MCP)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 4: ออกบัญชีเข้าใช้ MCP */}
        {/* ========================================================================= */}
        {currentPhase === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                ระยะที่ 4 จาก 4
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                ออกบัญชีเข้าใช้ MCP และเชื่อมต่อ AI Harness (Keycloak & MCP
                Provisioning)
              </h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-3xl">
                ระบบจัดการตัวตนผ่าน Keycloak ด้วยมาตรฐาน OAuth 2.1
                ลูกค้าสามารถเชื่อมต่อ AI Harness (เช่น Cursor, Claude Desktop
                หรือ Custom Agent) โดยใช้ Token ที่ระบุสิทธิ์ชัดเจน
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Credentials & mcp_config.json (6 Cols) */}
              <div className="lg:col-span-6 space-y-4">
                {/* Credentials Type Toggle */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">
                      รูปแบบข้อมูลเข้าใช้ (Authentication Mode)
                    </span>
                    <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setAuthType('machine')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          authType === 'machine'
                            ? 'bg-white text-blue-600 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Machine Credential
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthType('user')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          authType === 'user'
                            ? 'bg-white text-blue-600 shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        User Login (OAuth 2.1)
                      </button>
                    </div>
                  </div>

                  {/* Provisioned Keys Card */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        MCP Server Endpoint URL
                      </label>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
                        <span className="truncate">
                          https://mcp.neuronknowledge.imc.co.th/sse
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              'https://mcp.neuronknowledge.imc.co.th/sse',
                              'url'
                            )
                          }
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                        >
                          {copiedKey === 'url' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Keycloak Client ID
                      </label>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
                        <span>customer-corp-mcp-client</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy('customer-corp-mcp-client', 'cid')
                          }
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                        >
                          {copiedKey === 'cid' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Client Secret (เข้ารหัสและซ่อนหลังบันทึก)
                      </label>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
                        <span>
                          {showSecret
                            ? 'sec_live_9a8f7b3c2e1d44556677889900aabbcc'
                            : '••••••••••••••••••••••••••••••••••••••••'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowSecret((s) => !s)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                            title={showSecret ? 'ซ่อนรหัส' : 'แสดงรหัส'}
                          >
                            {showSecret ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                'sec_live_9a8f7b3c2e1d44556677889900aabbcc',
                                'sec'
                              )
                            }
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                          >
                            {copiedKey === 'sec' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Example Harness Config File */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-slate-200 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span>mcp_config.json (สำหรับ Claude Desktop / Cursor)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          JSON.stringify(
                            {
                              mcpServers: {
                                imcNeuronKnowledge: {
                                  url: 'https://mcp.neuronknowledge.imc.co.th/sse',
                                  headers: {
                                    Authorization:
                                      'Bearer <OAUTH_ACCESS_TOKEN>',
                                  },
                                },
                              },
                            },
                            null,
                            2
                          ),
                          'cfg'
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      {copiedKey === 'cfg' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>คัดลอก JSON</span>
                    </button>
                  </div>

                  <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                    {`{
  "mcpServers": {
    "imcNeuronKnowledge": {
      "url": "https://mcp.neuronknowledge.imc.co.th/sse",
      "headers": {
        "Authorization": "Bearer <OAUTH_ACCESS_TOKEN>"
      }
    }
  }
}`}
                  </pre>
                </div>
              </div>

              {/* Right Column: Live Request Inspector Simulation (6 Cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        สิ่งที่เกิดขึ้นในทุกครั้งที่เรียกใช้ (Live MCP Inspector)
                      </h3>
                      <p className="text-[11.5px] text-slate-500">
                        ขั้นตอนการตรวจสิทธิ์และความปลอดภัย 7 ขั้นของ MCP Server
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateRequest}
                      disabled={isSimulating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>
                        {isSimulating ? 'กำลังจำลอง...' : 'จำลองการเรียก MCP'}
                      </span>
                    </button>
                  </div>

                  {/* 7-Step Pipeline */}
                  <div className="space-y-2">
                    {[
                      {
                        step: 1,
                        title: '1. ตรวจ token กับ Keycloak',
                        detail:
                          'ตรวจสอบความถูกต้องของ JWT Token วันหมดอายุ และ signature',
                      },
                      {
                        step: 2,
                        title: '2. ระบุลูกค้า (Resolve Client)',
                        detail:
                          'จับคู่ client ID กับ customer-corp องค์กรลูกค้า',
                      },
                      {
                        step: 3,
                        title: '3. โหลดสิทธิ์และการตั้งค่า Use Case',
                        detail: `โหลด Use Case v${useCaseVersion}.0.0 และรายการแหล่งข้อมูลที่อนุญาต`,
                      },
                      {
                        step: 4,
                        title: '4. ตรวจสอบขอบเขตคำขอ (Data Scope Guard)',
                        detail:
                          'ตรวจสอบตาราง inventory_items และ trade_statistics อยู่ใน scope',
                      },
                      {
                        step: 5,
                        title: '5. เลือก DB Adapter ที่ถูกต้อง',
                        detail:
                          'เลือก PostgreSQL Connector พร้อมเข้ารหัส connection string',
                      },
                      {
                        step: 6,
                        title: '6. รันคำสั่งอ่านอย่างปลอดภัย (Read-only)',
                        detail: `บังคับ Limit ${maxRows} แถว และ Timeout ${queryTimeout} วินาที`,
                      },
                      {
                        step: 7,
                        title: '7. ส่งผลลัพธ์และบันทึก Audit Log',
                        detail:
                          'บันทึกประวัติการเรียกใช้ลง activity_logs เพื่อตรวจสอบย้อนกลับ',
                      },
                    ].map((st) => {
                      const isPast = simulatorStep >= st.step;
                      const isCurrent = simulatorStep === st.step;

                      return (
                        <div
                          key={st.step}
                          className={`p-2.5 rounded-xl border text-xs transition-all duration-200 flex items-start gap-2.5 ${
                            isCurrent
                              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                              : isPast
                              ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                              : 'bg-slate-50/60 border-slate-200/80 text-slate-400'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                              isCurrent
                                ? 'bg-[#0055fa] text-white animate-pulse'
                                : isPast
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isPast && !isCurrent ? '✓' : st.step}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold">{st.title}</div>
                            <div className="text-[11px] opacity-80 mt-0.5">
                              {st.detail}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {simulatorStep === 7 && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                      <span>
                        ✓ การทำงานครบ 7 ขั้นตอน — ส่งข้อมูลกลับสู่ AI Agent
                        ปลอดภัย 100%
                      </span>
                      <button
                        type="button"
                        onClick={() => setSimulatorStep(0)}
                        className="p-1 hover:bg-emerald-100 rounded text-emerald-800 transition cursor-pointer"
                        title="เริ่มใหม่"
                      >
                        <RotateCcw className="w-4 h-4 hover:rotate-180 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentPhase(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ย้อนกลับ: ระยะที่ 3</span>
              </button>

              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <span>พร้อมแล้ว! ทดลองแชทด้วย Agent ที่เชื่อมต่อ MCP</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* UPLOAD DOCUMENT TO KNOWLEDGE SET MODAL */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0055fa] flex items-center justify-center shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    อัปโหลดเอกสารเข้าสู่ Vector Database
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เลือกเอกสารและจัดกลุ่มลงใน Knowledge Set เพื่อระบุบริบทที่เกี่ยวข้องกัน
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Target Knowledge Set / Folder Selector */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-blue-600" />
                    <span>ชุดความรู้ปลายทาง (Target Knowledge Set) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setIsNewFolderModalOpen(true);
                    }}
                    className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    + สร้างชุดความรู้ใหม่
                  </button>
                </div>
                <select
                  value={uploadTargetFolderId}
                  onChange={(e) => setUploadTargetFolderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {knowledgeFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      📁 {folder.name} ({folder.description.slice(0, 45)}...)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-blue-700/80">
                  💡 เอกสารที่อัปโหลดจะถูกจัดเก็บในชุดเดียวกันและเชื่อมโยงบริบทความรู้เข้าด้วยกัน
                </p>
              </div>

              {/* Sample Files Selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">
                  เลือกไฟล์ตัวอย่างจำลอง หรือพิมพ์ชื่อไฟล์:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { name: 'ระเบียบพิกัดศุลกากรและพิกัดอัตราอากร_2569.pdf', size: '3.8 MB' },
                    { name: 'ข้อกำหนดมาตรฐานสินค้าเกษตรอินทรีย์_EU.docx', size: '1.5 MB' },
                    { name: 'สถิติการส่งออกและโควตานำเข้า_Q3.xlsx', size: '2.4 MB' },
                    { name: 'คู่มือการตรวจปล่อยสินค้าผ่านแดนศุลกากร.pdf', size: '4.1 MB' },
                  ].map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setUploadSelectedFileName(sample.name);
                        setUploadSelectedFileSize(sample.size);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                        uploadSelectedFileName === sample.name
                          ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="truncate min-w-0">
                        <div className="truncate text-xs">{sample.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{sample.size}</div>
                      </div>
                      {uploadSelectedFileName === sample.name && (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* File Name & Size Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  ชื่อไฟล์เอกสาร (File Name):
                </label>
                <input
                  type="text"
                  value={uploadSelectedFileName}
                  onChange={(e) => setUploadSelectedFileName(e.target.value)}
                  placeholder="เช่น คู่มือขั้นตอนศุลกากร_2569.pdf"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Vector RAG Info Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>การประมวลผล Vector RAG อัตโนมัติ:</span>
                </div>
                <p className="text-[11.5px] leading-relaxed">
                  เมื่อกดยืนยัน ระบบจะทำ Document Parser, ตัด Chunk ขนาด 500 tokens (overlap 50), คำนวณ Embedding Vector และจัดทำดัชนีพร้อมใช้งานสำหรับ tool <code className="font-mono text-blue-600">rag_query</code>
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleUploadFileSubmit}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>นำเข้าและประมวลผล (Upload & Ingest)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NEW KNOWLEDGE SET / FOLDER MODAL */}
      {/* ========================================================================= */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0055fa] flex items-center justify-center shrink-0">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    สร้าง Knowledge Set / โฟลเดอร์ใหม่
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดกลุ่มความรู้เพื่อจัดเก็บเอกสารที่มีเนื้อหาเกี่ยวข้องกัน
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  ชื่อ Knowledge Set / ชุดความรู้: *
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="เช่น ระเบียบสิทธิประโยชน์ FTA และภาษีศุลกากร"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  คำอธิบายบริบทของชุดความรู้ (Scope & Purpose):
                </label>
                <textarea
                  rows={3}
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="อธิบายว่าเอกสารในชุดนี้เกี่ยวข้องกันเรื่องใด เพื่อให้ AI ค้นหาและตอบคำถามได้อย่างถูกต้องแม่นยำ..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  เลือกธีมสีประจำชุดความรู้:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: 'blue', label: 'น้ำเงิน', cls: 'bg-blue-500' },
                    { id: 'purple', label: 'ม่วง', cls: 'bg-purple-500' },
                    { id: 'emerald', label: 'เขียว', cls: 'bg-emerald-500' },
                    { id: 'amber', label: 'ส้ม/ทอง', cls: 'bg-amber-500' },
                    { id: 'rose', label: 'ชมพู', cls: 'bg-rose-500' },
                    { id: 'indigo', label: 'คราม', cls: 'bg-indigo-500' },
                  ].map((colorOpt) => (
                    <button
                      key={colorOpt.id}
                      type="button"
                      onClick={() => setNewFolderColor(colorOpt.id as KnowledgeFolder['color'])}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition ${
                        newFolderColor === colorOpt.id
                          ? 'border-slate-800 bg-slate-900 text-white font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${colorOpt.cls}`} />
                      <span>{colorOpt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Template Suggestions */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-500 block text-[11px]">
                  เลือกแนวคิดตัวอย่างสำเร็จรูป:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      name: 'สิทธิประโยชน์ภาษี FTA & ศุลกากร',
                      desc: 'รวบรวมข้อตกลงการค้าเสรี พิกัดอัตราอากร และสิทธิลดหย่อนภาษีนำเข้าส่งออก',
                    },
                    {
                      name: 'มาตรฐานสินค้าและความปลอดภัยอาหาร',
                      desc: 'ระเบียบการรับรอง อย., GMP/HACCP, และข้อกำหนดความปลอดภัยสำหรับตลาดส่งออก',
                    },
                    {
                      name: 'นโยบายการเคลมสินค้าและข้อพิพาท',
                      desc: 'ขั้นตอนการเรียกร้องค่าเสียหาย การประกันภัยทางทะเล และข้อระงับข้อพิพาทคู่ค้า',
                    },
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setNewFolderName(tpl.name);
                        setNewFolderDesc(tpl.desc);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-medium transition cursor-pointer"
                    >
                      + {tpl.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>สร้าง Knowledge Set</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOVE FILE TO ANOTHER KNOWLEDGE SET MODAL */}
      {/* ========================================================================= */}
      {movingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    ย้ายชุดความรู้ (Knowledge Set)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เปลี่ยนกลุ่มความรู้ที่เอกสารนี้สังกัด
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMovingFile(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">
                  เอกสารที่เลือก:
                </span>
                <span className="font-bold text-slate-800 text-xs block truncate">
                  {movingFile.name}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  ชุดความรู้ปัจจุบัน:{' '}
                  <strong>
                    {knowledgeFolders.find((f) => f.id === movingFile.folderId)?.name || 'ยังไม่ได้ระบุ'}
                  </strong>
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  เลือกชุดความรู้ใหม่ที่ต้องการย้ายไป:
                </label>
                <div className="space-y-1.5">
                  {knowledgeFolders.map((folder) => {
                    const isCurrent = movingFile.folderId === folder.id;
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => handleMoveFile(movingFile.id, folder.id)}
                        className={`w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                          isCurrent
                            ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Folder className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <div className="text-xs font-semibold">{folder.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {folder.description}
                            </div>
                          </div>
                        </div>
                        {isCurrent ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold shrink-0">
                            ชุดปัจจุบัน
                          </span>
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setMovingFile(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD WEBSITE MODAL */}
      {/* ========================================================================= */}
      {isAddWebModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    เพิ่มเว็บไซต์ที่อนุญาต (Whitelist Domain)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดเว็บไซต์และหมวดหมู่เพื่อให้ AI ค้นหาผ่าน tool web_search
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddWebModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* URL */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  URL เว็บไซต์: *
                </label>
                <input
                  type="text"
                  value={newWebForm.url}
                  onChange={(e) => setNewWebForm((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="เช่น https://dft.go.th หรือ www.rd.go.th"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  ชื่อเว็บไซต์หรือหน่วยงาน (Title):
                </label>
                <input
                  type="text"
                  value={newWebForm.title}
                  onChange={(e) => setNewWebForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="เช่น กรมการค้าต่างประเทศ (DFT)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  หมวดหมู่ประเภทเว็บไซต์ (Category): *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'gov', label: '🏛️ ภาครัฐและศุลกากร', desc: 'กฎหมาย ภาษี พิธีการศุลกากร' },
                    { id: 'market', label: '📈 สถิติการค้าและตลาด', desc: 'ตัวเลขการค้า แนวโน้มตลาด' },
                    { id: 'standard', label: '🛡️ มาตรฐานและการรับรอง', desc: 'อย., มอก., สุขอนามัยพืช' },
                    { id: 'partner', label: '🤝 พอร์ทัลคู่ค้าและองค์กร', desc: 'ระบบท่าเรือ ข้อมูลคู่ค้า' },
                  ].map((catOpt) => (
                    <button
                      key={catOpt.id}
                      type="button"
                      onClick={() =>
                        setNewWebForm((prev) => ({ ...prev, category: catOpt.id as WebCategory }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                        newWebForm.category === catOpt.id
                          ? 'border-blue-500 bg-blue-50/60 font-semibold text-blue-900'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold">{catOpt.label}</span>
                      <span className="text-[10px] text-slate-400">{catOpt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  วัตถุประสงค์การสืบค้นสำหรับ AI (Purpose for `web_search`):
                </label>
                <textarea
                  rows={2}
                  value={newWebForm.purpose}
                  onChange={(e) =>
                    setNewWebForm((prev) => ({ ...prev, purpose: e.target.value }))
                  }
                  placeholder="ระบุว่า AI ควรใช้เว็บไซต์นี้ค้นหาคำตอบในประเด็นใด เช่น อ้างอิงประกาศพิกัดภาษีล่าสุด..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Quick Suggestions */}
              <div className="space-y-1.5 pt-1">
                <label className="font-semibold text-slate-500 block text-[11px]">
                  หรือเลือกเพิ่มจากเว็บยอดนิยม:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      url: 'https://bot.or.th',
                      title: 'ธนาคารแห่งประเทศไทย (BOT)',
                      cat: 'market' as WebCategory,
                      purpose: 'อัตราแลกเปลี่ยนเงินตราต่างประเทศและรายงานภาวะเศรษฐกิจ',
                    },
                    {
                      url: 'https://rd.go.th',
                      title: 'กรมสรรพากร (Revenue Dept)',
                      cat: 'gov' as WebCategory,
                      purpose: 'ตรวจสอบอัตราภาษีมูลค่าเพิ่ม VAT และอนุสัญญาภาษีซ้อน',
                    },
                    {
                      url: 'https://thaichamber.org',
                      title: 'หอการค้าไทยและสภาหอการค้าฯ',
                      cat: 'partner' as WebCategory,
                      purpose: 'ข้อมูลเครือข่ายคู่ค้าและแนวทางการค้าระหว่างประเทศ',
                    },
                  ].map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setNewWebForm({
                          url: s.url,
                          title: s.title,
                          category: s.cat,
                          purpose: s.purpose,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-medium transition cursor-pointer"
                    >
                      + {s.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddWebModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddWebsiteSubmit}
                disabled={!newWebForm.url.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>เพิ่มเว็บไซต์</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {isDbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0055fa] flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {editingDbId
                      ? 'แก้ไขการเชื่อมต่อ & จัดการการเผยแพร่ Schema'
                      : 'เพิ่มการเชื่อมต่อฐานข้อมูลใหม่ & เผยแพร่ Schema'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนด Database Engine, สิทธิ์ Read-Only และเลือกเผยแพร่เฉพาะ
                    Table / Column ที่ต้องการ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDbModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Steps Navigation */}
            <div className="px-6 py-2 border-b border-slate-100 bg-white flex items-center gap-4 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setModalStep('connection')}
                className={`py-1.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  modalStep === 'connection'
                    ? 'border-[#0055fa] text-[#0055fa]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <span className="w-4.5 h-4.5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>การเชื่อมต่อ & Database Engines</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

              <button
                type="button"
                onClick={() => setModalStep('publishing')}
                className={`py-1.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  modalStep === 'publishing'
                    ? 'border-[#0055fa] text-[#0055fa]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <span className="w-4.5 h-4.5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>เลือกเผยแพร่ Database, Table, Column & คำอธิบาย</span>
                {connectionTested && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">
                    Schema สแกนแล้ว
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ================= STEP 1: CONNECTION & ENGINES ================= */}
              {modalStep === 'connection' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Select Supported Database Engine */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                      1. เลือก Database Engine ที่เรารองรับ (Supported Engines)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {SUPPORTED_ENGINES.map((eng) => {
                        const isSelected = selectedEngine === eng.type;
                        return (
                          <button
                            key={eng.type}
                            type="button"
                            onClick={() => {
                              setSelectedEngine(eng.type);
                              setDbForm((prev) => ({
                                ...prev,
                                port: eng.defaultPort,
                              }));
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative group ${
                              isSelected
                                ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5 mb-2.5">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform">
                                <Image
                                  src={eng.logoSrc}
                                  alt={eng.name}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-contain"
                                  unoptimized
                                />
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {eng.badge}
                              </span>
                            </div>
                            <span className="font-bold text-slate-900 text-sm block leading-snug">
                              {eng.name}
                            </span>
                            <p className="text-[11px] text-slate-500 leading-snug mt-1">
                              {eng.description}
                            </p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400">
                              Port เริ่มต้น: {eng.defaultPort}
                            </div>
                            {isSelected && (
                              <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#0055fa] text-white flex items-center justify-center text-[10px] shadow-xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Connection Details Form */}
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        <span>2. กำหนดข้อมูลการเชื่อมต่อแบบอ่านอย่างเดียว (Read-Only)</span>
                      </span>
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        รหัสผ่านจะถูกเข้ารหัสด้วย AES-256-GCM
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="text-slate-600 font-semibold block mb-1">
                          ชื่อการเชื่อมต่อ (Connection Display Name):
                        </label>
                        <input
                          type="text"
                          value={dbForm.name}
                          onChange={(e) =>
                            setDbForm({ ...dbForm, name: e.target.value })
                          }
                          placeholder="เช่น ระบบคลังสินค้าหลัก, ระบบ ERP การเงิน"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">
                          Host / IP หรือ Domain:
                        </label>
                        <input
                          type="text"
                          value={dbForm.host}
                          onChange={(e) =>
                            setDbForm({ ...dbForm, host: e.target.value })
                          }
                          placeholder="db.example-internal.corp"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">
                          Port:
                        </label>
                        <input
                          type="number"
                          value={dbForm.port}
                          onChange={(e) =>
                            setDbForm({
                              ...dbForm,
                              port: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">
                          Database Name:
                        </label>
                        <input
                          type="text"
                          value={dbForm.database}
                          onChange={(e) =>
                            setDbForm({ ...dbForm, database: e.target.value })
                          }
                          placeholder="production_db"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">
                          Username (Read-Only):
                        </label>
                        <input
                          type="text"
                          value={dbForm.user}
                          onChange={(e) =>
                            setDbForm({ ...dbForm, user: e.target.value })
                          }
                          placeholder="mcp_readonly_user"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">
                          Password:
                        </label>
                        <input
                          type="password"
                          value={dbForm.password}
                          onChange={(e) =>
                            setDbForm({ ...dbForm, password: e.target.value })
                          }
                          placeholder="••••••••••••••••"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="text-slate-600 font-semibold block mb-1">
                          SSL Mode:
                        </label>
                        <select
                          value={dbForm.sslMode}
                          onChange={(e) =>
                            setDbForm({ ...dbForm, sslMode: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-400"
                        >
                          <option value="prefer">Prefer (แนะนำ)</option>
                          <option value="require">Require (บังคับ SSL)</option>
                          <option value="disable">Disable (ปิด SSL)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: SCHEMA PUBLISHING & DESCRIPTIONS ================= */}
              {modalStep === 'publishing' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Database Info Bar with Engine Icon */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-150 shadow-2xs flex items-center justify-center shrink-0 p-1.5">
                      <DbEngineLogo engine={selectedEngine} className="w-7 h-7" size={28} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {dbForm.name || 'ยังไม่ได้ระบุชื่อฐานข้อมูล'}
                        </span>
                        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                          {selectedEngine}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        {dbForm.host || 'host'}:{dbForm.port} / {dbForm.database || 'database'} (User: {dbForm.user || 'user'})
                      </div>
                    </div>
                  </div>

                  {/* Database-Level Publishing Toggle & Description */}
                  <div className="p-4.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="db-publish-toggle"
                          checked={dbForm.published}
                          onChange={(e) =>
                            setDbForm({ ...dbForm, published: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <label
                          htmlFor="db-publish-toggle"
                          className="font-bold text-slate-900 text-sm cursor-pointer"
                        >
                          เผยแพร่ฐานข้อมูลนี้ให้ MCP Server (Publish Database)
                        </label>
                      </div>

                      <span className="text-xs text-blue-700 font-semibold">
                        {dbForm.published
                          ? '✓ AI มีสิทธิ์เข้าถึงฐานข้อมูลนี้'
                          : '✗ ปิดกั้นการเข้าถึงทั้งหมด'}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        คำอธิบายฐานข้อมูลในภาพรวม (Database Description สำหรับ AI):
                      </label>
                      <textarea
                        rows={2}
                        value={dbForm.dbDescription}
                        onChange={(e) =>
                          setDbForm({
                            ...dbForm,
                            dbDescription: e.target.value,
                          })
                        }
                        placeholder="ระบุว่าฐานข้อมูลนี้เก็บข้อมูลเกี่ยวกับอะไร ขอบเขตธุรกิจใด เพื่อให้ AI เลือกใช้ได้อย่างถูกต้อง"
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-400 leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Tables & Columns Publishing Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          เลือกเผยแพร่ตารางและคอลัมน์ (Table & Column Level
                          Publishing)
                        </h4>
                        <p className="text-xs text-slate-500">
                          ติ๊กเลือกตารางและคอลัมน์ที่อนุญาตให้ AI
                          ค้นหาได้พร้อมใส่คำอธิบายเชิงธุรกิจ
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        พบ {modalTables.length} ตารางในสคีมา
                      </span>
                    </div>

                    {modalTables.map((tbl) => {
                      const isExpanded = expandedTableNames.includes(tbl.name);
                      const publishedColsCount = tbl.columns.filter(
                        (c) => c.published
                      ).length;

                      return (
                        <div
                          key={tbl.name}
                          className={`rounded-2xl border transition-all ${
                            tbl.published
                              ? 'bg-white border-slate-200 shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200/70 opacity-70'
                          }`}
                        >
                          {/* Table Header Bar */}
                          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={tbl.published}
                                onChange={() =>
                                  handleToggleTablePublish(tbl.name)
                                }
                                className="w-4.5 h-4.5 text-blue-600 rounded cursor-pointer"
                                title="เปิด/ปิด การเผยแพร่ตารางนี้"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <Table2 className="w-4 h-4 text-blue-600" />
                                  <span className="font-mono font-bold text-slate-900 text-sm">
                                    {tbl.name}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      tbl.published
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {tbl.published
                                      ? 'เผยแพร่ตารางนี้'
                                      : 'ซ่อนตารางนี้'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  เผยแพร่ {publishedColsCount}/
                                  {tbl.columns.length} คอลัมน์
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleTableExpand(tbl.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition cursor-pointer self-start sm:self-auto"
                            >
                              <Columns className="w-3.5 h-3.5 text-slate-500" />
                              <span>
                                {isExpanded ? 'ย่อคอลัมน์' : 'จัดการคอลัมน์'}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Table Description Inputs */}
                          <div className="p-4 space-y-3 bg-slate-50/40 text-xs">
                            <div>
                              <label className="font-semibold text-slate-700 block mb-1">
                                คำอธิบายตาราง (Table Description สำหรับ AI):
                              </label>
                              <input
                                type="text"
                                value={tbl.description}
                                onChange={(e) =>
                                  handleUpdateTableDescription(
                                    tbl.name,
                                    e.target.value
                                  )
                                }
                                placeholder="เช่น รายการสินค้าคงเหลือในคลังหลัก และสถานะพร้อมจัดส่ง"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-400"
                              />
                            </div>

                            <div>
                              <label className="font-semibold text-slate-700 block mb-1">
                                คำแนะนำการ Join ตาราง (Join Hint):
                              </label>
                              <input
                                type="text"
                                value={tbl.joinTip || ''}
                                onChange={(e) =>
                                  handleUpdateTableJoinTip(
                                    tbl.name,
                                    e.target.value
                                  )
                                }
                                placeholder="เช่น Join กับ shipment_records ด้วย item_id"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-400"
                              />
                            </div>

                            {/* Expanded Column-Level Publishing Editor */}
                            {isExpanded && (
                              <div className="pt-3 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                                <div className="font-bold text-slate-700 flex items-center justify-between">
                                  <span>
                                    คอลัมน์ในตาราง {tbl.name} ({tbl.columns.length})
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-normal">
                                    ยกเลิกติ๊กคอลัมน์เพื่อซ่อนข้อมูลสำคัญหรือความลับ
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {tbl.columns.map((col) => (
                                    <div
                                      key={col.name}
                                      className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                                        col.published
                                          ? 'bg-white border-slate-200'
                                          : 'bg-slate-100/70 border-slate-200/50 opacity-60'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-[200px]">
                                        <input
                                          type="checkbox"
                                          checked={col.published}
                                          onChange={() =>
                                            handleToggleColumnPublish(
                                              tbl.name,
                                              col.name
                                            )
                                          }
                                          className="w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0"
                                        />
                                        <div className="min-w-0">
                                          <div className="font-mono font-bold text-slate-900 text-xs truncate">
                                            {col.name}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-mono">
                                            {col.type}
                                          </div>
                                        </div>
                                        {col.isPii && (
                                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold shrink-0">
                                            PII / ความลับ
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <input
                                          type="text"
                                          value={col.description}
                                          onChange={(e) =>
                                            handleUpdateColumnDescription(
                                              tbl.name,
                                              col.name,
                                              e.target.value
                                            )
                                          }
                                          placeholder="คำอธิบายคอลัมน์สำหรับ AI เช่น รหัสสินค้า SKU สากล"
                                          className="w-full px-2.5 py-1 text-[11.5px] rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-400"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              {modalStep === 'publishing' ? (
                <button
                  type="button"
                  onClick={() => setModalStep('connection')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับไปตั้งค่าการเชื่อมต่อ</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDbModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition cursor-pointer"
                >
                  ยกเลิก
                </button>

                {modalStep === 'connection' ? (
                  <button
                    type="button"
                    onClick={handleModalTestConnection}
                    disabled={isTestingConnection}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isTestingConnection ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>กำลังทดสอบ & สแกน Schema...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>ทดสอบการเชื่อมต่อ & ดึง Schema (ถัดไป)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveModalDatabase}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>บันทึกและเผยแพร่แหล่งข้อมูลนี้ (Save & Publish)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
