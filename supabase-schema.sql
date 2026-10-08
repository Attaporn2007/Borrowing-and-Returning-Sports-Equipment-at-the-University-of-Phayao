-- รันไฟล์นี้ใน SQL Editor ของ Supabase (ตารางใหม่แทนอันเดิม)

-- ลบตารางเก่าทิ้งก่อน (ถ้ามีอยู่) เพื่อป้องกัน Error ซ้ำ
DROP TABLE IF EXISTS Blacklist, Return, BorrowItem, Borrow, Item, Category, Student, "User" CASCADE;

-- 1. ตาราง User (แก้ไขให้มีผู้ดูแลระบบเพียงบัญชีเดียว)
CREATE TABLE "User" (
    User_ID SERIAL PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL
);

INSERT INTO "User" (Username, Password) VALUES
('Adminsgn01', 'Adminsgnup01');

-- 1.5 ตาราง Student (โปรไฟล์ผู้ยืมที่สมัครผ่านเว็บ)
CREATE TABLE Student (
    Student_ID VARCHAR(20) PRIMARY KEY,
    Citizen_ID VARCHAR(13) NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(20),
    Status VARCHAR(50) NOT NULL DEFAULT 'ปกติ'
);

INSERT INTO Student (Student_ID, Citizen_ID, Name, Phone, Status) VALUES
('68023601', '1100100000002', 'นายกิตติศักดิ์ มั่นคง', NULL, 'ปกติ'),
('68023602', '1100100000003', 'นางสาวณิชา เพิ่มพูน', NULL, 'ปกติ'),
('68023603', '1100100000004', 'นายธนกฤต ชัยชนะ', NULL, 'ปกติ'),
('68023604', '1100100000005', 'นางสาวกานต์ดา สุขสวัสดิ์', NULL, 'ปกติ'),
('68023605', '1100100000001', 'นาย อรรถพร จันต๊ะ', NULL, 'ปกติ');

-- 2. ตาราง Category
CREATE TABLE Category (
    Category_ID SERIAL PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL,
    Description TEXT
);

INSERT INTO Category (CategoryName, Description) VALUES
('ลูกบอล', 'อุปกรณ์ประเภทลูกบอลกลางแจ้งและในร่ม'),
('ไม้แร็กเกต', 'อุปกรณ์ประเภทไม้ตี'),
('อุปกรณ์ทางน้ำ', 'อุปกรณ์สำหรับกีฬาทางน้ำ'),
('อุปกรณ์กรีฑา', 'อุปกรณ์สำหรับวิ่งและลาน'),
('อุปกรณ์ฟิตเนส', 'อุปกรณ์สำหรับออกกำลังกายในร่ม');

-- 3. ตาราง Item
CREATE TABLE Item (
    Item_ID SERIAL PRIMARY KEY,
    ItemName VARCHAR(100) NOT NULL,
    TotalQuantity INT NOT NULL,
    AvailableQuantity INT NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'พร้อมใช้งาน',
    Category_ID INT REFERENCES Category(Category_ID)
);

INSERT INTO Item (ItemName, TotalQuantity, AvailableQuantity, Status, Category_ID) VALUES
('ลูกฟุตบอล', 10, 8, 'พร้อมใช้งาน', 1),
('ลูกบาสเกตบอล', 8, 5, 'พร้อมใช้งาน', 1),
('ไม้แบดมินตัน', 15, 12, 'พร้อมใช้งาน', 2),
('ลูกวอลเลย์บอล', 10, 10, 'พร้อมใช้งาน', 1),
('ไม้ปิงปอง', 20, 16, 'พร้อมใช้งาน', 2);

