import subprocess
import threading
import sys
import os
import pyperclip
from datetime import datetime
from PyQt6.QtWidgets import (
    QApplication, QWidget, QTabWidget, QVBoxLayout, QHBoxLayout, 
    QLabel, QPushButton, QTableWidget, QTableWidgetItem, 
    QLineEdit, QMessageBox, QHeaderView, QFrame, QScrollArea, 
    QDialog, QFormLayout, QComboBox, QGridLayout
)
from PyQt6.QtCore import Qt
from supabase import create_client
from mail_health_tab import MailHealthTab
from team_atnc import AttendanceManager
from announcement_manager import AnnouncementManager
from announcement_admin_tab import AnnouncementAdminTab
from ui import MainWindow as TeamLeadsWindow
from admin_outlook_app import OutlookAdminApp
import zoneinfo

LOCAL_TIMEZONE = zoneinfo.ZoneInfo("Asia/Kolkata")

def get_time_boundaries():
    now_local = datetime.now(LOCAL_TIMEZONE)
    start_today_utc = (
        now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        .astimezone(zoneinfo.ZoneInfo("UTC"))
        .isoformat()
    )
    start_month_utc = (
        now_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        .astimezone(zoneinfo.ZoneInfo("UTC"))
        .isoformat()
    )
    return start_today_utc, start_month_utc

# ==========================================
# 1. SHARED CONFIGURATION (SINGLETON)
# ==========================================
# Using the Service Role Key globally to ensure all tabs have admin permissions
SUPABASE_URL = "https://kymifrlbbduoloviaybg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bWlmcmxiYmR1b2xvdmlheWJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjkxODA0OSwiZXhwIjoyMDY4NDk0MDQ5fQ.nfB1aJBRcC1i7peeWDpFzjMa-nO0D5esm4TnxB5e_bQ"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
MAX_SLOTS = 5 #

# ==========================================
# 2. DIALOGS (Imported from your originals)
# ==========================================

class TeamLeadsTab(TeamLeadsWindow):
    def __init__(self):
        super().__init__()

class AddAdminDialog(QDialog):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Add M365 Admin")
        self.setFixedWidth(350)
        layout = QFormLayout(self)
        self.code = QLineEdit()
        self.email = QLineEdit()
        self.cycle = QComboBox()
        self.cycle.addItems(["monthly", "yearly"])
        self.card = QLineEdit()
        layout.addRow("Admin Code", self.code)
        layout.addRow("Admin Email", self.email)
        layout.addRow("Billing Cycle", self.cycle)
        layout.addRow("Card Last 4", self.card)
        btn = QPushButton("Save Admin")
        btn.clicked.connect(self.save)
        layout.addWidget(btn)

    def save(self):
        supabase.table("m365_subscriptions").insert({
            "owner_code": self.code.text(),
            "owner_email": self.email.text(),
            "billing_cycle": self.cycle.currentText(),
            "card_last4": self.card.text(),
            "status": "active"
        }).execute()
        self.accept()

class ReassignDialog(QDialog):
    def __init__(self, admin_map, user_map):
        super().__init__()
        self.setWindowTitle("Reassign Account")
        self.setFixedWidth(300)
        layout = QVBoxLayout(self)
        self.admin_dd = QComboBox()
        self.employee_dd = QComboBox()
        for aid, aname in admin_map.items(): self.admin_dd.addItem(aname, aid)
        for uid, uname in user_map.items(): self.employee_dd.addItem(uname, uid)
        btn = QPushButton("Reassign")
        btn.clicked.connect(self.accept)
        layout.addWidget(QLabel("Admin"))
        layout.addWidget(self.admin_dd)
        layout.addWidget(QLabel("Employee"))
        layout.addWidget(self.employee_dd)
        layout.addWidget(btn)

# ==========================================
# 3. TAB 1: USER MANAGEMENT (admin.py)
# ==========================================

