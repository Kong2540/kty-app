/* KTY 1994 ระบบเบิก–จ่ายวัสดุ : ตั้งค่า (แก้ด้วย Notepad แล้วอัปโหลดขึ้น GitHub) */
self.KTY_CONFIG = {
  /* 1) URL เว็บแอปจาก Apps Script (ลงท้ายด้วย /exec) */
  API_URL: "https://script.google.com/macros/s/AKfycbyBPAhrxycqWdpDA9xsD5M-xVME71-CgviWLAXMOfObRToEykJxQKN_ENGGbZEFnCcu/exec",

  /* 2) แจ้งเตือน Push (ไม่บังคับ) : วางค่าจาก Firebase ตามคู่มือ ถ้ายังไม่ใช้ให้คง null ไว้ */
  FIREBASE: null,
  /* ตัวอย่าง:
  FIREBASE: {
    apiKey: "AIza...",
    authDomain: "kty1994-xxxx.firebaseapp.com",
    projectId: "kty1994-xxxx",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef"
  },
  */
  FIREBASE_VAPID_KEY: "",

  APP_NAME: "KTY 1994 ระบบเบิก–จ่ายวัสดุ"
};