-- 4. ตาราง Borrow (ปรับ User_ID ทั้งหมดให้เป็น 1 เพื่ออ้างอิงถึง Adminsgn01)
CREATE TABLE Borrow (
    Borrow_ID SERIAL PRIMARY KEY,
    BorrowDateTime TIMESTAMP NOT NULL,
    Student_ID VARCHAR(20) NOT NULL,
    National_ID VARCHAR(13),             -- รองรับการเก็บเลขบัตรประชาชน 13 หลัก
    BorrowName VARCHAR(100) NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'กำลังยืม',
    DueTime TIMESTAMP NOT NULL,
    User_ID INT REFERENCES "User"(User_ID)
);

INSERT INTO Borrow (BorrowDateTime, Student_ID, National_ID, BorrowName, Status, DueTime, User_ID) VALUES
('2026-08-26 10:00:00', '68023605', '1100100000001', 'นาย อรรถพร จันต๊ะ', 'กำลังยืม', '2026-08-26 17:00:00', 1),
('2026-08-26 10:30:00', '68023601', '1100100000002', 'นายกิตติศักดิ์ มั่นคง', 'กำลังยืม', '2026-08-26 17:00:00', 1),
('2026-08-26 11:00:00', '68023602', '1100100000003', 'นางสาวณิชา เพิ่มพูน', 'กำลังยืม', '2026-08-26 17:00:00', 1),
('2026-08-26 13:15:00', '68023603', '1100100000004', 'นายธนกฤต ชัยชนะ', 'คืนแล้ว', '2026-08-26 17:00:00', 1),
('2026-08-26 14:00:00', '68023604', '1100100000005', 'นางสาวกานต์ดา สุขสวัสดิ์', 'เกินกำหนด', '2026-08-26 17:00:00', 1);

-- 5. ตาราง BorrowItem
CREATE TABLE BorrowItem (
    BorrowItem_ID SERIAL PRIMARY KEY,
    Quantity INT NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'กำลังยืม',
    Borrow_ID INT REFERENCES Borrow(Borrow_ID),
    Item_ID INT REFERENCES Item(Item_ID)
);

INSERT INTO BorrowItem (Quantity, Status, Borrow_ID, Item_ID) VALUES
(2, 'กำลังยืม', 1, 1),
(1, 'กำลังยืม', 2, 2),
(2, 'กำลังยืม', 3, 3),
(4, 'คืนแล้ว', 4, 5),
(1, 'เกินกำหนด', 5, 4);

-- 6. ตาราง Return
CREATE TABLE Return (
    Return_ID SERIAL PRIMARY KEY,
    DueTime TIMESTAMP NOT NULL,
    ReturnDateTime TIMESTAMP,            -- เวลาคืนจริง (NULL = ยังไม่คืน)
    BorrowItem_ID INT REFERENCES BorrowItem(BorrowItem_ID)
);

INSERT INTO Return (DueTime, ReturnDateTime, BorrowItem_ID) VALUES
('2026-08-26 17:00:00', '2026-08-26 16:45:00', 1),
('2026-08-26 17:00:00', NULL, 2),
('2026-08-26 17:00:00', NULL, 3),
('2026-08-26 17:00:00', '2026-08-26 15:30:00', 4),
('2026-08-26 17:00:00', NULL, 5);

-- 7. ตาราง Blacklist
CREATE TABLE Blacklist (
    Blacklist_ID SERIAL PRIMARY KEY,
    Reason TEXT NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'ติด Blacklist',
    Return_ID INT REFERENCES Return(Return_ID)
);

INSERT INTO Blacklist (Reason, Status, Return_ID) VALUES
('ยังไม่นำอุปกรณ์มาคืนตามกำหนดเวลา', 'ติด Blacklist', 5),
('อุปกรณ์ชำรุดไม่อยู่ในสภาพเดิม', 'ติด Blacklist', 2),
('ส่งอุปกรณ์ล่าช้าเกิน 3 วัน', 'ปลดล็อกแล้ว', 4),
('ทำอุปกรณ์สูญหาย', 'ติด Blacklist', 1),
('ค้างชำระค่าปรับ', 'ติด Blacklist', 3);
