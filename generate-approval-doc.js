const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, LevelFormat, TabStopType, TabStopPosition,
  PageNumber, NumberFormat, VerticalAlign
} = require('docx');
const fs = require('fs');

// ══════════════════════════════════════════
// PALETTE
// ══════════════════════════════════════════
const C = {
  navy:"0F4C81", navyDk:"0A2647", navyMd:"1A5FA8", navyLt:"EBF3FB",
  teal:"0D7377", tealLt:"E0F7F7",
  green:"065F46", greenLt:"DCFCE7", greenMd:"047857",
  red:"991B1B",  redLt:"FEE2E2",   redMd:"B91C1C",
  amber:"92400E",amberLt:"FEF3C7", amberMd:"B45309",
  purple:"4C1D95",purpleLt:"EDE9FE",purpleMd:"6D28D9",
  slate:"334155", mid:"475569", muted:"64748B",
  border:"CBD5E1", rowAlt:"F1F5F9",
  white:"FFFFFF", dark:"0F172A",
  rose:"881337",  roseLt:"FFE4E6",
  indigo:"312E81",indigoLt:"E0E7FF",
  cyan:"164E63",  cyanLt:"CFFAFE",
  orange:"7C2D12",orangeLt:"FFEDD5",
  gold:"78350F",  goldLt:"FEF9C3",
};

const brd    = {style:BorderStyle.SINGLE,size:1,color:C.border};
const brdAll = {top:brd,bottom:brd,left:brd,right:brd};
const thkL   = (col)=>({style:BorderStyle.THICK,size:14,color:col});

// ══════════════════════════════════════════
// TEXT HELPERS
// ══════════════════════════════════════════
const R=(text,o={})=>new TextRun({
  text:String(text), font:o.mono?"Courier New":"Arial",
  size:o.sz||18, color:o.c||C.dark,
  bold:!!o.b, italics:!!o.i,
  underline:o.ul?{}:undefined,
});
const sp=(n=1)=>Array.from({length:n},()=>
  new Paragraph({children:[new TextRun("")],spacing:{before:0,after:0}}));

// ══════════════════════════════════════════
// HEADINGS
// ══════════════════════════════════════════
const H1=(text,fill=C.navyDk)=>new Paragraph({
  heading:HeadingLevel.HEADING_1,
  shading:{fill,type:ShadingType.CLEAR},
  spacing:{before:560,after:220},
  children:[new TextRun({text:`  ${text}`,font:"Arial",size:34,bold:true,color:C.white})],
});
const H2=(text,fill=C.navy)=>new Paragraph({
  heading:HeadingLevel.HEADING_2,
  shading:{fill,type:ShadingType.CLEAR},
  spacing:{before:320,after:160},
  children:[new TextRun({text:`  ◈  ${text}`,font:"Arial",size:24,bold:true,color:C.white})],
});
const H3=(text,c=C.navyDk)=>new Paragraph({
  heading:HeadingLevel.HEADING_3,
  spacing:{before:260,after:100},
  border:{bottom:{style:BorderStyle.SINGLE,size:2,color:C.navy}},
  children:[new TextRun({text:`  ▸  ${text}`,font:"Arial",size:20,bold:true,color:c})],
});
const H4=(text,c=C.slate)=>new Paragraph({
  spacing:{before:160,after:60},
  children:[new TextRun({text:`  ◉  ${text}`,font:"Arial",size:18,bold:true,color:c})],
});

// ══════════════════════════════════════════
// PARAGRAPHS / LISTS
// ══════════════════════════════════════════
const P=(text,indent=0,c=C.dark,sz=18)=>new Paragraph({
  children:[new TextRun({text,font:"Arial",size:sz,color:c})],
  spacing:{before:55,after:55},indent:{left:indent},
});
const LI=(text,lv=0,c=C.dark)=>new Paragraph({
  numbering:{reference:"bul",level:lv},
  children:[new TextRun({text,font:"Arial",size:18,color:c})],
  spacing:{before:35,after:35},
});
const NLI=(text,lv=0,c=C.dark)=>new Paragraph({
  numbering:{reference:"nums",level:lv},
  children:[new TextRun({text,font:"Arial",size:18,color:c})],
  spacing:{before:35,after:35},
});

// ══════════════════════════════════════════
// ALERT
// ══════════════════════════════════════════
const ALERT=(text,type="info")=>{
  const M={
    info:  {fill:C.navyLt,  bc:C.navy,    tc:C.navyDk,  icon:"ℹ"},
    ok:    {fill:C.greenLt, bc:C.green,   tc:C.green,   icon:"✓"},
    warn:  {fill:C.amberLt, bc:C.amber,   tc:C.amber,   icon:"⚠"},
    err:   {fill:C.redLt,   bc:C.red,     tc:C.red,     icon:"✕"},
    tip:   {fill:C.purpleLt,bc:C.purple,  tc:C.purple,  icon:"💡"},
    new:   {fill:C.tealLt,  bc:C.teal,    tc:C.teal,    icon:"★"},
    gold:  {fill:C.goldLt,  bc:C.gold,    tc:C.gold,    icon:"🏆"},
    code:  {fill:"1E293B",  bc:"475569",  tc:"94A3B8",  icon:"⚡"},
    flow:  {fill:C.indigoLt,bc:C.indigo,  tc:C.indigo,  icon:"🔄"},
    ui:    {fill:C.orangeLt,bc:C.orange,  tc:C.orange,  icon:"🎨"},
  }[type]||{fill:C.navyLt,bc:C.navy,tc:C.navyDk,icon:"ℹ"};
  const isMono=type==="code";
  return new Paragraph({
    shading:{fill:M.fill,type:ShadingType.CLEAR},
    border:{left:thkL(M.bc)},
    spacing:{before:80,after:80},
    indent:{left:120,right:80},
    children:[new TextRun({
      text:`  ${M.icon}  ${text}`,
      font:isMono?"Courier New":"Arial",
      size:isMono?16:17, color:M.tc,
      bold:type==="err"||type==="warn",
    })],
  });
};

// ══════════════════════════════════════════
// CODE BLOCK
// ══════════════════════════════════════════
const CODE=(lines=[])=>lines.map(t=>new Paragraph({
  shading:{fill:"1E293B",type:ShadingType.CLEAR},
  spacing:{before:8,after:8},
  indent:{left:120,right:80},
  children:[new TextRun({text:t,font:"Courier New",size:16,color:"94A3B8"})],
}));

// ══════════════════════════════════════════
// TABLE
// ══════════════════════════════════════════
const mkHdr=(cols,widths,fill=C.navy)=>new TableRow({
  tableHeader:true,
  children:cols.map((c,i)=>new TableCell({
    width:{size:widths[i],type:WidthType.DXA},
    shading:{fill,type:ShadingType.CLEAR},
    borders:brdAll, margins:{top:85,bottom:85,left:130,right:130},
    verticalAlign:VerticalAlign.CENTER,
    children:[new Paragraph({
      alignment:AlignmentType.CENTER,
      children:[new TextRun({text:String(c),font:"Arial",size:17,bold:true,color:C.white})],
    })],
  }))
});

const mkDR=(vals,widths,rowFill)=>new TableRow({
  children:vals.map((v,ci)=>{
    const isObj=(typeof v==="object"&&v!==null&&!Array.isArray(v));
    const txt=isObj?v.t:v;
    const opts=isObj?v:{};
    const w=widths[ci];
    return new TableCell({
      width:w?{size:w,type:WidthType.DXA}:undefined,
      shading:(opts.fill||rowFill)?{fill:opts.fill||rowFill,type:ShadingType.CLEAR}:undefined,
      borders:brdAll, margins:{top:70,bottom:70,left:130,right:130},
      verticalAlign:VerticalAlign.CENTER,
      children:[new Paragraph({
        alignment:opts.center?AlignmentType.CENTER:AlignmentType.RIGHT,
        children:[new TextRun({
          text:String(txt),
          font:opts.mono?"Courier New":"Arial",
          size:opts.sz||17, color:opts.c||C.dark, bold:!!opts.b,
        })],
      })],
    });
  })
});

const TBL=(headers,rows,widths,fillHdr=C.navy)=>{
  const total=widths.reduce((a,b)=>a+b,0);
  return new Table({
    width:{size:total,type:WidthType.DXA}, columnWidths:widths,
    rows:[
      mkHdr(headers,widths,fillHdr),
      ...rows.map((row,ri)=>mkDR(row,widths,ri%2!==0?C.rowAlt:undefined))
    ],
  });
};

const DIV=(label="")=>new Paragraph({
  alignment:AlignmentType.CENTER, spacing:{before:280,after:280},
  children:[new TextRun({text:`━━━━━━━━━━  ${label}  ━━━━━━━━━━`,font:"Arial",size:16,color:C.border})],
});

// ══════════════════════════════════════════
// FLOW STEP BOX — for workflow diagrams
// ══════════════════════════════════════════
const FLOW_STEP=(num,actor,action,fill,tc)=>new Paragraph({
  shading:{fill,type:ShadingType.CLEAR},
  spacing:{before:40,after:40},
  indent:{left:80,right:80},
  children:[
    new TextRun({text:`  ${num}  `,font:"Arial",size:16,bold:true,color:tc}),
    new TextRun({text:`[${actor}]  `,font:"Arial",size:16,bold:true,color:tc}),
    new TextRun({text:action,font:"Arial",size:17,color:tc}),
    new TextRun({text:"  ▼",font:"Arial",size:16,color:tc}),
  ],
});

// ══════════════════════════════════════════
// CONTENT
// ══════════════════════════════════════════
const BODY=[];
const add=(...items)=>{ items.flat().forEach(i=>BODY.push(i)); };

// ─────────────────────────────── COVER ───────────────────────────────
add(
  new Paragraph({spacing:{before:550,after:0},children:[new TextRun("")]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:40},
    children:[new TextRun({text:"⬡  SLMS",font:"Arial",size:128,bold:true,color:C.navy})],
  }),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:60},
    children:[R("Smart Logistics Management System",{sz:26,c:C.muted})],
  }),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:300},
    children:[R("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",{sz:16,c:C.border})],
  }),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:80},
    children:[new TextRun({text:"🔄  نظام الموافقات والاعتماد الشامل",font:"Arial",size:58,bold:true,color:C.navyDk})],
  }),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:40},
    children:[R("Approval & Authorization Workflow Engine",{sz:24,c:C.muted})],
  }),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:320},
    children:[R("إنشاء → مراجعة → موافقة → اعتماد → تنفيذ محاسبي",{sz:20,c:C.navyMd,b:true})],
  }),
  TBL([],[
    ["نوع الوثيقة","وثيقة تأسيس ميزة نظام الموافقات والاعتماد الكاملة"],
    ["الهدف","سيناريو تفصيلي لبناء دورة الحياة الكاملة لكل المستندات المالية والتشغيلية"],
    ["يشمل","BPMN · DB Schema · API · UI/UX · إشعارات · صلاحيات · اختبار"],
    ["النطاق","جميع العمليات: القيود اليومية · سندات الصرف · التحويلات · الشحنات · المشتريات · وغيرها"],
    ["المرجع","SAP Workflow · Oracle Approval Management · Odoo Approval Routes"],
    ["الإصدار","v1.0 — وثيقة تأسيس"],
  ],[3200,6800],[C.navy]),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 0: CONCEPTS ───────────────────────────