class UserManagementTab(QWidget):
    def __init__(self):
        super().__init__()
        self.layout = QVBoxLayout(self)
        
        search_layout = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search user by email...")
        search_btn = QPushButton("Search")
        search_btn.clicked.connect(self.search_user)
        search_layout.addWidget(self.search_input)
        search_layout.addWidget(search_btn)
        self.layout.addLayout(search_layout)

        self.table = QTableWidget()
        self.table.setColumnCount(7)
        self.table.setHorizontalHeaderLabels(["User ID", "Email", "Mails Today", "Mails Month", "Is Admin", "Machine ID", "Actions"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.layout.addWidget(self.table)

        btn_layout = QHBoxLayout()
        self.email_input = QLineEdit(); self.email_input.setPlaceholderText("New user email")
        self.password_input = QLineEdit(); self.password_input.setPlaceholderText("Password")
        create_btn = QPushButton("Create User")
        create_btn.clicked.connect(self.create_user)
        btn_layout.addWidget(self.email_input); btn_layout.addWidget(self.password_input); btn_layout.addWidget(create_btn)
        self.layout.addLayout(btn_layout)

        refresh_btn = QPushButton("Refresh Users")
        refresh_btn.clicked.connect(self.load_users)
        self.layout.addWidget(refresh_btn)
        self.load_users()

    def load_users(self):
        self.table.setRowCount(0)
        users = supabase.auth.admin.list_users()
        
        start_today_utc, start_month_utc = get_time_boundaries()

        for i, user in enumerate(users):
            user_id, email = user.id, user.email
            
            # Fetch profile & device
            prof = supabase.table("profiles").select("is_admin").eq("user_id", user_id).execute()
            is_admin = prof.data[0]["is_admin"] if prof.data else False
            dev = supabase.table("user_devices").select("machine_id").eq("user_id", user_id).execute()
            machine_id = dev.data[0]["machine_id"] if dev.data else "Not set"

            # Fetch mail counts from sent_mails
            today_res = (
                supabase.table("sent_mails")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .gte("sent_at", start_today_utc)
                .execute()
            )
            month_res = (
                supabase.table("sent_mails")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .gte("sent_at", start_month_utc)
                .execute()
            )

            today_count = today_res.count or 0
            month_count = month_res.count or 0

            # Populate row
            self.table.insertRow(i)
            self.table.setItem(i, 0, QTableWidgetItem(user_id))
            self.table.setItem(i, 1, QTableWidgetItem(email))
            self.table.setItem(i, 2, QTableWidgetItem(str(today_count)))
            self.table.setItem(i, 3, QTableWidgetItem(str(month_count)))
            self.table.setItem(i, 4, QTableWidgetItem("✅" if is_admin else "❌"))
            self.table.setItem(i, 5, QTableWidgetItem(machine_id))
            
            action_btn = QPushButton("Manage")
            action_btn.clicked.connect(lambda _, uid=user_id, em=email: self.manage_user(uid, em))
            self.table.setCellWidget(i, 6, action_btn)

    def search_user(self):
        email = self.search_input.text().strip()
        if not email: self.load_users(); return
        self.table.setRowCount(0)
        users = supabase.auth.admin.list_users() 
        results = [u for u in users if email.lower() in u.email.lower()]
        for i, user in enumerate(results):
            self.load_row(i, user)

    def create_user(self):
        email = self.email_input.text().strip()
        pw = self.password_input.text().strip()
        if not email or not pw: return
        try:
            new_user = supabase.auth.admin.create_user({"email": email, "password": pw, "email_confirmed_at": datetime.utcnow().isoformat()})
            supabase.table("profiles").insert({"user_id": new_user.user.id, "is_admin": False, "is_active": True}).execute()
            self.load_users()
        except Exception as e: QMessageBox.critical(self, "Error", str(e))

    def manage_user(self, user_id, email):
        msg = QMessageBox(self)
        msg.setWindowTitle("Manage User")
        msg.setText(f"Actions for:\n{email}")
        reset_btn = msg.addButton("Reset Machine ID", QMessageBox.ButtonRole.ActionRole)
        admin_btn = msg.addButton("Toggle Admin", QMessageBox.ButtonRole.ActionRole)
        disable_btn = msg.addButton("Toggle Disable", QMessageBox.ButtonRole.ActionRole)
        delete_btn = msg.addButton("Delete User", QMessageBox.ButtonRole.DestructiveRole)
        msg.addButton("Cancel", QMessageBox.ButtonRole.RejectRole)
        msg.exec()
        clicked = msg.clickedButton()

        if clicked == reset_btn:
            supabase.table("user_devices").delete().eq("user_id", user_id).execute()
            QMessageBox.information(self, "Done", "Machine ID reset")
        elif clicked == admin_btn:
            prof = supabase.table("profiles").select("is_admin").eq("user_id", user_id).single().execute()
            current = prof.data["is_admin"]
            supabase.table("profiles").update({"is_admin": not current}).eq("user_id", user_id).execute()
        elif clicked == disable_btn:
            # Full logic for banning/unbanning from original admin.py
            profile = supabase.table("profiles").select("is_active").eq("user_id", user_id).single().execute()
            is_active = profile.data["is_active"]
            if is_active:
                supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "999999h"})
                supabase.table("profiles").update({"is_active": False}).eq("user_id", user_id).execute()
            else:
                supabase.auth.admin.update_user_by_id(user_id, {"banned_until": None, "ban_duration": None})
                supabase.table("profiles").update({"is_active": True}).eq("user_id", user_id).execute()
        elif clicked == delete_btn:
            supabase.auth.admin.delete_user(user_id)
            supabase.table("profiles").delete().eq("user_id", user_id).execute()
        self.load_users()

