import type { Book } from "./types";

// Sample books.
// slot  = position on the shelf, left to right (the real shelf returns this list after a scan)
// type  = what kind of book, genre = what genre
// cover = (optional) image URL; when empty the app draws a cover from the title and type
export const SAMPLE_BOOKS: Book[] = [
  { id: 1,  slot: 1,  title: "ปีศาจ",                         author: "เสนีย์ เสาวพงศ์",               type: "นวนิยาย",        genre: "สังคมการเมือง", cover: "" },
  { id: 2,  slot: 2,  title: "คำพิพากษา",                     author: "ชาติ กอบจิตติ",                 type: "นวนิยาย",        genre: "จิตวิทยา",      cover: "" },
  { id: 3,  slot: 3,  title: "ความสุขของกะทิ",                author: "งามพรรณ เวชชาชีวะ",             type: "นวนิยาย",        genre: "ครอบครัว",      cover: "" },
  { id: 4,  slot: 4,  title: "เจ้าชายน้อย",                   author: "อ็องตวน เดอ แซ็งแต็กซูว์เปรี",  type: "วรรณกรรมเยาวชน", genre: "แฟนตาซี",       cover: "" },
  { id: 5,  slot: 5,  title: "สี่แผ่นดิน",                    author: "ม.ร.ว. คึกฤทธิ์ ปราโมช",        type: "นวนิยาย",        genre: "ประวัติศาสตร์", cover: "" },
  { id: 6,  slot: 6,  title: "ข้างหลังภาพ",                   author: "ศรีบูรพา",                      type: "นวนิยาย",        genre: "โรมานซ์",       cover: "" },
  { id: 7,  slot: 7,  title: "Sapiens",                       author: "Yuval Noah Harari",             type: "สารคดี",         genre: "ประวัติศาสตร์", cover: "" },
  { id: 8,  slot: 8,  title: "Atomic Habits",                 author: "James Clear",                   type: "พัฒนาตนเอง",     genre: "จิตวิทยา",      cover: "" },
  { id: 9,  slot: 9,  title: "Deep Work",                     author: "Cal Newport",                   type: "พัฒนาตนเอง",     genre: "การทำงาน",      cover: "" },
  { id: 10, slot: 10, title: "Thinking, Fast and Slow",       author: "Daniel Kahneman",               type: "สารคดี",         genre: "จิตวิทยา",      cover: "" },
  { id: 11, slot: 11, title: "Cosmos",                        author: "Carl Sagan",                    type: "วิทยาศาสตร์",    genre: "ดาราศาสตร์",    cover: "" },
  { id: 12, slot: 12, title: "A Brief History of Time",       author: "Stephen Hawking",               type: "วิทยาศาสตร์",    genre: "ฟิสิกส์",       cover: "" },
  { id: 13, slot: 13, title: "ตำรับสายเยาวภา",                author: "ท่านผู้หญิงเปลี่ยน ภาสกรวงศ์",  type: "ตำราอาหาร",      genre: "อาหารไทย",      cover: "" },
  { id: 14, slot: 14, title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling",   type: "นวนิยาย",        genre: "แฟนตาซี",       cover: "" },
  { id: 15, slot: 15, title: "Murder on the Orient Express",  author: "Agatha Christie",               type: "นวนิยาย",        genre: "สืบสวน",        cover: "" },
];

// Starting statistics (sample data): book id -> number of times picked
export const DEMO_PICKS: Record<number, number> = {
  3: 12, 1: 9, 6: 8, 4: 7, 8: 6, 5: 5, 2: 4, 7: 3, 12: 3, 14: 5, 15: 4, 13: 2, 9: 2, 11: 2, 10: 1,
};
