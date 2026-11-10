# AUAUSAVE HOUSE Artist Website

เว็บไซต์สำหรับฉันเองจ้า พร้อมระบบหลังบ้านแอดมิน ซึ่งก็คือฉันเองอีก เขียนด้วย HTML, CSS และ JavaScript โดยไม่ต้องติดตั้ง dependency นะจ๊ะ
ลงชื่อ มูมิน มุมิน มินมิน คิ

## เริ่มใช้งาน

เปิด `index.html` ในเว็บเบราว์เซอร์ หรือรัน local server:

```powershell
python -m http.server 8080
```

จากนั้นเปิด http://localhost:8080

## ฟีเจอร์

- หน้าแรกและรายชื่อศิลปิน
- หน้าโปรไฟล์ของศิลปินแต่ละคน
- ตารางงาน รางวัล และวิดีโอ YouTube
- หลังบ้านเพิ่ม แก้ไข และลบข้อมูลได้
- ใช้ Local Storage เป็นแคช และเชื่อมต่อ Supabase สำหรับข้อมูลและการเข้าสู่ระบบหลังบ้าน
- รองรับมือถือและเดสก์ท็อป

## โครงสร้างโค้ด

| ไฟล์ / โฟลเดอร์ | หน้าที่ |
| --- | --- |
| `index.html` | จุดเริ่มต้นและลำดับโหลดสคริปต์ / สไตล์ |
| `app.js` | หน้าสาธารณะ หลังบ้าน ตารางงาน และตัวเรนเดอร์หลัก |
| `styles.css` | สไตล์ส่วนกลางและ responsive |
| `archive.css` | Timeline, Filmography และการจัดการ Archive ที่ย้ายจาก inline style |
| `data.js` | ข้อมูลเริ่มต้นกรณียังไม่มีข้อมูลในแคช |
| `public-routes.js`, `save-profile-tabs.js` | URL สาธารณะและแท็บโปรไฟล์ศิลปิน |
| `series/` | หน้า Series, component, ตัวแก้ไข และ API adapter |
| `analytics.js`, `analytics.css` | ระบบสถิติและหน้าจอสถิติหลังบ้าน |
| `event-participation.js` | สถานะงาน เงื่อนไขเข้าร่วม และการเลื่อนงาน |
| `supabase-*.js` | การตั้งค่าและตัวเชื่อมฐานข้อมูล |
| `tests/` | Regression test และหน้า fixture สำหรับทดสอบโดยใช้ข้อมูลจำลอง |
| `dist/` | สำเนาไฟล์สำหรับการ deploy เดิม แยกจากต้นฉบับที่ localhost ใช้ |
| `tmp/`, `outputs/` | ไฟล์ชั่วคราวและผลลัพธ์จากเครื่องมือ ไม่ใช่ entry point ของเว็บ |

สคริปต์ปัจจุบันใช้ global ร่วมกันและมีตัวเรนเดอร์ที่เรียกต่อจาก implementation ก่อนหน้า จึงต้องคงลำดับโหลดใน `index.html` รวมถึงลำดับ CSS เดิมเมื่อแก้ไข ส่วน migration SQL เป็นประวัติฐานข้อมูลที่ต้องเก็บไว้ ไม่ควรลบเพียงเพราะไม่มีหน้าเว็บอ้างชื่อไฟล์โดยตรง

## ตรวจสอบก่อนส่งงาน

รันทดสอบทั้งหมดจากโฟลเดอร์โปรเจกต์ด้วย PowerShell:

```powershell
$testFiles = Get-ChildItem tests -Filter '*.cjs' |
  Where-Object { $_.Name -notlike 'prepare-*' -and $_.Name -ne 'source-section.cjs' } |
  ForEach-Object FullName
node --test @testFiles
```

ทดสอบหลังบ้านด้วยข้อมูลจำลองโดยรัน `node tests/prepare-event-participation-browser.cjs` แล้วเปิด `/tmp/event-participation-browser.html#admin` ผ่าน local server หน้า fixture จะไม่โหลด Supabase client จริง

การจัดรูปแบบใช้ `.prettierrc.json` และ `.prettierignore` โดยปิดการจัดรูปแบบ HTML ภายใน JavaScript template เพื่อรักษาข้อความและ markup เดิม:

```powershell
npx prettier@3.9.10 --check "**/*.js" "**/*.css"
```

สำหรับ local server ของ Codex ใช้ `node .codex-local-server.cjs` แล้วเปิด `http://localhost:8765/` ซึ่งรองรับ URL โฟลเดอร์ เช่น `/schedule` และ `/savewrg` ด้วย
