// Turns driver / network errors into Thai messages a creator can act on.
// Never return the raw error text: it can contain host names, user names or SQL.

interface DriverError {
  code?: string;
  /** SQL Server error number (mssql RequestError) */
  number?: number;
  message?: string;
}

export function friendlyConnectionError(error: unknown): string {
  const { code, number, message = '' } = (error ?? {}) as DriverError;

  switch (code) {
    // MySQL (mysql2)
    case 'ER_ACCESS_DENIED_ERROR':
      return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    case 'ER_BAD_DB_ERROR':
      return 'ไม่พบ database ชื่อนี้บน host';
    case 'ER_DBACCESS_DENIED_ERROR':
      return 'บัญชีนี้ไม่มีสิทธิ์เข้า database นี้';
    case 'ER_HOST_NOT_PRIVILEGED':
      return 'database ไม่อนุญาตให้เซิร์ฟเวอร์นี้เชื่อมต่อ (ตรวจ host ที่อนุญาตของบัญชี)';
    case 'ER_TABLEACCESS_DENIED_ERROR':
    case 'ER_COLUMNACCESS_DENIED_ERROR':
      return 'บัญชีนี้ไม่มีสิทธิ์อ่านตารางนี้';
    case 'HANDSHAKE_NO_SSL_SUPPORT':
      return 'database ไม่รองรับ SSL ให้เปลี่ยนโหมด SSL เป็น "disable"';
    case 'PROTOCOL_SEQUENCE_TIMEOUT':
      return 'คำสั่งใช้เวลานานเกิน 10 วินาที';
    // SQL Server (mssql / tedious)
    case 'ELOGIN':
      return /Cannot open database/i.test(message)
        ? 'ไม่พบ database ชื่อนี้ หรือบัญชีนี้ไม่มีสิทธิ์เข้า database นี้'
        : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    case 'ETIMEOUT':
      return 'เชื่อมต่อ host ไม่ได้ภายใน 10 วินาที ตรวจ firewall หรือ IP allowlist ของ database';
    case 'ESOCKET':
      // tedious reports a refused port as "Could not connect (sequence)"
      if (/ECONNREFUSED|Could not connect/i.test(message)) {
        return 'host ปฏิเสธการเชื่อมต่อ ตรวจ port และตรวจว่า database เปิดรับการเชื่อมต่อจากภายนอก';
      }
      if (/certificate|self[- ]signed|SSL|TLS/i.test(message)) {
        return 'ตรวจใบรับรอง SSL ไม่ผ่าน ลองเปลี่ยนโหมด SSL เป็น "require"';
      }
      return 'การเชื่อมต่อถูกตัดกลางทาง ตรวจ port, โหมด SSL และ firewall';
  }

  // Oracle (oracledb): code is "ORA-xxxxx" or "NJS-xxx"
  switch (code) {
    case 'ORA-01017':
      return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    case 'ORA-28000':
      return 'บัญชีนี้ถูกล็อกอยู่ ติดต่อผู้ดูแล database';
    case 'ORA-12514':
    case 'ORA-12505':
    case 'NJS-518':
      return 'ไม่พบ service name นี้บน host ตรวจช่อง Service name อีกครั้ง';
    case 'ORA-00942':
    case 'ORA-01031':
      return 'บัญชีนี้ไม่มีสิทธิ์อ่านตารางนี้';
    case 'NJS-503':
    case 'NJS-511':
      return 'host ปฏิเสธการเชื่อมต่อ ตรวจ port และตรวจว่า database เปิดรับการเชื่อมต่อจากภายนอก';
    case 'NJS-510':
      return 'เชื่อมต่อ host ไม่ได้ภายใน 10 วินาที ตรวจ firewall หรือ IP allowlist ของ database';
    case 'NJS-506':
      return 'เปิดการเชื่อมต่อแบบ SSL (TCPS) ไม่สำเร็จ ถ้า port นี้เป็น TCP ธรรมดา ให้เปลี่ยนโหมด SSL เป็น "disable"';
    case 'NJS-500':
    case 'NJS-501':
      return 'การเชื่อมต่อถูกตัดกลางทาง ตรวจ port, โหมด SSL (TCP/TCPS) และ firewall';
    // ClickHouse: numeric server error codes as strings
    case '516':
    case '192':
      return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    case '81':
      return 'ไม่พบ database ชื่อนี้บน host';
    case '497':
      return 'บัญชีนี้ไม่มีสิทธิ์อ่านข้อมูลนี้';
    case '159':
      return 'คำสั่งใช้เวลานานเกิน 10 วินาที';
  }
  if (/socket hang up|EPROTO|wrong version number/i.test(message)) {
    return 'การเชื่อมต่อถูกตัดกลางทาง ตรวจ port และโหมด SSL (HTTP/HTTPS หรือ TCP/TCPS)';
  }

  if (number === 229 || number === 230) {
    return 'บัญชีนี้ไม่มีสิทธิ์อ่านตารางนี้';
  }

  switch (code) {
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return 'ไม่พบ host นี้ ตรวจชื่อ host อีกครั้ง';
    case 'ECONNREFUSED':
      return 'host ปฏิเสธการเชื่อมต่อ ตรวจ port และตรวจว่า database เปิดรับการเชื่อมต่อจากภายนอก';
    case 'ETIMEDOUT':
    case 'EHOSTUNREACH':
    case 'ENETUNREACH':
      return 'เชื่อมต่อ host ไม่ได้ภายใน 10 วินาที ตรวจ firewall หรือ IP allowlist ของ database';
    case 'ECONNRESET':
      return 'การเชื่อมต่อถูกตัดกลางทาง ตรวจโหมด SSL และ firewall';
    case '28P01':
      return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    case '28000':
      return 'database ไม่อนุญาตให้เซิร์ฟเวอร์นี้เชื่อมต่อ (ตรวจ pg_hba.conf หรือเปิดใช้ SSL)';
    case '3D000':
      return 'ไม่พบ database ชื่อนี้บน host';
    case '42501':
      return 'บัญชีนี้ไม่มีสิทธิ์อ่านตารางนี้';
    case '57014':
      return 'คำสั่งใช้เวลานานเกิน 10 วินาที';
    case '53300':
      return 'database มีผู้เชื่อมต่อเต็มแล้ว ลองใหม่ภายหลัง';
    case 'DEPTH_ZERO_SELF_SIGNED_CERT':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
    case 'ERR_TLS_CERT_ALTNAME_INVALID':
    case 'CERT_HAS_EXPIRED':
      return 'ตรวจใบรับรอง SSL ไม่ผ่าน ลองเปลี่ยนโหมด SSL เป็น "require"';
  }

  if (/does not support SSL/i.test(message)) {
    return 'database ไม่รองรับ SSL ให้เปลี่ยนโหมด SSL เป็น "disable"';
  }
  if (/timeout|timed out/i.test(message)) {
    return 'เชื่อมต่อ host ไม่ได้ภายใน 10 วินาที ตรวจ firewall หรือ IP allowlist ของ database';
  }
  return 'เชื่อมต่อไม่สำเร็จ ตรวจค่าที่กรอกอีกครั้ง';
}
