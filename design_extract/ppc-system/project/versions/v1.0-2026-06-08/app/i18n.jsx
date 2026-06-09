/* ============================================================
   i18n — Thai (default) / English dictionary
   Usage:  const { t, lang } = useI18n();  t('nav.dashboard')
   ============================================================ */
(function () {
  const DICT = {
    /* ---- App / brand ---- */
    'app.name':        { th: 'Prime Glory', en: 'Prime Glory' },
    'app.tagline':     { th: 'ระบบวางแผนและควบคุมการผลิต', en: 'Production Planning & Control' },
    'app.search':      { th: 'ค้นหาใบสั่ง วัตถุดิบ ล็อต…', en: 'Search orders, materials, lots…' },

    /* ---- Nav sections ---- */
    'navsec.overview':   { th: 'ภาพรวม', en: 'Overview' },
    'navsec.planning':   { th: 'การวางแผน', en: 'Planning' },
    'navsec.production':  { th: 'การผลิต', en: 'Production' },
    'navsec.warehouse':   { th: 'คลังสินค้า', en: 'Warehouse' },
    'navsec.master':      { th: 'ข้อมูลหลัก', en: 'Master Data' },
    'navsec.admin':       { th: 'ผู้ดูแลระบบ', en: 'Administration' },

    /* ---- Nav items ---- */
    'nav.dashboard':   { th: 'แดชบอร์ด', en: 'Dashboard' },
    'nav.orders':      { th: 'คำสั่งซื้อลูกค้า', en: 'Customer Orders' },
    'nav.flow':        { th: 'สถานะใบสั่งผลิต', en: 'Order Status Flow' },
    'nav.schedule':    { th: 'ตารางการผลิต', en: 'Production Schedule' },
    'nav.designer':    { th: 'ออกแบบกระบวนการผลิต', en: 'Process Designer' },
    'nav.shopfloor':   { th: 'ติดตามงานระหว่างผลิต', en: 'Shop Floor / WIP' },
    'nav.receiving':   { th: 'รับเข้าวัตถุดิบ', en: 'Material Receiving' },
    'nav.issue':       { th: 'เบิกวัตถุดิบ', en: 'Material Issue' },
    'nav.fgreceiving': { th: 'รับเข้าสินค้าสำเร็จรูป', en: 'FG Receiving' },
    'nav.stock':       { th: 'สต็อกคลังสินค้า', en: 'Warehouse Stock' },
    'nav.items':       { th: 'รายการสินค้า', en: 'Item Master' },
    'nav.bom':         { th: 'สูตรการผลิต (BOM)', en: 'BOM Management' },
    'nav.users':       { th: 'จัดการผู้ใช้งาน', en: 'User Management' },
    'nav.settings':    { th: 'ตั้งค่าสายการผลิต', en: 'Line Settings' },

    /* ---- Users ---- */
    'users.create':    { th: 'สร้างผู้ใช้งาน', en: 'Create User' },
    'users.resetpw':   { th: 'รีเซ็ตรหัสผ่าน', en: 'Reset password' },
    'users.generate':  { th: 'สุ่มรหัส', en: 'Generate' },
    'users.pwhint':    { th: 'แอดมินเป็นผู้กำหนดรหัสผ่านให้ผู้ใช้', en: 'Admin sets the password for each user' },
    'toast.usercreated': { th: 'สร้างผู้ใช้งานเรียบร้อย', en: 'User created' },

    /* ---- Settings ---- */
    'set.title':       { th: 'ตั้งค่าสายการผลิต', en: 'Production Line Settings' },
    'set.sub':         { th: 'เพิ่ม/ลดสายการผลิต ตั้งกำลังคนและแผนการผลิตต่อวัน', en: 'Add/remove lines, set manpower and daily production plan' },
    'set.lines':       { th: 'สายการผลิต', en: 'Production Lines' },
    'set.addline':     { th: 'เพิ่มสายการผลิต', en: 'Add Line' },
    'set.dailyplan':   { th: 'แผนต่อวัน', en: 'Daily Plan' },
    'set.totalcap':    { th: 'รวมกำลังผลิต', en: 'Total capacity' },
    'set.wftypes':     { th: 'ประเภทเทมเพลตกระบวนการ', en: 'Workflow Template Types' },
    'set.deftpl':      { th: 'เทมเพลตเริ่มต้นของสาย', en: 'Default workflow' },
    'set.planhint':    { th: 'PPC กำหนดแผนการผลิตต่อวัน (จะแสดงใต้ชื่อสายในตารางการผลิต)', en: 'PPC sets the daily plan (shown under the line name on the schedule)' },

    /* ---- Roles ---- */
    'role.admin':       { th: 'ผู้ดูแลระบบ', en: 'Admin' },
    'role.ppc':         { th: 'ฝ่ายวางแผน (PPC)', en: 'PPC Planner' },
    'role.warehouse':   { th: 'ฝ่ายคลังสินค้า', en: 'Warehouse' },
    'role.production':   { th: 'ฝ่ายผลิต', en: 'Production' },
    'role.management':   { th: 'ฝ่ายบริหาร', en: 'Management' },
    'role.switch':       { th: 'สลับมุมมองบทบาท', en: 'Switch role view' },

    /* ---- Order status flow ---- */
    'status.request':    { th: 'ขอเปิดผลิต', en: 'Production Request' },
    'status.waiting':    { th: 'รอวัตถุดิบ', en: 'Waiting Material' },
    'status.reserved':   { th: 'เปิดใบสั่งผลิต / จองวัตถุดิบ', en: 'PO Created / Reserved' },
    'status.scheduled':  { th: 'จัดตารางแล้ว', en: 'Scheduled' },
    'status.completed':  { th: 'ผลิตเสร็จ', en: 'Completed' },
    'status.pending':    { th: 'รออนุมัติรับเข้า', en: 'Pending Acceptance' },
    'status.accepted':   { th: 'อนุมัติรับเข้าแล้ว', en: 'Accepted' },
    'status.inprogress': { th: 'กำลังผลิต', en: 'In Progress' },
    'status.issued':     { th: 'เบิกวัตถุดิบแล้ว', en: 'Materials Issued' },
    'status.sold':       { th: 'ขายออกแล้ว', en: 'Sold / Shipped' },

    /* ---- Priority ---- */
    'pri.high':   { th: 'ด่วนมาก', en: 'High' },
    'pri.med':    { th: 'ปานกลาง', en: 'Medium' },
    'pri.low':    { th: 'ปกติ', en: 'Low' },

    /* ---- Common buttons / actions ---- */
    'btn.new':       { th: 'สร้างใหม่', en: 'New' },
    'btn.add':       { th: 'เพิ่ม', en: 'Add' },
    'btn.edit':      { th: 'แก้ไข', en: 'Edit' },
    'btn.delete':    { th: 'ลบ', en: 'Delete' },
    'btn.save':      { th: 'บันทึก', en: 'Save' },
    'btn.cancel':    { th: 'ยกเลิก', en: 'Cancel' },
    'btn.confirm':   { th: 'ยืนยัน', en: 'Confirm' },
    'btn.close':     { th: 'ปิด', en: 'Close' },
    'btn.export':    { th: 'ส่งออก', en: 'Export' },
    'btn.filter':    { th: 'กรอง', en: 'Filter' },
    'btn.search':    { th: 'ค้นหา', en: 'Search' },
    'btn.view':      { th: 'ดู', en: 'View' },
    'btn.reserve':   { th: 'จองวัตถุดิบ', en: 'Reserve Materials' },
    'btn.createpo':  { th: 'เปิดใบสั่งผลิต', en: 'Create Production Order' },
    'btn.schedule':  { th: 'จัดตาราง', en: 'Schedule' },
    'btn.issue':     { th: 'เบิก', en: 'Issue' },
    'btn.receive':   { th: 'รับเข้า', en: 'Receive' },
    'btn.report':    { th: 'รายงานผลผลิต', en: 'Report Output' },
    'btn.transfer':  { th: 'ส่งต่อ', en: 'Transfer' },
    'btn.accept':    { th: 'อนุมัติรับเข้า', en: 'Accept' },
    'btn.reject':    { th: 'ปฏิเสธ', en: 'Reject' },
    'btn.addstep':   { th: 'เพิ่มขั้นตอน', en: 'Add Step' },
    'btn.savetpl':   { th: 'บันทึกเทมเพลต', en: 'Save Template' },
    'btn.login':     { th: 'เข้าสู่ระบบ', en: 'Sign in' },

    /* ---- Common fields ---- */
    'f.code':        { th: 'รหัส', en: 'Code' },
    'f.name':        { th: 'ชื่อ', en: 'Name' },
    'f.unit':        { th: 'หน่วย', en: 'Unit' },
    'f.category':    { th: 'หมวดหมู่', en: 'Category' },
    'f.status':      { th: 'สถานะ', en: 'Status' },
    'f.qty':         { th: 'จำนวน', en: 'Quantity' },
    'f.date':        { th: 'วันที่', en: 'Date' },
    'f.time':        { th: 'เวลา', en: 'Time' },
    'f.duedate':     { th: 'กำหนดส่ง', en: 'Due Date' },
    'f.priority':    { th: 'ความสำคัญ', en: 'Priority' },
    'f.customer':    { th: 'ลูกค้า', en: 'Customer' },
    'f.product':     { th: 'สินค้า', en: 'Product' },
    'f.supplier':    { th: 'ผู้ขาย', en: 'Supplier' },
    'f.lot':         { th: 'เลขล็อต', en: 'Lot Number' },
    'f.expiry':      { th: 'วันหมดอายุ', en: 'Expiry Date' },
    'f.line':        { th: 'สายการผลิต', en: 'Production Line' },
    'f.station':     { th: 'สถานี', en: 'Station' },
    'f.reason':      { th: 'เหตุผล', en: 'Reason' },
    'f.po':          { th: 'ใบสั่งผลิต', en: 'Production Order' },
    'f.order':       { th: 'เลขที่คำสั่งซื้อ', en: 'Order Number' },
    'f.required':    { th: 'ต้องใช้', en: 'Required' },
    'f.reserved':    { th: 'จองแล้ว', en: 'Reserved' },
    'f.available':   { th: 'คงเหลือ', en: 'Available' },
    'f.onhand':      { th: 'คงคลัง', en: 'On Hand' },
    'f.shortage':    { th: 'ขาด', en: 'Shortage' },
    'f.warehouse':   { th: 'คลัง', en: 'Warehouse' },
    'f.active':      { th: 'ใช้งาน', en: 'Active' },
    'f.inactive':    { th: 'ปิดใช้งาน', en: 'Inactive' },
    'f.username':    { th: 'ชื่อผู้ใช้', en: 'Username' },
    'f.password':    { th: 'รหัสผ่าน', en: 'Password' },
    'f.email':       { th: 'อีเมล', en: 'Email' },
    'f.role':        { th: 'บทบาท', en: 'Role' },
    'f.version':     { th: 'เวอร์ชัน', en: 'Version' },
    'f.progress':    { th: 'ความคืบหน้า', en: 'Progress' },
    'f.output':      { th: 'ผลผลิต', en: 'Output' },
    'f.target':      { th: 'เป้าหมาย', en: 'Target' },
    'f.capacity':    { th: 'กำลังการผลิต', en: 'Capacity' },
    'f.manpower':    { th: 'กำลังคน', en: 'Manpower' },

    /* ---- Units / misc ---- */
    'u.units':   { th: 'ชิ้น', en: 'units' },
    'u.pcs':     { th: 'ชิ้น', en: 'pcs' },
    'u.day':     { th: '/วัน', en: '/day' },
    'all':       { th: 'ทั้งหมด', en: 'All' },
    'rawmat':    { th: 'วัตถุดิบ', en: 'Raw Material' },
    'finished':  { th: 'สินค้าสำเร็จรูป', en: 'Finished Good' },

    /* ---- Dashboard ---- */
    'db.title':         { th: 'แดชบอร์ดผู้บริหาร', en: 'Management Dashboard' },
    'db.sub':           { th: 'ภาพรวมการผลิตแบบเรียลไทม์ · กะเช้า', en: 'Real-time production overview · Day shift' },
    'db.running':       { th: 'กำลังดำเนินการ', en: 'Orders Running' },
    'db.waiting':       { th: 'รอวัตถุดิบ', en: 'Waiting Material' },
    'db.scheduled':     { th: 'จัดตารางแล้ว', en: 'Scheduled' },
    'db.completed':     { th: 'เสร็จวันนี้', en: 'Completed Today' },
    'db.completedmonth': { th: 'เสร็จสิ้นเดือนนี้', en: 'Completed This Month' },
    'db.planactual':    { th: 'แผน vs ผลจริง', en: 'Plan vs Actual' },
    'db.dailyoutput':   { th: 'ผลผลิตรายวัน (7 วัน)', en: 'Daily Output (7 days)' },
    'db.caputil':       { th: 'อัตราการใช้กำลังการผลิต', en: 'Capacity Utilization' },
    'db.hourly':        { th: 'ผลผลิตรายชั่วโมง', en: 'Hourly Output' },
    'db.wipstation':    { th: 'งานระหว่างผลิตตามสถานี', en: 'WIP by Station' },
    'db.rmstock':       { th: 'สต็อกวัตถุดิบ', en: 'RM Stock' },
    'db.fgstock':       { th: 'สต็อกสินค้าสำเร็จรูป', en: 'FG Stock' },
    'db.nearexpiry':    { th: 'วัตถุดิบใกล้หมดอายุ', en: 'Near Expiry Materials' },
    'db.attention':     { th: 'รายการที่ต้องดำเนินการ', en: 'Needs Attention' },
    'db.linestatus':    { th: 'สถานะสายการผลิต', en: 'Line Status' },
    'db.plan':          { th: 'แผน', en: 'Plan' },
    'db.actual':        { th: 'ผลจริง', en: 'Actual' },

    /* ---- Flow / reservation ---- */
    'flow.title':       { th: 'สถานะใบสั่งผลิต', en: 'Order Status Flow' },
    'flow.sub':         { th: 'ติดตามคำสั่งจากคำขอผลิตถึงผลิตเสร็จ', en: 'Track demand from request to completion' },
    'flow.shortage':    { th: 'วัตถุดิบขาด', en: 'Material Shortage' },
    'flow.reservation': { th: 'การจองวัตถุดิบ', en: 'Material Reservation' },
    'flow.matcheck':    { th: 'ตรวจสอบวัตถุดิบตาม BOM', en: 'Material check against BOM' },
    'flow.allavail':    { th: 'วัตถุดิบครบ พร้อมเปิดใบสั่งผลิต', en: 'All materials available — ready to create PO' },
    'flow.hasshort':    { th: 'มีวัตถุดิบไม่เพียงพอ', en: 'Insufficient materials' },
    'flow.moveto':      { th: 'ดำเนินการต่อ', en: 'Advance to' },
    'flow.poname':      { th: 'ชื่อใบสั่งผลิต', en: 'Production Order No.' },
    'flow.reserved_ok': { th: 'จองสำเร็จ', en: 'Reserved' },

    /* ---- Schedule / Gantt ---- */
    'sch.title':     { th: 'ตารางการผลิต', en: 'Production Schedule' },
    'sch.sub':       { th: 'ลากใบสั่งผลิตวางบนสายการผลิต · ปรับขนาดเพื่อเปลี่ยนระยะเวลา', en: 'Drag orders onto lines · resize to change duration' },
    'sch.unassigned':{ th: 'ใบสั่งที่ยังไม่จัดตาราง', en: 'Unscheduled Orders' },
    'sch.dailycap':  { th: 'กำลังผลิต/วัน', en: 'Daily capacity' },
    'sch.today':     { th: 'วันนี้', en: 'Today' },
    'sch.draghint':  { th: 'ลากการ์ดมาวางบนสายการผลิต', en: 'Drag a card onto a production line' },

    /* ---- Process Designer ---- */
    'dsg.title':     { th: 'ออกแบบกระบวนการผลิต', en: 'Production Process Designer' },
    'dsg.sub':       { th: 'สร้างเทมเพลตขั้นตอนการผลิตแบบลากวาง', en: 'Build production workflow templates by drag & drop' },
    'dsg.templates': { th: 'เทมเพลตกระบวนการ', en: 'Workflow Templates' },
    'dsg.palette':   { th: 'คลังขั้นตอน', en: 'Step Library' },
    'dsg.canvas':    { th: 'ลำดับขั้นตอน', en: 'Workflow Steps' },
    'dsg.drophint':  { th: 'ลากขั้นตอนจากคลังมาวาง หรือลากเรียงลำดับใหม่', en: 'Drag steps from the library, or reorder them' },
    'dsg.duration':  { th: 'เวล', en: 'Duration' },

    /* ---- Shop floor ---- */
    'sf.title':      { th: 'ติดตามงานระหว่างผลิต', en: 'Shop Floor / WIP Tracking' },
    'sf.sub':        { th: 'ติดตาม WIP และรายงานผลผลิตทุกสถานี', en: 'Track WIP and report output at every station' },
    'sf.lot':        { th: 'ล็อตการผลิต', en: 'Production Lot' },
    'sf.wipboard':   { th: 'กระดาน WIP', en: 'WIP Board' },
    'sf.totalin':    { th: 'รับเข้า', en: 'In' },
    'sf.totalout':   { th: 'ส่งออก', en: 'Out' },
    'sf.atstation':  { th: 'คงค้างที่สถานี', en: 'At station' },
    'sf.cumoutput':  { th: 'ผลผลิตสะสม', en: 'Cumulative output' },
    'sf.reportout':  { th: 'รายงานผลผลิต', en: 'Report Output' },
    'sf.transferto': { th: 'ส่งต่อไปสถานีถัดไป', en: 'Transfer to next station' },
    'sf.outputlog':  { th: 'บันทึกผลผลิต', en: 'Output Log' },
    'sf.lotqty':     { th: 'จำนวนล็อต', en: 'Lot quantity' },

    /* ---- Warehouse ---- */
    'wh.recv.title': { th: 'รับเข้าวัตถุดิบ', en: 'Raw Material Receiving' },
    'wh.recv.sub':   { th: 'บันทึกการรับวัตถุดิบเข้าคลัง พร้อมล็อตและวันหมดอายุ', en: 'Record incoming materials with lot & expiry tracking' },
    'wh.issue.title':{ th: 'เบิกวัตถุดิบ', en: 'Material Issue' },
    'wh.issue.sub':  { th: 'เบิกตามใบสั่งผลิต หรือเบิกเพิ่มเติม', en: 'Issue by production order or additional issue' },
    'wh.issue.bypo': { th: 'เบิกตามใบสั่งผลิต', en: 'Issue from Production Order' },
    'wh.issue.add':  { th: 'เบิกเพิ่มเติม', en: 'Additional Issue' },
    'wh.issue.auto': { th: 'ระบบหักวัตถุดิบอัตโนมัติตาม BOM', en: 'Auto-consume materials based on BOM' },
    'wh.issue.log':  { th: 'รายการเบิก', en: 'Issue Log' },
    'wh.issue.type': { th: 'ประเภท', en: 'Type' },
    'wh.issue.refcol': { th: 'อ้างอิง', en: 'Reference' },
    'wh.issue.selectlot': { th: 'เลือกล็อตเบิก', en: 'Select lots to issue' },
    'wh.recentrecv': { th: 'รายการรับเข้าล่าสุด', en: 'Recent Receipts' },
    'wh.batches':    { th: 'ล็อตคงคลัง', en: 'Lots in Stock' },

    /* ---- FG receiving ---- */
    'fg.title':      { th: 'รับเข้าสินค้าสำเร็จรูป', en: 'Finished Good Receiving' },
    'fg.sub':        { th: 'สินค้าผลิตเสร็จรอ QC ก่อนเข้าคลัง', en: 'Completed goods await QC before entering FG warehouse' },
    'fg.received':   { th: 'รับเข้าแล้ว', en: 'Received' },
    'fg.produced':   { th: 'ผลิตเสร็จ', en: 'Produced' },
    'fg.ready':      { th: 'พร้อมรับ', en: 'Ready' },
    'fg.remaining':  { th: 'คงเหลือรอรับ', en: 'Remaining' },
    'fg.receivebatch': { th: 'รับเข้าสินค้าสำเร็จรูป', en: 'Receive FG Batch' },
    'fg.acceptbatch':  { th: 'ยืนยันรับเข้าคลัง', en: 'Receive into warehouse' },

    /* ---- Generic table/empty ---- */
    'tbl.noresults': { th: 'ไม่พบข้อมูล', en: 'No records found' },
    'tbl.showing':   { th: 'แสดง', en: 'Showing' },
    'of':            { th: 'จาก', en: 'of' },

    /* ---- Toasts ---- */
    'toast.saved':     { th: 'บันทึกเรียบร้อย', en: 'Saved successfully' },
    'toast.reserved':  { th: 'จองวัตถุดิบเรียบร้อย', en: 'Materials reserved' },
    'toast.pocreated': { th: 'เปิดใบสั่งผลิตเรียบร้อย', en: 'Production order created' },
    'toast.scheduled': { th: 'จัดตารางการผลิตเรียบร้อย', en: 'Order scheduled' },
    'toast.issued':    { th: 'เบิกวัตถุดิบเรียบร้อย', en: 'Materials issued' },
    'toast.received':  { th: 'รับเข้าเรียบร้อย', en: 'Receipt recorded' },
    'toast.transferred':{ th: 'ส่งต่อ WIP เรียบร้อย', en: 'WIP transferred' },
    'toast.reported':  { th: 'บันทึกผลผลิตเรียบร้อย', en: 'Output reported' },
    'toast.accepted':  { th: 'อนุมัติรับเข้าคลังเรียบร้อย', en: 'Accepted into FG warehouse' },
    'toast.tplsaved':  { th: 'บันทึกเทมเพลตกระบวนการเรียบร้อย', en: 'Workflow template saved' },
    'toast.completed': { th: 'ล็อตผลิตเสร็จสมบูรณ์', en: 'Lot completed' },
    'toast.started':   { th: 'เริ่มผลิตแล้ว — ล็อกสายการผลิต', en: 'Production started — line locked' },
    'toast.deleted':   { th: 'ลบคำสั่งซื้อเรียบร้อย', en: 'Order deleted' },
    'toast.reverted':  { th: 'ย้อนสถานะเรียบร้อย', en: 'Status reverted' },
    'toast.sold':      { th: 'บันทึกการขายออกเรียบร้อย', en: 'Sales issue recorded' },
    'toast.bomsaved':  { th: 'บันทึกสูตรการผลิตเรียบร้อย', en: 'BOM saved' },

    /* ---- FG Sales ---- */
    'nav.fgsales':     { th: 'เบิกขายสินค้า', en: 'FG Sales / Issue' },
    'fgs.title':       { th: 'เบิกขายสินค้าสำเร็จรูป', en: 'Finished Good Sales / Issue' },
    'fgs.sub':         { th: 'ตัดสต็อกสินค้าออกจากคลังตามเอกสารขาย พร้อมบันทึกรายงานการขาย', en: 'Deduct FG stock against a sales document and log the sales-out report' },
    'fgs.new':         { th: 'สร้างเอกสารขาย', en: 'New Sales Issue' },
    'fgs.docno':       { th: 'เลขที่เอกสารขาย', en: 'Sales Doc No.' },
    'fgs.salesrep':    { th: 'ผู้บันทึก/พนักงานขาย', en: 'Sales Rep' },
    'fgs.report':      { th: 'รายงานการขายออก', en: 'Sales-Out Report' },
    'fgs.totalout':    { th: 'ยอดขายออกรวม', en: 'Total Issued Out' },
    'fgs.docs':        { th: 'จำนวนเอกสารขาย', en: 'Sales Documents' },
    'fgs.nostock':     { th: 'สต็อกไม่พอ', en: 'Insufficient stock' },
    'fgs.line':        { th: 'รายการสินค้า', en: 'Line items' },
    'fgs.additem':     { th: 'เพิ่มรายการ', en: 'Add line' },
    'fgs.confirm':     { th: 'ยืนยันตัดสต็อก', en: 'Confirm & deduct stock' },

    /* ---- Schedule boards ---- */
    'sch.ready':       { th: 'ใบสั่งที่ยังไม่จัดตาราง (จองวัตถุดิบพร้อม)', en: 'Unscheduled (materials ready)' },
    'sch.waiting':     { th: 'ใบสั่งที่ยังไม่จัดตาราง (รอจองวัตถุดิบเข้า)', en: 'Unscheduled (awaiting material issue)' },
    'sch.gotoissue':   { th: 'ไปเบิกวัตถุดิบ', en: 'Go to Material Issue' },
    'sch.start':       { th: 'เริ่มผลิต', en: 'Start' },
    'sch.producing':   { th: 'กำลังผลิต', en: 'Running' },
    'sch.starthint':   { th: 'วางใบสั่งบนสาย แล้วกด “เริ่มผลิต” เพื่อยืนยันสายล่าสุดและเปิดให้รายงานผลหน้างาน', en: 'Place orders on a line, then press “Start” to lock the line and enable shop-floor reporting' },

    /* ---- BOM editing ---- */
    'bom.addline':     { th: 'เพิ่มวัตถุดิบ', en: 'Add material' },
    'bom.editline':    { th: 'แก้ไขรายการ', en: 'Edit line' },
    'bom.qtyper':      { th: 'ปริมาณต่อชิ้น', en: 'Qty per unit' },
    'bom.newver':      { th: 'เวอร์ชันใหม่', en: 'New version' },
    'btn.back':        { th: 'ย้อนกลับ', en: 'Step back' },
    'btn.issued':      { th: 'เบิกแล้ว', en: 'Issued' },
  };

  function tr(lang, key, vars) {
    const e = DICT[key];
    let s = e ? (e[lang] || e.en || key) : key;
    if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    return s;
  }

  // React context
  const I18nContext = React.createContext({ lang: 'th', t: (k) => k });
  function useI18n() { return React.useContext(I18nContext); }

  window.PG_I18N = { DICT, tr, I18nContext, useI18n };
})();
