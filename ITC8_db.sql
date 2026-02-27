-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Feb 27, 2026 at 06:08 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ITC8_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity`
--

CREATE TABLE `activity` (
  `activity_id` bigint(20) NOT NULL,
  `publicuty_post_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity`
--

INSERT INTO `activity` (`activity_id`, `publicuty_post_id`) VALUES
(1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `banner`
--

CREATE TABLE `banner` (
  `banner_id` bigint(20) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `discription` text DEFAULT NULL,
  `image_path` text NOT NULL,
  `source_activity_id` bigint(20) DEFAULT NULL,
  `source_news_id` bigint(20) DEFAULT NULL,
  `source_link_url` text DEFAULT NULL,
  `is_active` int(11) NOT NULL,
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `create_by` int(11) NOT NULL,
  `create_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `banner`
--

INSERT INTO `banner` (`banner_id`, `title`, `discription`, `image_path`, `source_activity_id`, `source_news_id`, `source_link_url`, `is_active`, `start_at`, `end_at`, `create_by`, `create_at`) VALUES
(1, 'ict8', '', 'uploads/banners/banner_20260227_053213_34ae14bed67d.jpg', NULL, NULL, NULL, 1, NULL, NULL, 20, '2026-02-27 11:32:13'),
(2, 'รถดาวเทียม', '', 'uploads/banners/banner_20260227_053238_0a7698fc005e.jpg', NULL, NULL, NULL, 0, NULL, NULL, 20, '2026-02-27 11:32:38'),
(3, 'ประกาศเจตนารมณ์', '', 'uploads/banners/banner_20260227_053259_b8162f037a55.jpg', NULL, 3, NULL, 1, NULL, NULL, 20, '2026-02-27 11:32:59'),
(4, 'ทดสอบ1', '', 'uploads/banners/banner_20260227_053416_ab95f2ec013f.jpg', NULL, NULL, NULL, 1, NULL, NULL, 20, '2026-02-27 11:34:16'),
(5, 'ทดสอบ2', '', 'uploads/banners/banner_20260227_053436_144914d2c7b7.jpg', NULL, NULL, NULL, 1, NULL, NULL, 20, '2026-02-27 11:34:36'),
(6, 'ทดสอบ3', '', 'uploads/banners/banner_20260227_053500_22227add5873.png', NULL, NULL, NULL, 1, NULL, NULL, 20, '2026-02-27 11:35:00');

-- --------------------------------------------------------

--
-- Table structure for table `channel`
--

