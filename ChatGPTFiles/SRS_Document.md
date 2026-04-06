# **Software Requirements Specification (SRS)**

## **Boat & Yacht Booking, Fishing Marketplace, and Competition App**

## 1. Introduction

### 1.1 Purpose

This document defines the functional and non-functional requirements for
a mobile and web application that provides: - Boat & yacht trip/fishing
appointment bookings\
- A marketplace for fishing equipment\
- Registration for fishing competitions

### 1.2 Scope

The application will serve: - Boat/Yacht Owners\
- Marketplace Vendors\
- Regular Customers/Users\
- Competition Organizers

### 1.3 Definitions

-   Owner: User who lists a boat or yacht for trips.\
-   Vendor: User selling fishing-related products.\
-   Customer: User booking trips, shopping, or joining competitions.\
-   Admin: System management role.

## 2. System Overview

The system is a multi-module platform with: 1. Booking Module\
2. Marketplace Module\
3. Competition Module\
4. Admin Portal

## 3. Functional Requirements

### 3.1 User Management

#### 3.1.1 Registration & Login

-   Sign up using email, phone OTP, Google/Apple\
-   Choose roles (Customer/Owner/Vendor)

#### 3.1.2 Profile Management

-   Update personal and role-based info

### 3.2 Boat & Yacht Booking Module

#### 3.2.1 Owner Features

-   Create boat profile, upload media, set pricing and availability\
-   Manage bookings and chat with customers

#### 3.2.2 Customer Features

-   Browse boats, book trips, pay, and chat with owners

#### 3.2.3 Booking Flow

1.  Customer selects boat\
2.  Chooses date/time\
3.  Pay\
4.  Owner approves/rejects

### 3.3 Marketplace Module

#### 3.3.1 Vendor Features

-   Create store, upload products, manage stock and orders

#### 3.3.2 Customer Features

-   Browse items, add to cart, checkout

### 3.4 Fishing Competition Module

#### 3.4.1 Organizer Features

-   Create competitions, approve participants

#### 3.4.2 Participant Features

-   Browse, apply, pay entry fees

### 3.5 Payments Module

-   Cards, mobile wallets, cash-on-delivery\
-   Refund & transaction history

### 3.6 Notifications

-   Push, email, SMS

### 3.7 Admin Portal

-   Manage approvals, reports, categories, promotions

## 4. Non-Functional Requirements

-   Performance, Security, Availability, Scalability, Usability

## 5. System Architecture

-   Flutter/React Native, Node/Laravel/Django, PostgreSQL/MySQL

## 6. API Requirements

-   Auth APIs\
-   Boat APIs\
-   Marketplace APIs\
-   Competition APIs\
-   Admin APIs

## 7. Database Entities

-   Users, Boats, Products, Orders, Competitions, Transactions, etc.

## 8. Constraints

-   Arabic support\
-   Egyptian payment compliance

## 9. Future Enhancements

-   Live GPS, AI recommendations, loyalty points

## 10. Approval

  Role            Name   Signature   Date
  --------------- ------ ----------- ------
  Product Owner                      
  Tech Lead                          
  QA Lead                            
