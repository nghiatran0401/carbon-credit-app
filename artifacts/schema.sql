-- MySQL dump 10.13  Distrib 9.2.0, for macos15.2 (arm64)
--
-- Host: localhost    Database: carbon_credit
-- ------------------------------------------------------
-- Server version	9.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Bookmark`
--

DROP TABLE IF EXISTS `Bookmark`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Bookmark` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `forestId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Bookmark_userId_fkey` (`userId`),
  KEY `Bookmark_forestId_fkey` (`forestId`),
  CONSTRAINT `Bookmark_forestId_fkey` FOREIGN KEY (`forestId`) REFERENCES `Forest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Bookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CarbonCredit`
--

DROP TABLE IF EXISTS `CarbonCredit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CarbonCredit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `forestId` int NOT NULL,
  `vintage` int NOT NULL,
  `certification` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `totalCredits` int NOT NULL,
  `availableCredits` int NOT NULL,
  `pricePerCredit` double NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `symbol` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tCO₂',
  `retiredCredits` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `CarbonCredit_forestId_fkey` (`forestId`),
  CONSTRAINT `CarbonCredit_forestId_fkey` FOREIGN KEY (`forestId`) REFERENCES `Forest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CartItem`
--

DROP TABLE IF EXISTS `CartItem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CartItem` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `carbonCreditId` int NOT NULL,
  `quantity` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `addedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `CartItem_userId_carbonCreditId_key` (`userId`,`carbonCreditId`),
  KEY `CartItem_carbonCreditId_fkey` (`carbonCreditId`),
  CONSTRAINT `CartItem_carbonCreditId_fkey` FOREIGN KEY (`carbonCreditId`) REFERENCES `CarbonCredit` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CartItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ExchangeRate`
--

DROP TABLE IF EXISTS `ExchangeRate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ExchangeRate` (
  `id` int NOT NULL AUTO_INCREMENT,
  `carbonCreditId` int NOT NULL,
  `rate` double NOT NULL,
  `currency` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `effectiveFrom` datetime(3) NOT NULL,
  `effectiveTo` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ExchangeRate_carbonCreditId_fkey` (`carbonCreditId`),
  CONSTRAINT `ExchangeRate_carbonCreditId_fkey` FOREIGN KEY (`carbonCreditId`) REFERENCES `CarbonCredit` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Forest`
--

DROP TABLE IF EXISTS `Forest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Forest` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `area` double NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastUpdated` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Order`
--

DROP TABLE IF EXISTS `Order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Order` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `totalPrice` double NOT NULL,
  `totalCredits` int NOT NULL DEFAULT '0',
  `currency` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `totalUsd` double NOT NULL DEFAULT '0',
  `paymentIntentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paidAt` datetime(3) DEFAULT NULL,
  `shippingAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripeSessionId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failureReason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Order_stripeSessionId_key` (`stripeSessionId`),
  KEY `Order_stripeSessionId_idx` (`stripeSessionId`),
  KEY `Order_userId_fkey` (`userId`),
  CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OrderHistory`
--

DROP TABLE IF EXISTS `OrderHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OrderHistory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int NOT NULL,
  `event` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `OrderHistory_orderId_fkey` (`orderId`),
  CONSTRAINT `OrderHistory_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OrderItem`
--

DROP TABLE IF EXISTS `OrderItem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OrderItem` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int NOT NULL,
  `carbonCreditId` int NOT NULL,
  `quantity` int NOT NULL,
  `pricePerCredit` double NOT NULL,
  `subtotal` double NOT NULL,
  `usdAmount` double NOT NULL DEFAULT '0',
  `exchangeRateId` int DEFAULT NULL,
  `retired` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `OrderItem_exchangeRateId_fkey` (`exchangeRateId`),
  KEY `OrderItem_orderId_fkey` (`orderId`),
  KEY `OrderItem_carbonCreditId_fkey` (`carbonCreditId`),
  CONSTRAINT `OrderItem_carbonCreditId_fkey` FOREIGN KEY (`carbonCreditId`) REFERENCES `CarbonCredit` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `OrderItem_exchangeRateId_fkey` FOREIGN KEY (`exchangeRateId`) REFERENCES `ExchangeRate` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Payment`
--

DROP TABLE IF EXISTS `Payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Payment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int NOT NULL,
  `stripeSessionId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripePaymentIntentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` double NOT NULL,
  `currency` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `failureReason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `method` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Payment_stripeSessionId_key` (`stripeSessionId`),
  KEY `Payment_orderId_fkey` (`orderId`),
  CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `firstName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `emailVerified` tinyint(1) NOT NULL DEFAULT '0',
  `stripeCustomerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-22  1:05:19