# ==========================================
# 4. TAB 2: ADMIN OVERVIEW (Admin365.py)
# ==========================================

class AdminCard(QFrame): #
    def __init__(self, admin):
        super().__init__()
        self.admin = admin
        self.setFixedWidth(320)
        self.setStyleSheet("QFrame { border: 1px solid #dcdcdc; border-radius: 8px; padding: 12px; background: #ffffff; }")
        layout = QVBoxLayout(self)
        layout.addWidget(QLabel(f"<b>{self.admin['owner_code']}</b>"))
        layout.addWidget(QLabel(self.admin["owner_email"]))
        used = self.admin["used"]
        dots = " ".join(["●"] * used + ["○"] * (MAX_SLOTS - used))
        layout.addWidget(QLabel(f"Usage: {dots}   {used} / 5"))
        layout.addWidget(QLabel(f"Billing: {self.admin['billing_cycle']}"))
        layout.addWidget(QLabel(f"Renewal: {self.admin['renewal_date'] or '—'}"))
        layout.addWidget(QLabel(f"Card: **** {self.admin['card_last4']}"))
        view_btn = QPushButton("View Accounts")
        view_btn.setStyleSheet("margin-top:8px;")
        layout.addWidget(view_btn)

class AdminOverviewTab(QWidget):
    def __init__(self):
        super().__init__()
        self.build_ui()

    def build_ui(self):
        main = QVBoxLayout(self)
        header = QHBoxLayout()
        header.addWidget(QLabel("<h2>M365 Family – Admin Overview</h2>"))
        header.addStretch()
        refresh_btn = QPushButton("↻ Refresh")
        refresh_btn.clicked.connect(self.refresh)
        add_btn = QPushButton("+ Add Admin")
        add_btn.clicked.connect(self.add_admin)
        header.addWidget(refresh_btn); header.addWidget(add_btn)
        main.addLayout(header)

        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.container = QWidget()
        self.grid = QGridLayout(self.container)
        self.grid.setSpacing(15)
        self.scroll.setWidget(self.container)
        main.addWidget(self.scroll)
        self.refresh()

    def refresh(self):
        for i in reversed(range(self.grid.count())): 
            self.grid.itemAt(i).widget().setParent(None)
        admins = supabase.table("m365_subscriptions").select("*").eq("status", "active").execute().data
        for i, admin in enumerate(admins):
            count = supabase.table("m365_accounts").select("id", count="exact").eq("subscription_id", admin["id"]).execute().count
            admin["used"] = count or 0
            card = AdminCard(admin)
            self.grid.addWidget(card, i // 3, i % 3)

    def add_admin(self):
        dlg = AddAdminDialog()
        if dlg.exec(): self.refresh()

# ==========================================
# 5. TAB 3: ACCOUNTS MANAGER (Accounts.py)
# ==========================================

class M365AccountTab(QWidget):
    def __init__(self):
        super().__init__()
        self.admin_map = {}
        self.user_map = {}
        self.all_rows = []
        self.init_ui()

    def copy_table_as_is(self):
        if self.table.rowCount() == 0:
            QMessageBox.warning(self, "No Data", "Table is empty.")
            return

        headers = []
        for c in range(self.table.columnCount() - 1):  # exclude Actions column
            headers.append(self.table.horizontalHeaderItem(c).text())

        lines = ["\t".join(headers)]

        for r in range(self.table.rowCount()):
            row_data = []
            for c in range(self.table.columnCount() - 1):
                item = self.table.item(r, c)
                row_data.append(item.text() if item else "")
            lines.append("\t".join(row_data))

        pyperclip.copy("\n".join(lines))
        QMessageBox.information(
            self,
            "Copied",
            f"{self.table.rowCount()} row(s) copied exactly as shown."
        )


    def init_ui(self):
        main = QVBoxLayout(self)
        title = QLabel("Microsoft 365 Accounts")
        title.setStyleSheet("font-size:18px; font-weight:bold;")
        main.addWidget(title)

        top = QHBoxLayout()

        self.search = QLineEdit()
        self.search.setPlaceholderText("Search by email, admin, employee, status...")
        self.search.textChanged.connect(self.apply_filter)

        btn_copy_all = QPushButton("📋 Copy All")
        btn_copy_all.clicked.connect(self.copy_table_as_is)

        self.add_toggle = QPushButton("+ Add Account")
        self.add_toggle.clicked.connect(self.toggle_form)

        top.addWidget(self.search)
        top.addWidget(btn_copy_all)
        top.addWidget(self.add_toggle)
        main.addLayout(top)


        # Add Form (Hidden by default)
        self.form_frame = QFrame(); self.form_frame.setVisible(False)
        form = QHBoxLayout(self.form_frame)
        self.admin_dd = QComboBox(); self.employee_dd = QComboBox()
        self.email_input = QLineEdit(); self.password_input = QLineEdit()
        self.email_input.setPlaceholderText("Family ID Email"); self.password_input.setPlaceholderText("Password")
        add_btn = QPushButton("Add"); add_btn.clicked.connect(self.add_account)
        form.addWidget(QLabel("Admin")); form.addWidget(self.admin_dd)
        form.addWidget(QLabel("Employee")); form.addWidget(self.employee_dd)
        form.addWidget(self.email_input); form.addWidget(self.password_input); form.addWidget(add_btn)
        main.addWidget(self.form_frame)

        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["M365 Email", "Admin", "Employee", "Status", "Password", "Actions"])
        # Original Styling
        self.table.setAlternatingRowColors(True)
        self.table.setStyleSheet("QTableWidget { gridline-color: #e5e5e5; } QHeaderView::section { background-color: #f7f7f7; padding: 6px; font-weight: 600; }")
        main.addWidget(self.table)
        self.load_initial_data()

    def toggle_form(self): self.form_frame.setVisible(not self.form_frame.isVisible())

    def load_initial_data(self):
        # Admins
        admins = supabase.table("m365_subscriptions").select("id, owner_code").eq("status", "active").execute().data
        for a in admins: self.admin_map[a["id"]] = a["owner_code"]; self.admin_dd.addItem(a["owner_code"], a["id"])
        # Employees
        users = supabase.auth.admin.list_users()
        for u in users:
            name = (u.user_metadata or {}).get("full_name") or u.email
            self.user_map[u.id] = name; self.employee_dd.addItem(name, u.id)
        self.load_data()

    def load_data(self):
        self.all_rows = supabase.table("m365_accounts").select("*").execute().data or []
        self.render_table(self.all_rows)

    def render_table(self, rows):
        self.table.setRowCount(len(rows))
        for i, row in enumerate(rows):
            self.table.setItem(i, 0, QTableWidgetItem(row["email"]))
            self.table.setItem(i, 1, QTableWidgetItem(self.admin_map.get(row["subscription_id"], "-")))
            self.table.setItem(i, 2, QTableWidgetItem(self.user_map.get(row["user_id"], "Unassigned")))
            self.table.setItem(i, 3, QTableWidgetItem(row["status"]))
            self.table.setItem(i, 4, QTableWidgetItem(row.get("password", "")))
            
            # Actions buttons
            action_widget = QWidget(); actions = QHBoxLayout(action_widget); actions.setContentsMargins(0,0,0,0)
            btn_copy = QPushButton("📋"); btn_copy.setFixedWidth(30); btn_copy.clicked.connect(lambda _, r=row: self.copy_all(r))
            btn_save = QPushButton("✅"); btn_save.setFixedWidth(30); btn_save.clicked.connect(self.save_password)
            btn_edit = QPushButton("✏️"); btn_edit.setFixedWidth(30); btn_edit.clicked.connect(lambda _, r=row: self.edit_account(r))
            btn_release = QPushButton("🔓"); btn_release.setFixedWidth(30); btn_release.clicked.connect(lambda _, r=row: self.release_account(r))
            btn_reassign = QPushButton("🔁"); btn_reassign.setFixedWidth(30); btn_reassign.clicked.connect(lambda _, r=row: self.reassign_account(r))
            for b in [btn_copy, btn_save, btn_edit, btn_release, btn_reassign]: actions.addWidget(b)
            self.table.setCellWidget(i, 5, action_widget)
        
        # Column resizing logic from Accounts.py
        h = self.table.horizontalHeader()
        h.setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        h.setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        for col in [1, 3, 4, 5]: h.setSectionResizeMode(col, QHeaderView.ResizeMode.Fixed)
        self.table.setColumnWidth(5, 170)

    # logic for add_account, release, reassign, copy_all, save_password, edit_account 
    # would follow the exact implementation from your provided Accounts.py script...
    def add_account(self):
        admin_id = self.admin_dd.currentData(); user_id = self.employee_dd.currentData()
        email = self.email_input.text().strip(); pw = self.password_input.text().strip()
        if not admin_id or not email: return
        supabase.table("m365_accounts").insert({"email": email, "password": pw or "free", "status": "assigned" if user_id else "free", "subscription_id": admin_id, "user_id": user_id}).execute()
        self.load_data()

    def apply_filter(self, text):
                  text = text.lower().strip()

                  if not text:
                      self.render_table(self.all_rows)
                      return

                  filtered = [
                      r for r in self.all_rows
                      if text in " ".join([
                          r.get("email", ""),
                          self.admin_map.get(r.get("subscription_id"), ""),
                          self.user_map.get(r.get("user_id"), ""),
                          r.get("status", "")
                      ]).lower()
                  ]

                  self.render_table(filtered)


    def release_account(self, row):
        supabase.table("m365_accounts").update({"user_id": None, "subscription_id": None, "status": "free"}).eq("id", row["id"]).execute()
        self.load_data()

    def reassign_account(self, row):
        dlg = ReassignDialog(self.admin_map, self.user_map)
        if dlg.exec():
            supabase.table("m365_accounts").update({"subscription_id": dlg.admin_dd.currentData(), "user_id": dlg.employee_dd.currentData(), "status": "assigned"}).eq("id", row["id"]).execute()
            self.load_data()

    def copy_all(self, row):
        profile = supabase.table("profiles").select("employee_id").eq("user_id", row["user_id"]).single().execute().data
        if not profile: return
        emp_id = profile["employee_id"]
        v = (row.get("password_version") or 0) + 1
        new_pw = f"Omni360{emp_id}V{v}"
        pyperclip.copy(f"{row['email']}\n{row.get('password','')}\n{new_pw}")
        self._pending_update = {"id": row["id"], "user_id": row["user_id"], "email": row["email"], "password": new_pw, "version": v}
        QMessageBox.information(self, "Copied", "Reset credentials copied to clipboard.")

    def save_password(self):
        data = getattr(self, "_pending_update", None)
        if not data: 
            QMessageBox.warning(self, "No Data", "Please click the Copy (📋) button first to generate the new password.")
            return
        
        # 1. Get the current (old) password from the local data
        row_data = next((r for r in self.all_rows if r["id"] == data["id"]), None)
        if not row_data: return
        
        old_pw = row_data.get("password")
        email = data["email"]
        new_pw = data["password"]

        # 2. Confirm launch
        reply = QMessageBox.question(self, "Start Reset", 
            f"Launch Browser to reset password for {email}?\n\nNew PW: {new_pw}",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        
        if reply == QMessageBox.StandardButton.Yes:
            # 3. Define the background task
            def run_automation():
                try:
                    # Executes: python reset.py email old_pass new_pass
                    subprocess.run([
                        sys.executable, email, old_pw, new_pw
                    ], check=True)
                    print(f"[GUI] Automation finished for {email}")
                except Exception as e:
                    print(f"[GUI] Automation error: {e}")

            # 4. Start the automation in a separate thread so GUI stays responsive
            threading.Thread(target=run_automation, daemon=True).start()

            # 5. Update the Database and Log
            supabase.table("m365_accounts").update({
                "password": new_pw, 
                "password_version": data["version"], 
                "last_password_reset": datetime.utcnow().isoformat()
            }).eq("id", data["id"]).execute()

            supabase.table("security_audit_log").insert({
                "user_id": data["user_id"], 
                "action": "M365_AUTO_RESET_LAUNCHED", 
                "table_name": "m365_accounts", 
                "record_id": data["id"], 
                "details": {"email": email}
            }).execute()

            QMessageBox.information(self, "Started", "Browser automation started. Follow the prompts in the Chrome window.")
            del self._pending_update
            self.load_data()

    def edit_account(self, row):
        dlg = QDialog(self); layout = QVBoxLayout(dlg)
        e = QLineEdit(row["email"]); p = QLineEdit(row["password"])
        btn = QPushButton("Save"); btn.clicked.connect(lambda: [supabase.table("m365_accounts").update({"email": e.text(), "password": p.text()}).eq("id", row["id"]).execute(), dlg.accept(), self.load_data()])
        layout.addWidget(QLabel("Email")); layout.addWidget(e); layout.addWidget(QLabel("Password")); layout.addWidget(p); layout.addWidget(btn)
        dlg.exec()

# ==========================================
# 6. FINAL MAIN WINDOW
# ==========================================

class OmniSync360Admin(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("OmniSync360 Admin Hub")
        self.resize(1350, 850)
        
        layout = QVBoxLayout(self)
        self.tabs = QTabWidget()
        
        # Adding your three apps as tabs
        self.tabs.addTab(UserManagementTab(), "Users & Devices")
        self.tabs.addTab(AdminOverviewTab(), "M365 Subscriptions")
        self.tabs.addTab(M365AccountTab(), "M365 Account Assignments")
        self.tabs.addTab(MailHealthTab(supabase), "Mail Health")
        self.tabs.addTab(AttendanceManager(), "Team Attendance")
        self.tabs.addTab(AnnouncementAdminTab(), "Announcements")
        self.tabs.addTab(TeamLeadsTab(), "Team Leads")
        self.tabs.addTab(OutlookAdminApp(), "Outlook Inbox Explorer")
        
        layout.addWidget(self.tabs)

if __name__ == "__main__":
    # Check if we are running the GUI or the Automation Worker
    # Argument count will be 4 if called by the subprocess: [exe_path, email, old_pw, new_pw]
    if len(sys.argv) == 4:
        from reset import reset_password
        import asyncio
        
        email = sys.argv[1]
        old_pw = sys.argv[2]
        new_pw = sys.argv[3]
        
        # This executes JUST the password reset logic, no GUI
        asyncio.run(reset_password(email, old_pw, new_pw))
    else:
        # Standard GUI Startup
        app = QApplication(sys.argv)
        hub = OmniSync360Admin()
        hub.show()
        sys.exit(app.exec())