CREATE TABLE `channel` (
  `channel_id` int(11) NOT NULL,
  `channel` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `channel`
--

INSERT INTO `channel` (`channel_id`, `channel`) VALUES
(1, 'line'),
(2, 'web');

-- --------------------------------------------------------

--
-- Table structure for table `contact_info`
--

CREATE TABLE `contact_info` (
  `contact_info_id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `fax` varchar(255) DEFAULT NULL,
  `fax_extension` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `facebook_name` varchar(255) DEFAULT NULL,
  `facebook_url` text DEFAULT NULL,
  `line_id` varchar(255) DEFAULT NULL,
  `line_url` text DEFAULT NULL,
  `map_embed_url` text DEFAULT NULL,
  `map_lat` text DEFAULT NULL,
  `map_lng` text DEFAULT NULL,
  `create_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `contact_info`
--

INSERT INTO `contact_info` (`contact_info_id`, `organization_id`, `phone_number`, `fax`, `fax_extension`, `email`, `facebook_name`, `facebook_url`, `line_id`, `line_url`, `map_embed_url`, `map_lat`, `map_lng`, `create_at`) VALUES
(1, 1, '0-5525-8559', NULL, NULL, 'saraban_phitsanulok@moi.go.th', NULL, NULL, NULL, NULL, NULL, '16.829911033025063', '100.26001466706398', '2026-02-18 18:45:55'),
(2, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '17.629996031582724', '100.09585112201647', '2026-02-18 18:52:16'),
(3, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '17.00639201646107', '99.8267011140633', '2026-02-18 18:53:03'),
(4, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '17.00004079217932', '99.12548358449317', '2026-02-18 18:53:52'),
(5, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '18.145389321613088', '100.14044873922674', '2026-02-18 18:54:22'),
(6, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '18.797241471316585', '100.73436076808143', '2026-02-18 18:55:06'),
(7, 7, '055-258-955', '055-258955', '20455, 20466', 'zonel8.pitsanulok@gmail.com', 'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสารเขต 8 พิษณุโลก', 'https://www.facebook.com/profile.php?id=100064204652886', NULL, NULL, '<iframe src=\"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3819.0179480715533!2d100.2571603743738!3d16.825465683969046!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30dfbd5f56a30fb3%3A0x51a9fa816a71070d!2z4Lio4Li54LiZ4Lii4LmM4Liq4Li34LmI4Lit4Liq4Liy4Lij4LmA4LiC4LiVIDgg4LiI4Lix4LiH4Lir4Lin4Lix4LiU4Lie4Li04Lip4LiT4Li44LmC4Lil4LiB!5e0!3m2!1sth!2sth!4v1771415906635!5m2!1sth!2sth\" width=\"600\" height=\"450\" style=\"border:0;\" allowfullscreen=\"\" loading=\"lazy\" referrerpolicy=\"no-referrer-when-downgrade\"></iframe>', '16.82577377005273', '100.25973529501078', '2026-02-18 18:58:36');

-- --------------------------------------------------------

--
-- Table structure for table `department`
--

CREATE TABLE `department` (
  `department_id` int(11) NOT NULL,
  `department_code` varchar(255) NOT NULL,
  `department_title` varchar(255) NOT NULL,
  `organization_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `department`
--

INSERT INTO `department` (`department_id`, `department_code`, `department_title`, `organization_id`) VALUES
(1, 'IT', 'ฝ่ายเทคโนโลยีสารสนเทศ', 7),
(2, 'CT', 'ฝ่ายเทคโนโลยีการสื่อสาร', 7),
(3, 'GA', 'ฝ่ายบริหารงานทั่วไป', 7),
(5, 'test1', 'ทดสอบ', 5);

-- --------------------------------------------------------

--
-- Table structure for table `device`
--

CREATE TABLE `device` (
  `device_id` bigint(20) NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `main_type_of_device_id` int(11) DEFAULT NULL,
  `type_of_device_id` int(11) DEFAULT NULL,
  `ip` varchar(255) DEFAULT NULL,
  `detail` text DEFAULT NULL,
  `contact_info_id` int(11) DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `device`
--

INSERT INTO `device` (`device_id`, `device_name`, `main_type_of_device_id`, `type_of_device_id`, `ip`, `detail`, `contact_info_id`, `is_online`) VALUES
(1, 'Phrae_MPLS_router', 5, 4, '10.250.0.115', NULL, 5, 0),
(3, 'Phrae_MCU_vcs', 4, 10, '10.220.22.129', NULL, 5, 0),
(4, 'Phrae_internet_GIN_switch', 1, 6, '10.228.132.1', NULL, 5, 0),
(5, 'Phrae_internet_GIN_switch', 1, 6, '10.229.132.1', NULL, 5, 0),
(6, 'Phrae_IP_Phone_telephone', 3, 9, '10.246.133.1', NULL, 5, 0),
(7, 'Phrae_IP_Phone_telephone', 3, 9, '10.247.133.1', NULL, 5, 0),
(8, 'Phrae_Internet_MOI_router', 2, 4, '10.8.104.1', NULL, 5, 0),
(9, 'Phrae_Internet_MOI_router', 2, 4, '10.8.8.2', NULL, 5, 0),
(10, 'Phrae_Internet_MOI_router', 2, 4, '10.8.9.1', NULL, 5, 0),
(11, 'Phrae_radio_radio', 7, 11, '10.8.100.5', NULL, 5, 0),
(12, 'Phrae_SX80_vcs', 8, 10, '10.220.22.131', NULL, 5, 0),
(13, 'Nan_MPLS_router', 5, 4, '10.250.0.116', NULL, 6, 0),
(14, 'Nan_MCU_vcs', 4, 10, '10.220.22.161', NULL, 6, 0),
(15, 'Nan_MCU_vcs', 4, 10, '10.220.48.129', NULL, 6, 0),
(16, 'Nan_internet_GIN_switch', 1, 6, '10.228.133.1', NULL, 6, 0),
(17, 'Nan_internet_GIN_switch', 1, 6, '10.229.133.1', NULL, 6, 0),
(18, 'Nan_IP_Phone_telephone', 3, 9, '10.246.134.1', NULL, 6, 0),
(19, 'Nan_IP_Phone_telephone', 3, 9, '10.247.134.1', NULL, 6, 0),
(20, 'Nan_Internet_MOI_router', 2, 4, '10.8.10.2', NULL, 6, 0),
(21, 'Nan_Internet_MOI_router', 2, 4, '10.8.105.1', NULL, 6, 0),
(22, 'Nan_Internet_MOI_router', 2, 4, '10.8.111.1', NULL, 6, 0),
(23, 'Nan_radio_radio', 7, 11, '10.8.100.5', NULL, 6, 0),
(24, 'Nan_SX80_vcs', 8, 10, '10.220.22.162', NULL, 6, 0),
(25, 'Uttaradit_MPLS_router', 5, 4, '10.250.0.112', NULL, 2, 0),
(26, 'Uttaradit_MCU_vcs', 4, 10, '10.220.22.33', NULL, 2, 0),
(27, 'Uttaradit_MCU_vcs', 4, 10, '10.220.46.209', NULL, 2, 0),
(28, 'Uttaradit_internet_GIN_switch', 1, 6, '10.228.129.1', NULL, 2, 0),
(29, 'Uttaradit_internet_GIN_switch', 1, 6, '10.229.129.1', NULL, 2, 0),
(30, 'Uttaradit_IP_Phone_telephone', 3, 9, '10.246.130.1', NULL, 2, 0),
(31, 'Uttaradit_IP_Phone_telephone', 3, 9, '10.247.130.1', NULL, 2, 0),
(32, 'Uttaradit_Internet_MOI_router', 2, 4, '10.8.101.1', NULL, 2, 0),
(33, 'Uttaradit_Internet_MOI_router', 2, 4, '10.8.2.2', NULL, 2, 0),
(34, 'Uttaradit_Internet_MOI_router', 2, 4, '10.8.3.1', NULL, 2, 0),
(35, 'Uttaradit_radio_radio', 7, 11, '10.8.3.1', NULL, 2, 0),
(36, 'Uttaradit_SX80_vcs', 8, 10, '10.220.22.35', NULL, 2, 0),
(37, 'Sukhothai_MPLS_router', 5, 4, '10.250.0.113', NULL, 3, 0),
(38, 'Sukhothai_MCU_vcs', 4, 10, '10.220.22.65', NULL, 3, 0),
(39, 'Sukhothai_MCU_vcs', 4, 10, '10.220.48.81', NULL, 3, 0),
(40, 'Sukhothai_internet_GIN_switch', 1, 6, '10.228.130.1', NULL, 3, 0),
(41, 'Sukhothai_internet_GIN_switch', 1, 6, '10.229.130.1', NULL, 3, 0),
(42, 'Sukhothai_IP_Phone_telephone', 3, 9, '10.246.131.1', NULL, 3, 0),
(43, 'Sukhothai_IP_Phone_telephone', 3, 9, '10.247.131.1', NULL, 3, 0),
(44, 'Sukhothai_Internet_MOI_router', 2, 4, '10.8.102.1', NULL, 3, 0),
(45, 'Sukhothai_Internet_MOI_router', 2, 4, '10.8.4.2', NULL, 3, 0),
(46, 'Sukhothai_Internet_MOI_router', 2, 4, '10.8.5.1', NULL, 3, 0),
(47, 'Sukhothai_radio_radio', 7, 11, '10.8.100.5', NULL, 3, 0),
(48, 'Sukhothai_radio_radio', 7, 11, '10.220.22.67', NULL, 3, 0),
(49, 'Tak_MPLS_router', 5, 4, '10.250.0.114', NULL, 4, 0),
(50, 'Tak_MCU_vcs', 4, 10, '10.220.22.97', NULL, 4, 0),
(51, 'Tak_MCU_vcs', 4, 10, '10.220.46.201', NULL, 4, 0),
(52, 'Tak_internet_GIN_switch', 1, 6, '10.228.131.1', NULL, 4, 0),
(53, 'Tak_internet_GIN_switch', 1, 6, '10.229.131.1', NULL, 4, 0),
(54, 'Tak_IP_Phone_telephone', 3, 9, '10.246.132.1', NULL, 4, 0),
(55, 'Tak_IP_Phone_telephone', 3, 9, '10.247.132.1', NULL, 4, 0),
(56, 'Tak_Internet_MOI_router', 2, 4, '10.8.103.1', NULL, 4, 0),
(57, 'Tak_Internet_MOI_router', 2, 4, '10.8.0.6.2', NULL, 4, 0),
(58, 'Tak_Internet_MOI_router', 2, 4, '10.8.7.1', NULL, 4, 0),
(59, 'Tak_radio_radio', 7, 11, '10.8.100.5', NULL, 4, 0),
(60, 'Tak_SX80_vcs', 8, 10, '10.220.22.99', NULL, 4, 0),
(61, 'Phitsanulok_MPLS_router', 5, 4, '10.250.0.11', NULL, 1, 0),
(62, 'Phitsanulok_MCU_vcs', 4, 10, '10.220.48.97', NULL, 1, 0),
(63, 'Phitsanulok_internet_GIN_switch', 1, 6, '10.229.128.1', NULL, 1, 0),
(64, 'Phitsanulok_IP_Phone_telephone', 3, 9, '10.246.129.1', NULL, 1, 0),
(65, 'Phitsanulok_IP_Phone_telephone', 3, 9, '10.247.129.1', NULL, 1, 0),
(66, 'Phitsanulok_Internet_MOI_router', 2, 4, '10.8.100.1', NULL, 1, 0),
(67, 'Phitsanulok_Internet_MOI_router', 2, 4, '10.8.100.1', NULL, 1, 0),
(68, 'Phitsanulok_radio_radio', 7, 11, '10.8.100.5', NULL, 1, 0),
(69, 'Phitsanulok_SX80_vcs', 8, 10, '10.220.22.7', NULL, 1, 0),
(70, 'Phitsanulok_internet_GIN_switch', 1, 6, '10.228.128.1', NULL, 7, 0),
(71, 'Phitsanulok_IP_Phone_telephone', 3, 9, '10.246.128.1', NULL, 7, 0),
(72, 'Phitsanulok_Internet_MOI_router', 2, 4, '10.8.0.1', NULL, 7, 0),
(73, 'Phitsanulok_radio_radio', 7, 11, '10.8.100.1', NULL, 7, 0),
(74, 'Phitsanulok_RG08_SWC38_01_switch', 13, 6, '10.251.23.11', NULL, 7, 0),
(75, 'Phitsanulok_RG08_SWC29_01_switch', 11, 6, '10.251.23.12', NULL, 7, 0),
(76, 'Phitsanulok_RG08_SWC29_02_switch', 12, 6, '10.251.23.13', NULL, 7, 0),
(77, 'Phitsanulok_server_radio_radio', 14, 11, '10.8.100.5', NULL, 7, 0),
(78, 'Phitsanulok_radio_radio', 7, 11, '10.220.22.6', NULL, 7, 0),
(79, 'Phitsanulok_SX80_vcs', 8, 10, '10.8.0.45', NULL, 7, 0),
(80, 'Phitsanulok_printer_printer', 10, 13, '10.247.128.12', NULL, 7, 0),
(81, 'Phitsanulok_printer_printer', 10, 13, '10.247.128.13', NULL, 7, 0),
(82, 'Phitsanulok_printer_printer', 10, 13, '10.247.128.14', NULL, 7, 0),
(83, 'Phitsanulok_printer_printer', 10, 13, '10.247.128.15', NULL, 7, 0),
(84, 'Phitsanulok_printer_printer', 10, 13, '10.247.128.16', NULL, 7, 0),
(85, 'Phitsanulok_MPLS_router', 5, 4, '10.250.0.23', NULL, 7, 0),
(86, 'Phitsanulok_NAT_NAT', 6, 14, '1.1.23.1', NULL, 7, 0),
(87, 'Phitsanulok_MCU_vcs', 4, 10, NULL, NULL, 7, 0),
(88, 'Phitsanulok_NAT_NAT', 6, 14, '1.1.111.1', NULL, 1, 0),
(89, 'Tak_NAT_NAT', 6, 14, '1.1.114.1', NULL, 4, 0),
(90, 'Sukhothai_NAT_NAT', 6, 14, '1.1.113.1', NULL, 3, 0),
(91, 'Uttaradit_NAT_NAT', 6, 14, '1.1.112.1', NULL, 2, 0),
(92, 'Nan_NAT_NAT', 6, 14, '1.1.116.1', NULL, 6, 0),
(93, 'Phrae_NAT_NAT', 6, 14, '1.1.115.1', NULL, 5, 0);

-- --------------------------------------------------------

--
-- Table structure for table `document`
--

CREATE TABLE `document` (
  `document_id` bigint(20) NOT NULL,
  `filepath` text NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `is_private` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document`
--

INSERT INTO `document` (`document_id`, `filepath`, `original_filename`, `stored_filename`, `file_size`, `is_private`, `is_active`) VALUES
(1, '/uploads/documents/doc_20260226_061625_24fa983e16cc4f62.docx', 'ใบลากิจ-ลาป่วยสำหรับนักศึกษาฝึกงาน', 'doc_20260226_061625_24fa983e16cc4f62.docx', 0, 0, 1),
(2, 'https://ict8.moi.go.th/image/208/%E0%B8%87%E0%B8%94%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B9%80%E0%B8%82%E0%B8%95%E0%B9%98.pdf', 'ประกาศเจตนารมณ์', '%E0%B8%87%E0%B8%94%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B9%80%E0%B8%82%E0%B8%95%E0%B9%98.pdf', 0, 0, 1),
(3, '/uploads/documents/doc_20260226_081104_fbc58795c1602f90.pdf', 'ประกาศผู้ชนะการเสนอราคา', 'doc_20260226_081104_fbc58795c1602f90.pdf', 0, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `event`
--

CREATE TABLE `event` (
  `event_id` bigint(20) NOT NULL,
  `request_id` bigint(20) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `detail` text DEFAULT NULL,
  `location` text DEFAULT NULL,
  `province_id` int(11) DEFAULT NULL,
  `meeting_link` varchar(255) DEFAULT NULL,
  `round_no` int(11) NOT NULL,
  `event_year` int(11) NOT NULL,
  `note` text DEFAULT NULL,
  `event_status_id` int(11) DEFAULT NULL,
  `start_datetime` datetime DEFAULT NULL,
  `end_datetime` datetime DEFAULT NULL,
  `create_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event`
--

INSERT INTO `event` (`event_id`, `request_id`, `title`, `detail`, `location`, `province_id`, `meeting_link`, `round_no`, `event_year`, `note`, `event_status_id`, `start_datetime`, `end_datetime`, `create_at`, `updated_at`) VALUES
(1, 10, 'ทดสอบแก้ไข', 'รายละเอียด', NULL, 1, NULL, 1, 2026, NULL, 13, '2026-02-19 13:01:00', '2026-02-21 13:02:00', '2026-02-24 00:59:54', '2026-02-24 00:59:54'),
(2, 9, 'ทดสอบ2', 'รายละเอียด2', 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', 2, NULL, 1, 2026, NULL, 8, NULL, NULL, '2026-02-24 01:10:06', '2026-02-24 01:10:06'),
(3, 7, 'ทดสอบการทำงานของการแจ้งเตือน', 'ทดสอบการทำงานของการแจ้งเตือน', 'หลักกิโลที่ 0', 3, NULL, 1, 2026, NULL, 16, '2026-02-22 15:46:00', '2026-02-23 15:51:00', '2026-02-24 00:59:27', '2026-02-24 00:59:27'),
(4, 14, 'ทดสอบบริการรถดาวเทียมสื่อสาร (#3)', '1. เรียนท่านผู้โดยสารโปรทราบ\n2. การเรียนรู้ไม่มีที่สิ้นสุด', 'อยากกินขนมเปียกปูน', 4, NULL, 1, 2026, 'นอนกลางวัน', 15, '2026-02-22 14:23:00', '2026-02-24 14:23:00', '2026-02-23 07:35:17', '2026-02-23 07:35:17'),
(5, 5, 'ทดสอบการแจ้งเตือนครั้งที่ 2', 'ทดสอบการแจ้งเตือนครั้งที่ 2', NULL, 3, NULL, 1, 2026, NULL, 11, '2026-02-22 14:18:00', '2026-02-22 20:18:00', '2026-02-24 01:00:06', '2026-02-24 01:00:06'),
(6, 4, 'ทดสอบ', 'ทดสอบ', NULL, 1, NULL, 1, 2026, NULL, 11, '2026-02-06 12:07:00', '2026-02-08 12:07:00', '2026-02-24 01:00:39', '2026-02-24 01:00:39'),
(7, 18, 'TEST round/year auto', 'auto round/year', 'ทดสอบ round/year', 4, NULL, 1, 2569, NULL, 16, '2026-03-01 10:00:00', '2026-03-01 12:00:00', '2026-02-24 01:02:09', '2026-02-24 01:02:09'),
(8, 3, 'ทดสอบ round_no/year', 'ทดสอบ round_no/year', NULL, 1, NULL, 2, 2569, NULL, 9, '2026-02-22 11:56:00', '2026-02-24 11:56:00', '2026-02-20 04:38:44', '2026-02-20 04:38:44'),
(9, NULL, 'ตื่นมาทำงานตอนเช้า', '12345', NULL, 1, NULL, 3, 2569, NULL, NULL, '2026-02-21 00:00:00', '2026-02-22 23:59:59', '2026-02-20 05:26:17', '2026-02-20 05:26:17'),
(10, NULL, 'ทดสอบ', 'ทดสอบ', 'ทดสอบ', 1, NULL, 4, 2569, NULL, NULL, '2026-02-20 00:00:00', '2026-02-21 23:59:59', '2026-02-20 06:51:41', '2026-02-20 06:51:41'),
(11, NULL, 'ทดสอบการแจ้งเตือนผ่านไลน์ในหัวข้อการเพิ่มงานในหน่วยงาน', 'ทดสอบการแจ้งเตือนผ่านไลน์ในหัวข้อการเพิ่มงานในหน่วยงาน', 'ทดสอบการแจ้งเตือนผ่านไลน์ในหัวข้อการเพิ่มงานในหน่วยงาน', 1, NULL, 5, 2569, 'ทดสอบการแจ้งเตือนผ่านไลน์ในหัวข้อการเพิ่มงานในหน่วยงาน', NULL, '2026-03-06 00:00:00', '2026-03-06 23:59:59', '2026-02-20 06:58:57', '2026-02-20 06:58:57'),
(12, NULL, 'ทดสอบการเพิ่มงานสำหรับหน้ารายการงาน', 'ทดสอบการเพิ่มงานสำหรับหน้ารายการงาน', 'ทดสอบการเพิ่มงานสำหรับหน้ารายการงาน', 2, NULL, 6, 2569, 'ทดสอบการเพิ่มงานสำหรับหน้ารายการงาน', NULL, '2026-02-20 00:00:00', '2026-02-20 23:59:59', '2026-02-20 07:59:53', '2026-02-20 07:59:53'),
(14, 6, 'ทดสอบ event_log ฝั่ง request 1', 'ทดสอบ event_log ฝั่ง request 1', NULL, 3, NULL, 7, 2569, 'วันพรุ่งนี้ใส่ชุดสีชมพู', 10, '2026-02-22 15:24:00', '2026-02-22 23:24:00', '2026-02-23 06:58:26', '2026-02-23 06:58:26'),
(15, NULL, 'ทดสอบ event_log เพิ่มงาน (ภายในหน่วยงาน)', 'ทดสอบ event_log เพิ่มงาน (ภายในหน่วยงาน)', 'ทดสอบ event_log เพิ่มงาน (ภายในหน่วยงาน)', 3, NULL, 8, 2569, 'ทดสอบ event_log เพิ่มงาน (ภายในหน่วยงาน)', NULL, '2026-02-21 00:00:00', '2026-02-21 23:59:59', '2026-02-20 08:56:16', '2026-02-20 08:56:16'),
(16, 19, 'ทดสอบการขอสนับสนุนห้องประชุม vcs', 'ทดสอบการขอสนับสนุนห้องประชุม vcs', NULL, 2, NULL, 9, 2569, NULL, 9, '2026-02-22 08:30:00', '2026-02-22 13:30:00', '2026-02-20 10:56:27', '2026-02-20 10:56:27'),
(17, 20, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์13579', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 3, NULL, 15, 2569, 'รอบริษัทช่างหัวมันตอบกลับ 101', 8, '2026-02-21 18:02:00', '2026-02-28 18:02:00', '2026-02-24 01:22:04', '2026-02-24 01:22:04'),
(18, NULL, 'ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)', NULL, NULL, 1, NULL, 11, 2569, 'วันที่ 21 เดือนมีนา ต้องทำเอกสารรายงานผลการทดสอบประสิทธิภาพให้เรียบร้อย', NULL, '2026-02-21 00:00:00', '2026-02-24 23:59:00', '2026-02-23 08:12:55', '2026-02-23 08:12:55'),
(19, 22, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', NULL, 5, 'https://www.facebook.com/', 12, 2569, '1234', 11, '2026-03-10 14:22:00', '2026-03-11 14:22:00', '2026-02-24 00:48:25', '2026-02-24 00:48:25'),
(20, 23, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', 'กำหนดการ นัดเดินทางตอนเช้าเวลา 05.00', 'อยากกินขนมเปียกปูน', 3, NULL, 13, 2569, NULL, 17, '2026-03-11 14:47:00', '2026-03-12 14:47:00', '2026-02-23 08:09:10', '2026-02-23 08:09:10'),
(21, 21, 'ทดสอบ', NULL, NULL, 3, NULL, 14, 2569, NULL, 13, '2026-03-04 14:19:00', '2026-03-05 14:19:00', '2026-02-24 01:13:19', '2026-02-24 01:13:19');

-- --------------------------------------------------------

--
-- Table structure for table `event_log`
--

CREATE TABLE `event_log` (
  `event_log_id` bigint(20) NOT NULL,
  `event_id` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `detail` text NOT NULL,
  `location` text NOT NULL,
  `note` text NOT NULL,
  `updated_by` int(11) NOT NULL,
  `participant_user_ids` varchar(2000) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_log`
--

INSERT INTO `event_log` (`event_log_id`, `event_id`, `title`, `detail`, `location`, `note`, `updated_by`, `participant_user_ids`) VALUES
(2, 14, 'ทดสอบ event_log ฝั่ง request', 'ทดสอบ event_log ฝั่ง request', '', '', 20, ''),
(3, 15, 'ทดสอบ event_log เพิ่มงาน (ภายในหน่วยงาน)', 'ทดสอบ event_log เพิ่มงาน (ภายในหน่วยงาน)', 'ทดสอบ event_log เพิ่มงาน (ภายในหน่วยงาน)', 'ทดสอบ event_log เพิ่มงาน (ภายในหน่วยงาน)', 20, ''),
(4, 16, 'ทดสอบการขอสนับสนุนห้องประชุม vcs', 'ทดสอบการขอสนับสนุนห้องประชุม vcs', '', '', 20, ''),
(5, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', '', 20, ''),
(6, 18, 'ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)', '', '', '', 20, ''),
(7, 14, 'ทดสอบ event_log ฝั่ง request 1', 'ทดสอบ event_log ฝั่ง request 1', '', 'นอนกลางวัน', 20, ''),
(8, 14, 'ทดสอบ event_log ฝั่ง request 1', 'ทดสอบ event_log ฝั่ง request 1', '', 'วันพรุ่งนี้ใส่ชุดสีชมพู', 20, ''),
(9, 14, 'ทดสอบ event_log ฝั่ง request 1', 'ทดสอบ event_log ฝั่ง request 1', '', 'วันพรุ่งนี้ใส่ชุดสีชมพู', 20, ''),
(10, 14, 'ทดสอบ event_log ฝั่ง request 1', 'ทดสอบ event_log ฝั่ง request 1', '', 'วันพรุ่งนี้ใส่ชุดสีชมพู', 20, ''),
(11, 14, 'ทดสอบ event_log ฝั่ง request 1', 'ทดสอบ event_log ฝั่ง request 1', '', 'วันพรุ่งนี้ใส่ชุดสีชมพู', 20, '20'),
(12, 14, 'ทดสอบ event_log ฝั่ง request 1', 'ทดสอบ event_log ฝั่ง request 1', '', 'วันพรุ่งนี้ใส่ชุดสีชมพู', 20, '20,21,23'),
(13, 14, 'ทดสอบ event_log ฝั่ง request 1', 'ทดสอบ event_log ฝั่ง request 1', '', 'วันพรุ่งนี้ใส่ชุดสีชมพู', 20, '20,22,23'),
(14, 14, 'ทดสอบ event_log ฝั่ง request 1', 'ทดสอบ event_log ฝั่ง request 1', '', 'วันพรุ่งนี้ใส่ชุดสีชมพู', 20, '20'),
(15, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, ''),
(16, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, '20,21,23'),
(17, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, '20,21,23'),
(18, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, '20'),
(19, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, ''),
(20, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, '20'),
(21, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', '', 20, ''),
(22, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ', 20, '20'),
(23, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ', 20, '20'),
(24, 18, 'ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)', '', '', 'วันที่ 21 เดือนมีนา ต้องทำเอกสารรายงานผลการทดสอบประสิทธิภาพให้เรียบร้อย', 20, '20,21,22'),
(25, 18, 'ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)', '', '', 'วันที่ 21 เดือนมีนา ต้องทำเอกสารรายงานผลการทดสอบประสิทธิภาพให้เรียบร้อย', 20, '20'),
(26, 4, 'ทดสอบบริการรถดาวเทียมสื่อสาร (#3)', '1. เรียนท่านผู้โดยสารโปรทราบ\n2. การเรียนรู้ไม่มีที่สิ้นสุด', 'อยากกินขนมเปียกปูน', '', 20, ''),
(27, 4, 'ทดสอบบริการรถดาวเทียมสื่อสาร (#3)', '1. เรียนท่านผู้โดยสารโปรทราบ\n2. การเรียนรู้ไม่มีที่สิ้นสุด', 'อยากกินขนมเปียกปูน', 'นอนกลางวัน', 20, ''),
(28, 4, 'ทดสอบบริการรถดาวเทียมสื่อสาร (#3)', '1. เรียนท่านผู้โดยสารโปรทราบ\n2. การเรียนรู้ไม่มีที่สิ้นสุด', 'อยากกินขนมเปียกปูน', 'นอนกลางวัน', 20, ''),
(29, 20, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', '', 'อยากกินขนมเปียกปูน', '', 20, ''),
(30, 21, 'ทดสอบ', '', '', '', 20, ''),
(31, 20, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', '', 'อยากกินขนมเปียกปูน', '', 20, ''),
(32, 20, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', 'กำหนดการ นัดเดินทางตอนเช้าเวลา 05.00', 'อยากกินขนมเปียกปูน', '', 20, '20'),
(33, 20, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', 'กำหนดการ นัดเดินทางตอนเช้าเวลา 05.00', 'อยากกินขนมเปียกปูน', '', 20, '20'),
(34, 20, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', 'กำหนดการ นัดเดินทางตอนเช้าเวลา 05.00', 'อยากกินขนมเปียกปูน', '', 20, '20'),
(35, 20, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', 'กำหนดการ นัดเดินทางตอนเช้าเวลา 05.00', 'อยากกินขนมเปียกปูน', '', 20, '20'),
(36, 20, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', 'กำหนดการ นัดเดินทางตอนเช้าเวลา 05.00', 'อยากกินขนมเปียกปูน', '', 20, '20'),
(37, 20, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', 'กำหนดการ นัดเดินทางตอนเช้าเวลา 05.00', 'อยากกินขนมเปียกปูน', '', 20, '20'),
(38, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ', 20, '20'),
(39, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ 101', 20, '20'),
(40, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ 101', 20, '20'),
(41, 18, 'ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)', '', '', 'วันที่ 21 เดือนมีนา ต้องทำเอกสารรายงานผลการทดสอบประสิทธิภาพให้เรียบร้อย', 20, '20'),
(42, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, '20'),
(43, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, '20'),
(44, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, '20'),
(45, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, '20'),
(46, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '', 20, '20,22'),
(47, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์1', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ 101', 20, '20'),
(48, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์13579', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ 101', 20, '20'),
(49, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '1234', 20, '20'),
(50, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '1234', 20, '20'),
(51, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '1234', 20, '20'),
(52, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '1234', 20, ''),
(53, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '1234', 20, '20'),
(54, 19, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 'ทดสอบการขอสนับสนุนห้องประชุม webex', '', '1234', 20, '20'),
(55, 2, 'ทดสอบ2', 'รายละเอียด2', 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', '', 20, ''),
(56, 3, 'ทดสอบการทำงานของการแจ้งเตือน', 'ทดสอบการทำงานของการแจ้งเตือน', 'หลักกิโลที่ 0', '', 20, ''),
(57, 1, 'ทดสอบแก้ไข', 'รายละเอียด', '', '', 20, ''),
(58, 1, 'ทดสอบแก้ไข', 'รายละเอียด', '', '', 20, ''),
(59, 1, 'ทดสอบแก้ไข', 'รายละเอียด', '', '', 20, ''),
(60, 5, 'ทดสอบการแจ้งเตือนครั้งที่ 2', 'ทดสอบการแจ้งเตือนครั้งที่ 2', '', '', 20, ''),
(61, 6, 'ทดสอบ', 'ทดสอบ', '', '', 20, ''),
(62, 7, 'TEST round/year auto', 'auto round/year', 'ทดสอบ round/year', '', 20, ''),
(63, 2, 'ทดสอบ2', 'รายละเอียด2', 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', '', 20, '20'),
(64, 2, 'ทดสอบ2', 'รายละเอียด2', 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', '', 20, '20'),
(65, 2, 'ทดสอบ2', 'รายละเอียด2', 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', '', 20, '20'),
(66, 2, 'ทดสอบ2', 'รายละเอียด2', 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', '', 20, '20'),
(67, 2, 'ทดสอบ2', 'รายละเอียด2', 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', '', 20, '20'),
(68, 21, 'ทดสอบ', '', '', '', 20, ''),
(69, 21, 'ทดสอบ', '', '', '', 20, '20,22'),
(70, 21, 'ทดสอบ', '', '', '', 20, '20,22'),
(71, 21, 'ทดสอบ', '', '', '', 20, '20,22'),
(72, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์13579', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ 101', 20, '20'),
(73, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์13579', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ 101', 20, '20'),
(74, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์13579', 'เปิดไม่ติดเลย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 'รอบริษัทช่างหัวมันตอบกลับ 101', 20, '20');

-- --------------------------------------------------------

--
-- Table structure for table `event_media`
--

CREATE TABLE `event_media` (
  `event_media_id` bigint(20) UNSIGNED NOT NULL,
  `event_id` bigint(20) DEFAULT NULL,
  `source_type` enum('request_attachment','event_report_picture') NOT NULL,
  `source_id` bigint(20) UNSIGNED NOT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_cover` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_media`
--

INSERT INTO `event_media` (`event_media_id`, `event_id`, `source_type`, `source_id`, `sort_order`, `is_cover`, `created_at`) VALUES
(1, 17, 'request_attachment', 32, 1, 1, '2026-02-24 13:50:25'),
(2, 17, 'request_attachment', 33, 2, 0, '2026-02-24 13:50:25'),
(3, 17, 'request_attachment', 41, 3, 0, '2026-02-24 13:50:25'),
(4, 17, 'request_attachment', 42, 4, 0, '2026-02-24 13:50:25'),
(5, 17, 'request_attachment', 54, 5, 0, '2026-02-24 13:50:25'),
(6, 17, 'request_attachment', 55, 6, 0, '2026-02-24 13:50:25'),
(7, 17, 'request_attachment', 56, 7, 0, '2026-02-24 13:50:25'),
(8, 17, 'request_attachment', 57, 8, 0, '2026-02-24 13:50:25'),
(9, 17, 'request_attachment', 58, 9, 0, '2026-02-24 13:50:25'),
(10, 17, 'request_attachment', 59, 10, 0, '2026-02-24 13:50:25');

-- --------------------------------------------------------

--
-- Table structure for table `event_participant`
--

CREATE TABLE `event_participant` (
  `event_participant` bigint(20) NOT NULL,
  `event_id` bigint(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_notification_recipient` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_participant`
--

INSERT INTO `event_participant` (`event_participant`, `event_id`, `user_id`, `is_notification_recipient`, `is_active`) VALUES
(1, 9, 20, 1, 1),
(2, 9, 21, 1, 1),
(3, 9, 22, 1, 1),
(4, 10, 20, 1, 1),
(5, 11, 20, 1, 1),
(6, 12, 20, 1, 1),
(7, 12, 21, 1, 1),
(8, 12, 24, 1, 1),
(9, 15, 20, 1, 1),
(10, 15, 23, 1, 1),
(11, 15, 24, 1, 1),
(12, 18, 20, 1, 1),
(18, 14, 20, 1, 1),
(19, 14, 21, 1, 0),
(20, 14, 23, 1, 0),
(21, 14, 22, 1, 0),
(22, 19, 20, 1, 1),
(23, 19, 21, 1, 0),
(24, 19, 23, 1, 0),
(25, 17, 20, 1, 1),
(26, 18, 21, 1, 0),
(27, 18, 22, 1, 0),
(28, 20, 20, 1, 1),
(29, 19, 22, 1, 0),
(30, 2, 20, 1, 1),
(31, 21, 20, 1, 1),
(32, 21, 22, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `event_report`
--

CREATE TABLE `event_report` (
  `event_report_id` bigint(20) NOT NULL,
  `event_id` bigint(20) NOT NULL,
  `summary_text` text NOT NULL,
  `submitted_by_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `submitted_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_report`
--

INSERT INTO `event_report` (`event_report_id`, `event_id`, `summary_text`, `submitted_by_id`, `created_at`, `updated_at`, `submitted_at`) VALUES
(1, 18, '', 20, '2026-02-20 18:23:20', '2026-02-20 11:23:20', '2026-02-20 18:23:20'),
(2, 12, '', 20, '2026-02-20 18:47:52', '2026-02-20 11:47:52', '2026-02-20 18:47:52'),
(3, 1, '', 20, '2026-02-24 07:59:50', '2026-02-24 00:59:50', '2026-02-24 07:59:50'),
(4, 2, '', 20, '2026-02-24 08:09:49', '2026-02-24 01:09:49', '2026-02-24 08:09:49'),
(5, 21, '', 20, '2026-02-24 08:13:19', '2026-02-24 01:13:19', '2026-02-24 08:13:19'),
(6, 17, '', 20, '2026-02-24 08:22:04', '2026-02-24 01:22:04', '2026-02-24 08:22:04');

-- --------------------------------------------------------

--
-- Table structure for table `event_report_picture`
--

CREATE TABLE `event_report_picture` (
  `event_report_picture_id` bigint(20) NOT NULL,
  `event_report_id` bigint(20) NOT NULL,
  `filepath` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_report_picture`
--

INSERT INTO `event_report_picture` (`event_report_picture_id`, `event_report_id`, `filepath`, `original_filename`, `stored_filename`, `file_size`, `uploaded_by`, `uploaded_at`) VALUES
(1, 1, 'uploads/event_reports/er_1_u20_20260223_091300_119044.png', 'Screenshot 2569-02-23 at 14.06.40.png', 'er_1_u20_20260223_091300_119044.png', 311297, 20, '2026-02-23 15:13:00'),
(2, 1, 'uploads/event_reports/er_1_u20_20260223_091300_d9a246.png', 'Screenshot 2569-02-23 at 15.12.03.png', 'er_1_u20_20260223_091300_d9a246.png', 156168, 20, '2026-02-23 15:13:00');

-- --------------------------------------------------------

--
-- Table structure for table `event_status`
--

CREATE TABLE `event_status` (
  `event_status_id` int(11) NOT NULL,
  `status_code` varchar(255) NOT NULL,
  `status_name` varchar(255) NOT NULL,
  `meaning` text NOT NULL,
  `request_type_id` int(11) NOT NULL,
  `sort_order` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_status`
--

INSERT INTO `event_status` (`event_status_id`, `status_code`, `status_name`, `meaning`, `request_type_id`, `sort_order`) VALUES
(1, 'REPAIR_PENDING', 'รอรับงาน', 'เจ้าหน้าที่ได้รับแจ้งแล้ว รอการรับงานจากผู้รับผิดชอบ', 3, 1),
(2, 'REPAIR_ACCEPTED', 'รับงานแล้ว', 'ผู้รับผิดชอบรับงานเรียบร้อย', 3, 2),
(3, 'REPAIR_IN_PROGRESS', 'กำลังดำเนินการ', 'อยู่ระหว่างการตรวจสอบหรือซ่อมแซม', 3, 3),
(4, 'REPAIR_WAIT_PARTS', 'รออะไหล่', 'อยู่ระหว่างรออะไหล่เพื่อดำเนินการซ่อม', 3, 4),
(5, 'REPAIR_EXTERNAL', 'ส่งซ่อมภายนอก', 'จำเป็นต้องส่งอุปกรณ์ไปยังผู้ให้บริการภายนอก', 3, 5),
(6, 'REPAIR_FIXED', 'ดำเนินการแก้ไขแล้ว', 'ซ่อมแซมเรียบร้อยและอยู่ระหว่างตรวจสอบ', 3, 6),
(7, 'REPAIR_UNREPAIRABLE', 'ซ่อมไม่ได้', 'อุปกรณ์ไม่สามารถซ่อมแซมได้', 3, 7),
(8, 'REPAIR_COMPLETED', 'เสร็จสิ้น', 'ดำเนินการทั้งหมดเรียบร้อยแล้ว', 3, 8),
(9, 'CONF_PENDING', 'รอรับงาน', 'เจ้าหน้าที่ได้รับคำขอประชุมแล้ว', 2, 1),
(10, 'CONF_ACCEPTED', 'รับงานแล้ว', 'เจ้าหน้าที่รับผิดชอบงานประชุมแล้ว', 2, 2),
(11, 'CONF_PREPARING', 'กำลังดำเนินการ', 'อยู่ระหว่างการดำเนินการ', 2, 3),
(12, 'CONF_IN_MEETING', 'กำลังประชุม', 'อยู่ระหว่างการประชุม', 2, 4),
(13, 'CONF_COMPLETED', 'เสร็จสิ้น', 'การประชุมเสร็จสิ้นเรียบร้อย', 2, 5),
(14, 'OTHER_IN_PENDING', 'รอรับงาน', 'เจ้าหน้าที่ได้รับคำขออื่นๆ', 4, 1),
(15, 'OTHER_IN_ACCEPTED', 'รับงานแล้ว', 'เจ้าหน้าที่ได้รับผิดชอบคำขอ', 4, 2),
(16, 'OTHER_IN_PROGRESS', 'กำลังดำเนินงาน', 'อยู่ระหว่างการดำเนินการตามคำขอ', 4, 3),
(17, 'OTHER_COMPLETED', 'เสร็จสิ้น', 'ดำเนินการเสร็จสิ้นแล้ว', 4, 4);

-- --------------------------------------------------------

--
-- Table structure for table `event_template`
--

CREATE TABLE `event_template` (
  `event_template_id` bigint(20) UNSIGNED NOT NULL,
  `publicity_post_id` bigint(20) DEFAULT NULL,
  `template_type_id` int(11) NOT NULL,
  `layout_json` longtext DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_template`
--

INSERT INTO `event_template` (`event_template_id`, `publicity_post_id`, `template_type_id`, `layout_json`, `created_by`, `created_at`) VALUES
(1, 1, 2, '{\"version\":1,\"fields\":{\"poster_date\":\"2026-02-26\",\"issue_no\":\"15/2569\"},\"elements\":{\"title\":{\"x\":23.652708747514907372533343732357025146484375,\"y\":502.58300198807154401947627775371074676513671875,\"w\":1414,\"h\":0,\"fontSize\":75,\"fontWeight\":800,\"color\":\"#ffffff\",\"fontFamily\":\"\'Noto Sans Thai\', sans-serif\",\"align\":\"center\"},\"content\":{\"x\":55.0869781312127315686666406691074371337890625,\"y\":1236.37052683896627058857120573520660400390625,\"w\":570.61195328031817552982829511165618896484375,\"h\":0,\"fontSize\":34,\"fontWeight\":500,\"color\":\"#111827\",\"fontFamily\":\"\'Noto Sans Thai\', sans-serif\",\"align\":\"left\"},\"date\":{\"x\":525.828901590457235215581022202968597412109375,\"y\":362.598658051689881176571361720561981201171875,\"w\":416,\"h\":0,\"fontSize\":27,\"fontWeight\":600,\"color\":\"#ffffff\",\"fontFamily\":\"\'Noto Sans Thai\', sans-serif\",\"align\":\"left\"},\"issue\":{\"x\":314.136307157057672156952321529388427734375,\"y\":362.01441351888666986269527114927768707275390625,\"w\":233,\"h\":0,\"fontSize\":26,\"fontWeight\":600,\"color\":\"#ffffff\",\"fontFamily\":\"\'Noto Sans Thai\', sans-serif\",\"align\":\"left\"},\"cover\":{\"x\":730.210611332008056706399656832218170166015625,\"y\":600.308151093439619216951541602611541748046875,\"w\":556.146868787276389411999844014644622802734375,\"h\":372.4478131212723610588000155985355377197265625},\"img2\":{\"x\":712.8149850894632209019619040191173553466796875,\"y\":1416.280815109343848234857432544231414794921875,\"w\":596.020377733598479608190245926380157470703125,\"h\":358.88121272365805225490476004779338836669921875},\"img3\":{\"x\":710.751863817097500941599719226360321044921875,\"y\":989.40457256461240831413306295871734619140625,\"w\":601.2701292246521234119427390396595001220703125,\"h\":368.35561630218688833338092081248760223388671875},\"img4\":{\"x\":68.7574552683896627058857120573520660400390625,\"y\":627.066103379721653254819102585315704345703125,\"w\":561.3844433399602849021903239190578460693359375,\"h\":465.3207007952286176077905111014842987060546875},\"img5\":{\"x\":547,\"y\":1086,\"w\":464,\"h\":162},\"img6\":{\"x\":70,\"y\":1188,\"w\":464,\"h\":162}},\"assets\":{\"selected_event_media_ids\":[1,3,2,9]},\"canvas\":{\"width\":1414,\"height\":2000}}', 20, '2026-02-24 14:59:27');

-- --------------------------------------------------------

--
-- Table structure for table `event_template_asset`
--

CREATE TABLE `event_template_asset` (
  `event_template_asset_id` bigint(20) UNSIGNED NOT NULL,
  `event_template_id` bigint(20) UNSIGNED NOT NULL,
  `event_media_id` bigint(20) UNSIGNED NOT NULL,
  `slot_no` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_template_asset`
--

INSERT INTO `event_template_asset` (`event_template_asset_id`, `event_template_id`, `event_media_id`, `slot_no`, `created_at`) VALUES
(22, 1, 1, 1, '2026-02-24 15:41:27'),
(23, 1, 3, 2, '2026-02-24 15:41:27'),
(24, 1, 2, 3, '2026-02-24 15:41:27'),
(25, 1, 9, 4, '2026-02-24 15:41:27');

-- --------------------------------------------------------

--
-- Table structure for table `event_template_export`
--

CREATE TABLE `event_template_export` (
  `event_template_export_id` bigint(20) UNSIGNED NOT NULL,
  `event_template_id` bigint(20) UNSIGNED NOT NULL,
  `filepath` varchar(255) NOT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `stored_filename` varchar(255) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `exported_by` bigint(20) UNSIGNED DEFAULT NULL,
  `exported_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_template_export`
--

INSERT INTO `event_template_export` (`event_template_export_id`, `event_template_id`, `filepath`, `original_filename`, `stored_filename`, `file_size`, `exported_by`, `exported_at`) VALUES
(1, 1, '/uploads/event_reports/event_report_1_20260224_094135_a6de58c9754859d9.jpg', 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์-ครั้งที่-2-1414x2000.jpg', 'event_report_1_20260224_094135_a6de58c9754859d9.jpg', 613530, 20, '2026-02-24 15:41:35');

-- --------------------------------------------------------

--
-- Table structure for table `head_of_request`
--

CREATE TABLE `head_of_request` (
  `id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `request_sub_type_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `head_of_request`
--

INSERT INTO `head_of_request` (`id`, `staff_id`, `request_sub_type_id`) VALUES
(1, 20, 1),
(2, 21, 1),
(3, 22, 1),
(4, 20, 2),
(5, 23, 2),
(6, 20, 3),
(7, 22, 3),
(8, 23, 3),
(9, 20, 5),
(10, 22, 5),
(11, 24, 5),
(12, 25, 5),
(17, 20, 6),
(18, 21, 6),
(19, 22, 6);

-- --------------------------------------------------------

--
-- Table structure for table `history_image_page`
--

CREATE TABLE `history_image_page` (
  `history_image_page_id` int(11) NOT NULL,
  `path` text NOT NULL,
  `is_active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `history_image_page`
--

INSERT INTO `history_image_page` (`history_image_page_id`, `path`, `is_active`) VALUES
(1, '/uploads/history_image_page/history_20260226_121004_ef240935bad50404.jpg', 0),
(2, '/uploads/history_image_page/history_20260226_121047_ae0cf9ebc0284243.jpg', 1);

-- --------------------------------------------------------

--
-- Table structure for table `home_mission_img`
--

CREATE TABLE `home_mission_img` (
  `home_mission_img_id` int(11) NOT NULL,
  `path` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `home_mission_img`
--

INSERT INTO `home_mission_img` (`home_mission_img_id`, `path`) VALUES
(7, '/uploads/home_mission_img/mission_20260227_060623_8daac53886971030.jpg'),
(8, '/uploads/home_mission_img/mission_20260227_060632_c3ec6fdcbf194b7a.jpg'),
(9, '/uploads/home_mission_img/mission_20260227_060639_d4a3e79a19abed6e.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `link_url`
--

CREATE TABLE `link_url` (
  `url_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `link_url` text NOT NULL,
  `is_banner` tinyint(1) NOT NULL,
  `writer` int(11) NOT NULL,
  `create_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `link_url`
--

INSERT INTO `link_url` (`url_id`, `title`, `content`, `link_url`, `is_banner`, `writer`, `create_at`) VALUES
(1, 'สหกรณ์ออมทรัพย์กระทรวงมหาดไทย จำกัด', 'เว็บไซต์สหกรณ์ออมทรัพย์ภายในกระทรวงมหาดไทย – ข้อมูลสมาชิก ข่าวสาร เงินฝาก เงินกู้', 'https://www.moicoop.com/', 0, 20, '2026-02-26 11:49:57'),
(2, 'สำนักงานปลัดกระทรวงมหาดไทย – หน่วยงานบุคคล', 'เว็บไซต์ฝ่ายทรัพยากรบุคคลของกระทรวง – คู่มือและข้อมูลการสรรหาแต่งตั้งบุคลากร', 'https://personnel.moi.go.th', 0, 20, '2026-02-26 11:51:14'),
(3, 'DPIS – ระบบสารสนเทศทรัพยากรบุคคลระดับกรม', 'ระบบทรัพยากรบุคคลของกระทรวงมหาดไทย สำหรับจัดการข้อมูลบุคลากรราชการ', 'https://dpis.moi.go.th/', 0, 20, '2026-02-26 11:54:03'),
(4, 'ระบบประเมิน 360 กระทรวงมหาดไทย', 'ระบบออนไลน์สำหรับการประเมินผลบุคลากรแบบ 360 องศา', 'https://assess.moi.go.th/assess_360/', 0, 20, '2026-02-26 11:54:40');

-- --------------------------------------------------------

--
-- Table structure for table `main_type_of_device`
--

CREATE TABLE `main_type_of_device` (
  `main_type_of_device` int(11) NOT NULL,
  `main_type_of_device_title` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `main_type_of_device`
--

INSERT INTO `main_type_of_device` (`main_type_of_device`, `main_type_of_device_title`) VALUES
(1, 'internet_GIN'),
(2, 'Internet_MOI'),
(3, 'IP_Phone'),
(4, 'MCU'),
(5, 'MPLS'),
(6, 'NAT'),
(7, 'radio'),
(8, 'SX80'),
(10, 'printer'),
(11, 'RG08_SWC29_01'),
(12, 'RG08_SWC29_02'),
(13, 'RG08_SWC38_01'),
(14, 'server_radio');

-- --------------------------------------------------------

--
-- Table structure for table `news`
--

CREATE TABLE `news` (
  `news_id` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `link_url` text DEFAULT NULL,
  `is_banner` tinyint(1) NOT NULL,
  `writer` int(11) NOT NULL,
  `create_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `news`
--

INSERT INTO `news` (`news_id`, `title`, `content`, `link_url`, `is_banner`, `writer`, `create_at`) VALUES
(1, 'ทดสอบข่าวประชาสัมพันธ์', 'ทดสอบข่าวประชาสัมพันธ์', NULL, 0, 20, '2026-02-26 07:30:30'),
(2, 'ประกาศผู้ชนะการเสนอราคา', 'ประกาศผู้ชนะการเสนอราคา งานจัดซื้อระบบผลิตไฟฟ้าจากแสงอาทิตย์บนหลังคา (Solar Rooftop) ขนาด ๓ เฟส ๑๐ กิโลวัตต์ จำนวน ๑ ระบบ โดยวิธีเฉพาะเจาะจง', NULL, 0, 20, '2026-02-26 08:11:30'),
(3, 'ประกาศเจตนารมณ์', 'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสารเขต 8 (พิษณุโลก) ประกาศเจตนารมณ์ให้บุคลากรทุกระดับยึดมั่นในหลักคุณธรรม จริยธรรม และธรรมาภิบาลในการปฏิบัติหน้าที่ โดยไม่รับของขวัญ ของกำนัล หรือผลประโยชน์อื่นใดจากการปฏิบัติหน้าที่ รวมถึงไม่สนับสนุนหรือมีส่วนเกี่ยวข้องกับการให้หรือรับสินบนในทุกรูปแบบ เพื่อป้องกันการทุจริตและความขัดแย้งทางผลประโยชน์ พร้อมมุ่งเน้นการให้บริการประชาชนด้วยความโปร่งใส ตรวจสอบได้ และคำนึงถึงประโยชน์ส่วนรวมเป็นสำคัญ ทั้งนี้ให้บุคลากรถือปฏิบัติตามแนวทางดังกล่าวอย่างเคร่งครัด', NULL, 1, 20, '2026-02-26 08:24:34');

-- --------------------------------------------------------

--
-- Table structure for table `news_document`
--

CREATE TABLE `news_document` (
  `news_document_id` int(11) NOT NULL,
  `news_id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `news_document`
--

INSERT INTO `news_document` (`news_document_id`, `news_id`, `document_id`, `created_at`) VALUES
(1, 2, 3, '2026-02-26 14:12:20'),
(2, 3, 2, '2026-02-26 14:24:34');

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `notification_id` bigint(20) NOT NULL,
  `request_id` bigint(20) DEFAULT NULL,
  `event_id` bigint(20) DEFAULT NULL,
  `notification_type_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `create_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `schedule_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`notification_id`, `request_id`, `event_id`, `notification_type_id`, `message`, `create_at`, `schedule_at`) VALUES
(4, NULL, NULL, 1, 'มีคำขอสมัครสมาชิกใหม่ รอการอนุมัติ: สิริฉัตร์ ปานน้อย (LINE: ploy_ch@t)', '2026-02-19 06:43:33', NULL),
(5, 12, NULL, 4, 'มีคำขอใช้ห้องประชุมใหม่เข้ามา (#12) — ทดสอบ', '2026-02-19 07:20:16', NULL),
(6, 13, NULL, 5, 'มีคำขอแจ้งซ่อมอุปกรณ์ใหม่เข้ามา (#13) — ทดสอบ', '2026-02-19 07:21:43', NULL),
(7, 14, NULL, 6, 'มีคำขอใช้บริการอื่น ๆ ใหม่เข้ามา (#14) — ทดสอบ', '2026-02-19 07:23:36', NULL),
(8, 15, NULL, 4, 'ขอใช้ห้องประชุม (#15) — ovdsipasidpsdapfiasdfasdf\nตรวจสอบ/อนุมัติ: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/check_request.html?request_id=15', '2026-02-19 08:28:08', NULL),
(9, 16, NULL, 6, 'คำร้องอื่น ๆ (#16) — TEST approve flow\nตรวจสอบ/อนุมัติ: http://127.0.0.1/ict8/check_request.html?request_id=16', '2026-02-19 08:41:17', NULL),
(11, 10, 1, 7, 'คำขอได้รับการอนุมัติแล้ว (#10) — ทดสอบ\nแก้ไขรายละเอียดงาน: http://127.0.0.1/ict8/schedule/event-edit.html?event_id=1', '2026-02-20 03:38:44', NULL),
(12, 9, 2, 7, 'คำขอได้รับการอนุมัติแล้ว (#9) — ทดสอบ2\nแก้ไขรายละเอียดงาน: http://127.0.0.1/ict8/schedule/event-edit.html?event_id=2', '2026-02-20 03:40:38', NULL),
(13, 7, 3, 7, 'คำขอได้รับการอนุมัติแล้ว (#7) — ทดสอบการทำงานของการแจ้งเตือน\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=3', '2026-02-20 03:50:34', NULL),
(14, 14, 4, 7, 'คำขอได้รับการอนุมัติแล้ว (#14) — ทดสอบบริการรถดาวเทียมสื่อสาร (#3)\nแก้ไขรายละเอียดงาน: http://localhost/ict8/schedule/event-edit.html?event_id=4', '2026-02-20 04:06:36', NULL),
(15, 14, 4, 7, 'มีคำขอได้รับการอนุมัติแล้ว (#14) — ทดสอบบริการรถดาวเทียมสื่อสาร (#3)\nแก้ไขรายละเอียดงาน: http://localhost/ict8/schedule/event-edit.html?event_id=4', '2026-02-20 04:06:36', NULL),
(16, 14, 4, 7, 'คำขอได้รับการอนุมัติแล้ว (#14) — ทดสอบบริการรถดาวเทียมสื่อสาร (#3)\nแก้ไขรายละเอียดงาน: http://localhost/ict8/schedule/event-edit.html?event_id=4', '2026-02-20 04:13:25', NULL),
(17, 14, 4, 7, 'มีคำขอได้รับการอนุมัติแล้ว (#14) — ทดสอบบริการรถดาวเทียมสื่อสาร (#3)\nแก้ไขรายละเอียดงาน: http://localhost/ict8/schedule/event-edit.html?event_id=4', '2026-02-20 04:13:25', NULL),
(18, 5, 5, 7, 'คำขอได้รับการอนุมัติแล้ว (#5) — ทดสอบการแจ้งเตือนครั้งที่ 2\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=5', '2026-02-20 04:17:43', NULL),
(19, 5, 5, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#5) — ทดสอบการแจ้งเตือนครั้งที่ 2\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=5', '2026-02-20 04:17:43', NULL),
(20, 4, 6, 7, 'คำขอได้รับการอนุมัติแล้ว (#4) — ทดสอบ\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=6', '2026-02-20 04:22:55', NULL),
(21, 4, 6, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#4) — ทดสอบ\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=6', '2026-02-20 04:22:55', NULL),
(22, 18, 7, 7, 'คำขอได้รับการอนุมัติแล้ว (#18) — TEST round/year auto\nแก้ไขรายละเอียดงาน: http://localhost/ict8/schedule/event-edit.html?event_id=7', '2026-02-20 04:36:45', NULL),
(23, 18, 7, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#18) — TEST round/year auto\nแก้ไขรายละเอียดงาน: http://localhost/ict8/schedule/event-edit.html?event_id=7', '2026-02-20 04:36:45', NULL),
(24, 3, 8, 7, 'คำขอได้รับการอนุมัติแล้ว (#3) — ทดสอบ round_no/year\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=8', '2026-02-20 04:38:44', NULL),
(25, 3, 8, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#3) — ทดสอบ round_no/year\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=8', '2026-02-20 04:38:44', NULL),
(26, NULL, 10, 8, 'คุณมีส่วนร่วมกับงาน: ทดสอบ\nดู/แก้ไขได้ที่: /ict8/schedule/event-edit.html?id=10', '2026-02-20 06:51:41', NULL),
(27, NULL, 11, 8, 'คุณมีส่วนร่วมกับงาน: ทดสอบการแจ้งเตือนผ่านไลน์ในหัวข้อการเพิ่มงานในหน่วยงาน\nดู/แก้ไขได้ที่: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=11', '2026-02-20 06:58:57', NULL),
(28, NULL, 12, 8, 'คุณมีส่วนร่วมกับงาน: ทดสอบการเพิ่มงานสำหรับหน้ารายการงาน\nแก้ไขรายละเอียดงานได้ที่: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=12', '2026-02-20 07:59:53', NULL),
(29, 6, 14, 7, 'คำขอได้รับการอนุมัติแล้ว (#6) — ทดสอบ event_log ฝั่ง request\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=14', '2026-02-20 08:54:26', NULL),
(30, 6, 14, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#6) — ทดสอบ event_log ฝั่ง request\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=14', '2026-02-20 08:54:26', NULL),
(31, NULL, 15, 8, 'คุณมีส่วนร่วมกับงาน: ทดสอบ event_log เพิ่มงาน (ภายในหน่วยงาน)\nแก้ไขรายละเอียดงานได้ที่: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=15', '2026-02-20 08:56:16', NULL),
(32, 19, NULL, 4, 'ขอใช้ห้องประชุม (#19) — ทดสอบการขอสนับสนุนห้องประชุม vcs\nตรวจสอบ/อนุมัติ: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/check_request.html?request_id=19', '2026-02-20 10:55:36', NULL),
(33, 19, 16, 7, 'คำขอได้รับการอนุมัติแล้ว (#19) — ทดสอบการขอสนับสนุนห้องประชุม vcs\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=16', '2026-02-20 10:56:27', NULL),
(34, 19, 16, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#19) — ทดสอบการขอสนับสนุนห้องประชุม vcs\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=16', '2026-02-20 10:56:27', NULL),
(35, 20, NULL, 5, 'แจ้งเสีย (#20) — ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nตรวจสอบ/อนุมัติ: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/check_request.html?request_id=20', '2026-02-20 11:01:43', NULL),
(36, 20, 17, 7, 'คำขอได้รับการอนุมัติแล้ว (#20) — ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=17', '2026-02-20 11:02:54', NULL),
(37, 20, 17, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#20) — ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=17', '2026-02-20 11:02:54', NULL),
(38, NULL, 18, 8, 'คุณมีส่วนร่วมกับงาน: ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)\nแก้ไขรายละเอียดงานได้ที่: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=18', '2026-02-20 11:04:54', NULL),
(39, 21, NULL, 4, 'ขอใช้ห้องประชุม (#21) — ทดสอบ\nตรวจสอบ/อนุมัติ: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/check_request.html?request_id=21', '2026-02-23 07:19:53', NULL),
(40, 22, NULL, 4, 'ขอใช้ห้องประชุม (#22) — ทดสอบการขอสนับสนุนห้องประชุม webex\nตรวจสอบ/อนุมัติ: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/check_request.html?request_id=22', '2026-02-23 07:22:37', NULL),
(41, 22, 19, 7, 'คำขอได้รับการอนุมัติแล้ว (#22) — ทดสอบการขอสนับสนุนห้องประชุม webex\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=19', '2026-02-23 07:23:34', NULL),
(42, 22, 19, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#22) — ทดสอบการขอสนับสนุนห้องประชุม webex\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=19', '2026-02-23 07:23:34', NULL),
(43, NULL, 19, 8, 'มีการเพิ่มผู้เข้าร่วมกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 07:24:07', NULL),
(44, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 07:24:07', NULL),
(45, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 07:24:19', NULL),
(46, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 07:26:54', NULL),
(47, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 07:27:13', NULL),
(48, NULL, 19, 8, 'มีการเพิ่มผู้เข้าร่วมกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 07:27:18', NULL),
(49, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 07:27:18', NULL),
(50, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-23 07:29:49', NULL),
(51, NULL, 17, 8, 'มีการเพิ่มผู้เข้าร่วมกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-23 07:30:41', NULL),
(52, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-23 07:30:41', NULL),
(53, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-23 07:31:25', NULL),
(54, NULL, 18, 8, 'มีการเพิ่มผู้เข้าร่วมกิจกรรม: ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=18', '2026-02-23 07:34:04', NULL),
(55, NULL, 18, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=18', '2026-02-23 07:34:04', NULL),
(56, NULL, 18, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=18', '2026-02-23 07:34:17', NULL),
(57, NULL, 4, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบบริการรถดาวเทียมสื่อสาร (#3)\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=4', '2026-02-23 07:34:50', NULL),
(58, NULL, 4, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบบริการรถดาวเทียมสื่อสาร (#3)\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=4', '2026-02-23 07:35:12', NULL),
(59, NULL, 4, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบบริการรถดาวเทียมสื่อสาร (#3)\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=4', '2026-02-23 07:35:17', NULL),
(60, 23, NULL, 6, 'คำร้องอื่น ๆ (#23) — ทดสอบอื่นๆและอื่นๆและอื่นๆ\nตรวจสอบ/อนุมัติ: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/check_request.html?request_id=23', '2026-02-23 07:47:58', NULL),
(61, 23, 20, 7, 'คำขอได้รับการอนุมัติแล้ว (#23) — ทดสอบอื่นๆและอื่นๆและอื่นๆ\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=20', '2026-02-23 07:49:08', NULL),
(62, 23, 20, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#23) — ทดสอบอื่นๆและอื่นๆและอื่นๆ\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=20', '2026-02-23 07:49:08', NULL),
(63, 21, 21, 7, 'คำขอได้รับการอนุมัติแล้ว (#21) — ทดสอบ\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=21', '2026-02-23 07:49:28', NULL),
(64, 21, 21, 7, 'มีงานเข้ามาในความรับผิดชอบของคุณ (#21) — ทดสอบ\nแก้ไขรายละเอียดงาน: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?event_id=21', '2026-02-23 07:49:28', NULL),
(65, NULL, 20, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบอื่นๆและอื่นๆและอื่นๆ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=20', '2026-02-23 07:50:02', NULL),
(66, NULL, 20, 8, 'มีการเพิ่มผู้เข้าร่วมกิจกรรม: ทดสอบอื่นๆและอื่นๆและอื่นๆ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=20', '2026-02-23 07:50:47', NULL),
(67, NULL, 20, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบอื่นๆและอื่นๆและอื่นๆ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=20', '2026-02-23 07:50:47', NULL),
(68, NULL, 20, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบอื่นๆและอื่นๆและอื่นๆ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=20', '2026-02-23 07:51:44', NULL),
(69, NULL, 20, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบอื่นๆและอื่นๆและอื่นๆ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=20', '2026-02-23 07:51:58', NULL),
(70, NULL, 20, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบอื่นๆและอื่นๆและอื่นๆ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=20', '2026-02-23 07:52:15', NULL),
(71, NULL, 20, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบอื่นๆและอื่นๆและอื่นๆ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=20', '2026-02-23 07:52:32', NULL),
(72, NULL, 20, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบอื่นๆและอื่นๆและอื่นๆ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=20', '2026-02-23 08:09:10', NULL),
(73, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-23 08:09:40', NULL),
(74, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-23 08:10:20', NULL),
(75, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-23 08:10:50', NULL),
(76, NULL, 18, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการทำงาน เพิ่มงาน (ภายในหน่วยงาน)\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=18', '2026-02-23 08:12:55', NULL),
(77, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:17:29', NULL),
(78, NULL, 19, 10, 'ได้รับลิงก์เข้าร่วมประชุม: ทดสอบการขอสนับสนุนห้องประชุม webex\nลิงก์: https://www.facebook.com/\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:29:21', NULL),
(79, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:35:11', NULL),
(80, NULL, 19, 10, 'ได้รับ link เข้าร่วมประชุม: ทดสอบการขอสนับสนุนห้องประชุม webex\nลิงก์: https://www.facebook.com/\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:35:42', NULL),
(81, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:35:42', NULL),
(82, NULL, 19, 8, 'มีการเพิ่มผู้เข้าร่วมกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:37:14', NULL),
(83, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:37:14', NULL),
(84, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์1\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-23 08:39:58', NULL),
(85, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์13579\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-23 08:40:33', NULL),
(86, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:49:30', NULL),
(87, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:50:52', NULL),
(88, NULL, 19, 10, 'ได้รับ link เข้าร่วมประชุม: ทดสอบการขอสนับสนุนห้องประชุม webex\nลิงก์: https://www.facebook.com/\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:51:05', NULL),
(89, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:51:05', NULL),
(90, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:51:22', NULL),
(91, NULL, 19, 8, 'มีการเพิ่มผู้เข้าร่วมกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:51:30', NULL),
(92, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-23 08:51:30', NULL),
(93, NULL, 19, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการขอสนับสนุนห้องประชุม webex\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=19', '2026-02-24 00:48:25', NULL),
(94, NULL, 2, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ2\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=2', '2026-02-24 00:59:03', NULL),
(95, NULL, 3, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการทำงานของการแจ้งเตือน\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=3', '2026-02-24 00:59:27', NULL),
(96, NULL, 1, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบแก้ไข\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=1', '2026-02-24 00:59:50', NULL),
(97, NULL, 1, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบแก้ไข\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=1', '2026-02-24 00:59:53', NULL),
(98, NULL, 1, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบแก้ไข\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=1', '2026-02-24 00:59:54', NULL),
(99, NULL, 5, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเตือนครั้งที่ 2\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=5', '2026-02-24 01:00:06', NULL),
(100, NULL, 6, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=6', '2026-02-24 01:00:39', NULL),
(101, NULL, 7, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: TEST round/year auto\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=7', '2026-02-24 01:02:09', NULL),
(102, NULL, 2, 8, 'มีการเพิ่มผู้เข้าร่วมกิจกรรม: ทดสอบ2\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=2', '2026-02-24 01:08:19', NULL),
(103, NULL, 2, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ2\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=2', '2026-02-24 01:08:19', NULL),
(104, NULL, 2, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ2\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=2', '2026-02-24 01:09:32', NULL),
(105, NULL, 2, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ2\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=2', '2026-02-24 01:09:45', NULL),
(106, NULL, 2, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ2\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=2', '2026-02-24 01:09:49', NULL),
(107, NULL, 2, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ2\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=2', '2026-02-24 01:10:06', NULL),
(108, NULL, 21, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=21', '2026-02-24 01:12:46', NULL),
(109, NULL, 21, 8, 'มีการเพิ่มผู้เข้าร่วมกิจกรรม: ทดสอบ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=21', '2026-02-24 01:13:00', NULL),
(110, NULL, 21, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=21', '2026-02-24 01:13:00', NULL),
(111, NULL, 21, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=21', '2026-02-24 01:13:13', NULL),
(112, NULL, 21, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบ\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=21', '2026-02-24 01:13:19', NULL),
(113, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์13579\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-24 01:21:04', NULL),
(114, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์13579\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-24 01:21:18', NULL),
(115, NULL, 17, 9, 'มีการแก้ไขรายละเอียดกิจกรรม: ทดสอบการแจ้งเสียซ่อม-อุปกรณ์13579\nดูรายละเอียด: http://unjogging-melany-deadliest.ngrok-free.dev/ict8/schedule/event-edit.html?id=17', '2026-02-24 01:22:04', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notification_type`
--

CREATE TABLE `notification_type` (
  `notification_type_id` int(11) NOT NULL,
  `notification_type` varchar(255) NOT NULL,
  `meaning` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_type`
--

INSERT INTO `notification_type` (`notification_type_id`, `notification_type`, `meaning`) VALUES
(1, 'user_registration_pending', 'รอการอนุมัติสมาชิก'),
(4, 'request_conferance_pending', 'รอการอนุมัติคำขอสนันสนุนจองห้องประชุมจากเจ้าหน้าที่'),
(5, 'request_repair_pending', 'รอการอนุมัติคำขอสนันสนุนแจ้งเสีย-ซ่อมอุปกรณ์ขากเจ้าหน้าที่'),
(6, 'request_other_pending', 'รอการอนุมัติคำขอสนับสนุนอื่นๆ จากเจ้าหน้าที่'),
(7, 'request_accepted', 'คำขอได้รับการอนุมัติจากเจ้าหน้าที่แล้ว'),
(8, 'event_particition', 'การมีส่วนร่วมในกิจกรรม'),
(9, 'event_edit', 'มีการแก้ไขรายละเอียดกิจกรรม'),
(10, 'get_meeting_link', 'ได้รับ link เข้าร่วมประชุม');

-- --------------------------------------------------------

--
-- Table structure for table `notification_type_staff`
--

CREATE TABLE `notification_type_staff` (
  `id` bigint(20) NOT NULL,
  `notification_type_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_type_staff`
--

INSERT INTO `notification_type_staff` (`id`, `notification_type_id`, `user_id`, `is_enabled`, `created_at`) VALUES
(1, 1, 20, 1, '2026-02-13 05:01:36'),
(2, 4, 20, 1, '2026-02-13 05:02:40'),
(3, 4, 21, 0, '2026-02-13 05:02:40'),
(4, 4, 22, 0, '2026-02-13 05:02:40'),
(5, 4, 23, 0, '2026-02-13 05:02:41'),
(6, 5, 20, 1, '2026-02-13 05:02:53'),
(7, 5, 23, 0, '2026-02-13 05:02:53'),
(8, 5, 24, 0, '2026-02-13 05:02:53'),
(9, 5, 25, 0, '2026-02-13 05:02:53'),
(10, 6, 20, 1, '2026-02-13 05:03:47'),
(11, 6, 23, 0, '2026-02-13 05:03:47'),
(12, 6, 24, 0, '2026-02-13 05:03:47'),
(13, 6, 25, 0, '2026-02-13 05:03:47');

-- --------------------------------------------------------

--
-- Table structure for table `organization`
--

CREATE TABLE `organization` (
  `organization_id` int(11) NOT NULL,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` text NOT NULL,
  `province_id` int(11) NOT NULL,
  `organization_type_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `organization`
--

INSERT INTO `organization` (`organization_id`, `code`, `name`, `location`, `province_id`, `organization_type_id`) VALUES
(1, 'GOV-PVK', 'สำนักงานจังหวัดพิษณุโลก', 'ศาลากลางจังหวัดพิษณุโลก ตำบลในเมือง อำเภอเมืองพิษณุโลก จังหวัดพิษณุโลก 65000', 1, 2),
(2, 'GOV-UTD', 'สำนักงานจังหวัดอุตรดิตถ์', 'ชั้น 4 ศาลากลางจังหวัดอุตรดิตถ์ ถนนประชานิมิตร ตำบลท่าอิฐ อำเภอเมืองอุตรดิตถ์ จังหวัดอุตรดิตถ์ 53000', 4, 2),
(3, 'GOV-SSK', 'สำนักงานจังหวัดสุโขทัย', 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 3, 2),
(4, 'GOV-TAK', 'สำนักงานจังหวัดตาก', 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', 2, 2),
(5, 'GOV-PRE', 'สำนักงานจังหวัดแพร่', 'ศาลากลางจังหวัดแพร่ ถนนไชยบูรณ์ ตำบลในเวียง อำเภอเมืองแพร่ จังหวัดแพร่ 54000', 5, 2),
(6, 'GOV-NAN', 'สำนักงานจังหวัดน่าน', 'ชั้น 3 ศาลากลางจังหวัดน่าน ถนนน่าน-พะเยา ตำบลไชยสถาน อำเภอเมือง จังหวัดน่าน 55000', 6, 2),
(7, 'ICT8', 'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร เขต 8 (พิษณุโลก)', 'ศาลากลางจังหวัดพิษณุโลก ถนนวังจันทน์ ตำบลในเมือง อำเภอเมืองพิษณุโลก จังหวัดพิษณุโลก 6500', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `organization_type`
--

CREATE TABLE `organization_type` (
  `organization_type_id` int(11) NOT NULL,
  `type_name` varchar(255) NOT NULL,
  `type_name_th` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `organization_type`
--

INSERT INTO `organization_type` (`organization_type_id`, `type_name`, `type_name_th`) VALUES
(1, 'internal user', 'บุคลากรภายในหน่วยงานศสข. 8 พล.'),
(2, 'external user', 'บุคคลภายนอกหน่วยงาน');

-- --------------------------------------------------------

--
-- Table structure for table `person`
--

CREATE TABLE `person` (
  `person_id` int(11) NOT NULL,
  `person_user_id` int(11) NOT NULL,
  `person_prefix_id` int(11) NOT NULL,
  `first_name_th` varchar(255) NOT NULL,
  `first_name_en` varchar(255) DEFAULT NULL,
  `last_name_th` varchar(255) NOT NULL,
  `last_name_en` varchar(255) DEFAULT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `organization_id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `position_title_id` int(11) NOT NULL,
  `photo_path` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `create_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `person`
--

INSERT INTO `person` (`person_id`, `person_user_id`, `person_prefix_id`, `first_name_th`, `first_name_en`, `last_name_th`, `last_name_en`, `display_name`, `organization_id`, `department_id`, `position_title_id`, `photo_path`, `is_active`, `start_date`, `end_date`, `create_at`) VALUES
(6, 20, 3, 'สิริฉัตร์', 'Sirichat', 'ปานน้อย', 'Pannoi', 'สิริฉัตร์ ปานน้อย', 7, 1, 14, '/uploads/profiles/u_6_20260204_053905.png', 1, '2025-11-10 00:00:00', '2026-02-27 00:00:00', '2026-01-22 10:26:15'),
(7, 21, 2, 'เจ้าหน้าที่_ทดสอบA', 'staff_testA', 'เจ้าหน้าที่_ทดสอบA', 'staff_testA', 'เจ้าหน้าที่_ทดสอบA', 7, 1, 14, '/uploads/profiles/u_7_20260218_032517.webp', 1, NULL, NULL, '2026-02-12 13:58:34'),
(8, 22, 1, 'เจ้าหน้าที่_ทดสอบB', 'staff_testB', 'เจ้าหน้าที่_ทดสอบB', 'staff_testB', 'เจ้าหน้าที่_ทดสอบB', 7, 1, 14, '', 1, NULL, NULL, '2026-02-12 13:58:34'),
(9, 23, 1, 'เจ้าหน้าที่_ทดสอบC', 'staff_testC', 'เจ้าหน้าที่_ทดสอบC', 'staff_testC', 'เจ้าหน้าที่_ทดสอบC', 7, 1, 14, '', 1, NULL, NULL, '2026-02-12 13:58:34'),
(10, 24, 1, 'เจ้าหน้าที่_ทดสอบD', 'staff_testD', 'เจ้าหน้าที่_ทดสอบD', 'staff_testD', 'เจ้าหน้าที่_ทดสอบD', 7, 1, 14, '', 1, NULL, NULL, '2026-02-12 13:58:34'),
(11, 25, 3, 'เจ้าหน้าที่_ทดสอบE', 'staff_testE', 'เจ้าหน้าที่_ทดสอบE', 'staff_testE', 'เจ้าหน้าที่_ทดสอบE', 7, 1, 14, '', 1, NULL, NULL, '2026-02-12 13:58:34');

-- --------------------------------------------------------

--
-- Table structure for table `person_prefix`
--

CREATE TABLE `person_prefix` (
  `person_prefix_id` int(11) NOT NULL,
  `prefix_th` varchar(255) NOT NULL,
  `prefix_en` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `person_prefix`
--

INSERT INTO `person_prefix` (`person_prefix_id`, `prefix_th`, `prefix_en`) VALUES
(1, 'นาย', 'Mr'),
(2, 'นาง', 'Mrs'),
(3, 'นางสาว', 'Miss');

-- --------------------------------------------------------

--
-- Table structure for table `position_title`
--

CREATE TABLE `position_title` (
  `position_title_id` int(11) NOT NULL,
  `position_code` varchar(255) NOT NULL,
  `position_title` varchar(255) NOT NULL,
  `organization_id` int(11) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `position_title`
--

INSERT INTO `position_title` (`position_title_id`, `position_code`, `position_title`, `organization_id`, `department_id`) VALUES
(1, 'DIR-01', 'ผู้อำนวยการ', 7, NULL),
(2, 'IT-01', 'หัวหน้าฝ่าย', 7, 1),
(3, 'IT-02', 'นายช่างไฟฟ้าชำนาญงาน', 7, 1),
(4, 'IT-03', 'นายช่างไฟฟ้าปฏิบัติงาน', 7, 1),
(5, 'CT-01', 'หัวหน้าฝ่าย', 7, 2),
(7, 'CT-02', 'นายช่างไฟฟ้าชำนาญงาน', 7, 2),
(8, 'CT-03', 'นายช่างไฟฟ้าปฏิบัติงาน', 7, 2),
(9, 'CT-04', 'พนักงานช่างไฟฟ้า', 7, 2),
(10, 'GA-01', 'เจ้าพนักงานธุรการปฏิบัติงาน', 7, 3),
(11, 'GA-02', 'พนักงานขับรถยนต์', 7, 3),
(12, 'GA-03', 'พนักงานทำความสะอาด', 7, 3),
(14, 'nisit-1', 'นักศึกษาฝึกงาน', 7, 1),
(15, 'test', 'ทดสอบ', 5, 5);

-- --------------------------------------------------------

--
-- Table structure for table `province`
--

CREATE TABLE `province` (
  `province_id` int(11) NOT NULL,
  `nameEN` varchar(255) NOT NULL,
  `nameTH` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `province`
--

INSERT INTO `province` (`province_id`, `nameEN`, `nameTH`) VALUES
(1, 'Phitsanulok', 'พิษณุโลก'),
(2, 'Tak', 'ตาก'),
(3, 'Sukhothai', 'สุโขทัย'),
(4, 'Uttaradit', 'อุตรดิตถ์'),
(5, 'Phrae', 'แพร่'),
(6, 'Nan', 'น่าน');

-- --------------------------------------------------------

--
-- Table structure for table `publicity_post`
--

CREATE TABLE `publicity_post` (
  `publicity_post_id` bigint(20) NOT NULL,
  `event_id` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `is_banner` tinyint(1) NOT NULL,
  `create_by` int(11) NOT NULL,
  `create_at` datetime NOT NULL,
  `update_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `publicity_post`
--

INSERT INTO `publicity_post` (`publicity_post_id`, `event_id`, `title`, `content`, `is_banner`, `create_by`, `create_at`, `update_at`) VALUES
(1, 17, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์ ครั้งที่ 2', 'ศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร เขต 8 (พิษณุโลก)\nขอเชิญเข้าร่วมกิจกรรมอบรมเชิงปฏิบัติการด้านเทคโนโลยีสารสนเทศ เพื่อเสริมสร้างความรู้และทักษะในการใช้งานระบบดิจิทัลให้มีประสิทธิภาพมากยิ่งขึ้น โดยภายในกิจกรรมจะมีการบรรยายให้ความรู้ การสาธิตการใช้งานระบบจริง รวมถึงการแลกเปลี่ยนประสบการณ์ระหว่างหน่วยงาน เพื่อยกระดับการปฏิบัติงานด้านเทคโนโลยีสารสนเทศให้สามารถตอบสนองต่อภารกิจขององค์กรได้อย่างเหมาะสมในยุคดิจิทัล', 1, 20, '2026-02-24 12:40:06', '2026-02-24 16:04:40');

-- --------------------------------------------------------

--
-- Table structure for table `publicity_post_media`
--

CREATE TABLE `publicity_post_media` (
  `publicity_post_media_id` bigint(20) UNSIGNED NOT NULL,
  `post_id` bigint(20) NOT NULL,
  `event_media_id` bigint(20) UNSIGNED NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 1,
  `is_cover` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `publicity_post_media`
--

INSERT INTO `publicity_post_media` (`publicity_post_media_id`, `post_id`, `event_media_id`, `sort_order`, `is_cover`, `created_at`) VALUES
(1, 1, 5, 1, 1, '2026-02-24 16:04:40'),
(2, 1, 2, 2, 0, '2026-02-24 16:04:40'),
(3, 1, 1, 3, 0, '2026-02-24 16:04:40'),
(4, 1, 8, 4, 0, '2026-02-24 16:04:40'),
(5, 1, 7, 5, 0, '2026-02-24 16:04:40'),
(6, 1, 4, 6, 0, '2026-02-24 16:04:40');

-- --------------------------------------------------------

--
-- Table structure for table `request`
--

CREATE TABLE `request` (
  `request_id` bigint(20) NOT NULL,
  `request_type` int(11) NOT NULL,
  `request_sub_type` int(11) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `device_id` bigint(20) DEFAULT NULL,
  `detail` text DEFAULT NULL,
  `requester_id` int(11) NOT NULL,
  `province_id` int(11) NOT NULL,
  `location` text DEFAULT NULL,
  `hasAttachment` tinyint(1) DEFAULT NULL,
  `head_of_request_id` int(11) DEFAULT NULL,
  `approve_by_id` bigint(20) DEFAULT NULL,
  `approve_channel_id` int(11) DEFAULT NULL,
  `urgency_id` int(11) DEFAULT NULL,
  `approve_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `start_date_time` datetime DEFAULT NULL,
  `end_date_time` datetime DEFAULT NULL,
  `current_status_id` int(11) DEFAULT NULL,
  `request_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request`
--

INSERT INTO `request` (`request_id`, `request_type`, `request_sub_type`, `subject`, `device_id`, `detail`, `requester_id`, `province_id`, `location`, `hasAttachment`, `head_of_request_id`, `approve_by_id`, `approve_channel_id`, `urgency_id`, `approve_at`, `start_date_time`, `end_date_time`, `current_status_id`, `request_at`) VALUES
(3, 2, 1, 'ทดสอบ round_no/year', NULL, 'ทดสอบ round_no/year', 20, 1, '', 1, 1, 2, 2, 2, '2026-02-20 04:38:44', '2026-02-22 11:56:00', '2026-02-24 11:56:00', 3, '2026-02-06 05:00:05'),
(4, 2, 1, 'ทดสอบ', NULL, 'ทดสอบ', 20, 1, NULL, 1, 1, 2, 2, NULL, '2026-02-20 04:22:55', '2026-02-06 12:07:00', '2026-02-08 12:07:00', 3, '2026-02-06 05:08:18'),
(5, 2, 2, 'ทดสอบการแจ้งเตือนครั้งที่ 2', NULL, 'ทดสอบการแจ้งเตือนครั้งที่ 2', 20, 3, NULL, 1, 4, 2, 2, 2, '2026-02-20 04:17:43', '2026-02-22 14:18:00', '2026-02-22 20:18:00', 3, '2026-02-06 07:18:26'),
(6, 2, 1, 'ทดสอบ event_log ฝั่ง request', NULL, 'ทดสอบ event_log ฝั่ง request', 20, 3, NULL, 1, 1, 2, 2, 2, '2026-02-20 08:54:26', '2026-02-22 15:24:00', '2026-02-22 23:24:00', 3, '2026-02-06 08:24:58'),
(7, 4, 5, 'ทดสอบการทำงานของการแจ้งเตือน', NULL, 'ทดสอบการทำงานของการแจ้งเตือน', 20, 3, 'หลักกิโลที่ 0', 1, 9, 10, 2, 2, '2026-02-20 03:50:34', '2026-02-22 15:46:00', '2026-02-23 15:51:00', 15, '2026-02-06 08:47:02'),
(8, 3, NULL, 'ทดสอบ', 86, NULL, 20, 1, 'ศาลากลางจังหวัดพิษณุโลก ถนนวังจันทน์ ตำบลในเมือง อำเภอเมืองพิษณุโลก จังหวัดพิษณุโลก 6500', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, '2026-02-19 05:48:50'),
(9, 3, 6, 'ทดสอบ2', 52, 'รายละเอียด2', 20, 2, 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', 1, NULL, NULL, NULL, NULL, '2026-02-20 03:40:38', NULL, NULL, 9, '2026-02-19 06:01:08'),
(10, 2, 1, 'ทดสอบ', NULL, NULL, 20, 1, NULL, 0, NULL, NULL, 2, NULL, '2026-02-20 03:38:44', '2026-02-19 13:01:00', '2026-02-21 13:02:00', 3, '2026-02-19 06:02:05'),
(11, 4, 5, 'ทดสอบ12345', NULL, '123123123123\n12312312312312', 20, 2, 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', 1, 9, 10, 2, 2, '2026-02-20 02:13:09', '2026-02-22 14:02:00', '2026-02-24 13:02:00', 15, '2026-02-19 06:02:26'),
(12, 2, 1, 'ทดสอบdasdasdasd', NULL, 'asdasdasdasd', 20, 1, NULL, 1, 1, NULL, 2, 1, '2026-02-20 02:10:14', '2026-02-22 14:19:00', '2026-02-24 14:20:00', 3, '2026-02-19 07:20:16'),
(13, 3, 6, 'ทดสอบหัวข้อแจ้งเสียแจ้งซ่อม id 13 ครั้งที่ 1', 51, '', 20, 2, 'ชั้น 4 ศาลากลางจังหวัดตาก ถนนพหลโยธิน ตำบลหนองหลวง อำเภอเมืองตาก จังหวัดตาก 63000', 1, 18, NULL, NULL, NULL, '2026-02-20 01:03:54', '2026-02-22 07:58:00', '2026-02-24 07:58:00', 9, '2026-02-19 07:21:43'),
(14, 4, 3, 'ทดสอบบริการรถดาวเทียมสื่อสาร (#3)', NULL, '1. เรียนท่านผู้โดยสารโปรทราบ\n2. การเรียนรู้ไม่มีที่สิ้นสุด', 20, 4, 'อยากกินขนมเปียกปูน', 1, 6, NULL, 2, 2, '2026-02-20 04:13:25', '2026-02-22 14:23:00', '2026-02-24 14:23:00', 15, '2026-02-19 07:23:36'),
(15, 2, 2, 'APPROVED VIA PUT', NULL, 'x', 20, 5, NULL, 1, NULL, NULL, NULL, NULL, '2026-02-20 02:07:21', '2026-02-26 15:27:00', '2026-02-27 15:27:00', 3, '2026-02-19 08:28:08'),
(16, 4, 1, 'TEST approve flow', NULL, 'test', 20, 5, 'ICT8', 0, NULL, NULL, NULL, NULL, '2026-02-19 08:42:19', '2026-03-01 10:00:00', '2026-03-01 12:00:00', 15, '2026-02-19 08:41:17'),
(18, 4, 3, 'TEST round/year auto', NULL, 'auto round/year', 20, 4, 'ทดสอบ round/year', 0, 6, NULL, 2, 2, '2026-02-20 04:36:45', '2026-03-01 10:00:00', '2026-03-01 12:00:00', 15, '2026-02-20 04:36:37'),
(19, 2, 1, 'ทดสอบการขอสนับสนุนห้องประชุม vcs', NULL, 'ทดสอบการขอสนับสนุนห้องประชุม vcs', 20, 2, NULL, 1, 1, 2, 2, 2, '2026-02-20 10:56:27', '2026-02-22 08:30:00', '2026-02-22 13:30:00', 3, '2026-02-20 10:55:36'),
(20, 3, 6, 'ทดสอบการแจ้งเสียซ่อม-อุปกรณ์', 47, 'เปิดไม่ติดเลย', 20, 3, 'ชั้น 2 ศาลากลางจังหวัดสุโขทัย (อาคารหลังใหม่ 5 ชั้น) ถนน นิกรเกษม ตำบล ธานี อำเภอเมืองสุโขทัย สุโขทัย 64000', 1, 17, 6, 2, 2, '2026-02-20 11:02:54', '2026-02-21 18:02:00', '2026-02-28 18:02:00', 9, '2026-02-20 11:01:43'),
(21, 2, 2, 'ทดสอบ', NULL, '', 20, 3, NULL, 1, 4, 2, 2, 2, '2026-02-24 01:13:15', '2026-03-04 14:19:00', '2026-03-05 14:19:00', 3, '2026-02-23 07:19:53'),
(22, 2, 2, 'ทดสอบการขอสนับสนุนห้องประชุม webex', NULL, 'ทดสอบการขอสนับสนุนห้องประชุม webex', 20, 5, NULL, 1, 4, 2, 2, 2, '2026-02-23 07:23:34', '2026-03-10 14:22:00', '2026-03-11 14:22:00', 3, '2026-02-23 07:22:37'),
(23, 4, 5, 'ทดสอบอื่นๆและอื่นๆและอื่นๆ', NULL, '', 20, 3, 'อยากกินขนมเปียกปูน', 1, 9, 10, 2, 1, '2026-02-23 07:49:08', '2026-03-11 14:47:00', '2026-03-12 14:47:00', 15, '2026-02-23 07:47:58');

-- --------------------------------------------------------

--
-- Table structure for table `request_attachment`
--

CREATE TABLE `request_attachment` (
  `request_attachment_id` bigint(20) NOT NULL,
  `request_id` bigint(20) NOT NULL,
  `filepath` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_attachment`
--

INSERT INTO `request_attachment` (`request_attachment_id`, `request_id`, `filepath`, `original_filename`, `stored_filename`, `file_size`, `uploaded_by`, `uploaded_at`) VALUES
(1, 3, 'uploads/requests/req_3_u20_20260206_060005.png', 'Screenshot 2569-02-06 at 11.52.27.png', 'req_3_u20_20260206_060005.png', 769215, 20, '2026-02-06 05:00:05'),
(2, 4, 'uploads/requests/req_4_u20_20260206_060818.png', 'Screenshot 2569-02-06 at 11.52.27.png', 'req_4_u20_20260206_060818.png', 769215, 20, '2026-02-06 05:08:18'),
(3, 5, 'uploads/requests/req_5_u20_20260206_081826.docx', 'แนวข้อสอบกพ.docx', 'req_5_u20_20260206_081826.docx', 3542354, 20, '2026-02-06 07:18:26'),
(4, 6, 'uploads/requests/req_6_u20_20260206_092458.png', 'Screenshot_20260129-134621.png', 'req_6_u20_20260206_092458.png', 165858, 20, '2026-02-06 08:24:58'),
(5, 7, 'uploads/requests/req_7_u20_20260206_094702.png', 'Screenshot 2569-02-06 at 15.17.40.png', 'req_7_u20_20260206_094702.png', 377334, 20, '2026-02-06 08:47:02'),
(6, 8, 'uploads/requests/req_8_u20_20260219_064850_5f461d.png', 'Screenshot 2569-02-19 at 12.17.41.png', 'req_8_u20_20260219_064850_5f461d.png', 46701, 20, '2026-02-19 05:48:50'),
(7, 9, 'uploads/requests/req_9_u20_20260219_070108_3cf61e.png', 'Screenshot 2569-02-19 at 12.11.54.png', 'req_9_u20_20260219_070108_3cf61e.png', 672228, 20, '2026-02-19 06:01:08'),
(8, 12, 'uploads/requests/req_12_u20_20260219_082016_7b1363.png', 'Screenshot 2569-02-19 at 13.44.54.png', 'req_12_u20_20260219_082016_7b1363.png', 338513, 20, '2026-02-19 07:20:16'),
(9, 13, 'uploads/requests/req_13_u20_20260219_082143_d3e505.png', 'Screenshot 2569-02-19 at 12.18.47.png', 'req_13_u20_20260219_082143_d3e505.png', 89568, 20, '2026-02-19 07:21:43'),
(10, 14, 'uploads/requests/req_14_u20_20260219_082336_e245ea.png', 'Screenshot 2569-02-19 at 14.04.37.png', 'req_14_u20_20260219_082336_e245ea.png', 91757, 20, '2026-02-19 07:23:36'),
(11, 15, 'uploads/requests/req_15_u20_20260219_092808_7175f9.png', 'Screenshot 2569-02-19 at 12.24.14.png', 'req_15_u20_20260219_092808_7175f9.png', 52043, 20, '2026-02-19 08:28:08'),
(12, 15, 'uploads/requests/req_15_u0_20260220_015213_5ce1df.png', 'logo_หน่วย8.png', 'req_15_u0_20260220_015213_5ce1df.png', 2343732, 0, '2026-02-20 00:52:13'),
(13, 13, 'uploads/requests/req_13_u20_20260220_015436_668c71.png', 'Screenshot 2569-02-19 at 16.00.11.png', 'req_13_u20_20260220_015436_668c71.png', 219441, 20, '2026-02-20 00:54:36'),
(14, 13, 'uploads/requests/req_13_u20_20260220_015436_8680cb.png', 'Screenshot 2569-02-19 at 15.56.48.png', 'req_13_u20_20260220_015436_8680cb.png', 319258, 20, '2026-02-20 00:54:36'),
(15, 13, 'uploads/requests/req_13_u20_20260220_015436_c306ae.png', 'Screenshot 2569-02-19 at 15.50.33.png', 'req_13_u20_20260220_015436_c306ae.png', 598794, 20, '2026-02-20 00:54:36'),
(16, 14, 'uploads/requests/req_14_u20_20260220_021404_bb11d5.png', 'Screenshot 2569-02-19 at 12.11.54.png', 'req_14_u20_20260220_021404_bb11d5.png', 672228, 20, '2026-02-20 01:14:04'),
(17, 14, 'uploads/requests/req_14_u20_20260220_021404_e5d138.png', 'Screenshot 2569-02-19 at 12.17.41.png', 'req_14_u20_20260220_021404_e5d138.png', 46701, 20, '2026-02-20 01:14:04'),
(18, 14, 'uploads/requests/req_14_u20_20260220_021404_488389.png', 'Screenshot 2569-02-19 at 12.24.14.png', 'req_14_u20_20260220_021404_488389.png', 52043, 20, '2026-02-20 01:14:04'),
(19, 11, 'uploads/requests/req_11_u20_20260220_031309_8a93bd.png', 'Screenshot 2569-02-19 at 16.00.11.png', 'req_11_u20_20260220_031309_8a93bd.png', 219441, 20, '2026-02-20 02:13:09'),
(20, 7, 'uploads/requests/req_7_u20_20260220_045038_9ae4a9.png', 'Screenshot 2569-02-19 at 15.56.48.png', 'req_7_u20_20260220_045038_9ae4a9.png', 319258, 20, '2026-02-20 03:50:38'),
(21, 7, 'uploads/requests/req_7_u20_20260220_045038_fb24df.png', 'Screenshot 2569-02-19 at 15.50.33.png', 'req_7_u20_20260220_045038_fb24df.png', 598794, 20, '2026-02-20 03:50:38'),
(22, 5, 'uploads/requests/req_5_u20_20260220_051746_525148.png', 'Screenshot 2569-02-20 at 09.18.14.png', 'req_5_u20_20260220_051746_525148.png', 267663, 20, '2026-02-20 04:17:46'),
(23, 5, 'uploads/requests/req_5_u20_20260220_051746_20a023.png', 'Screenshot 2569-02-20 at 09.03.00.png', 'req_5_u20_20260220_051746_20a023.png', 447548, 20, '2026-02-20 04:17:46'),
(24, 5, 'uploads/requests/req_5_u20_20260220_051746_0778e0.png', 'Screenshot 2569-02-20 at 09.02.05.png', 'req_5_u20_20260220_051746_0778e0.png', 45793, 20, '2026-02-20 04:17:46'),
(25, 3, 'uploads/requests/req_3_u20_20260220_053846_bcf268.png', 'Screenshot 2569-02-20 at 09.03.00.png', 'req_3_u20_20260220_053846_bcf268.png', 447548, 20, '2026-02-20 04:38:46'),
(26, 3, 'uploads/requests/req_3_u20_20260220_053846_713ca8.png', 'Screenshot 2569-02-20 at 09.02.05.png', 'req_3_u20_20260220_053846_713ca8.png', 45793, 20, '2026-02-20 04:38:46'),
(27, 6, 'uploads/requests/req_6_u20_20260220_095430_7995aa.png', 'Screenshot 2569-02-20 at 14.03.36.png', 'req_6_u20_20260220_095430_7995aa.png', 517193, 20, '2026-02-20 08:54:30'),
(28, 6, 'uploads/requests/req_6_u20_20260220_095430_0f0623.png', 'Screenshot 2569-02-20 at 13.52.23.png', 'req_6_u20_20260220_095430_0f0623.png', 439450, 20, '2026-02-20 08:54:30'),
(29, 6, 'uploads/requests/req_6_u20_20260220_095430_b53b7a.png', 'Screenshot 2569-02-20 at 13.40.47.png', 'req_6_u20_20260220_095430_b53b7a.png', 313864, 20, '2026-02-20 08:54:30'),
(30, 19, 'uploads/requests/req_19_u20_20260220_115536_fb2e2d.png', 'Screenshot 2569-02-20 at 09.56.40.png', 'req_19_u20_20260220_115536_fb2e2d.png', 514410, 20, '2026-02-20 10:55:36'),
(31, 19, 'uploads/requests/req_19_u20_20260220_115629_1b0af7.png', 'Screenshot 2569-02-20 at 17.11.27.png', 'req_19_u20_20260220_115629_1b0af7.png', 627804, 20, '2026-02-20 10:56:29'),
(32, 20, 'uploads/requests/req_20_u20_20260220_120143_4b3b7a.png', 'Screenshot 2569-02-20 at 17.11.27.png', 'req_20_u20_20260220_120143_4b3b7a.png', 627804, 20, '2026-02-20 11:01:43'),
(33, 20, 'uploads/requests/req_20_u20_20260220_120256_4cefdb.png', 'Screenshot 2569-02-20 at 15.29.21.png', 'req_20_u20_20260220_120256_4cefdb.png', 334027, 20, '2026-02-20 11:02:56'),
(34, 22, 'uploads/requests/req_22_u20_20260223_082237_99b049.png', 'Screenshot 2569-02-23 at 14.05.45.png', 'req_22_u20_20260223_082237_99b049.png', 390275, 20, '2026-02-23 07:22:37'),
(35, 23, 'uploads/requests/req_23_u20_20260223_084758_54866c.png', 'Screenshot 2569-02-23 at 13.47.43.png', 'req_23_u20_20260223_084758_54866c.png', 384037, 20, '2026-02-23 07:47:58'),
(36, 23, 'uploads/requests/req_23_u20_20260223_085203_3369a7.png', 'Screenshot 2569-02-23 at 14.42.39 (2).png', 'req_23_u20_20260223_085203_3369a7.png', 1237526, 20, '2026-02-23 07:52:03'),
(37, 23, 'uploads/requests/req_23_u20_20260223_085203_cbe0d5.png', 'Screenshot 2569-02-23 at 14.42.39.png', 'req_23_u20_20260223_085203_cbe0d5.png', 1357126, 20, '2026-02-23 07:52:03'),
(38, 23, 'uploads/requests/req_23_u20_20260223_085216_83d6ce.png', 'Screenshot 2569-02-23 at 13.48.45.png', 'req_23_u20_20260223_085216_83d6ce.png', 318663, 20, '2026-02-23 07:52:16'),
(39, 23, 'uploads/requests/req_23_u20_20260223_085216_338165.png', 'Screenshot 2569-02-23 at 13.47.43.png', 'req_23_u20_20260223_085216_338165.png', 384037, 20, '2026-02-23 07:52:16'),
(40, 23, 'uploads/requests/req_23_u20_20260223_085233_a3bea8.png', 'Screenshot 2569-02-23 at 07.51.56.png', 'req_23_u20_20260223_085233_a3bea8.png', 613492, 20, '2026-02-23 07:52:33'),
(41, 20, 'uploads/requests/req_20_u20_20260223_090947_e173c6.png', 'Screenshot 2569-02-23 at 07.51.56.png', 'req_20_u20_20260223_090947_e173c6.png', 613492, 20, '2026-02-23 08:09:47'),
(42, 20, 'uploads/requests/req_20_u20_20260223_091054_f9900d.png', 'Screenshot 2569-02-23 at 13.14.17.png', 'req_20_u20_20260223_091054_f9900d.png', 235937, 20, '2026-02-23 08:10:54'),
(43, 22, 'uploads/requests/req_22_u20_20260223_091731_80b0d2.png', 'Screenshot 2569-02-23 at 15.12.03.png', 'req_22_u20_20260223_091731_80b0d2.png', 156168, 20, '2026-02-23 08:17:31'),
(44, 9, 'uploads/requests/req_9_u20_20260224_020934_6b2f52.png', 'Screenshot 2569-02-23 at 15.53.03.png', 'req_9_u20_20260224_020934_6b2f52.png', 55928, 20, '2026-02-24 01:09:34'),
(45, 9, 'uploads/requests/req_9_u20_20260224_020934_05b9d0.png', 'Screenshot 2569-02-23 at 15.38.14.png', 'req_9_u20_20260224_020934_05b9d0.png', 248945, 20, '2026-02-24 01:09:34'),
(46, 9, 'uploads/requests/req_9_u20_20260224_020934_bd9812.png', 'Screenshot 2569-02-23 at 15.38.05.png', 'req_9_u20_20260224_020934_bd9812.png', 86036, 20, '2026-02-24 01:09:34'),
(47, 9, 'uploads/requests/req_9_u20_20260224_020934_4df443.png', 'Screenshot 2569-02-23 at 15.12.03.png', 'req_9_u20_20260224_020934_4df443.png', 156168, 20, '2026-02-24 01:09:34'),
(48, 9, 'uploads/requests/req_9_u20_20260224_020934_5c3c94.png', 'Screenshot 2569-02-23 at 15.03.16.png', 'req_9_u20_20260224_020934_5c3c94.png', 74409, 20, '2026-02-24 01:09:34'),
(49, 9, 'uploads/requests/req_9_u20_20260224_020934_42c617.png', 'Screenshot 2569-02-23 at 15.00.15.png', 'req_9_u20_20260224_020934_42c617.png', 353477, 20, '2026-02-24 01:09:34'),
(50, 21, 'uploads/requests/req_21_u20_20260224_021315_daf18f.png', 'Screenshot 2569-02-23 at 15.53.03.png', 'req_21_u20_20260224_021315_daf18f.png', 55928, 20, '2026-02-24 01:13:15'),
(51, 21, 'uploads/requests/req_21_u20_20260224_021315_c75835.png', 'Screenshot 2569-02-23 at 15.38.14.png', 'req_21_u20_20260224_021315_c75835.png', 248945, 20, '2026-02-24 01:13:15'),
(52, 21, 'uploads/requests/req_21_u20_20260224_021315_a3fa39.png', 'Screenshot 2569-02-23 at 15.38.05.png', 'req_21_u20_20260224_021315_a3fa39.png', 86036, 20, '2026-02-24 01:13:15'),
(53, 21, 'uploads/requests/req_21_u20_20260224_021315_8d5af9.png', 'Screenshot 2569-02-23 at 15.12.03.png', 'req_21_u20_20260224_021315_8d5af9.png', 156168, 20, '2026-02-24 01:13:15'),
(54, 20, 'uploads/requests/req_20_u20_20260224_022120_6d715e.png', 'Screenshot 2569-02-23 at 15.53.03.png', 'req_20_u20_20260224_022120_6d715e.png', 55928, 20, '2026-02-24 01:21:20'),
(55, 20, 'uploads/requests/req_20_u20_20260224_022120_a5b23e.png', 'Screenshot 2569-02-23 at 15.38.14.png', 'req_20_u20_20260224_022120_a5b23e.png', 248945, 20, '2026-02-24 01:21:20'),
(56, 20, 'uploads/requests/req_20_u20_20260224_022120_e05b4d.png', 'Screenshot 2569-02-23 at 15.38.05.png', 'req_20_u20_20260224_022120_e05b4d.png', 86036, 20, '2026-02-24 01:21:20'),
(57, 20, 'uploads/requests/req_20_u20_20260224_022120_8779ba.png', 'Screenshot 2569-02-23 at 15.12.03.png', 'req_20_u20_20260224_022120_8779ba.png', 156168, 20, '2026-02-24 01:21:20'),
(58, 20, 'uploads/requests/req_20_u20_20260224_022120_d67694.png', 'Screenshot 2569-02-23 at 15.03.16.png', 'req_20_u20_20260224_022120_d67694.png', 74409, 20, '2026-02-24 01:21:20'),
(59, 20, 'uploads/requests/req_20_u20_20260224_022120_38503b.png', 'Screenshot 2569-02-23 at 15.00.15.png', 'req_20_u20_20260224_022120_38503b.png', 353477, 20, '2026-02-24 01:21:20');

-- --------------------------------------------------------

--
-- Table structure for table `request_status`
--

CREATE TABLE `request_status` (
  `status_id` int(11) NOT NULL,
  `status_code` varchar(255) NOT NULL,
  `status_name` varchar(255) NOT NULL,
  `meaning` text NOT NULL,
  `request_type_id` int(11) NOT NULL,
  `sort_order` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_status`
--

INSERT INTO `request_status` (`status_id`, `status_code`, `status_name`, `meaning`, `request_type_id`, `sort_order`) VALUES
(1, 'pending', 'รออนุมัติ', 'สถานะเริ่มต้นหลังผู้ใช้ส่งคำขอ', 2, 1),
(2, 'need_more_info', 'ขอรายละเอียดเพิ่มเติม', 'เจ้าหน้าที่ต้องการข้อมูลเพิ่มจากผู้ยื่นคำขอ ก่อนอนุมัติ/ดำเนินการ', 2, 2),
(3, 'approved', 'อนุมัติแล้ว', 'คำขอได้รับการอนุมัติ แล้วเข้าสู่ขั้นตอนดำเนินการ', 2, 3),
(4, 'in_progress', 'กำลังดำเนินการ', 'เจ้าหน้าที่กำลังดำเนินการตามคำขอ', 2, 4),
(5, 'done', 'เสร็จสิ้น', 'ดำเนินการเสร็จสิ้น', 2, 5),
(6, 'rejected', 'ไม่อนุมัติ', 'คำขอถูกปฏิเสธ', 2, 6),
(7, 'pending', 'รออนุมัติ', 'สถานะเริ่มต้นหลังผู้ใช้ส่งคำขอ', 3, 1),
(8, 'need_more_info', 'ขอรายละเอียดเพิ่มเติม', 'เจ้าหน้าที่ต้องการข้อมูลเพิ่มจากผู้ยื่นคำขอ ก่อนอนุมัติ/ดำเนินการ', 3, 2),
(9, 'approved', 'อนุมัติแล้ว', 'คำขอได้รับการอนุมัติ แล้วเข้าสู่ขั้นตอนดำเนินการ', 3, 3),
(10, 'in_progress', 'กำลังดำเนินการ', 'เจ้าหน้าที่กำลังดำเนินการตามคำขอ', 3, 4),
(11, 'done', 'เสร็จสิ้น', 'ดำเนินการเสร็จสิ้น', 3, 5),
(12, 'rejected', 'ไม่อนุมัติ', 'คำขอถูกปฏิเสธ', 3, 6),
(13, 'pending', 'รออนุมัติ', 'สถานะเริ่มต้นหลังผู้ใช้ส่งคำขอ', 4, 1),
(14, 'need_more_info', 'ขอรายละเอียดเพิ่มเติม', 'เจ้าหน้าที่ต้องการข้อมูลเพิ่มจากผู้ยื่นคำขอ ก่อนอนุมัติ/ดำเนินการ', 4, 2),
(15, 'approved', 'อนุมัติแล้ว', 'คำขอได้รับการอนุมัติ แล้วเข้าสู่ขั้นตอนดำเนินการ', 4, 3),
(16, 'in_progress', 'กำลังดำเนินการ', 'เจ้าหน้าที่กำลังดำเนินการตามคำขอ', 4, 4),
(17, 'done', 'เสร็จสิ้น', 'ดำเนินการเสร็จสิ้น', 4, 5),
(18, 'rejected', 'ไม่อนุมัติ', 'คำขอถูกปฏิเสธ', 4, 6);

-- --------------------------------------------------------

--
-- Table structure for table `request_sub_type`
--

CREATE TABLE `request_sub_type` (
  `request_sub_type_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `discription` text NOT NULL,
  `subtype_of` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_sub_type`
--

INSERT INTO `request_sub_type` (`request_sub_type_id`, `name`, `discription`, `subtype_of`) VALUES
(1, 'VCS', '', 2),
(2, 'WEBEX', '', 2),
(3, 'บริการรถดาวเทียมสื่อสาร', '', 4),
(5, 'อื่น ๆ', '', 4),
(6, 'แจ้งเสีย/ซ่อม', '', 3);

-- --------------------------------------------------------

--
-- Table structure for table `request_type`
--

CREATE TABLE `request_type` (
  `request_type_id` int(11) NOT NULL,
  `type_name` varchar(255) NOT NULL,
  `discription` text NOT NULL,
  `url_link` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_type`
--

INSERT INTO `request_type` (`request_type_id`, `type_name`, `discription`, `url_link`) VALUES
(2, 'ขอสนับสนุนห้องประชุม', 'ขอใช้บริการจองระบบประชุมออนไลน์ เช่น VCS, Webex, Zoom หรือระบบ Conference อื่น ๆ ของหน่วยงาน', 'https://unjogging-melany-deadliest.ngrok-free.dev/ict8/gcms/request-conference.html'),
(3, 'แจ้งเสีย/ซ่อมอุปกรณ์', 'แจ้งปัญหาอุปกรณ์ด้านเทคโนโลยีสารสนเทศของหน่วยงาน ทั้งอุปกรณ์ที่มีหมายเลข IP Address และอุปกรณ์ที่ไม่มี IP ที่อยู่ภายใต้การดูแลของศูนย์เขต 8', 'https://unjogging-melany-deadliest.ngrok-free.dev/ict8/gcms/request-repair.html'),
(4, 'ขอใช้บริการอื่น ๆ ของหน่วยงาน', 'ขอรับบริการด้านเทคโนโลยีสารสนเทศหรือภารกิจของหน่วยงาน', 'https://unjogging-melany-deadliest.ngrok-free.dev/ict8/gcms/request-other.html');

-- --------------------------------------------------------

--
-- Table structure for table `site_diractor`
--

CREATE TABLE `site_diractor` (
  `diractor_id` int(11) NOT NULL,
  `firstname` varchar(255) NOT NULL,
  `lastname` varchar(255) NOT NULL,
  `photo_path` text DEFAULT NULL,
  `start` year(4) DEFAULT NULL,
  `end` year(4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_diractor`
--

INSERT INTO `site_diractor` (`diractor_id`, `firstname`, `lastname`, `photo_path`, `start`, `end`) VALUES
(1, 'นายบุญรอด', 'ยิ้มอำพันธ์', NULL, '1972', '1984'),
(2, 'นายทวีป', 'จันทนา', NULL, '1984', '1990'),
(3, 'นายลิขิต', 'สุวรรณพิกุล', NULL, '1990', '1991'),
(4, 'นายนิคม', 'อัมพวะมัต', NULL, '1992', '2003'),
(5, 'นายปรีชา', 'วงศ์ชาคร', '/uploads/site_diractor/diractor_20260226_125219_a6a8427512ec966c.png', '2003', '2008'),
(6, 'นายณรงค์ชัย', 'ภูริโสภณ', NULL, '2008', '2010'),
(7, 'นายสมศักดิ์', 'ลิ้มสกุล', '/uploads/site_diractor/diractor_20260226_125421_c04ffdb695b4888d.png', '2010', '2012'),
(8, 'นายเจษฏา', 'ธรรมมาลี', NULL, '2012', '2014'),
(9, 'นางธีรา', 'ธนูศิลป์', NULL, '2014', '2015'),
(10, 'นายสุรชัย', 'ชุ่มเกษร', '/uploads/site_diractor/diractor_20260226_125623_b825b6c60929dd8f.png', '2016', '2021'),
(11, 'นายศิริวัฒน์', 'อภิณหพานิชย์', '/uploads/site_diractor/diractor_20260226_125707_dda235a05fc13b67.png', '2021', '2023'),
(12, 'นายชัยชนะ', 'เชี่ยวชาญ', '/uploads/site_diractor/diractor_20260226_125751_49b030ec209a4b40.png', '2023', '2024'),
(13, 'นายพิภพ', 'อินจันทร์', '/uploads/site_diractor/diractor_20260226_125858_e87619ac7eb86750.png', '2024', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `site_mission`
--

CREATE TABLE `site_mission` (
  `site_mission_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `discription` text DEFAULT NULL,
  `img_path` text DEFAULT NULL,
  `sort_order` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_mission`
--

INSERT INTO `site_mission` (`site_mission_id`, `title`, `discription`, `img_path`, `sort_order`) VALUES
(1, 'เชื่อมโยงเครือข่าย', 'เป็นศูนย์กลางการเชื่อมโยงเครือข่ายสารสนเทศและการสื่อสารระหว่างส่วนกลางกับจังหวัด และระหว่างจังหวัดัดภายในเครือข่ายรับผิดชอบ และตามที่ร้องขอ', '/uploads/site_mission/mission_20260227_043246_e44374da4b4833ac.png', 1),
(2, 'ประสานฐานข้อมูล', 'เป็นศูนย์กลางประสานข้อมูลของ กระทรวงมหาดไทยในส่วนภูมิภาค และสนับสนุนศูนย์ข้อมูลจังหวัดภายในเครือข่ายรับผิดชอบ', '/uploads/site_mission/mission_20260227_043345_0d106ae30cc35723.png', 2),
(3, 'แนะแนวด้านเทคโนโลยี', 'ให้คำแนะนำปรึกษาด้านเทคโนโลยีสารสนเทศและสื่อสารแก่จังหวัดภายในเครือข่ายรับผิดชอบ', '/uploads/site_mission/mission_20260227_043429_6fc4b9fa235b346d.png', 3),
(4, 'ติดตามประเมินผล', 'ติดตาม ประเมินผล และเสนอแนะแนวทางในการปรับปรุงการปฏิบัติงานแก่จังหวัด', '/uploads/site_mission/mission_20260227_043501_77fb7e68cfb0448f.png', 4),
(5, 'สนับสนุนอุปกรณ์', 'สนับสนุนเครื่องมือ อุปกรณ์สารสนเทศและให้บริการด้านการรับ-ส่งข่าวสาร การติดตั้ง ตรวจซ่อม บำรุงรักษาเครื่องมืออุปกรณ์แก่ส่วนราชการต่างๆ', '/uploads/site_mission/mission_20260227_043535_27e0238f2c8cce62.png', 5),
(6, 'ถวายความปลอดภัยฯ', 'ถวายความปลอดภัยด้านการสื่อสารแด่พระบาทสมเด็จพระเจ้าอยู่หัว สมเด็จพระนางเจ้าฯ พระบรมราชินีนาถ และพระบรมวงศานุวงศ์', '/uploads/site_mission/mission_20260227_043605_22fb26220e04ff03.png', 6),
(7, 'ธุรการ/พัสดุ', 'บริหารงานธุรการ งานบุคคล งานงบประมาณการอนุมัติเบิกจ่าย การบริหารการจัดซื้อ/จัดจ้าง งานพัสดุและอาคารสถานที่ ตามอำนาจที่ได้รับมอบหมาย', '/uploads/site_mission/mission_20260227_043637_5130a1decf394713.png', 7),
(8, 'ความปลอดภัยเครือข่าย', 'บริหารจัดการเครือข่าย การรักษาความปลอดภัยสารสนเทศ ภายในเครือข่ายรับผิดชอบ', '/uploads/site_mission/mission_20260227_043706_cd0449d46f31ff1f.png', 8),
(9, 'วิดิทัศน์ทางไกล', 'บริหารจัดการการประชุมระบบวิดิทัศน์ทางไกลและการควบคุมอุปกรณ์ MCU ภายในเครือข่ายรับผิดชอบ', '/uploads/site_mission/mission_20260227_043732_5b28629a46538911.png', 9),
(10, 'ดาวเทียม/วิทยุ', 'บริหารจัดการระบบสื่อสารดาวเทียมและระบบวิทยุสื่อสาร ภายในเครือข่ายรับผิดชอบ', '/uploads/site_mission/mission_20260227_043802_4e083e1d02ff9000.png', 10),
(11, 'CCTV', 'ปฏิบัติงานระบบกล้องโทรทัศน์วงจรปิด (CCTV) ภายในเครือข่ายรับผิดชอบ', '/uploads/site_mission/mission_20260227_043832_f607127229560616.png', 11),
(12, 'งานอื่นๆ', 'ปฏิบัติงานอื่นๆ ที่ได้รับมอบหมาย', '/uploads/site_mission/mission_20260227_043901_7d8bf0678a86e507.png', 12);

-- --------------------------------------------------------

--
-- Table structure for table `site_structure`
--

CREATE TABLE `site_structure` (
  `site_structure` int(11) NOT NULL,
  `prefix_person_id` int(11) NOT NULL,
  `fristname` varchar(255) NOT NULL,
  `lastname` varchar(255) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `position_id` int(11) DEFAULT NULL,
  `pic_path` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_structure`
--

INSERT INTO `site_structure` (`site_structure`, `prefix_person_id`, `fristname`, `lastname`, `department_id`, `position_id`, `pic_path`, `created_at`) VALUES
(1, 1, 'พิภพ', 'อินจันทร์', NULL, 1, '/uploads/site_structure/structure_20260227_034254_9136500b108fe0fb.png', '2026-02-27 02:42:54'),
(2, 1, 'เฉลิมพล', 'ทองโคตร', 1, 2, '/uploads/site_structure/structure_20260227_034756_d1d6b889567077da.png', '2026-02-27 02:59:02'),
(3, 1, 'อนันต์', 'เปลี่ยนโพธิ์', 1, 3, '/uploads/site_structure/structure_20260227_034835_bc1971c2c2919d43.png', '2026-02-27 02:48:35'),
(4, 1, 'พอเพียง', 'ช่วยงาน', 1, 4, '/uploads/site_structure/structure_20260227_035038_7b9244294d10214d.png', '2026-02-27 02:50:38'),
(5, 1, 'สุพจ', 'คงมณี', 2, 5, '/uploads/site_structure/structure_20260227_035130_a81e5ceab1ab9aea.png', '2026-02-27 02:51:30'),
(6, 1, 'เกรียง', 'พร้อมพิมพ์', 2, 7, '/uploads/site_structure/structure_20260227_035248_26ed1688eabb23b0.png', '2026-02-27 02:52:48'),
(7, 1, 'กิตติกวินทร์', 'องค์สวัสดิ์', 2, 8, '/uploads/site_structure/structure_20260227_035455_8bed76dc6f0a6bab.png', '2026-02-27 02:54:55'),
(8, 1, 'ณัฐพล', 'สนใจ', 2, 9, '/uploads/site_structure/structure_20260227_035541_fc30007ade4633c9.png', '2026-02-27 02:55:41'),
(9, 3, 'พิกุล', 'สิทธิ', 3, 10, '/uploads/site_structure/structure_20260227_035622_8dfd0513eb3be12e.png', '2026-02-27 02:56:22'),
(10, 1, 'ประภาส', 'แก้วกำพล', 3, 11, '/uploads/site_structure/structure_20260227_035703_44330ef5b151b8c2.png', '2026-02-27 02:57:03'),
(11, 2, 'บุญธรรม', 'ทองกรณ์', 3, 12, '/uploads/site_structure/structure_20260227_035752_9ffd54a784ea06db.png', '2026-02-27 02:57:52');

-- --------------------------------------------------------

--
-- Table structure for table `template_type`
--

CREATE TABLE `template_type` (
  `template_type_id` int(11) NOT NULL,
  `template_name` varchar(255) NOT NULL,
  `detail` text NOT NULL,
  `create_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `bg_filepath` varchar(255) DEFAULT NULL,
  `bg_original_filename` varchar(255) DEFAULT NULL,
  `bg_stored_filename` varchar(255) DEFAULT NULL,
  `bg_file_size` int(11) DEFAULT NULL,
  `bg_uploaded_by` int(11) DEFAULT NULL,
  `bg_uploaded_at` datetime DEFAULT NULL,
  `canvas_width` int(11) DEFAULT 1080,
  `canvas_height` int(11) DEFAULT 1080
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `template_type`
--

INSERT INTO `template_type` (`template_type_id`, `template_name`, `detail`, `create_at`, `bg_filepath`, `bg_original_filename`, `bg_stored_filename`, `bg_file_size`, `bg_uploaded_by`, `bg_uploaded_at`, `canvas_width`, `canvas_height`) VALUES
(1, 'template ข่าวประชาสัมพันธ์1', '', '2026-02-24 04:15:56', '/uploads/template_bg/tplbg_20260224_051550_f117f1da064c9746.jpg', '1.jpg', 'tplbg_20260224_051550_f117f1da064c9746.jpg', 163726, 20, '2026-02-24 05:15:50', 1414, 2000),
(2, 'template ข่าวประชาสัมพันธ์2', '', '2026-02-24 04:16:28', '/uploads/template_bg/tplbg_20260224_051625_e8d8ab18b1034cc6.jpg', '2.jpg', 'tplbg_20260224_051625_e8d8ab18b1034cc6.jpg', 191958, 20, '2026-02-24 05:16:25', 1414, 2000),
(3, 'template ข่าวประชาสัมพันธ์ 3', '', '2026-02-24 04:16:57', '/uploads/template_bg/tplbg_20260224_051655_1777f6b23593ec90.jpg', '3.jpg', 'tplbg_20260224_051655_1777f6b23593ec90.jpg', 183719, 20, '2026-02-24 05:16:55', 1414, 2000);

-- --------------------------------------------------------

--
-- Table structure for table `type_of_device`
--

CREATE TABLE `type_of_device` (
  `type_of_device_id` int(11) NOT NULL,
  `type_of_device_title` varchar(255) NOT NULL,
  `has_network` tinyint(1) NOT NULL,
  `icon_path_online` text DEFAULT NULL,
  `icon_path_offline` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `type_of_device`
--

INSERT INTO `type_of_device` (`type_of_device_id`, `type_of_device_title`, `has_network`, `icon_path_online`, `icon_path_offline`) VALUES
(1, 'access_point', 1, '/uploads/device_icon/device_20260218_104659_0afa44bf0d1e6ead.png', '/uploads/device_icon/device_20260218_104659_80b62bf9d09d5a1f.png'),
(2, 'cctv', 1, '/uploads/device_icon/device_20260218_104937_def631f26884e632.png', '/uploads/device_icon/device_20260218_104937_0ccf3bcd56f43475.png'),
(3, 'firewall', 1, '/uploads/device_icon/device_20260218_105041_504a27e34359ea25.png', '/uploads/device_icon/device_20260218_105042_ae49ff29fb994dbc.png'),
(4, 'router', 1, '/uploads/device_icon/device_20260218_105122_db49dd3efea96ac4.png', '/uploads/device_icon/device_20260218_105122_c51c9704d5ff1ee9.png'),
(5, 'server', 1, '/uploads/device_icon/device_20260218_105218_fec6e437683797ea.png', '/uploads/device_icon/device_20260218_105218_fa43b145d631bf5b.png'),
(6, 'switch', 1, '/uploads/device_icon/device_20260218_105310_154f243827b9ee74.png', '/uploads/device_icon/device_20260218_105310_38cc13e3cb29d7d3.png'),
(7, 'unknown', 0, '/uploads/device_icon/device_20260218_105853_ef306e2bba3617d1.png', '/uploads/device_icon/device_20260218_105853_152915fe5ad77358.png'),
(8, 'walkie_talkie', 0, '/uploads/device_icon/device_20260218_105944_48b6ece9d56238d9.png', '/uploads/device_icon/device_20260218_105944_c2ab667a3f4aaa1b.png'),
(9, 'telephone', 1, '/uploads/device_icon/device_20260218_110024_a59a2ddc7390b33e.png', '/uploads/device_icon/device_20260218_110024_02912c2b0242129e.png'),
(10, 'vcs', 1, '/uploads/device_icon/device_20260218_110052_e29c1ce11c02562b.png', '/uploads/device_icon/device_20260218_110052_ef7d92055142b154.png'),
(11, 'radio', 0, '/uploads/device_icon/device_20260218_110121_af479cad7d22faf1.png', '/uploads/device_icon/device_20260218_110121_aad8415184cdbf73.png'),
(13, 'printer', 0, '', ''),
(14, 'NAT', 1, '', '');

-- --------------------------------------------------------

--
-- Table structure for table `urgency`
--

CREATE TABLE `urgency` (
  `urgency_id` int(11) NOT NULL,
  `urgency_code` varchar(255) NOT NULL,
  `urgency_title` varchar(255) NOT NULL,
  `urgency_level` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `urgency`
--

INSERT INTO `urgency` (`urgency_id`, `urgency_code`, `urgency_title`, `urgency_level`) VALUES
(1, 'urgency-1', 'ด่วน', 1),
(2, 'urgency-2', 'ด่วนมาก', 2),
(3, 'urgency-3', 'ด่วนที่สุด', 3);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` int(11) NOT NULL,
  `line_user_id` varchar(255) NOT NULL,
  `line_user_name` varchar(255) NOT NULL,
  `user_role_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `line_user_id`, `line_user_name`, `user_role_id`) VALUES
(20, 'U41c511046c78a0d9ddb938e5f5ed9fee', 'ploy_ch@t', 3),
(21, 'staff_tastA', 'staff_tastA', 2),
(22, 'staff_tastB', 'staff_tastB', 2),
(23, 'staff_tastC', 'staff_tastC', 2),
(24, 'staff_tastD', 'staff_tastD', 2),
(25, 'staff_tastE', 'staff_tastE', 2);

-- --------------------------------------------------------

--
-- Table structure for table `user_notification_channel`
--

CREATE TABLE `user_notification_channel` (
  `user_notification_channel_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `channel` int(11) NOT NULL,
  `enable` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_notification_channel`
--

INSERT INTO `user_notification_channel` (`user_notification_channel_id`, `user_id`, `channel`, `enable`) VALUES
(1, 20, 1, 1),
(2, 20, 2, 1),
(3, 25, 1, 1),
(4, 25, 2, 1),
(5, 21, 1, 1),
(6, 21, 2, 1),
(7, 24, 1, 1),
(8, 24, 2, 1),
(9, 23, 1, 1),
(10, 23, 2, 1),
(11, 22, 1, 1),
(12, 22, 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_role`
--

CREATE TABLE `user_role` (
  `user_role_id` int(11) NOT NULL,
  `code` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_role`
--

INSERT INTO `user_role` (`user_role_id`, `code`, `role`) VALUES
(1, 'USER', 'ผู้ใช้งานทั่วไป'),
(2, 'STAFF', 'เจ้าหน้าที่'),
(3, 'ADMIN', 'ผู้ดูแลระบบ');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity`
--
ALTER TABLE `activity`
  ADD PRIMARY KEY (`activity_id`),
  ADD KEY `fk_publicity_post_id` (`publicuty_post_id`);

--
-- Indexes for table `banner`
--
ALTER TABLE `banner`
  ADD PRIMARY KEY (`banner_id`),
  ADD KEY `fk_source_news_id_banner` (`source_news_id`),
  ADD KEY `fk_create_by_banner` (`create_by`),
  ADD KEY `fk_source_activity_id` (`source_activity_id`);

--
-- Indexes for table `channel`
--
ALTER TABLE `channel`
  ADD PRIMARY KEY (`channel_id`);

--
-- Indexes for table `contact_info`
--
ALTER TABLE `contact_info`
  ADD PRIMARY KEY (`contact_info_id`),
  ADD KEY `fk_organization_id_contect_info` (`organization_id`);

--
-- Indexes for table `department`
--
ALTER TABLE `department`
  ADD PRIMARY KEY (`department_id`),
  ADD KEY `fk_organization_id` (`organization_id`);

--
-- Indexes for table `device`
--
ALTER TABLE `device`
  ADD PRIMARY KEY (`device_id`),
  ADD KEY `fk_contact_info` (`contact_info_id`),
  ADD KEY `fk_type_of_device` (`type_of_device_id`),
  ADD KEY `fk_main_type_of_device` (`main_type_of_device_id`);

--
-- Indexes for table `document`
--
ALTER TABLE `document`
  ADD PRIMARY KEY (`document_id`);

--
-- Indexes for table `event`
--
ALTER TABLE `event`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `fk_request_id_event` (`request_id`),
  ADD KEY `fk_event_status_id_event` (`event_status_id`),
  ADD KEY `fk_province_id_event` (`province_id`);

--
-- Indexes for table `event_log`
--
ALTER TABLE `event_log`
  ADD PRIMARY KEY (`event_log_id`),
  ADD KEY `fk_event_id_log_event` (`event_id`);

--
-- Indexes for table `event_media`
--
ALTER TABLE `event_media`
  ADD PRIMARY KEY (`event_media_id`),
  ADD KEY `fk_event_id_media` (`event_id`);

--
-- Indexes for table `event_participant`
--
ALTER TABLE `event_participant`
  ADD PRIMARY KEY (`event_participant`),
  ADD KEY `fk_event_id_event_participant` (`event_id`),
  ADD KEY `fk_user_id_event_participant` (`user_id`);

--
-- Indexes for table `event_report`
--
ALTER TABLE `event_report`
  ADD PRIMARY KEY (`event_report_id`),
  ADD KEY `fk_event_id_event_report` (`event_id`),
  ADD KEY `fk_submitted_by_event_report` (`submitted_by_id`);

--
-- Indexes for table `event_report_picture`
--
ALTER TABLE `event_report_picture`
  ADD PRIMARY KEY (`event_report_picture_id`),
  ADD KEY `fk_event_report_id` (`event_report_id`),
  ADD KEY `fk_uploaded_by_event_report_picture` (`uploaded_by`);

--
-- Indexes for table `event_status`
--
ALTER TABLE `event_status`
  ADD PRIMARY KEY (`event_status_id`),
  ADD KEY `fk_request_type_id` (`request_type_id`);

--
-- Indexes for table `event_template`
--
ALTER TABLE `event_template`
  ADD PRIMARY KEY (`event_template_id`),
  ADD KEY `fk_template_type_id_event_template` (`template_type_id`),
  ADD KEY `fk_event_template_publicity_post` (`publicity_post_id`);

--
-- Indexes for table `event_template_asset`
--
ALTER TABLE `event_template_asset`
  ADD PRIMARY KEY (`event_template_asset_id`),
  ADD KEY `fk_template_asset_media` (`event_media_id`),
  ADD KEY `fk_event_template_id_assets` (`event_template_id`);

--
-- Indexes for table `event_template_export`
--
ALTER TABLE `event_template_export`
  ADD PRIMARY KEY (`event_template_export_id`),
  ADD KEY `fk_export_template` (`event_template_id`);

--
-- Indexes for table `head_of_request`
--
ALTER TABLE `head_of_request`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_staff_id` (`staff_id`),
  ADD KEY `request_sub_type` (`request_sub_type_id`);

--
-- Indexes for table `history_image_page`
--
ALTER TABLE `history_image_page`
  ADD PRIMARY KEY (`history_image_page_id`);

--
-- Indexes for table `home_mission_img`
--
ALTER TABLE `home_mission_img`
  ADD PRIMARY KEY (`home_mission_img_id`);

--
-- Indexes for table `link_url`
--
ALTER TABLE `link_url`
  ADD PRIMARY KEY (`url_id`);

--
-- Indexes for table `main_type_of_device`
--
ALTER TABLE `main_type_of_device`
  ADD PRIMARY KEY (`main_type_of_device`);

--
-- Indexes for table `news`
--
ALTER TABLE `news`
  ADD PRIMARY KEY (`news_id`),
  ADD KEY `fk_writer` (`writer`);

--
-- Indexes for table `news_document`
--
ALTER TABLE `news_document`
  ADD PRIMARY KEY (`news_document_id`),
  ADD UNIQUE KEY `uniq_news_document` (`news_id`,`document_id`),
  ADD KEY `idx_document_id` (`document_id`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `fk_event_id` (`event_id`),
  ADD KEY `fk_notification_type_id` (`notification_type_id`),
  ADD KEY `fk_request_id_notification` (`request_id`);

--
-- Indexes for table `notification_type`
--
ALTER TABLE `notification_type`
  ADD PRIMARY KEY (`notification_type_id`);

--
-- Indexes for table `notification_type_staff`
--
ALTER TABLE `notification_type_staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_type_user` (`notification_type_id`,`user_id`),
  ADD KEY `fk_nts_user` (`user_id`);

--
-- Indexes for table `organization`
--
ALTER TABLE `organization`
  ADD PRIMARY KEY (`organization_id`),
  ADD KEY `fk_province` (`province_id`),
  ADD KEY `fk_organization_type` (`organization_type_id`);

--
-- Indexes for table `organization_type`
--
ALTER TABLE `organization_type`
  ADD PRIMARY KEY (`organization_type_id`);

--
-- Indexes for table `person`
--
ALTER TABLE `person`
  ADD PRIMARY KEY (`person_id`),
  ADD KEY `fk_person_user_id` (`person_user_id`),
  ADD KEY `fk_person_prefix_id` (`person_prefix_id`),
  ADD KEY `fk_department_id` (`department_id`),
  ADD KEY `fk_position_title_person` (`position_title_id`),
  ADD KEY `fk_organization_id_person` (`organization_id`);

--
-- Indexes for table `person_prefix`
--
ALTER TABLE `person_prefix`
  ADD PRIMARY KEY (`person_prefix_id`);

--
-- Indexes for table `position_title`
--
ALTER TABLE `position_title`
  ADD PRIMARY KEY (`position_title_id`),
  ADD KEY `fk_department_position_title` (`department_id`),
  ADD KEY `fk_organization_id_position_title` (`organization_id`);

--
-- Indexes for table `province`
--
ALTER TABLE `province`
  ADD PRIMARY KEY (`province_id`);

--
-- Indexes for table `publicity_post`
--
ALTER TABLE `publicity_post`
  ADD PRIMARY KEY (`publicity_post_id`),
  ADD KEY `fk_event_id_publicity_post` (`event_id`),
  ADD KEY `fk_create_by_publicity_post` (`create_by`);

--
-- Indexes for table `publicity_post_media`
--
ALTER TABLE `publicity_post_media`
  ADD PRIMARY KEY (`publicity_post_media_id`),
  ADD UNIQUE KEY `uq_ppm_post_media` (`post_id`,`event_media_id`),
  ADD KEY `idx_ppm_post_id` (`post_id`),
  ADD KEY `idx_ppm_event_media_id` (`event_media_id`),
  ADD KEY `idx_ppm_post_sort` (`post_id`,`sort_order`);

--
-- Indexes for table `request`
--
ALTER TABLE `request`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `fk_requester_id` (`requester_id`),
  ADD KEY `fk_head_of_request_id` (`head_of_request_id`),
  ADD KEY `fk_approve_channel_id` (`approve_channel_id`),
  ADD KEY `fk_current_status_id` (`current_status_id`),
  ADD KEY `fk_request_type_request` (`request_type`),
  ADD KEY `fk_request_subtype_request` (`request_sub_type`),
  ADD KEY `fk_device_id` (`device_id`),
  ADD KEY `fk_urgency_id` (`urgency_id`),
  ADD KEY `fk_province_id_request` (`province_id`),
  ADD KEY `fk_approve_by_id` (`approve_by_id`);

--
-- Indexes for table `request_attachment`
--
ALTER TABLE `request_attachment`
  ADD PRIMARY KEY (`request_attachment_id`),
  ADD KEY `fk_request_id` (`request_id`);

--
-- Indexes for table `request_status`
--
ALTER TABLE `request_status`
  ADD PRIMARY KEY (`status_id`),
  ADD KEY `fk_request_type` (`request_type_id`);

--
-- Indexes for table `request_sub_type`
--
ALTER TABLE `request_sub_type`
  ADD PRIMARY KEY (`request_sub_type_id`),
  ADD KEY `fk_subtype_of` (`subtype_of`);

--
-- Indexes for table `request_type`
--
ALTER TABLE `request_type`
  ADD PRIMARY KEY (`request_type_id`);

--
-- Indexes for table `site_diractor`
--
ALTER TABLE `site_diractor`
  ADD PRIMARY KEY (`diractor_id`);

--
-- Indexes for table `site_mission`
--
ALTER TABLE `site_mission`
  ADD PRIMARY KEY (`site_mission_id`);

--
-- Indexes for table `site_structure`
--
ALTER TABLE `site_structure`
  ADD PRIMARY KEY (`site_structure`),
  ADD KEY `fk_structure_prefix` (`prefix_person_id`),
  ADD KEY `fk_structure_department` (`department_id`),
  ADD KEY `fk_structure_position` (`position_id`);

--
-- Indexes for table `template_type`
--
ALTER TABLE `template_type`
  ADD PRIMARY KEY (`template_type_id`);

--
-- Indexes for table `type_of_device`
--
ALTER TABLE `type_of_device`
  ADD PRIMARY KEY (`type_of_device_id`);

--
-- Indexes for table `urgency`
--
ALTER TABLE `urgency`
  ADD PRIMARY KEY (`urgency_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `fk_user_role` (`user_role_id`);

--
-- Indexes for table `user_notification_channel`
--
ALTER TABLE `user_notification_channel`
  ADD PRIMARY KEY (`user_notification_channel_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `channel_id` (`channel`);

--
-- Indexes for table `user_role`
--
ALTER TABLE `user_role`
  ADD PRIMARY KEY (`user_role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity`
--
ALTER TABLE `activity`
  MODIFY `activity_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `banner`
--
ALTER TABLE `banner`
  MODIFY `banner_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `channel`
--
ALTER TABLE `channel`
  MODIFY `channel_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `contact_info`
--
ALTER TABLE `contact_info`
  MODIFY `contact_info_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `department`
--
ALTER TABLE `department`
  MODIFY `department_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `device`
--
ALTER TABLE `device`
  MODIFY `device_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=94;

--
-- AUTO_INCREMENT for table `document`
--
ALTER TABLE `document`
  MODIFY `document_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `event`
--
ALTER TABLE `event`
  MODIFY `event_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `event_log`
--
ALTER TABLE `event_log`
  MODIFY `event_log_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=75;

--
-- AUTO_INCREMENT for table `event_media`
--
ALTER TABLE `event_media`
  MODIFY `event_media_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `event_participant`
--
ALTER TABLE `event_participant`
  MODIFY `event_participant` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `event_report`
--
ALTER TABLE `event_report`
  MODIFY `event_report_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `event_report_picture`
--
ALTER TABLE `event_report_picture`
  MODIFY `event_report_picture_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `event_status`
--
ALTER TABLE `event_status`
  MODIFY `event_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `event_template`
--
ALTER TABLE `event_template`
  MODIFY `event_template_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `event_template_asset`
--
ALTER TABLE `event_template_asset`
  MODIFY `event_template_asset_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `event_template_export`
--
ALTER TABLE `event_template_export`
  MODIFY `event_template_export_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `head_of_request`
--
ALTER TABLE `head_of_request`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `history_image_page`
--
ALTER TABLE `history_image_page`
  MODIFY `history_image_page_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `home_mission_img`
--
ALTER TABLE `home_mission_img`
  MODIFY `home_mission_img_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `link_url`
--
ALTER TABLE `link_url`
  MODIFY `url_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `main_type_of_device`
--
ALTER TABLE `main_type_of_device`
  MODIFY `main_type_of_device` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `news`
--
ALTER TABLE `news`
  MODIFY `news_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `news_document`
--
ALTER TABLE `news_document`
  MODIFY `news_document_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `notification_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

--
-- AUTO_INCREMENT for table `notification_type`
--
ALTER TABLE `notification_type`
  MODIFY `notification_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `notification_type_staff`
--
ALTER TABLE `notification_type_staff`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `organization`
--
ALTER TABLE `organization`
  MODIFY `organization_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `organization_type`
--
ALTER TABLE `organization_type`
  MODIFY `organization_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `person`
--
ALTER TABLE `person`
  MODIFY `person_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `person_prefix`
--
ALTER TABLE `person_prefix`
  MODIFY `person_prefix_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `position_title`
--
ALTER TABLE `position_title`
  MODIFY `position_title_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `province`
--
ALTER TABLE `province`
  MODIFY `province_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `publicity_post`
--
ALTER TABLE `publicity_post`
  MODIFY `publicity_post_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `publicity_post_media`
--
ALTER TABLE `publicity_post_media`
  MODIFY `publicity_post_media_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `request`
--
ALTER TABLE `request`
  MODIFY `request_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `request_attachment`
--
ALTER TABLE `request_attachment`
  MODIFY `request_attachment_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `request_status`
--
ALTER TABLE `request_status`
  MODIFY `status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `request_sub_type`
--
ALTER TABLE `request_sub_type`
  MODIFY `request_sub_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `request_type`
--
ALTER TABLE `request_type`
  MODIFY `request_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `site_diractor`
--
ALTER TABLE `site_diractor`
  MODIFY `diractor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `site_mission`
--
ALTER TABLE `site_mission`
  MODIFY `site_mission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `site_structure`
--
ALTER TABLE `site_structure`
  MODIFY `site_structure` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `template_type`
--
ALTER TABLE `template_type`
  MODIFY `template_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `type_of_device`
--
ALTER TABLE `type_of_device`
  MODIFY `type_of_device_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `urgency`
--
ALTER TABLE `urgency`
  MODIFY `urgency_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `user_notification_channel`
--
ALTER TABLE `user_notification_channel`
  MODIFY `user_notification_channel_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `user_role`
--
ALTER TABLE `user_role`
  MODIFY `user_role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity`
--
ALTER TABLE `activity`
  ADD CONSTRAINT `fk_publicity_post_id` FOREIGN KEY (`publicuty_post_id`) REFERENCES `publicity_post` (`publicity_post_id`);

--
-- Constraints for table `banner`
--
ALTER TABLE `banner`
  ADD CONSTRAINT `fk_create_by_banner` FOREIGN KEY (`create_by`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_source_activity_id` FOREIGN KEY (`source_activity_id`) REFERENCES `activity` (`activity_id`),
  ADD CONSTRAINT `fk_source_news_id_banner` FOREIGN KEY (`source_news_id`) REFERENCES `news` (`news_id`);

--
-- Constraints for table `contact_info`
--
ALTER TABLE `contact_info`
  ADD CONSTRAINT `fk_organization_id_contect_info` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`organization_id`);

--
-- Constraints for table `department`
--
ALTER TABLE `department`
  ADD CONSTRAINT `fk_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`organization_id`);

--
-- Constraints for table `device`
--
ALTER TABLE `device`
  ADD CONSTRAINT `fk_contact_info` FOREIGN KEY (`contact_info_id`) REFERENCES `contact_info` (`contact_info_id`),
  ADD CONSTRAINT `fk_main_type_of_device` FOREIGN KEY (`main_type_of_device_id`) REFERENCES `main_type_of_device` (`main_type_of_device`),
  ADD CONSTRAINT `fk_type_of_device` FOREIGN KEY (`type_of_device_id`) REFERENCES `type_of_device` (`type_of_device_id`);

--
-- Constraints for table `event`
--
ALTER TABLE `event`
  ADD CONSTRAINT `fk_event_status_id_event` FOREIGN KEY (`event_status_id`) REFERENCES `event_status` (`event_status_id`),
  ADD CONSTRAINT `fk_province_id_event` FOREIGN KEY (`province_id`) REFERENCES `province` (`province_id`),
  ADD CONSTRAINT `fk_request_id_event` FOREIGN KEY (`request_id`) REFERENCES `request` (`request_id`);

--
-- Constraints for table `event_log`
--
ALTER TABLE `event_log`
  ADD CONSTRAINT `fk_event_id_log_event` FOREIGN KEY (`event_id`) REFERENCES `event` (`event_id`);

--
-- Constraints for table `event_media`
--
ALTER TABLE `event_media`
  ADD CONSTRAINT `fk_event_id_media` FOREIGN KEY (`event_id`) REFERENCES `event` (`event_id`);

--
-- Constraints for table `event_participant`
--
ALTER TABLE `event_participant`
  ADD CONSTRAINT `fk_event_id_event_participant` FOREIGN KEY (`event_id`) REFERENCES `event` (`event_id`),
  ADD CONSTRAINT `fk_user_id_event_participant` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `event_report`
--
ALTER TABLE `event_report`
  ADD CONSTRAINT `fk_event_id_event_report` FOREIGN KEY (`event_id`) REFERENCES `event` (`event_id`),
  ADD CONSTRAINT `fk_submitted_by_event_report` FOREIGN KEY (`submitted_by_id`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `event_report_picture`
--
ALTER TABLE `event_report_picture`
  ADD CONSTRAINT `fk_event_report_id` FOREIGN KEY (`event_report_id`) REFERENCES `event_report` (`event_report_id`),
  ADD CONSTRAINT `fk_uploaded_by_event_report_picture` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `event_status`
--
ALTER TABLE `event_status`
  ADD CONSTRAINT `fk_request_type_id` FOREIGN KEY (`request_type_id`) REFERENCES `request_type` (`request_type_id`);

--
-- Constraints for table `event_template`
--
ALTER TABLE `event_template`
  ADD CONSTRAINT `fk_event_template_publicity_post` FOREIGN KEY (`publicity_post_id`) REFERENCES `publicity_post` (`publicity_post_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_template_type_id_event_template` FOREIGN KEY (`template_type_id`) REFERENCES `template_type` (`template_type_id`);

--
-- Constraints for table `event_template_asset`
--
ALTER TABLE `event_template_asset`
  ADD CONSTRAINT `fk_event_template_id_assets` FOREIGN KEY (`event_template_id`) REFERENCES `event_template` (`event_template_id`),
  ADD CONSTRAINT `fk_template_asset_media` FOREIGN KEY (`event_media_id`) REFERENCES `event_media` (`event_media_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `event_template_export`
--
ALTER TABLE `event_template_export`
  ADD CONSTRAINT `fk_export_template` FOREIGN KEY (`event_template_id`) REFERENCES `event_template` (`event_template_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `head_of_request`
--
ALTER TABLE `head_of_request`
  ADD CONSTRAINT `fk_staff_id` FOREIGN KEY (`staff_id`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `request_sub_type` FOREIGN KEY (`request_sub_type_id`) REFERENCES `request_sub_type` (`request_sub_type_id`);

--
-- Constraints for table `news`
--
ALTER TABLE `news`
  ADD CONSTRAINT `fk_writer` FOREIGN KEY (`writer`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `fk_event_id` FOREIGN KEY (`event_id`) REFERENCES `event` (`event_id`),
  ADD CONSTRAINT `fk_notification_type_id` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_type` (`notification_type_id`),
  ADD CONSTRAINT `fk_request_id_notification` FOREIGN KEY (`request_id`) REFERENCES `request` (`request_id`);

--
-- Constraints for table `notification_type_staff`
--
ALTER TABLE `notification_type_staff`
  ADD CONSTRAINT `fk_nts_type` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_type` (`notification_type_id`),
  ADD CONSTRAINT `fk_nts_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `organization`
--
ALTER TABLE `organization`
  ADD CONSTRAINT `fk_organization_type` FOREIGN KEY (`organization_type_id`) REFERENCES `organization_type` (`organization_type_id`),
  ADD CONSTRAINT `fk_province` FOREIGN KEY (`province_id`) REFERENCES `province` (`province_id`);

--
-- Constraints for table `person`
--
ALTER TABLE `person`
  ADD CONSTRAINT `fk_department_id` FOREIGN KEY (`department_id`) REFERENCES `department` (`department_id`),
  ADD CONSTRAINT `fk_organization_id_person` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`organization_id`),
  ADD CONSTRAINT `fk_person_prefix_id` FOREIGN KEY (`person_prefix_id`) REFERENCES `person_prefix` (`person_prefix_id`),
  ADD CONSTRAINT `fk_person_user_id` FOREIGN KEY (`person_user_id`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_position_title_person` FOREIGN KEY (`position_title_id`) REFERENCES `position_title` (`position_title_id`);

--
-- Constraints for table `position_title`
--
ALTER TABLE `position_title`
  ADD CONSTRAINT `fk_department_position_title` FOREIGN KEY (`department_id`) REFERENCES `department` (`department_id`),
  ADD CONSTRAINT `fk_organization_id_position_title` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`organization_id`);

--
-- Constraints for table `publicity_post`
--
ALTER TABLE `publicity_post`
  ADD CONSTRAINT `fk_create_by_publicity_post` FOREIGN KEY (`create_by`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_event_id_publicity_post` FOREIGN KEY (`event_id`) REFERENCES `event` (`event_id`);

--
-- Constraints for table `publicity_post_media`
--
ALTER TABLE `publicity_post_media`
  ADD CONSTRAINT `fk_ppm_event_media_id` FOREIGN KEY (`event_media_id`) REFERENCES `event_media` (`event_media_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ppm_post_id` FOREIGN KEY (`post_id`) REFERENCES `publicity_post` (`publicity_post_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `request`
--
ALTER TABLE `request`
  ADD CONSTRAINT `fk_approve_by_id` FOREIGN KEY (`approve_by_id`) REFERENCES `notification_type_staff` (`id`),
  ADD CONSTRAINT `fk_approve_channel_id` FOREIGN KEY (`approve_channel_id`) REFERENCES `channel` (`channel_id`),
  ADD CONSTRAINT `fk_current_status_id` FOREIGN KEY (`current_status_id`) REFERENCES `request_status` (`status_id`),
  ADD CONSTRAINT `fk_device_id` FOREIGN KEY (`device_id`) REFERENCES `device` (`device_id`),
  ADD CONSTRAINT `fk_head_of_request_id` FOREIGN KEY (`head_of_request_id`) REFERENCES `head_of_request` (`id`),
  ADD CONSTRAINT `fk_province_id_request` FOREIGN KEY (`province_id`) REFERENCES `province` (`province_id`),
  ADD CONSTRAINT `fk_request_subtype_request` FOREIGN KEY (`request_sub_type`) REFERENCES `request_sub_type` (`request_sub_type_id`),
  ADD CONSTRAINT `fk_request_type_request` FOREIGN KEY (`request_type`) REFERENCES `request_type` (`request_type_id`),
  ADD CONSTRAINT `fk_requester_id` FOREIGN KEY (`requester_id`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `fk_urgency_id` FOREIGN KEY (`urgency_id`) REFERENCES `urgency` (`urgency_id`);

--
-- Constraints for table `request_attachment`
--
ALTER TABLE `request_attachment`
  ADD CONSTRAINT `fk_request_id` FOREIGN KEY (`request_id`) REFERENCES `request` (`request_id`);

--
-- Constraints for table `request_status`
--
ALTER TABLE `request_status`
  ADD CONSTRAINT `fk_request_type` FOREIGN KEY (`request_type_id`) REFERENCES `request_type` (`request_type_id`);

--
-- Constraints for table `request_sub_type`
--
ALTER TABLE `request_sub_type`
  ADD CONSTRAINT `fk_subtype_of` FOREIGN KEY (`subtype_of`) REFERENCES `request_type` (`request_type_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `site_structure`
--
ALTER TABLE `site_structure`
  ADD CONSTRAINT `fk_structure_department` FOREIGN KEY (`department_id`) REFERENCES `department` (`department_id`),
  ADD CONSTRAINT `fk_structure_position` FOREIGN KEY (`position_id`) REFERENCES `position_title` (`position_title_id`),
  ADD CONSTRAINT `fk_structure_prefix` FOREIGN KEY (`prefix_person_id`) REFERENCES `person_prefix` (`person_prefix_id`);

--
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `fk_user_role` FOREIGN KEY (`user_role_id`) REFERENCES `user_role` (`user_role_id`);

--
-- Constraints for table `user_notification_channel`
--
ALTER TABLE `user_notification_channel`
  ADD CONSTRAINT `channel_id` FOREIGN KEY (`channel`) REFERENCES `channel` (`channel_id`),
  ADD CONSTRAINT `user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
