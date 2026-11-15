// ข้อมูลหนังสือตัวอย่าง
// slot  = ตำแหน่งบนชั้นจากซ้ายไปขวา (ชั้นจริงจะส่งรายการนี้กลับมาหลังสั่งแสกน)
// type  = หนังสืออะไร (ประเภท), genre = แนวอะไร
// cover = (ไม่บังคับ) URL รูปปก ถ้าไม่ใส่ ระบบวาดปกให้จากชื่อเรื่องและประเภท
window.MS_BOOKS = [
  { id: 1,  slot: 1,  title: "ปีศาจ",                         author: "เสนีย์ เสาวพงศ์",               type: "นวนิยาย",        genre: "สังคมการเมือง" },
  { id: 2,  slot: 2,  title: "คำพิพากษา",                     author: "ชาติ กอบจิตติ",                 type: "นวนิยาย",        genre: "จิตวิทยา" },
  { id: 3,  slot: 3,  title: "ความสุขของกะทิ",                author: "งามพรรณ เวชชาชีวะ",             type: "นวนิยาย",        genre: "ครอบครัว" },
  { id: 4,  slot: 4,  title: "เจ้าชายน้อย",                   author: "อ็องตวน เดอ แซ็งแต็กซูว์เปรี",  type: "วรรณกรรมเยาวชน", genre: "แฟนตาซี" },
  { id: 5,  slot: 5,  title: "สี่แผ่นดิน",                    author: "ม.ร.ว. คึกฤทธิ์ ปราโมช",        type: "นวนิยาย",        genre: "ประวัติศาสตร์" },
  { id: 6,  slot: 6,  title: "ข้างหลังภาพ",                   author: "ศรีบูรพา",                      type: "นวนิยาย",        genre: "โรมานซ์" },
  { id: 7,  slot: 7,  title: "Sapiens",                       author: "Yuval Noah Harari",             type: "สารคดี",         genre: "ประวัติศาสตร์" },
  { id: 8,  slot: 8,  title: "Atomic Habits",                 author: "James Clear",                   type: "พัฒนาตนเอง",     genre: "จิตวิทยา" },
  { id: 9,  slot: 9,  title: "Deep Work",                     author: "Cal Newport",                   type: "พัฒนาตนเอง",     genre: "การทำงาน" },
  { id: 10, slot: 10, title: "Thinking, Fast and Slow",       author: "Daniel Kahneman",               type: "สารคดี",         genre: "จิตวิทยา" },
  { id: 11, slot: 11, title: "Cosmos",                        author: "Carl Sagan",                    type: "วิทยาศาสตร์",    genre: "ดาราศาสตร์" },
  { id: 12, slot: 12, title: "A Brief History of Time",       author: "Stephen Hawking",               type: "วิทยาศาสตร์",    genre: "ฟิสิกส์" },
  { id: 13, slot: 13, title: "ตำรับสายเยาวภา",                author: "ท่านผู้หญิงเปลี่ยน ภาสกรวงศ์",  type: "ตำราอาหาร",      genre: "อาหารไทย" },
  { id: 14, slot: 14, title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling",   type: "นวนิยาย",        genre: "แฟนตาซี" },
  { id: 15, slot: 15, title: "Murder on the Orient Express",  author: "Agatha Christie",               type: "นวนิยาย",        genre: "สืบสวน" }
];

// สถิติเริ่มต้น (ข้อมูลตัวอย่าง) หนังสือ id -> จำนวนครั้งที่เลือก
window.MS_DEMO_PICKS = { 3: 12, 1: 9, 6: 8, 4: 7, 8: 6, 5: 5, 2: 4, 7: 3, 12: 3, 14: 5, 15: 4, 13: 2, 9: 2, 11: 2, 10: 1 };