add(
  H1("0. المفاهيم والمصطلحات الأساسية"),
  ALERT("اقرأ هذا القسم أولاً — كل مصطلح له معنى دقيق في النظام","warn"),
  ...sp(),

  H2("0.1  المصطلحات الأساسية"),
  TBL(
    ["المصطلح","التعريف","مثال"],
    [
      ["المستند (Document)","أي طلب أو عملية تحتاج موافقة قبل التنفيذ","قيد يومي · سند صرف · أمر شراء"],
      ["المُنشئ (Creator / A)","المستخدم الذي أنشأ المستند وأرسله للمراجعة","محاسب مدخل بيانات"],
      ["المراجع (Reviewer / B)","المستخدم المخوَّل بمراجعة وقبول أو رفض المستند","مشرف الحسابات"],
      ["المعتمِد (Approver / C)","المستخدم ذو الصلاحية العليا لتعميد المستند ليأخذ أثراً محاسبياً","المدير المالي / مدير القسم"],
      ["دورة الموافقة (Approval Route)","سلسلة المستخدمين المطلوب مرور المستند عليهم بالترتيب","A → B → C"],
      ["التعميد (Post / Commit)","الإجراء الذي يُعطي المستند أثره القانوني والمحاسبي","عند التعميد: يُقيَّد في الحسابات"],
      ["قيد الانتظار (Pending State)","المستند وُجِد لكن لا أثر محاسبي حتى التعميد","draft → pending → approved → posted"],
      ["الإلغاء (Void)","إبطال مستند مُعتمَد — يُنشئ قيد عكسي تلقائياً","المدير يُلغي سند صرف مُعتمَد"],
      ["التفويض (Delegation)","المعتمِد يُفوِّض صلاحيته لمستخدم آخر مؤقتاً","عند الإجازة"],
      ["حد الاعتماد (Approval Limit)","الحد المالي الذي يُعتمَد فوقه تلقائياً أو يحتاج مستوى أعلى","C يعتمد حتى 50,000 — فوقها يذهب لـ D"],
    ],
    [2200,4500,3300]
  ),
  ...sp(),

  H2("0.2  مبادئ التصميم الذهبية"),
  LI("🔒  لا مستند يأخذ أثراً محاسبياً قبل اكتمال سلسلة الاعتماد كاملاً"),
  LI("📝  كل إجراء في دورة الموافقة يُسجَّل في سجل تدقيق لا يمكن حذفه (WORM)"),
  LI("🔔  كل تحرك في المستند يُولِّد إشعاراً فورياً للأطراف المعنية"),
  LI("🔄  الرفض يُعيد المستند للمنشئ مع سبب واضح قابل للرؤية"),
  LI("⏰  لكل مرحلة SLA زمني — تجاوزه يُولِّد تنبيهاً للمسؤول"),
  LI("👁  كل مستخدم يرى مساره فقط — لا يرى ما لا يخصه"),
  LI("⛓  الأثر المحاسبي مرتبط بحدث التعميد — لا بالإنشاء ولا بالموافقة"),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 1: DB SCHEMA ───────────────────────────
add(
  H1("1. تصميم قاعدة البيانات — Database Schema"),
  ALERT("🔴 أهم قسم تقني — البنية الصحيحة هنا تضمن صحة كل شيء فوقها","err"),
  ...sp(),

  H2("1.1  الجداول الرئيسية"),
  H3("جدول approval_routes — قوالب دورات الاعتماد"),
  TBL(
    ["الحقل","النوع","القيود","الوصف"],
    [
      ["id","UUID","PK",""],
      ["tenant_id","UUID","FK → tenants, NOT NULL","العميل المالك"],
      ["name_ar","VARCHAR(255)","NOT NULL","اسم القالب بالعربي: 'دورة اعتماد القيود'"],
      ["name_en","VARCHAR(255)","NOT NULL","اسم القالب بالإنجليزي"],
      ["document_type","ENUM","NOT NULL","journal_entry|payment_voucher|receipt_voucher|bank_transfer|purchase_order|sales_order|expense|shipment|customs|contract"],
      ["is_active","BOOLEAN","DEFAULT true","هل الدورة مُفعَّلة؟"],
      ["min_amount","DECIMAL(18,2)","DEFAULT 0","الحد الأدنى للمبلغ — تحته تُعتمَد تلقائياً"],
      ["max_amount","DECIMAL(18,2)","NULLABLE","الحد الأقصى — فوقه تذهب لمستوى أعلى"],
      ["auto_approve_below","DECIMAL(18,2)","NULLABLE","مبلغ صغير يُعتمَد تلقائياً دون مراجعة"],
      ["require_all_steps","BOOLEAN","DEFAULT true","هل كل الخطوات إلزامية؟"],
      ["sla_hours","INTEGER","DEFAULT 24","الوقت المسموح لكل خطوة (ساعات)"],
      ["created_by","UUID","FK → users",""],
      ["created_at","TIMESTAMPTZ","auto",""],
    ],
    [2200,1800,2500,4500]
  ),
  ...sp(),

  H3("جدول approval_steps — خطوات كل دورة"),
  TBL(
    ["الحقل","النوع","القيود","الوصف"],
    [
      ["id","UUID","PK",""],
      ["route_id","UUID","FK → approval_routes",""],
      ["step_number","INTEGER","NOT NULL · 1,2,3...","رقم الخطوة بالترتيب"],
      ["step_type","ENUM","NOT NULL","review (مراجعة) | approve (اعتماد) | notify (إشعار فقط)"],
      ["role_id","UUID","FK → roles, NULLABLE","الدور المطلوب (إما role أو user أو department)"],
      ["user_id","UUID","FK → users, NULLABLE","مستخدم محدد (أولوية على role)"],
      ["department","VARCHAR(100)","NULLABLE","قسم كامل"],
      ["approval_type","ENUM","DEFAULT 'any_one'","any_one|all_required|majority"],
      ["can_delegate","BOOLEAN","DEFAULT true","هل يمكن التفويض؟"],
      ["is_mandatory","BOOLEAN","DEFAULT true","هل الخطوة إلزامية؟"],
      ["escalate_after_hours","INTEGER","NULLABLE","التصعيد التلقائي بعد كذا ساعة"],
      ["escalate_to_user","UUID","FK → users, NULLABLE","يُصعَّد لمن عند انتهاء الوقت"],
      ["note_required_on_reject","BOOLEAN","DEFAULT true","يُجبَر على كتابة سبب الرفض"],
    ],
    [2200,1800,2500,4500]
  ),
  ...sp(),

  H3("جدول documents — المستندات"),
  TBL(
    ["الحقل","النوع","الوصف"],
    [
      ["id","UUID","PK"],
      ["tenant_id","UUID","العميل — عزل كامل"],
      ["document_number","VARCHAR(50)","رقم تسلسلي: JE-2024-00001"],
      ["document_type","ENUM","journal_entry|payment_voucher|receipt_voucher|bank_transfer|purchase_order|expense|shipment|customs|contract|..."],
      ["reference_id","UUID","مفتاح للجدول الفعلي (journal_entries / payment_vouchers / ...)"],
      ["title","VARCHAR(500)","عنوان مختصر للمستند"],
      ["amount","DECIMAL(18,2)","المبلغ الإجمالي (للمقارنة مع حدود الاعتماد)"],
      ["currency","VARCHAR(3)","رمز العملة"],
      ["status","ENUM","draft | pending_review | under_review | approved | rejected | pending_approval | pending_post | posted | voided | cancelled"],
      ["route_id","UUID","FK → approval_routes — الدورة المستخدمة"],
      ["current_step","INTEGER","الخطوة الحالية في الدورة"],
      ["created_by","UUID","FK → users — المنشئ (A)"],
      ["branch_id","UUID","FK → branches"],
      ["notes","TEXT","ملاحظات المنشئ"],
      ["attachments","JSONB","مصفوفة مرفقات: [{name, url, size, type}]"],
      ["submitted_at","TIMESTAMPTZ","وقت الإرسال للمراجعة"],
      ["approved_at","TIMESTAMPTZ","وقت الموافقة النهائية"],
      ["posted_at","TIMESTAMPTZ","وقت التعميد (يأخذ الأثر المحاسبي)"],
      ["due_date","DATE","تاريخ الاستحقاق (إن وجد)"],
      ["priority","ENUM","low|normal|high|urgent"],
      ["created_at","TIMESTAMPTZ","auto"],
      ["updated_at","TIMESTAMPTZ","auto"],
    ],
    [2500,1800,6700]
  ),
  ...sp(),

  H3("جدول document_approvals — سجل كل إجراء في دورة المستند"),
  TBL(
    ["الحقل","النوع","الوصف"],
    [
      ["id","UUID","PK"],
      ["document_id","UUID","FK → documents"],
      ["step_id","UUID","FK → approval_steps"],
      ["step_number","INTEGER","رقم الخطوة"],
      ["action","ENUM","submitted|reviewed|approved|rejected|posted|voided|cancelled|delegated|escalated|recalled"],
      ["actor_id","UUID","FK → users — من قام بالإجراء"],
      ["delegated_by","UUID","FK → users, NULLABLE — في حال التفويض"],
      ["comment","TEXT","تعليق أو سبب الرفض — إلزامي عند الرفض"],
      ["read_at","TIMESTAMPTZ","متى اطّلع المعنيّ على المستند أول مرة"],
      ["acted_at","TIMESTAMPTZ","متى تم الإجراء"],
      ["ip_address","INET","عنوان IP لتسجيل من أين تمت العملية"],
      ["user_agent","TEXT","المتصفح / الجهاز"],
      ["created_at","TIMESTAMPTZ","auto — WORM: INSERT ONLY"],
    ],
    [2500,1800,7700]
  ),
  ALERT("WORM Policy: جدول document_approvals لا يُحذَف ولا يُعدَّل — INSERT فقط — Trigger في PostgreSQL يمنع ذلك","err"),
  ...sp(),

  H3("جدول document_watchers — المراقبون"),
  TBL(
    ["الحقل","النوع","الوصف"],
    [
      ["id","UUID","PK"],
      ["document_id","UUID","FK → documents"],
      ["user_id","UUID","FK → users — المراقب"],
      ["added_by","UUID","FK → users — من أضافه"],
      ["notify_on","TEXT[]","الأحداث التي يُشعَر بها: ['submitted','approved','rejected','posted']"],
      ["created_at","TIMESTAMPTZ","auto"],
    ],
    [2000,1800,8200]
  ),
  ...sp(),

  H3("جدول document_delegations — التفويضات المؤقتة"),
  TBL(
    ["الحقل","النوع","الوصف"],
    [
      ["id","UUID","PK"],
      ["from_user","UUID","FK → users — المفوِّض"],
      ["to_user","UUID","FK → users — المفوَّض إليه"],
      ["document_types","TEXT[]","أنواع المستندات المفوَّضة — فارغ = الكل"],
      ["valid_from","TIMESTAMPTZ","بداية التفويض"],
      ["valid_until","TIMESTAMPTZ","نهاية التفويض"],
      ["is_active","BOOLEAN","DEFAULT true"],
      ["reason","TEXT","سبب التفويض (إجازة مثلاً)"],
      ["tenant_id","UUID","FK → tenants"],
    ],
    [2000,1800,8200]
  ),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 2: STATUS MACHINE ───────────────────────────
add(
  H1("2. آلة الحالات — Document Status State Machine"),
  ALERT("كل حالة تحدد ما يمكن فعله بالمستند — لا يمكن القفز على حالة","flow"),
  ...sp(),

  H2("2.1  الحالات الكاملة وانتقالاتها"),
  TBL(
    ["الحالة","الاسم العربي","لون الـ Badge","من يمكنه الانتقال منها","إلى أين"],
    [
      [{t:"draft",c:C.muted,b:true},"مسودة","رمادي","المنشئ (A)","pending_review (بالإرسال) | deleted"],
      [{t:"pending_review",c:C.amberMd,b:true},"بانتظار المراجعة","أصفر","المراجع (B)","under_review (عند الاطلاع) | recalled (A يسترده)"],
      [{t:"under_review",c:C.purple,b:true},"تحت المراجعة","بنفسجي","المراجع (B)","approved (قبول) | rejected (رفض)"],
      [{t:"approved",c:C.navy,b:true},"موافق عليه","أزرق","المعتمِد (C)","pending_post | rejected"],
      [{t:"rejected",c:C.redMd,b:true},"مرفوض","أحمر","المنشئ (A)","draft (تعديل وإعادة إرسال) | cancelled"],
      [{t:"pending_post",c:C.amberMd,b:true},"بانتظار التعميد","برتقالي","المعتمِد (C) أو النظام","posted | rejected | voided"],
      [{t:"posted",c:C.green,b:true},"مُعتمَد ومُقيَّد","أخضر داكن","المعتمِد (C) فقط","voided (إلغاء مع قيد عكسي)"],
      [{t:"voided",c:C.red,b:true},"ملغى","أحمر داكن","—","نهائي — لا رجعة"],
      [{t:"cancelled",c:C.slate,b:true},"مُلغى بواسطة المنشئ","رمادي داكن","—","نهائي — لا رجعة"],
    ],
    [2000,2000,1800,3000,3200]
  ),
  ...sp(),

  H2("2.2  مخطط الانتقالات المرئي"),
  ALERT("المخطط التالي يوضح دورة الحياة الكاملة لأي مستند في النظام","flow"),
  ...CODE([
    "                    ┌─────────────────────────────────────────────┐",
    "                    │            DOCUMENT LIFECYCLE               │",
    "                    └─────────────────────────────────────────────┘",
    "",
    "  [A يُنشئ]                                                         ",
    "      │                                                              ",
    "      ▼                                                              ",
    "  ┌───────┐   [A يُرسل]   ┌──────────────────┐                      ",
    "  │ draft │ ────────────► │  pending_review   │ ◄── [A يسترده]      ",
    "  └───────┘               └──────────────────┘                      ",
    "      ▲                           │ [B يطّلع]                        ",
    "      │                           ▼                                  ",
    "      │                   ┌──────────────┐                           ",
    "      │                   │ under_review │                           ",
    "      │                   └──────────────┘                           ",
    "      │                    │            │                            ",
    "      │               [B يقبل]    [B يرفض]                          ",
    "      │                    │            │                            ",
    "      │                    ▼            ▼                            ",
    "      │             ┌──────────┐   ┌──────────┐                     ",
    "      │             │ approved │   │ rejected │ ──► [A يُعدِّل]      ",
    "      │             └──────────┘   └──────────┘         │           ",
    "      │                  │              │                └──► draft  ",
    "      │             [C يُعمِّد]   [C يرفض]                            ",
    "      │                  │                                           ",
    "      │                  ▼                                           ",
    "      │          ┌──────────────┐                                    ",
    "      │          │ pending_post │                                    ",
    "      │          └──────────────┘                                    ",
    "      │                  │ [C أو النظام يُقيِّد]                      ",
    "      │                  ▼                                           ",
    "      │          ┌────────────┐   [C يُلغي]   ┌────────┐            ",
    "      │          │   posted   │ ────────────► │ voided │            ",
    "      │          └────────────┘               └────────┘            ",
    "      │                                        (قيد عكسي تلقائي)   ",
    "      │                                                              ",
    "   [A يُلغي]──────────────────────────────────► cancelled           ",
  ]),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 3: DOCUMENT TYPES ───────────────────────────
add(
  H1("3. أنواع المستندات الخاضعة للاعتماد"),
  ALERT("كل نوع مستند له دورة اعتماد مستقلة قابلة للتخصيص لكل عميل","info"),
  ...sp(),

  H2("3.1  قائمة المستندات الكاملة"),
  TBL(
    ["#","نوع المستند","الكود","الوحدة","الأثر عند التعميد","حد مالي افتراضي"],
    [
      ["1","قيد يومي","journal_entry","accounting","تأثير على الأرصدة المحاسبية","أي مبلغ"],
      ["2","سند صرف","payment_voucher","accounting","خصم من الصندوق / البنك","فوق 1,000 SAR"],
      ["3","سند قبض","receipt_voucher","accounting","إضافة للصندوق / البنك","أي مبلغ"],
      ["4","أمر تحويل بنكي","bank_transfer","accounting","تحويل بين حسابات","فوق 5,000 SAR"],
      ["5","أمر شراء","purchase_order","procurement","التزام بشراء من مورد","فوق 500 SAR"],
      ["6","مطالبة مصروف","expense_claim","accounting","سداد مصروفات موظف","فوق 200 SAR"],
      ["7","فاتورة مورد","vendor_invoice","accounting","التزام بدفع للمورد","أي مبلغ"],
      ["8","إشعار خصم","debit_note","accounting","خصم من حساب الدائن","أي مبلغ"],
      ["9","إشعار إضافة","credit_note","accounting","إضافة لحساب المدين","أي مبلغ"],
      ["10","أمر استيراد شحنة","shipment_order","shipments","بدء عملية الشحن","فوق 1,000 SAR"],
      ["11","طلب تخليص جمركي","customs_declaration","customs","بدء التخليص","أي مبلغ"],
      ["12","عقد مورد","supplier_contract","procurement","ربط المورد بعقد","أي عقد"],
      ["13","أمر إعادة تخزين","stock_adjustment","warehousing","تعديل المخزون","أي كمية"],
      ["14","طلب عرض سعر","rfq","procurement","إرسال للموردين","أي مبلغ"],
      ["15","تسوية بنكية","bank_reconciliation","accounting","إقفال الفرق","فوق 0"],
    ],
    [500,2500,2000,1600,3000,2400]
  ),
  ...sp(),

  H2("3.2  هيكل دورة الاعتماد لكل نوع"),
  TBL(
    ["نوع المستند","المرحلة 1","المرحلة 2","المرحلة 3","تعميد تلقائي؟"],
    [
      ["قيد يومي","مراجع محاسبة (B)","مدير مالي (C)","—","إذا < 500 SAR"],
      ["سند صرف","مراجع محاسبة (B)","مدير مالي (C)","مدير عام (D) إذا > 50K","لا"],
      ["سند قبض","مراجع محاسبة (B)","—","—","إذا < 1,000 SAR"],
      ["تحويل بنكي","مراجع محاسبة (B)","مدير مالي (C)","مدير عام + توقيع (D)","لا"],
      ["أمر شراء","مشرف مشتريات (B)","مدير مالي (C)","مدير عام (D) إذا > 100K","إذا < 500 SAR"],
      ["مطالبة مصروف","مشرف القسم (B)","مراجع محاسبة (C)","—","إذا < 100 SAR"],
      ["أمر شحنة","مشرف عمليات (B)","مدير العمليات (C)","—","لا"],
      ["تخليص جمركي","مشرف جمارك (B)","مدير العمليات (C)","—","لا"],
      ["تسوية بنكية","مراجع محاسبة (B)","مدير مالي (C)","—","لا"],
    ],
    [2500,2200,2200,2200,1900]
  ),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 4: DETAILED FLOW ───────────────────────────
add(
  H1("4. دورة الاعتماد التفصيلية — سيناريو خطوة بخطوة"),
  ALERT("السيناريو المرجعي: قيد يومي من A ← B ← C — تتبعه حرفياً في التطوير والاختبار","tip"),
  ...sp(),

  H2("4.1  المرحلة الأولى: الإنشاء والإرسال (A)"),
  H3("ما يفعله المستخدم A"),
  NLI("يفتح: المحاسبة → القيود اليومية → '+ قيد جديد'"),
  NLI("يملأ بيانات القيد: التاريخ، الوصف، الحسابات المدينة والدائنة"),
  NLI("يُرفق المستندات الداعمة (فاتورة، عقد، صورة)"),
  NLI("يضغط 'حفظ كمسودة' — المستند في حالة draft — لا أثر محاسبي"),
  NLI("يراجع المستند ويضغط 'إرسال للمراجعة'"),
  NLI("الواجهة: نافذة تأكيد — 'سيُرسَل للمستخدم [ب — اسمه] للمراجعة. هل أنت متأكد؟'"),
  NLI("يضغط تأكيد → الحالة تصبح pending_review"),
  ...sp(),

  H3("ما يفعله النظام عند الإرسال"),
  ...CODE([
    "// ApprovalService.submitDocument(documentId, userId)",
    "",
    "1. التحقق من صلاحية المستخدم (documents:create + submit)",
    "2. التحقق من اكتمال البيانات الإلزامية",
    "3. البحث عن الـ approval_route المناسب:",
    "   - document_type + amount range + tenant_id",
    "   - إذا لم تُوجَد دورة: خطأ → 'لم يُعيَّن مسار اعتماد لهذا النوع'",
    "4. التحقق من التعميد التلقائي (auto_approve_below):",
    "   - إذا amount <= auto_approve_below: تُعتمَد مباشرة → status=posted",
    "5. تحديد الخطوة الأولى من approval_steps:",
    "   - يُحدِّد المستخدم المعنيّ (role أو user محدد)",
    "6. تحديث: documents.status = 'pending_review'",
    "             documents.current_step = 1",
    "             documents.submitted_at = NOW()",
    "7. INSERT في document_approvals:",
    "   {action:'submitted', actor_id: A, comment: null}",
    "8. إرسال إشعار للمراجع (B):",
    "   - In-App Notification + Email + (SMS اختياري)",
    "9. تسجيل في audit_logs",
  ]),
  ...sp(),

  H2("4.2  المرحلة الثانية: المراجعة (B)"),
  H3("إشعار المراجع B"),
  TBL(
    ["قناة الإشعار","محتوى الرسالة","وقت الإرسال"],
    [
      ["🔔 Bell (In-App)","لديك مستند جديد بانتظار مراجعتك: [رقم القيد] - [المبلغ]","فوري"],
      ["📧 Email","عنوان: مستند يحتاج مراجعتك — [اسم الشركة]\nجسم: [اسم المنشئ] أرسل قيداً بقيمة [X SAR] بتاريخ [Y]\nرابط مباشر للمستند","فوري"],
      ["📱 Push (جوال)","[الاسم] أرسل لك مستنداً للمراجعة","فوري"],
      ["⏰ تذكير","لم تُراجَع بعد [N ساعة] — اضغط هنا","بعد نصف SLA"],
      ["🚨 تصعيد","انتهى SLA المراجعة — المستند يُصعَّد لـ [المشرف]","عند انتهاء SLA"],
    ],
    [2000,5000,2000]
  ),
  ...sp(),
  H3("ما يفعله المراجع B"),
  NLI("يضغط على الإشعار → يُوجَّه مباشرة للمستند"),
  NLI("النظام يُسجِّل: read_at = NOW() في document_approvals (اطُّلع عليه)"),
  NLI("يرى: بيانات المستند + المرفقات + تاريخ الإنشاء + الملاحظات"),
  NLI("لديه 3 خيارات: [✅ قبول] [❌ رفض] [↩ إعادة توجيه]"),
  ...sp(),
  H3("خيار 1: القبول"),
  NLI("يضغط '✅ قبول'"),
  NLI("نافذة اختيارية: 'تعليق (اختياري)' + زر 'تأكيد القبول'"),
  NLI("النظام: document_approvals INSERT {action:'approved', actor:B}"),
  NLI("النظام: ينتقل للخطوة التالية (C المعتمِد)"),
  NLI("النظام: documents.status = 'approved'"),
  NLI("إشعار لـ C: 'مستند [X] اعتُمِد من [B] ويحتاج تعميدك'"),
  NLI("إشعار لـ A: 'مستندك [X] وافق عليه [B] — في انتظار التعميد'"),
  ...sp(),
  H3("خيار 2: الرفض"),
  NLI("يضغط '❌ رفض'"),
  NLI("نافذة إلزامية: حقل 'سبب الرفض' (مطلوب · min 10 حروف)"),
  NLI("اختياري: 'طلب مرفق إضافي'"),
  NLI("يضغط 'تأكيد الرفض'"),
  NLI("النظام: document_approvals INSERT {action:'rejected', actor:B, comment:سبب_الرفض}"),
  NLI("النظام: documents.status = 'rejected'"),
  NLI("النظام: documents.current_step = 1 (إعادة تعيين)"),
  NLI("إشعار عاجل لـ A:"),
  NLI("🔴 'مستندك [رقم القيد] مرفوض — السبب: [النص]'",1),
  NLI("زر مباشر: 'عرض المستند وتعديله'",1),
  NLI("لا يُرسَل إشعار لـ C (لم يصله بعد)"),
  ...sp(),
  H3("خيار 3: إعادة التوجيه"),
  NLI("يضغط '↩ إعادة توجيه'"),
  NLI("يختار مستخدماً آخر من قائمة + يكتب سبب التوجيه"),
  NLI("النظام: يُعدِّل الخطوة الحالية لتشير للمستخدم الجديد"),
  NLI("يُسجَّل في document_approvals: {action:'delegated'}"),
  ...sp(),

  H2("4.3  المرحلة الثالثة: التعميد (C)"),
  H3("خيار 1: التعميد والتقييد"),
  NLI("C يفتح المستند → يرى: بيانات القيد + سجل الموافقة من B"),
  NLI("يضغط '⛓ اعتماد وتقييد'"),
  NLI("نافذة تأكيد: 'سيُقيَّد هذا المستند محاسبياً — لا رجعة إلا بإلغاء رسمي'"),
  NLI("يضغط تأكيد → النظام:"),
  NLI("documents.status = 'posted', documents.posted_at = NOW()",1),
  NLI("INSERT في الجداول المحاسبية (journal_entries_lines, account_balances...)",1),
  NLI("document_approvals INSERT {action:'posted', actor:C}",1),
  NLI("إشعار لـ A: '✅ مستندك [X] تم تعميده بنجاح من [C]'",1),
  NLI("إشعار للمحاسب العام: 'قيد جديد مُعتمَد: [X]'",1),
  ...sp(),
  H3("خيار 2: رفض من المعتمِد"),
  NLI("C يضغط '❌ رفض'"),
  NLI("نافذة إلزامية: سبب الرفض"),
  NLI("documents.status = 'rejected'"),
  NLI("إشعار عاجل لـ A و B: 'مستند [X] رُفض من المعتمِد [C] — السبب: [...]'"),
  ...sp(),
  H3("خيار 3: الإلغاء (لمستند مُعتمَد مسبقاً فقط)"),
  NLI("C يضغط '🚫 إلغاء المستند'"),
  NLI("النظام يتحقق: documents.status == 'posted'"),
  NLI("نافذة تأكيد بخطوتين: سبب + 'أكتب كلمة VOID للتأكيد'"),
  NLI("النظام:"),
  NLI("documents.status = 'voided'",1),
  NLI("إنشاء قيد عكسي تلقائي (Reversal Entry) بنفس المبالغ معكوسة",1),
  NLI("document_approvals INSERT {action:'voided', actor:C, comment:السبب}",1),
  NLI("إشعار لـ A وB وC وجميع المراقبين:"),
  NLI("'🔴 تم إلغاء المستند [X] من قِبَل [C] — السبب: [...] — تم إنشاء قيد عكسي [رقم]'",1),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 5: UI SCREENS ───────────────────────────
add(
  H1("5. تصميم الشاشات — UI/UX Specifications"),
  ALERT("🎨 الهدف: تجربة بصرية تُضاهي Notion + Linear + SAP Fiori بطابع عربي أصيل","ui"),
  ...sp(),

  H2("5.1  شاشة إنشاء المستند — Document Creator"),
  H3("هيكل الصفحة"),
  TBL(
    ["المنطقة","المحتوى","التفاصيل"],
    [
      ["رأس الصفحة","breadcrumb + رقم تسلسلي تلقائي + الحالة badge","رقم: JE-2024-00001 | حالة: مسودة (رمادي)"],
      ["الجزء الأيسر (70%)","النموذج الرئيسي","حقول المستند الأساسية"],
      ["الجزء الأيمن (30%)","لوحة المعلومات الجانبية","دورة الاعتماد + المرفقات + التعليقات + المراقبون"],
      ["ذيل الصفحة","أزرار الإجراءات","حفظ مسودة | إرسال للمراجعة | إلغاء"],
    ],
    [2500,3500,4000]
  ),
  ...sp(),
  H3("الحقول الرئيسية لكل نوع مستند"),
  TBL(
    ["الحقل","النوع","القيود","التأثير الديناميكي"],
    [
      ["التاريخ","Date Picker","مطلوب · لا تاريخ مستقبلي (إن لم يُسمَح)","—"],
      ["الوصف / الموضوع","Textarea","مطلوب · min 5 حروف","—"],
      ["المرجع الخارجي","Text","اختياري","رقم فاتورة / عقد خارجي"],
      ["المبلغ الإجمالي","Number","auto-calculated","يتحسب من بنود القيد"],
      ["العملة","Select","من currencies + سعر الصرف التلقائي","Tooltip: 'سعر الصرف: 3.75'"],
      ["الأولوية","Segmented: عادي / عاجل / طارئ","افتراضي: عادي","عاجل → Badge أصفر | طارئ → Badge أحمر"],
      ["تاريخ الاستحقاق","Date (اختياري)","—","تحذير إذا < 24 ساعة"],
      ["المرفقات","File Upload","PDF/IMG · max 10MB/ملف · max 20 ملف","Drag & Drop + Preview"],
      ["ملاحظات للمراجع","Textarea","اختياري","تُعرَض للمراجع ولا تُطبَع في الوثيقة الرسمية"],
      ["إضافة مراقبين","Multi-Select Users","اختياري","يحصلون على إشعارات بكل تحرك"],
    ],
    [2000,1800,2500,4700]
  ),
  ...sp(),
  H3("لوحة دورة الاعتماد الجانبية (Approval Panel)"),
  LI("عنوان: 'مسار الاعتماد'"),
  LI("يعرض سلسلة الخطوات بصرياً: A → B → C"),
  LI("كل خطوة: أيقونة دائرة + اسم المستخدم + دوره + الحالة"),
  LI("الخطوة الحالية: مضيئة ومتحركة (pulse animation)"),
  LI("الخطوات المكتملة: علامة ✓ خضراء + الوقت"),
  LI("الخطوات القادمة: رمادي فاتح"),
  LI("إذا كانت العملية تتجاوز حد مالي: تحذير أحمر 'سيذهب لمستوى إضافي'"),
  ...sp(),

  H2("5.2  شاشة بريد الوارد — My Inbox (صندوق الموافقات)"),
  ALERT("هذه الشاشة أهم شاشة يومية لمستخدمي المراجعة والاعتماد","gold"),
  H3("تصميم الشاشة"),
  TBL(
    ["المنطقة","المحتوى","التصميم"],
    [
      ["رأس الصاندوق","عداد: 'لديك 12 مستنداً بانتظارك' | فلاتر سريعة","عداد متحرك + لون أحمر إذا > 10"],
      ["فلاتر الـ Toolbar","نوع المستند | الأولوية | المبلغ | التاريخ | المُنشئ","Quick Filters في شريط أفقي"],
      ["قائمة المستندات","بطاقات Cards (لا جدول)","كل بطاقة: رقم + نوع + مُنشئ + مبلغ + تاريخ + SLA countdown"],
      ["SLA Timer","عداد تنازلي لكل مستند","أخضر إذا > 50% | أصفر إذا 20-50% | أحمر إذا < 20%"],
      ["Bulk Actions","تحديد متعدد → موافقة جماعية","checkbox + 'اعتماد المحدد (5)'"],
      ["بطاقة المستند","Preview سريع عند hover أو swipe","يعرض أهم بيانات المستند"],
    ],
    [2500,3000,4500]
  ),
  ...sp(),
  H3("بطاقة المستند (Card Design)"),
  ...CODE([
    "┌─────────────────────────────────────────────────────────────┐",
    "│  🟡 قيد يومي          JE-2024-00142     ⏰ متبقي: 8 ساعات  │",
    "│─────────────────────────────────────────────────────────────│",
    "│  أحمد محمد          15 يناير 2024              SAR 24,500  │",
    "│  وصف: دفعة مستحقة لمورد المواد الخام — شركة الخليج        │",
    "│─────────────────────────────────────────────────────────────│",
    "│  📎 3 مرفقات   👁 لم يُطَّلَع عليه   🔴 عاجل               │",
    "│─────────────────────────────────────────────────────────────│",
    "│         [✅ قبول]    [❌ رفض]    [👁 عرض التفاصيل]          │",
    "└─────────────────────────────────────────────────────────────┘",
  ]),
  ...sp(),

  H2("5.3  شاشة تفاصيل المستند — Document Detail View"),
  H3("هيكل الصفحة الكاملة"),
  TBL(
    ["القسم","المحتوى","الموقع"],
    [
      ["Header Bar","رقم المستند + النوع + الحالة badge + الأولوية + الأزرار","أعلى الصفحة — Sticky"],
      ["معلومات المستند","بطاقة: كل بيانات المستند الأساسية","القسم الرئيسي"],
      ["بنود المستند","جدول البنود (لو قيد: مدين/دائن — لو فاتورة: أصناف/كميات/سعر)","وسط الصفحة"],
      ["قسم المرفقات","معرض الملفات مع preview","ورقات المرفقات القابلة للنقر"],
      ["Timeline الاعتماد","مخطط زمني لكل إجراء","الشريط الجانبي الأيمن"],
      ["تعليقات وملاحظات","thread للتعليقات","أسفل المستند"],
      ["أزرار الإجراء","حسب الدور والحالة","شريط سفلي ثابت (Sticky Footer)"],
    ],
    [2500,4000,3500]
  ),
  ...sp(),
  H3("Timeline الاعتماد — المخطط الزمني"),
  ...CODE([
    "  Timeline (من الأعلى للأسفل — الأحدث في الأعلى):",
    "",
    "  ● 10:45 ص — [أحمد محمد] أنشأ المستند                  ✅ مكتمل",
    "  │",
    "  ● 10:47 ص — [أحمد محمد] أرسل للمراجعة                 ✅ مكتمل",
    "  │",
    "  ● 10:52 ص — [سارة العمري] اطّلعت على المستند           ✅ مكتمل",
    "  │",
    "  ▶ 11:30 ص — [سارة العمري] وافقت مع تعليق:              ✅ مكتمل",
    "  │            'تم التحقق من الفاتورة الأصلية'",
    "  │",
    "  ◉ الآن    — [محمد الزهراني] بانتظار التعميد            ⏳ جارٍ",
    "  │            (SLA: 16 ساعة متبقية)",
    "  │",
    "  ○ قادم    — التعميد المحاسبي                           ○ لم يبدأ",
  ]),
  ...sp(),
  H3("أزرار الإجراء حسب الدور والحالة"),
  TBL(
    ["الحالة","المستخدم A (المنشئ)","المستخدم B (المراجع)","المستخدم C (المعتمِد)","مراقب"],
    [
      ["draft","[✏ تعديل] [📤 إرسال] [🗑 حذف]","—","—","👁 عرض فقط"],
      ["pending_review","[↩ استرداد]","[✅ قبول] [❌ رفض] [↩ توجيه]","—","👁 عرض فقط"],
      ["under_review","[↩ استرداد]","[✅ قبول] [❌ رفض] [↩ توجيه]","—","👁 عرض فقط"],
      ["approved","👁 عرض فقط","👁 عرض فقط","[⛓ اعتماد وتقييد] [❌ رفض]","👁 عرض فقط"],
      ["rejected","[✏ تعديل وإعادة إرسال] [🚫 إلغاء]","—","—","👁 عرض فقط"],
      ["posted","👁 عرض + طباعة","👁 عرض + طباعة","[🚫 إلغاء] [🖨 طباعة]","👁 عرض فقط"],
      ["voided","[📋 عرض القيد العكسي]","[📋 عرض القيد العكسي]","[📋 عرض القيد العكسي]","👁 عرض فقط"],
    ],
    [2000,2500,2500,2500,1500]
  ),
  ...sp(),

  H2("5.4  شاشة لوحة مراقبة الطلبات — Approval Monitor Dashboard"),
  ALERT("🏆 هذه الشاشة توفر رؤية 360° لجميع المستندات في النظام","gold"),
  H3("من يرى هذه الشاشة؟"),
  LI("المدير المالي وكبار المديرين: يرون كل شيء"),
  LI("المراجعون والمعتمِدون: يرون ما يخصهم + ما ينتظر توقيعهم"),
  LI("المنشئون: يرون مستنداتهم فقط + حالتها"),
  ...sp(),
  H3("بطاقات الإحصائيات (KPI Cards)"),
  TBL(
    ["البطاقة","القيمة","اللون","الوصف"],
    [
      ["⏳ بانتظار مراجعتي","12","أحمر إذا > 10","مستندات في صف انتظاري"],
      ["⚠ تجاوز SLA","3","أحمر دائماً","مستندات تجاوزت الوقت المحدد"],
      ["✅ معتمَد اليوم","28","أخضر","عدد المستندات المُعتمَدة اليوم"],
      ["❌ مرفوض اليوم","5","أحمر","عدد المرفوضات"],
      ["💰 إجمالي معتمَد","SAR 345,200","أزرق","مجموع قيم المعتمَد اليوم"],
      ["⏱ متوسط وقت الاعتماد","4.2 ساعة","رمادي","efficiency metric"],
    ],
    [2800,1800,1200,4200]
  ),
  ...sp(),
  H3("الجدول الرئيسي — All Documents Table"),
  TBL(
    ["العمود","نوع البيانات","فلتر؟","فرز؟"],
    [
      ["رقم المستند","نص + رابط","✅ بحث","✅"],
      ["النوع","Badge ملوَّن","✅ Multi-select","✅"],
      ["الموضوع","نص مختصر","✅ بحث","—"],
      ["المُنشئ","Avatar + اسم","✅ Select","✅"],
      ["المبلغ","رقم منسَّق","✅ Range","✅"],
      ["الأولوية","Badge: عادي/عاجل/طارئ","✅","✅"],
      ["الحالة","Badge متحرك مع لون","✅ Multi-select","✅"],
      ["المرحلة الحالية","اسم المراجع/المعتمِد الحالي","✅","—"],
      ["متبقي SLA","Countdown مرئي","—","✅"],
      ["آخر إجراء","Relative time: قبل ساعتين","—","✅"],
      ["الإجراءات","أزرار حسب الدور والحالة","—","—"],
    ],
    [2200,2000,1500,1500]
  ),
  ...sp(),
  H3("Filters Panel المتقدم"),
  LI("فلتر بالحالة: draft | pending | approved | rejected | posted | voided"),
  LI("فلتر بالنوع: قيد يومي | سند صرف | أمر شراء | ..."),
  LI("فلتر بالفترة: اليوم | أمس | هذا الأسبوع | هذا الشهر | مخصص"),
  LI("فلتر بالمبلغ: Range من-إلى"),
  LI("فلتر بالمُنشئ: Multi-select من قائمة المستخدمين"),
  LI("فلتر SLA: 'تجاوز فقط' | 'قريب من الانتهاء (<25%)'"),
  LI("فلتر الأولوية: عاجل | طارئ"),
  LI("حفظ الفلاتر: 'حفظ هذا الفلتر كـ View مخصص'"),
  ...sp(),

  H2("5.5  شاشة تتبع المستند — Document Tracker"),
  ALERT("تُجيب على سؤال: 'أين مستندي الآن؟ ومن قرأه؟ ومتى؟'","info"),
  H3("مكونات الشاشة"),
  LI("Progress Bar أفقي: [إنشاء] → [مراجعة] → [موافقة] → [تعميد] → [مكتمل]"),
  LI("كل مرحلة: لون مختلف + أيقونة مختلفة + وقت الدخول والخروج"),
  LI("Read Receipts: '✓ اطّلع عليه [سارة] في 10:52 ص (قبل 2 ساعة)'"),
  LI("الوقت المستغرق في كل مرحلة vs SLA المحدد"),
  LI("Timeline بالتعليقات المرفقة بكل إجراء"),
  LI("زر 'إرسال تذكير' للطرف المنتظر (إذا تجاوز 50% من SLA)"),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 6: NOTIFICATIONS ───────────────────────────
add(
  H1("6. نظام الإشعارات الكامل — Notifications Engine"),
  ALERT("كل حدث في دورة الاعتماد يُولِّد إشعارات متعددة القنوات وفق أولويته","info"),
  ...sp(),

  H2("6.1  مصفوفة الإشعارات الكاملة"),
  TBL(
    ["الحدث","يُشعَر من","In-App","Email","Push","SMS","الأولوية"],
    [
      ["A أرسل مستنداً","B (المراجع)","✅","✅","✅","—","عالية"],
      ["B اطّلع على المستند","A","✅ '✓ اطُّلع'","—","—","—","عادية"],
      ["B وافق","A + C","✅","✅","✅","—","عالية"],
      ["B رفض","A","✅ 🔴","✅","✅","✅","عاجلة"],
      ["C اعتمد وقيَّد","A + B + محاسب","✅","✅","✅","—","عالية"],
      ["C رفض","A + B","✅ 🔴","✅","✅","✅","عاجلة"],
      ["C ألغى مستنداً مُعتمَداً","A + B + محاسب","✅ 🔴","✅","✅","✅","عاجلة"],
      ["تجاوز SLA المراجعة","B + مشرف B","✅ 🟡","✅","✅","—","عالية"],
      ["تجاوز SLA التعميد","C + مشرف C","✅ 🟡","✅","✅","—","عالية"],
      ["تصعيد تلقائي","المستخدم الجديد","✅","✅","✅","✅","عاجلة"],
      ["تفويض من B لـ B2","B2","✅","✅","✅","—","عالية"],
      ["مستند اقترب من SLA","المسؤول الحالي","✅","—","✅","—","تحذير"],
      ["تذكير من المنشئ","المراجع/المعتمِد","✅","✅","—","—","عادية"],
      ["مراقب: أي تغيير","المراقبون","✅","✅","—","—","حسب الإعداد"],
    ],
    [3000,2000,900,900,900,900,1800]
  ),
  ...sp(),

  H2("6.2  تصميم رسائل الإشعار"),
  H3("نموذج In-App Notification"),
  ...CODE([
    "┌─────────────────────────────────────────────────────────────┐",
    "│  🔴  مستند مرفوض — يتطلب إجراءً                           │",
    "│─────────────────────────────────────────────────────────────│",
    "│  رفضت [سارة العمري] مستندك JE-2024-00142                  │",
    "│  السبب: 'يرجى إرفاق الفاتورة الأصلية من المورد'           │",
    "│                                                             │",
    "│  [📄 عرض المستند]           [✏ تعديل وإعادة إرسال]        │",
    "│─────────────────────────────────────────────────────────────│",
    "│  قبل 5 دقائق                              ✕ تجاهل         │",
    "└─────────────────────────────────────────────────────────────┘",
  ]),
  ...sp(),
  H3("نموذج Email (HTML)"),
  ...CODE([
    "الموضوع: 🔴 مستندك JE-2024-00142 مرفوض — يتطلب تعديلاً",
    "",
    "═══════════════════════════════════════════════════════════",
    "  ⬡ SLMS — نظام إدارة الخدمات اللوجستية",
    "  [شعار الشركة] — شركة النجم للتجارة",
    "═══════════════════════════════════════════════════════════",
    "",
    "  مرحباً أحمد،",
    "",
    "  تم رفض مستندك من قِبَل سارة العمري.",
    "",
    "  ┌─────────────────────────────────┐",
    "  │  رقم المستند: JE-2024-00142    │",
    "  │  النوع:        قيد يومي         │",
    "  │  المبلغ:       SAR 24,500       │",
    "  │  التاريخ:      15 يناير 2024    │",
    "  └─────────────────────────────────┘",
    "",
    "  سبب الرفض:",
    "  ─────────",
    "  'يرجى إرفاق الفاتورة الأصلية من المورد قبل الإرسال'",
    "",
    "  [🔗 عرض المستند وتعديله]",
    "",
    "═══════════════════════════════════════════════════════════",
    "  هذه رسالة آلية من نظام SLMS — لا ترد عليها",
  ]),
  ...sp(),

  H2("6.3  إعدادات الإشعارات للمستخدم"),
  LI("صفحة: الإعدادات → الإشعارات"),
  LI("لكل نوع حدث: Toggle: In-App / Email / Push / SMS"),
  LI("ساعات الهدوء: 'لا إشعارات بين 11 مساءً و 7 صباحاً (عدا العاجلة)'"),
  LI("إعداد Email Digest يومي: 'ملخص يومي في الساعة 8 صباحاً'"),
  LI("الأحداث العاجلة (رفض / SLA تجاوز): لا يمكن إيقافها"),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 7: APPROVAL RULES ───────────────────────────
add(
  H1("7. قواعد وحالات خاصة — Special Rules & Edge Cases"),
  ...sp(),

  H2("7.1  التفويض (Delegation)"),
  TBL(
    ["الحالة","السلوك المطلوب"],
    [
      ["B في إجازة","B يُفوِّض صلاحيته لـ B2 قبل الغياب — المستندات الجديدة تذهب لـ B2 مباشرة"],
      ["مستند واصل لـ B أثناء الإجازة","النظام يكتشف: B في إجازة → يُحوِّل لـ B2 تلقائياً إذا كان التفويض مُعيَّناً"],
      ["B2 يُصدر قراراً","يُسجَّل: 'اعتمد B2 (بتفويض من B)'"],
      ["انتهاء فترة التفويض","المستندات تعود لـ B التلقائي"],
      ["تفويض متسلسل","B2 لا يمكنه تفويض صلاحية B لـ B3 (منع التفويض المتسلسل)"],
    ],
    [3000,7000]
  ),
  ...sp(),

  H2("7.2  الحدود المالية (Approval Limits)"),
  TBL(
    ["المستوى","الحد الأقصى للاعتماد","ما يحدث فوق الحد"],
    [
      ["المراجع B","مراجعة فقط — لا حد مالي للمراجعة","يُمرَّر للمعتمِد C دائماً"],
      ["المعتمِد C (مشرف)","حتى 50,000 SAR","يذهب تلقائياً لـ D (مدير عام)"],
      ["المعتمِد D (مدير)","حتى 200,000 SAR","يذهب لـ E (مجلس إدارة)"],
      ["المعتمِد E (CFO)","حتى 1,000,000 SAR","يتطلب توقيعاً رقمياً + تصويتاً"],
      ["تعميد تلقائي","أقل من auto_approve_below (الحد المحدد في الدورة)","يُعتمَد دون أي مراجعة"],
    ],
    [3000,2500,4500]
  ),
  ALERT("الحدود المالية قابلة للتخصيص لكل عميل من إعدادات دورة الاعتماد","tip"),
  ...sp(),

  H2("7.3  الاسترداد (Recall)"),
  TBL(
    ["السيناريو","هل يمكن الاسترداد؟","الشرط"],
    [
      ["draft → A يُلغي","✅ نعم — حذف","المستند لا يزال مسودة"],
      ["pending_review → A يسترد","✅ نعم — يعود لـ draft","B لم يبدأ المراجعة بعد"],
      ["under_review → A يحاول الاسترداد","⚠ يحتاج موافقة B","B فتح المستند — يجب اخطاره"],
      ["approved → A يحاول الاسترداد","❌ لا — فقط C يمكنه الرفض","المسار اكتمل حتى هذه النقطة"],
      ["posted → أي شخص","❌ لا استرداد — فقط Void","المستند له أثر محاسبي"],
    ],
    [3000,2000,5000]
  ),
  ...sp(),

  H2("7.4  التصعيد التلقائي (Auto-Escalation)"),
  LI("عند انتهاء SLA بدون إجراء: النظام يُصعِّد للمستوى التالي"),
  LI("إشعار للمسؤول (مشرف B): 'مستند [X] تجاوز وقت المراجعة المحدد'"),
  LI("خيار المشرف: تمديد SLA | تفويض | اتخاذ القرار مباشرة"),
  LI("جميع المشرفين يُمكنهم رؤية قائمة 'المستندات المتعثرة'"),
  ...sp(),

  H2("7.5  القيود المتعارضة (Conflict of Interest)"),
  LI("المنشئ لا يمكنه الموافقة على مستنداته (منع تلقائي)"),
  LI("إذا كان B هو نفسه A: النظام يُحوِّل تلقائياً للمراجع الاحتياطي"),
  LI("رسالة تحذير واضحة: 'لا يمكنك الموافقة على مستند أنشأته أنت'"),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 8: API DESIGN ───────────────────────────
add(
  H1("8. تصميم الـ API — Approval Workflow Endpoints"),
  ...sp(),

  H2("8.1  Endpoints الرئيسية"),
  TBL(
    ["Method","Endpoint","الوصف","الصلاحية المطلوبة"],
    [
      [{t:"GET",c:C.green},"GET /api/tenant/documents","قائمة المستندات مع فلاتر","documents:read"],
      [{t:"POST",c:C.navy},"POST /api/tenant/documents","إنشاء مستند جديد","documents:create"],
      [{t:"GET",c:C.green},"GET /api/tenant/documents/:id","تفاصيل مستند كامل","documents:read + ملكية"],
      [{t:"PATCH",c:C.amberMd},"PATCH /api/tenant/documents/:id","تعديل مسودة","documents:edit + حالة=draft"],
      [{t:"DELETE",c:C.red},"DELETE /api/tenant/documents/:id","حذف مسودة","documents:delete + حالة=draft"],
      [{t:"POST",c:C.navy},"POST /api/tenant/documents/:id/submit","إرسال للمراجعة","documents:submit"],
      [{t:"POST",c:C.navy},"POST /api/tenant/documents/:id/recall","استرداد","documents:recall + شروط"],
      [{t:"POST",c:C.green},"POST /api/tenant/documents/:id/approve","موافقة (B أو C)","documents:approve + في الدور"],
      [{t:"POST",c:C.red},"POST /api/tenant/documents/:id/reject","رفض","documents:reject + في الدور"],
      [{t:"POST",c:C.teal},"POST /api/tenant/documents/:id/post","تعميد وتقييد","documents:post + حالة=approved"],
      [{t:"POST",c:C.red},"POST /api/tenant/documents/:id/void","إلغاء معتمَد","documents:void + حالة=posted"],
      [{t:"GET",c:C.green},"GET /api/tenant/documents/:id/history","سجل الإجراءات","documents:read"],
      [{t:"POST",c:C.navy},"POST /api/tenant/documents/:id/delegate","تفويض","documents:delegate"],
      [{t:"GET",c:C.green},"GET /api/tenant/documents/inbox","صندوق موافقاتي","auth"],
      [{t:"GET",c:C.green},"GET /api/tenant/documents/tracker/:id","تتبع المستند","auth"],
      [{t:"POST",c:C.amberMd},"POST /api/tenant/documents/:id/remind","إرسال تذكير","documents:remind"],
      [{t:"GET",c:C.green},"GET /api/tenant/approval-routes","قوالب الدورات","approval_routes:read"],
      [{t:"POST",c:C.navy},"POST /api/tenant/approval-routes","إنشاء دورة","approval_routes:create"],
      [{t:"GET",c:C.green},"GET /api/tenant/documents/monitor","لوحة المراقبة","manager role"],
    ],
    [900,3500,3000,2600]
  ),
  ...sp(),

  H2("8.2  نماذج Request / Response"),
  H3("POST /api/tenant/documents/:id/reject"),
  ...CODE([
    "// Request Body:",
    "{",
    '  "comment": "يرجى إرفاق الفاتورة الأصلية — البيانات غير مكتملة",',
    '  "request_additional_docs": true,',
    '  "required_docs": ["فاتورة المورد", "كشف الحساب البنكي"]',
    "}",
    "",
    "// Response 200:",
    "{",
    '  "success": true,',
    '  "message": "تم رفض المستند وإشعار المنشئ",',
    '  "data": {',
    '    "document_id": "uuid",',
    '    "new_status": "rejected",',
    '    "notified_users": ["ahmed@company.com"],',
    '    "rejection_logged_at": "2024-01-15T10:30:00Z"',
    "  }",
    "}",
    "",
    "// Response 403 (لا صلاحية):",
    "{",
    '  "success": false,',
    '  "code": "INSUFFICIENT_PERMISSION",',
    '  "message": "ليس لديك صلاحية رفض هذا المستند في المرحلة الحالية"',
    "}",
  ]),
  ...sp(),
  H3("POST /api/tenant/documents/:id/post (التعميد)"),
  ...CODE([
    "// Request Body:",
    "{",
    '  "comment": "تم التحقق والاعتماد",',
    '  "post_date": "2024-01-15",  // اختياري — افتراضي: اليوم',
    '  "confirm_token": "CONFIRM"   // رمز تأكيد إجباري',
    "}",
    "",
    "// Response 201:",
    "{",
    '  "success": true,',
    '  "message": "تم تعميد المستند وتقييده محاسبياً",',
    '  "data": {',
    '    "document_id": "uuid",',
    '    "document_number": "JE-2024-00142",',
    '    "posted_at": "2024-01-15T11:45:00Z",',
    '    "accounting_entries": [',
    '      { "account": "1200", "debit": 24500, "credit": 0 },',
    '      { "account": "2100", "debit": 0,     "credit": 24500 }',
    "    ],",
    '    "notified_users": ["ahmed@...", "sara@...", "accountant@..."]',
    "  }",
    "}",
  ]),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 9: SETTINGS ───────────────────────────
add(
  H1("9. إعدادات دورة الاعتماد — Approval Routes Configuration"),
  ALERT("هذه الإعدادات يُعيِّنها مدير الشركة (tenant_admin) أو مالكها","info"),
  ...sp(),

  H2("9.1  صفحة إعداد دورات الاعتماد"),
  H3("هيكل الصفحة"),
  LI("قائمة الدورات الموجودة (بطاقات) مع حالة كل منها (مُفعَّلة/معطَّلة)"),
  LI("+ إنشاء دورة جديدة → Modal بالخطوات:"),
  NLI("اختيار نوع المستند"),
  NLI("تعيين الحدود المالية (min/max/auto)"),
  NLI("إضافة الخطوات: drag & drop لترتيب الخطوات"),
  NLI("لكل خطوة: نوع (مراجعة/اعتماد/إشعار) + المسؤول + SLA"),
  NLI("اختبار الدورة: 'جرّب بمبلغ 5,000 SAR' → يعرض مسار الاعتماد"),
  ...sp(),

  H2("9.2  إعدادات الحدود المالية"),
  TBL(
    ["الإعداد","النوع","الوصف","مثال"],
    [
      ["auto_approve_below","Number","المبالغ الأقل تُعتمَد تلقائياً","0 = لا تعميد تلقائي"],
      ["min_amount","Number","الحد الأدنى لتطبيق هذه الدورة","5,000 SAR"],
      ["max_amount","Number","الحد الأقصى — فوقه دورة مختلفة","50,000 SAR"],
      ["sla_hours","Number","وقت كل خطوة بالساعات","24 ساعة"],
      ["escalate_after","Number","تصعيد بعد X ساعة بدون إجراء","48 ساعة"],
    ],
    [2500,1500,3500,2500]
  ),
  ...sp(),

  H2("9.3  نماذج دورات جاهزة — Preset Templates"),
  TBL(
    ["اسم القالب","يناسب","الخطوات","SLA"],
    [
      ["دورة بسيطة (مشرف فقط)","مستندات صغيرة < 1,000","A → C مباشرة","12 ساعة"],
      ["دورة مزدوجة (مراجعة + اعتماد)","معظم المستندات","A → B → C","24+24 ساعة"],
      ["دورة ثلاثية (مع مدير عام)","مبالغ كبيرة > 50K","A → B → C → D","24+24+48 ساعة"],
      ["دورة إخطار فقط","مستندات معلوماتية","A → إشعار للكل","—"],
      ["دورة تصويتية","قرارات جماعية","A → فريق (أغلبية 3/5)","48 ساعة"],
    ],
    [2800,3000,2500,2700]
  ),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 10: UX DESIGN ───────────────────────────
add(
  H1("10. مواصفات التصميم البصري والتأثيرات"),
  ALERT("🎨 هذا النظام يجب أن يكون أجمل جزء في التطبيق — يُستخدَم يومياً بشكل مكثف","ui"),
  ...sp(),

  H2("10.1  ألوان حالات المستند"),
  TBL(
    ["الحالة","اللون الرئيسي","اللون الخلفي","الحدود","الأيقونة","تأثير حركي"],
    [
      ["draft","#64748B","#F8FAFC","#CBD5E1","📝","لا"],
      ["pending_review","#B45309","#FEF9C3","#FCD34D","⏳","pulse بطيء"],
      ["under_review","#7C3AED","#F5F3FF","#C4B5FD","🔍","pulse متوسط"],
      ["approved","#1D4ED8","#EFF6FF","#93C5FD","✅","لا"],
      ["rejected","#B91C1C","#FFF1F2","#FCA5A5","❌","shake مرة"],
      ["pending_post","#B45309","#FFF7ED","#FCD34D","📋","pulse سريع"],
      ["posted","#047857","#ECFDF5","#6EE7B7","⛓","success flash مرة"],
      ["voided","#991B1B","#FEF2F2","#FCA5A5","🚫","لا"],
      ["cancelled","#334155","#F8FAFC","#94A3B8","🗑","لا"],
    ],
    [2000,1800,1800,1800,1000,3100]
  ),
  ...sp(),

  H2("10.2  التأثيرات والحركات"),
  TBL(
    ["التأثير","متى يحدث","التقنية","المدة"],
    [
      ["Pulse Animation","مستند في انتظار اجراء","CSS: animation: pulse 2s infinite","مستمر"],
      ["Shake Animation","مستند مرفوض — badge يهتز","CSS: animation: shake 0.5s","مرة واحدة"],
      ["Success Flash","عند الاعتماد أو التعميد","CSS: bg flash green→transparent","0.8 ثانية"],
      ["Progress Bar Animate","انتقال بين الخطوات","Framer Motion: width transition","0.5 ثانية"],
      ["Card Slide In","مستند جديد يصل الـ Inbox","Framer: slideInDown + fadeIn","0.4 ثانية"],
      ["Card Dismiss","بعد الموافقة — البطاقة تختفي","Framer: slideOutRight + fade","0.3 ثانية"],
      ["Timeline Reveal","فتح صفحة التفاصيل","Stagger animation من الأعلى","0.1s تراكمي"],
      ["SLA Countdown","يغير اللون تدريجياً","CSS: color transition على كل تحديث","سلس"],
      ["Confetti","عند تعميد مستند بعد رحلة طويلة","canvas-confetti","مرة واحدة"],
      ["Toast Notification","عند كل حدث","Slide from bottom-right","3-6 ثانية"],
    ],
    [2500,3000,3000,2500]
  ),
  ...sp(),

  H2("10.3  Micro-interactions الذكية"),
  LI("زر 'قبول': عند hover → يتحول من outlined لـ filled أخضر تدريجياً"),
  LI("زر 'رفض': عند hover → حدود تتحول لأحمر + أيقونة تهتز خفيفة"),
  LI("حقل 'سبب الرفض': يظهر بـ slide down عند الضغط على رفض — لا Modal منفصل"),
  LI("تأكيد التعميد: المستخدم يكتب 'CONFIRM' في حقل → زر يتحول لأخضر ويُفعَّل"),
  LI("SLA Timer: يُغير اللون تدريجياً (أخضر → أصفر → أحمر) بشكل smooth"),
  LI("Read Receipt: عند فتح المستند → نقطة خضراء تظهر عند اسم القارئ في Timeline"),
  LI("Bulk Selection: عند تحديد أكثر من مستند → شريط أعمال يظهر من الأسفل"),
  LI("Drag & Drop في إعداد خطوات الدورة: سهولة إعادة الترتيب"),
  LI("Keyboard Shortcut: A = موافقة | R = رفض | Esc = إغلاق"),
  ...sp(),

  H2("10.4  Empty States"),
  TBL(
    ["الشاشة","الرسالة","الأيقونة","الزر"],
    [
      ["صندوق الموافقات فارغ","رائع! لا مستندات بانتظارك 🎉","✨ صندوق فارغ","—"],
      ["لا مستندات في النوع المحدد","لا توجد نتائج للفلتر المحدد","🔍","مسح الفلاتر"],
      ["لا دورة اعتماد مُعيَّنة","لم يُعيَّن مسار اعتماد لهذا النوع","⚙","إعداد الدورة"],
      ["المستند لا يوجد","المستند غير موجود أو محذوف","😕","العودة للقائمة"],
    ],
    [2500,3000,2000,2500]
  ),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 11: TESTING ───────────────────────────
add(
  H1("11. سيناريوهات الاختبار الكاملة"),
  ALERT("شغّل هذه الاختبارات بالترتيب — فشل أي منها يعني خللاً في المسار الأساسي","err"),
  ...sp(),

  H2("11.1  سيناريو A: دورة ناجحة كاملة"),
  TBL(
    ["#","الخطوة","المستخدم","الإجراء","التحقق","نتيجة"],
    [
      ["A01","إنشاء مستند","A","إنشاء قيد يومي 24,500 SAR","status=draft في DB","☐"],
      ["A02","حفظ مسودة","A","حفظ كمسودة","لا أثر محاسبي | لا إشعارات","☐"],
      ["A03","إرسال للمراجعة","A","اضغط إرسال + تأكيد","status=pending_review | إشعار لـ B","☐"],
      ["A04","إشعار B","B","يستلم Bell + Email","الإشعار فوري ويحتوي رابطاً","☐"],
      ["A05","B يفتح المستند","B","يضغط على الإشعار","read_at يُسجَّل | status=under_review","☐"],
      ["A06","A يرى التأكيد","A","يرى '✓ اطّلع عليه'","Timeline يتحدث فوراً","☐"],
      ["A07","B يوافق","B","اضغط قبول + تعليق اختياري","status=approved | إشعار لـ A وC","☐"],
      ["A08","C يعتمد","C","اضغط اعتماد وتقييد + CONFIRM","status=posted | أثر محاسبي","☐"],
      ["A09","التحقق المحاسبي","—","SELECT * FROM journal_entries WHERE ref=doc_id","سجلات محاسبية موجودة","☐"],
      ["A10","إشعارات النجاح","A+B","يستلمان '✅ تم التعميد'","الإشعار فوري","☐"],
    ],
    [600,2200,1200,2500,2700,900]
  ),
  ...sp(),

  H2("11.2  سيناريو B: مسار الرفض والتعديل"),
  TBL(
    ["#","الخطوة","المستخدم","الإجراء","التحقق","نتيجة"],
    [
      ["B01","إرسال المستند","A","أرسل مستنداً","status=pending_review","☐"],
      ["B02","B يرفض","B","رفض + سبب: 'يرجى إرفاق الفاتورة'","status=rejected","☐"],
      ["B03","إشعار رفض لـ A","A","Bell أحمر + Email عاجل","الرسالة تحتوي سبب الرفض","☐"],
      ["B04","A يرى السبب","A","يفتح المستند","السبب مرئي + تاريخ الرفض + من رفض","☐"],
      ["B05","A يعدّل","A","يضيف الفاتورة ويُعيد الإرسال","status=pending_review من جديد","☐"],
      ["B06","B يوافق هذه المرة","B","موافقة","status=approved","☐"],
      ["B07","C يُلغي بعد التعميد","C","يضغط إلغاء + VOID + سبب","status=voided + قيد عكسي","☐"],
      ["B08","إشعار الإلغاء","A+B","يستلمان إشعاراً باللون الأحمر","يذكر القيد العكسي","☐"],
    ],
    [600,2200,1200,2500,2700,900]
  ),
  ...sp(),

  H2("11.3  اختبارات الصلاحيات (RBAC)"),
  TBL(
    ["#","السيناريو","الاختبار","المتوقع","نتيجة"],
    [
      ["R01","A يوافق على مستنده","POST /approve مع token A","403: 'لا يمكنك الموافقة على مستنداتك'","☐"],
      ["R02","مستخدم عادي يوافق","POST /approve بدون دور reviewer","403: 'ليس لديك صلاحية المراجعة'","☐"],
      ["R03","B يُعمِّد (بدون صلاحية post)","POST /post مع token B","403: 'التعميد مخصص للمعتمِد C فقط'","☐"],
      ["R04","مستند غير معتمَد يُعمَّد","POST /post على مستند pending_review","422: 'المستند لا يزال قيد المراجعة'","☐"],
      ["R05","تعديل مستند معتمَد","PATCH على مستند posted","403: 'المستند المعتمَد لا يمكن تعديله'","☐"],
      ["R06","حذف مستند مُعتمَد","DELETE على مستند posted","403: 'لا يمكن حذف مستند مقيَّد — استخدم الإلغاء'","☐"],
      ["R07","Tenant A يرى مستند Tenant B","GET /documents/:id مع token tenant مختلف","404: 'المستند غير موجود' (عزل كامل)","☐"],
      ["R08","A يحذف مستند B","DELETE /documents/:id بحيث created_by ≠ A","403: 'هذا المستند ليس لك'","☐"],
      ["R09","Void بدون سبب","POST /void بدون comment","422: 'سبب الإلغاء مطلوب'","☐"],
      ["R10","Void بدون VOID token","POST /void بدون confirm_token","422: 'يرجى كتابة VOID للتأكيد'","☐"],
    ],
    [600,2500,2800,3200,900]
  ),
  ...sp(),

  H2("11.4  اختبارات الحالات الخاصة"),
  TBL(
    ["#","السيناريو","الاختبار","المتوقع","نتيجة"],
    [
      ["S01","تعميد تلقائي (مبلغ صغير)","إرسال مستند بمبلغ 100 SAR (auto_approve < 500)","status=posted مباشرة — بدون مراجعة","☐"],
      ["S02","تصعيد SLA","مستند متأخر SLA=2 ساعة → ننتظر 2.5","إشعار تصعيد للمشرف + مستند يظهر في 'المتعثرة'","☐"],
      ["S03","تفويض وإرجاع","B يُفوِّض لـ B2 → مستند يصل → B2 يوافق","document_approvals: actor=B2, delegated_by=B","☐"],
      ["S04","استرداد قبل المراجعة","A يسترد بعد الإرسال لكن قبل أن يقرأ B","status=draft + لا إشعار إلغاء لـ B","☐"],
      ["S05","استرداد بعد القراءة","A يسترد بعد read_at سُجِّل","⚠ تنبيه: 'المراجع اطّلع على المستند — هل تريد الاسترداد؟'","☐"],
      ["S06","قيد عكسي عند الإلغاء","C يُلغي سند صرف بعد تعميده","قيد عكسي تلقائي بنفس المبلغ معكوساً + ربط بالأصل","☐"],
      ["S07","دورة ثلاثية (D مطلوب)","مستند 75,000 SAR → C يوافق → يذهب لـ D","current_step=3 + إشعار لـ D","☐"],
      ["S08","موافقة جماعية","3 من 5 يوافقون في خطوة majority","status يتغير بعد الثالث فقط","☐"],
    ],
    [600,2500,2800,3200,900]
  ),
  ...sp(),

  H2("11.5  اختبارات الأداء"),
  TBL(
    ["#","السيناريو","الهدف","الحد الأقصى"],
    [
      ["P01","تحميل صندوق الموافقات (50 مستند)","< 500ms","1 ثانية"],
      ["P02","إرسال مستند + إشعار","< 300ms (submit) + < 2s (notification)","3 ثواني"],
      ["P03","تحميل لوحة المراقبة (1000 سجل)","< 1s","2 ثانية"],
      ["P04","بحث المستندات مع فلاتر متعددة","< 500ms","1 ثانية"],
      ["P05","Timeline مستند (30 إجراء)","< 400ms","800ms"],
      ["P06","موافقة جماعية (10 مستندات)","< 2s","5 ثواني"],
    ],
    [600,4000,3000,2400]
  ),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 12: PERMISSIONS ───────────────────────────
add(
  H1("12. الصلاحيات المطلوبة — Permissions Matrix"),
  ALERT("كل صلاحية يجب تعريفها في جدول permissions + ربطها بالأدوار الافتراضية","info"),
  ...sp(),

  H2("12.1  قائمة الصلاحيات الكاملة"),
  TBL(
    ["الصلاحية","الكود","الوصف","الأدوار الافتراضية"],
    [
      ["إنشاء مستند","documents:create","إنشاء أي نوع مستند جديد","محاسب · مشرف · مدير"],
      ["عرض المستندات","documents:read","عرض المستندات (حسب الملكية والنطاق)","الكل"],
      ["تعديل مسودة","documents:edit","تعديل مستند بحالة draft فقط","المنشئ فقط"],
      ["حذف مسودة","documents:delete","حذف مستند بحالة draft فقط","المنشئ فقط"],
      ["إرسال للمراجعة","documents:submit","إرسال المستند من draft → pending_review","المنشئ"],
      ["استرداد","documents:recall","استرداد المستند قبل المراجعة","المنشئ"],
      ["مراجعة وموافقة","documents:approve","الموافقة على المستند (خطوة review/approve)","المراجع · المعتمِد"],
      ["رفض","documents:reject","رفض المستند مع سبب إلزامي","المراجع · المعتمِد"],
      ["تعميد (Post)","documents:post","التعميد المحاسبي — أعلى صلاحية عمليات","المعتمِد فقط"],
      ["إلغاء (Void)","documents:void","إلغاء مستند مُعتمَد + قيد عكسي","المعتمِد + مدير مالي"],
      ["تفويض","documents:delegate","تفويض صلاحية المراجعة/الاعتماد لمستخدم آخر","المراجع · المعتمِد"],
      ["إرسال تذكير","documents:remind","إرسال تذكير للمراجع/المعتمِد المنتظر","المنشئ"],
      ["لوحة المراقبة","documents:monitor","عرض لوحة المراقبة الشاملة","مدير · مشرف"],
      ["إعداد الدورات","approval_routes:create","إنشاء وتعديل قوالب دورات الاعتماد","مدير النظام"],
      ["عرض الدورات","approval_routes:read","عرض قوالب الدورات المُعيَّنة","الكل"],
      ["إعداد التفويض","delegations:manage","إدارة التفويضات","المراجع · المعتمِد"],
      ["سجل التدقيق","audit:read","عرض سجل التدقيق (WORM)","مدير · مراجع داخلي"],
    ],
    [2000,2200,3500,2300]
  ),
  ...sp(),

  H2("12.2  مصفوفة الأدوار × الصلاحيات"),
  TBL(
    ["الصلاحية","محاسب","مشرف محاسبة","مدير مالي","مدير عام","مراجع داخلي"],
    [
      ["documents:create","✅","✅","✅","✅","—"],
      ["documents:read","ملكه فقط","قسمه","الكل","الكل","الكل (قراءة)"],
      ["documents:edit","✅ (draft)","✅ (draft)","✅ (draft)","✅ (draft)","—"],
      ["documents:submit","✅","✅","✅","✅","—"],
      ["documents:approve","—","✅","✅","✅","—"],
      ["documents:reject","—","✅","✅","✅","—"],
      ["documents:post","—","—","✅","✅","—"],
      ["documents:void","—","—","✅","✅","—"],
      ["documents:delegate","—","✅","✅","✅","—"],
      ["documents:monitor","—","✅","✅","✅","✅"],
      ["approval_routes:create","—","—","—","✅","—"],
      ["audit:read","—","—","✅","✅","✅"],
    ],
    [2500,1600,1800,1600,1600,1900]
  ),
  new Paragraph({children:[new PageBreak()]}),
);

// ─────────────────────── SEC 13: MIGRATION ───────────────────────────
add(
  H1("13. خطة التنفيذ والترحيل — Implementation Roadmap"),
  ALERT("التنفيذ على 4 مراحل — كل مرحلة مستقلة وقابلة للإطلاق","tip"),
  ...sp(),

  H2("13.1  المرحلة الأولى — الأساس (Sprint 1-2)"),
  TBL(
    ["المهمة","الأولوية","التقدير","التبعيات"],
    [
      ["إنشاء جداول DB (approval_routes, approval_steps, documents, document_approvals)","P0","3 أيام","—"],
      ["WORM Trigger على document_approvals","P0","1 يوم","جدول document_approvals"],
      ["ApprovalService: submit, approve, reject, post, void","P0","5 أيام","DB Tables"],
      ["DocumentService: CRUD + status transitions","P0","4 أيام","DB Tables"],
      ["Status State Machine (التحقق من الانتقالات المسموحة)","P0","2 يوم","—"],
      ["API Routes: all 19 endpoints","P0","3 أيام","Services"],
      ["Permission seeding (17 صلاحية)","P0","1 يوم","—"],
      ["Unit Tests: Services","P0","3 أيام","Services"],
    ],
    [4500,900,1500,3100]
  ),
  ...sp(),

  H2("13.2  المرحلة الثانية — الواجهات (Sprint 3-4)"),
  TBL(
    ["المهمة","الأولوية","التقدير","التبعيات"],
    [
      ["شاشة إنشاء المستند (Creator)","P0","4 أيام","API ready"],
      ["لوحة الاعتماد الجانبية (Approval Panel)","P0","3 أيام","Creator"],
      ["صندوق الموافقات (Inbox)","P0","4 أيام","API ready"],
      ["شاشة تفاصيل المستند (Detail View)","P0","3 أيام","API ready"],
      ["Timeline Component","P1","2 يوم","Detail View"],
      ["Approval Monitor Dashboard","P1","4 أيام","API ready"],
      ["Document Tracker","P1","2 يوم","Timeline"],
      ["Animation & Micro-interactions","P2","3 أيام","UI Components"],
    ],
    [4500,900,1500,3100]
  ),
  ...sp(),

  H2("13.3  المرحلة الثالثة — الإشعارات والتصعيد (Sprint 5)"),
  TBL(
    ["المهمة","الأولوية","التقدير","التبعيات"],
    [
      ["NotificationService: In-App + Email","P0","3 أيام","ApprovalService events"],
      ["Email Templates (HTML/Arabic)","P1","2 يوم","NotificationService"],
      ["SLA Monitoring Cron Job","P1","2 يوم","documents table"],
      ["Auto-Escalation Logic","P1","2 يوم","SLA Cron"],
      ["Delegation System","P1","3 أيام","ApprovalService"],
      ["Push Notifications (FCM)","P2","2 يوم","NotificationService"],
      ["SMS Integration (optional)","P3","1 يوم","External API"],
    ],
    [4500,900,1500,3100]
  ),
  ...sp(),

  H2("13.4  المرحلة الرابعة — التحسين والإطلاق (Sprint 6)"),
  TBL(
    ["المهمة","الأولوية","التقدير","التبعيات"],
    [
      ["Integration Tests (كل السيناريوهات)","P0","4 أيام","All modules"],
      ["Performance Testing (P01-P06)","P1","2 يوم","All modules"],
      ["إعداد دورات الاعتماد (Admin UI)","P1","3 أيام","API ready"],
      ["Bulk Actions (موافقة/رفض جماعي)","P2","2 يوم","Inbox"],
      ["Keyboard Shortcuts","P2","1 يوم","UI"],
      ["Confetti + polish animations","P3","1 يوم","UI"],
      ["Documentation + Training","P1","2 يوم","All"],
      ["User Acceptance Testing (UAT)","P0","3 أيام","All"],
    ],
    [4500,900,1500,3100]
  ),
  ...sp(),

  DIV("نهاية الوثيقة"),
  ...sp(),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:200,after:100},
    children:[new TextRun({text:"⬡  SLMS — Approval Workflow Engine v1.0",font:"Arial",size:20,bold:true,color:C.navy})],
  }),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:100},
    children:[R("وثيقة تأسيس شاملة — جاهزة للتطوير",{sz:18,c:C.muted})],
  }),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:200},
    children:[R("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",{sz:16,c:C.border})],
  }),
);

// ══════════════════════════════════════════
// BUILD DOCUMENT
// ══════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 18, color: C.dark },
        paragraph: { spacing: { line: 276 } },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: "bul",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "●", alignment: AlignmentType.RIGHT, style: { paragraph: { indent: { left: 400, hanging: 200 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "○", alignment: AlignmentType.RIGHT, style: { paragraph: { indent: { left: 800, hanging: 200 } } } },
          { level: 2, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.RIGHT, style: { paragraph: { indent: { left: 1200, hanging: 200 } } } },
        ],
      },
      {
        reference: "nums",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.RIGHT, style: { paragraph: { indent: { left: 400, hanging: 250 } } } },
          { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2)", alignment: AlignmentType.RIGHT, style: { paragraph: { indent: { left: 800, hanging: 250 } } } },
          { level: 2, format: LevelFormat.LOWER_ROMAN, text: "%3.", alignment: AlignmentType.RIGHT, style: { paragraph: { indent: { left: 1200, hanging: 250 } } } },
        ],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 }, // Letter
        margin: { top: 900, bottom: 900, left: 1100, right: 1100 },
        pageNumbers: { start: 1 },
      },
      titlePage: true,
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "⬡ SLMS", font: "Arial", size: 14, bold: true, color: C.navy }),
            new TextRun({ text: "  |  نظام الموافقات والاعتماد  |  وثيقة تأسيس v1.0", font: "Arial", size: 14, color: C.muted }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border } },
          spacing: { before: 100 },
          children: [
            new TextRun({ text: "صفحة  ", font: "Arial", size: 14, color: C.muted }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 14, color: C.navy, bold: true }),
            new TextRun({ text: "  من  ", font: "Arial", size: 14, color: C.muted }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 14, color: C.navy, bold: true }),
            new TextRun({ text: "   |   SLMS — Confidential", font: "Arial", size: 14, color: C.muted }),
          ],
        })],
      }),
    },
    children: BODY,
  }],
});

// ══════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════
const outPath = './SLMS-Approval-Workflow-Engine.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`✅ Generated: ${outPath} (${sizeMB} MB)`);
  console.log(`   Sections: 0-13 (14 sections)`);
  console.log(`   Total paragraphs: ${BODY.length}`);
}).catch(err => {
  console.error('❌ Error generating document:', err.message);
  process.exit(1);
});
