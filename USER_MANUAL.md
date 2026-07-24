# CP Companion – User Manual & Practice Guide

Welcome to **CP Companion**! This user manual provides step-by-step guidance on how to use every feature in the application to organize, review, and analyze your competitive programming practice.

---

## 📖 Table of Contents

1. [Getting Started & Account Creation](#1-getting-started--account-creation)
2. [Overview Dashboard](#2-overview-dashboard)
3. [Managing Your Problem Library](#3-managing-your-problem-library)
4. [Using the SM-2 Revision Queue](#4-using-the-sm-2-revision-queue)
5. [Running Virtual Contests](#5-running-virtual-contests)
6. [Analytics & Progress Tracking](#6-analytics--progress-tracking)
7. [Trie Search & Autocomplete](#7-trie-search--autocomplete)
8. [Importing & Exporting Data](#8-importing--exporting-data)
9. [Account Settings & Customization](#9-account-settings--customization)

---

## 1. Getting Started & Account Creation

### **Creating an Account**
1. Open the application in your web browser (e.g. `http://127.0.0.1:3000/`).
2. On the login screen, click the **Create account** tab.
3. Enter your **Full name**, **Email address**, and a **Password** (at least 6 characters).
4. Click **Create account**. You will be logged in automatically.

### **Signing In**
1. If you already have an account, enter your **Email** and **Password** under the **Sign in** tab.
2. Click **Sign in**. Your session token will be saved securely.

---

## 2. Overview Dashboard

The **Overview** page is your daily launchpad. It provides an immediate snapshot of your practice momentum:

- **Problems Solved Stat**: Total problems solved out of your overall library count.
- **Weekly Goal Progress**: Shows how many problems you have solved this week toward your weekly goal (e.g. `7/10`).
- **Streak Tracker**: Displays your current active daily streak and all-time best streak.
- **Weekly Momentum Chart**: A 7-day bar chart showing problems solved per day over the past week.
- **Next Up Banner**: Prompts you when problems are due for revision in your SM-2 queue.
- **Focus Topics**: Visual bars representing the topics you practice most frequently.

---

## 3. Managing Your Problem Library

Navigate to **Problem Library** (`/problems`) to view and manage all your coding problems.

### **Adding a Problem**
1. Click the **+ Add problem** button at the top right.
2. Fill out the problem details:
   - **Title**: Problem name (e.g., *Two Sum*, *Lowest Common Ancestor*).
   - **Platform**: Select LeetCode, Codeforces, AtCoder, CodeChef, HackerRank, GeeksForGeeks, CSES, or type a custom platform name.
   - **Difficulty**: Choose `Easy`, `Medium`, or `Hard`.
   - **Status**: Set to `Unsolved` or `Solved`.
   - **Topics**: Enter comma-separated topics (e.g., `Binary Search, Array`).
   - **Company Tags**: Enter company names (e.g., `Google, Meta, Amazon`).
   - **Solution Link**: Paste an optional URL to the problem or your solution code.
3. Click **Add to library**.

### **Filtering & Sorting Problems**
- **Search Bar**: Type any title, topic, company tag, or platform.
- **Difficulty Filter**: Filter by `Easy`, `Medium`, or `Hard`.
- **Status Filter**: View only `Solved` or `Unsolved` problems.
- **Favorites & Bookmarks**: Toggle the **Favorites** (❤️) or **Bookmarks** (🔖) buttons to quickly access flagged problems.

### **Problem Actions**
Hover over any problem row to access quick action buttons:
- **Checkmark (✔)**: Mark problem as Solved or Unsolved.
- **Sticky Note (📝)**: Open the markdown notes modal to write problem notes, hints, or code approaches.
- **Bookmark (🔖)**: Bookmark problem for later.
- **Pencil (✏️)**: Edit problem details.
- **Trash (🗑️)**: Delete problem from library.
- **External Link (↗)**: Open the problem URL in a new browser tab.

---

## 4. Using the SM-2 Revision Queue

Navigate to **Revision Queue** (`/revision`) to access smart spaced repetition powered by the SuperMemo SM-2 algorithm.

### **How the Revision Queue Works**
- When you solve a problem, it is automatically added to your revision queue.
- The queue sorts problems using a **MinHeap Priority Queue** based on due date, difficulty, and previous attempt history.

### **Completing a Review**
1. Click **Review now** next to any problem due for revision.
2. Attempt the problem or recall your solution pattern.
3. Rate your recall performance using the **0–5 Quality Rating buttons**:
   - **0 (Blackout)**: Complete memory loss; resets interval to 1 day.
   - **1 (Wrong)**: Incorrect answer.
   - **2 (Forgot)**: Incorrect, but answer seemed familiar.
   - **3 (Hard)**: Correct answer after significant difficulty.
   - **4 (Good)**: Correct answer after a short hesitation.
   - **5 (Perfect)**: Instant, perfect recall.
4. The algorithm automatically calculates and schedules the next review date!

---

## 5. Running Virtual Contests

Navigate to **Virtual Contest** (`/contest`) to simulate timed competitive programming sessions.

### **Starting a Quick Random Contest**
1. Click **Quick random contest**.
2. The system uses a **Greedy Selection Algorithm** to pick 4 difficulty-balanced problems from your library.
3. The timer begins immediately.

### **Configuring a Custom Contest**
1. Click **Custom contest** or **+ New contest**.
2. Select:
   - **Contest Name**: e.g., *Weekend Warmup*
   - **Duration**: 30, 60, 90, or 120 minutes.
   - **Number of Problems**: 2 to 6 problems.
   - **Difficulty Mix**: `Mixed (Balanced)`, `Easy only`, `Medium only`, or `Hard only`.
3. Click **Start contest**.

### **During the Contest**
- Problems are labeled `A`, `B`, `C`, `D`, etc.
- A live countdown timer shows remaining time (turns red when under 5 minutes).
- As you solve each problem, click **Mark solved**.
- Click **End contest** when finished to view your final score and completion time metrics.

---

## 6. Analytics & Progress Tracking

Navigate to **Analytics** (`/analytics`) to explore data-driven performance metrics:

- **365-Day Activity Heatmap**: GitHub-style grid showing daily problem-solving density over the past year.
- **Monthly Progress Bar Chart**: Number of problems solved per month.
- **Difficulty Breakdown Pie Chart**: Proportion of Easy, Medium, and Hard problems in your library.
- **Topic Analysis Chart**: Horizontal bar chart comparing total problems vs. solved problems across your top topics.
- **Platform Distribution**: Chart showing where you practice most frequently.

---

## 7. Trie Search & Autocomplete

### **Opening Search**
Press **⌘ K** (Mac) or **Ctrl + K** (Windows), or click **Quick search** in the top navigation bar.

### **Using Autocomplete**
- Start typing any word or prefix (e.g. `Tree`, `Graph`, `Max`).
- The **Client-side Trie** instantly suggests matching problem titles in real time.
- Click any suggestion to immediately navigate to the search results.

---

## 8. Importing & Exporting Data

Navigate to **Settings** (`/settings`) to manage your data files:

### **Exporting Data**
- Click **Export JSON** to download your complete library as a structured `.json` file.
- Click **Export CSV** to download your library as a spreadsheet-compatible `.csv` file.

### **Importing Data**
1. Click **Import data** and select a `.json` or `.csv` file previously exported from CP Companion.
2. The importer automatically checks for duplicate problem titles and reports how many new problems were added.

---

## 9. Account Settings & Customization

Under **Settings** (`/settings`), you can:
- **Update Profile**: Change your display name, email, or weekly problem goal.
- **Toggle Theme**: Switch between **Dark Mode** and **Light Mode**.
- **Danger Zone**: Click **Reset all data** to erase your stored problems and history if you want a fresh start.

---

*Enjoy practicing with intent on CP Companion!*
